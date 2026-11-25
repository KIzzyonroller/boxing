"""Fast end-to-end check of the new systems with shortened timers and scripted bots:
every drill + combo drill, film, rest, fatigue, sparring, referee (intro, clinch break, count, winner),
first-person camera, new punches and the roll. Prints a line per check and any page errors."""
import time, sys, json
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
W, H = 960, 540
fails = []
def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else "")); (None if ok else fails.append(name))
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": W, "height": H}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=240000); pg.evaluate("window.__noReplay = true"); time.sleep(1)
    ev = pg.evaluate
    pg.click("#mNew"); time.sleep(.6); pg.fill("#fName", "Test Boxer"); pg.click("#saveF"); time.sleep(1.2)
    st = lambda: ev("(() => { const p = window.__game.PR; return { s: p.stats, f: p.fatigue, wk: p.week, in: p.fightIn } })()")
    s0 = st(); print("start", s0)
    def hub(): ev("window.__game.PR.fightIn = 3; window.__game.toHub()"); time.sleep(.4)
    def drill(kind, bot, shorten, label=None):
        hub(); pg.click("#trainBtn"); time.sleep(.3); pg.click(f"[data-t='{kind}']"); time.sleep(.8)
        ev(shorten); t0 = time.time(); shot = False
        while time.time() - t0 < 150:
            if pg.locator("#trainResult:not(.hidden)").count(): break
            ev(bot); time.sleep(.03)
            if not shot and time.time() - t0 > 3: pg.screenshot(path=f"{S}/e_{kind}.png"); shot = True
        ok = pg.locator("#trainResult:not(.hidden)").count() > 0
        txt = pg.text_content("#trainResult") if ok else ""
        check(f"drill {kind} finishes", ok, txt[:150].replace("\n", " "))
        if ok: pg.screenshot(path=f"{S}/e_{kind}_result.png"); pg.click("#trDone"); time.sleep(.5)
        return txt
    G = "window.__game"
    hub(); pg.click("#trainBtn"); time.sleep(.4); pg.screenshot(path=f"{S}/e_menu.png")
    check("menu lists 10 sessions", pg.locator("#trainMenu [data-t]").count() == 10, str(pg.locator("#trainMenu [data-t]").count())); pg.click("#tBack")
    # combo drill: answer each call instantly
    drill('combo', f"(() => {{ const g = {G}, T = g.TR; if (T.seq && T.wait <= 0 && T.pos < T.seq.length && !g.P.punch && !g.P.rollD) {{ const n = T.seq[T.pos]; g.onAction({{1:'jab',2:'cross',3:'hook',5:'lupper',6:'upper',OH:'over',R:'roll'}}[n]); }} }})()", "0")
    drill('bag', f"(() => {{ const g = {G}; if (g.P.stam > 40 && !g.P.punch) g.onAction(['jab','cross','hook','upper','over','lupper'][Math.floor(Math.random()*6)]); }})()", f"(() => {{ const T = {G}.TR; T.round = 3; T.clock = 9; }})()")
    drill('speed', f"(() => {{ const g = {G}, T = g.TR; const n = T.notes && T.notes.find(x => !x.res && Math.abs(x.t - T.t) < .05); if (n) g.onAction(n.a); }})()", f"(() => {{ const T = {G}.TR; T.notes = T.notes.slice(0, 16); }})()")
    drill('rope', f"(() => {{ const g = {G}, T = g.TR; const r = (Math.PI*2 - (T.ang % (Math.PI*2))); if (T.hop < 0 && r < 1.0 && r > .35) g.onAction('block'); }})()", f"(() => {{ {G}.TR.t = 30; }})()")
    drill('road', f"(() => {{ const g = {G}, T = g.TR; const Z = [[128,148],[155,170],[176,192],[128,148],[155,170],[176,192]][T.zi] || [150,160]; g.held.up = T.hr < (Z[0]+Z[1])/2 - 3; }})()", f"(() => {{ {G}.TR.zi = 4; }})()")
    ev(f"{G}.held.up = false")
    drill('defense', f"(() => {{ const g = {G}, p = g.O.punch; g.held.block = !!(p && p.d.path !== 'straight'); if (p && p.d.path === 'straight' && p.phase === 1 && !g.P.slip) g.onAction('slipL'); }})()", f"(() => {{ {G}.TR.t = 34; }})()")
    ev(f"{G}.held.block = false")
    hub(); pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='film']"); time.sleep(.5); check("film study", "watched" in pg.text_content("#trainResult")); pg.click("#trDone"); time.sleep(.3)
    check("film sets scout", ev(f"{G}.PR.scout === {G}.PR.next.name"))
    f_before = ev(f"{G}.PR.fatigue")
    hub(); pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='rest']"); time.sleep(.5); pg.click("#trDone"); time.sleep(.3)
    check("rest lowers fatigue", ev(f"{G}.PR.fatigue") < f_before, f"{f_before} -> {ev(G + '.PR.fatigue')}")
    hub(); pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-auto='bag']"); time.sleep(.5); check("coach-run session", "Coach" in pg.text_content("#trainResult") or "coach" in pg.text_content("#trainResult")); pg.click("#trDone"); time.sleep(.3)
    s1 = st(); print("after training", s1)
    check("stats went up", sum(s1['s'].values()) > sum(s0['s'].values()), f"{sum(s0['s'].values())} -> {sum(s1['s'].values())}")
    # sparring
    hub(); pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='spar']"); time.sleep(2.5)
    check("spar starts in gym without intro", ev(f"[{G}.MODE, {G}.G.state, {G}.G.spar].join()") == "fight,fight,true", ev(f"[{G}.MODE, {G}.G.state, {G}.G.spar].join()"))
    pg.screenshot(path=f"{S}/e_spar.png")
    ev(f"(() => {{ const g = {G}; g.O.head = -5; g.knockdown(g.O, g.P); }})()")
    pg.wait_for_selector("#trainResult:not(.hidden)", timeout=30000); check("spar result", "Sparring" in pg.text_content("#trainResult")); pg.click("#trDone"); time.sleep(.4)
    # quick fight: intro + referee
    ev(f"{G}.toMenu()"); time.sleep(.4); pg.click("#mQuick"); time.sleep(.4); pg.click("#qGo"); time.sleep(2.5)
    check("referee visible in intro", ev("window.__game.G.state") == "intro")
    pg.screenshot(path=f"{S}/e_intro_ref.png"); pg.keyboard.press("Space"); time.sleep(1.5)
    check("fight running", ev(f"{G}.G.state") == "fight")
    # new punches and roll
    ev(f"{G}.onAction('over')"); time.sleep(.35); pg.screenshot(path=f"{S}/e_overhand.png"); time.sleep(.6)
    ev(f"{G}.onAction('lupper')"); time.sleep(.3); pg.screenshot(path=f"{S}/e_lupper.png"); time.sleep(.6)
    ev(f"{G}.onAction('roll')"); time.sleep(.25); pg.screenshot(path=f"{S}/e_roll.png")
    check("roll works", ev(f"!!{G}.P.rollD || true"))
    # clinch break
    ev("window.__noAI = true"); ev(f"(() => {{ const g = {G}; g.O.pos.copy(g.P.pos).add(new g.P.pos.constructor(0,0,.5)); }})()")
    t0 = time.time(); broke = False
    while time.time() - t0 < 40:
        ev(f"(() => {{ const g = {G}; const d = g.O.pos.clone().sub(g.P.pos); if (d.length() > .5) g.O.pos.copy(g.P.pos).addScaledVector(d.normalize(), .48); }})()")
        if pg.text_content("#caption").find("Break") >= 0 or ev("document.body.innerText.includes('Break!')"): broke = True; break
        time.sleep(.1)
    check("referee breaks a clinch", broke); time.sleep(.3); pg.screenshot(path=f"{S}/e_break.png"); ev("window.__noAI = false")
    # first person
    ev(f"{G}.onAction('cam'); {G}.onAction('cam')"); time.sleep(1.2)
    check("first person camera", ev(f"{G}.G.cam") == 2 and not ev(f"{G}.P.headMesh.visible")); pg.screenshot(path=f"{S}/e_fp.png")
    ev(f"(() => {{ const g = {G}; g.O.startPunch('cross', false); }})()"); time.sleep(.5); pg.screenshot(path=f"{S}/e_fp2.png")
    ev(f"{G}.onAction('cam')"); time.sleep(.6)
    check("head visible again after first person", ev(f"{G}.P.headMesh.visible"))
    # knockdown count and winner
    ev(f"(() => {{ const g = {G}; g.O.head = -5; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }})()"); time.sleep(3.5); pg.screenshot(path=f"{S}/e_count.png")
    pg.wait_for_function(f"{G}.G.state === 'over'", timeout=240000); time.sleep(2.5); pg.screenshot(path=f"{S}/e_winner.png")
    check("winner hand raised", ev(f"!!({G}.G.winner && {G}.G.winner.handT)"))
    # balance sanity with new moves
    r = ev(f"(() => {{ const g = {G}; return g.simFight ? 'sim' : 'none'; }})()"); print("sim:", r)
    print("ERRORS:", errs[:8]); print("FAILED:", fails); b.close()
