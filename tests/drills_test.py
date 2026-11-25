"""Plays every training drill with a scripted bot, screenshots each, and checks gains, fatigue and sparring."""
import time, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1)
    pg.click("#mNew" if pg.locator("#mNew").count() else "#mStart"); time.sleep(.8)
    pg.fill("#fName", "Drill Tester"); pg.click("#saveF"); time.sleep(1.5)
    st = lambda: pg.evaluate("(() => { const p = window.__game.PR; return { stats: p.stats, fatigue: p.fatigue, week: p.week, fightIn: p.fightIn, scout: p.scout } })()")
    print("start", st())
    def play(kind, bot, secs):
        if pg.evaluate("window.__game.PR.fightIn") <= 0:
            pg.evaluate("window.__game.PR.fightIn = 3")
            pg.evaluate("document.getElementById('menuBtn') && 0"); pg.evaluate("window.__game.toHub()"); time.sleep(.5)
        pg.click("#trainBtn"); time.sleep(.4)
        if kind == 'menu': return
        pg.click(f"[data-t='{kind}']"); time.sleep(1.5)
        t0 = time.time(); shot_done = False
        while time.time() - t0 < secs:
            if pg.locator("#trainResult:not(.hidden)").count(): break
            pg.evaluate(bot); time.sleep(.05)
            if not shot_done and time.time() - t0 > 6: pg.screenshot(path=f"{S}/d_{kind}.png"); shot_done = True
        pg.wait_for_selector("#trainResult:not(.hidden)", timeout=240000); time.sleep(.4)
        pg.screenshot(path=f"{S}/d_{kind}_result.png")
        print(kind, "->", pg.text_content("#trainResult")[:260].replace("\n", " "))
        pg.click("#trDone"); time.sleep(1)
    G = "window.__game"
    play('menu', '', 0); pg.screenshot(path=f"{S}/d_menu.png"); pg.click("#tBack"); time.sleep(.4)
    play('bag', f"(() => {{ const g = {G}; if (g.P.stam > 45 && !g.P.punch) g.onAction(['jab','cross','hook','upper'][Math.floor(Math.random()*4)]); }})()", 200)
    play('speed', f"(() => {{ const g = {G}, T = g.TR; const n = T.notes && T.notes.find(x => !x.res && Math.abs(x.t - T.t) < .04); if (n) g.onAction(n.a); }})()", 200)
    play('rope', f"(() => {{ const g = {G}, T = g.TR; const r = (Math.PI*2 - (T.ang % (Math.PI*2))); if (T.hop < 0 && r < .9 && r > .3) g.onAction('block'); }})()", 200)
    play('road', f"(() => {{ const g = {G}, T = g.TR; const z = [[128,148],[155,170],[176,192],[128,148],[155,170],[176,192]][T.zi] || [150,160]; g.held.up = T.hr < (z[0]+z[1])/2; }})()", 200)
    play('defense', f"(() => {{ const g = {G}, p = g.O.punch; g.held.block = !!(p && p.d.path !== 'straight'); if (p && p.d.path === 'straight' && p.phase === 1 && p.k > .1 && !g.P.slip) g.onAction('slipL'); }})()", 200)
    play('film', '', 0) if False else None
    pg.evaluate("window.__game.toHub()"); time.sleep(.4); pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='film']"); time.sleep(.6); print("film ->", pg.text_content("#trainResult")[:200]); pg.click("#trDone"); time.sleep(.6)
    print("after drills", st())
    if pg.evaluate("window.__game.PR.fightIn") <= 0: pg.evaluate("window.__game.PR.fightIn = 2"); pg.evaluate("window.__game.toHub()"); time.sleep(.4)
    pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='spar']"); time.sleep(3); pg.screenshot(path=f"{S}/d_spar.png")
    print("spar state", pg.evaluate("[window.__game.MODE, window.__game.G.state, window.__game.G.spar]"))
    pg.evaluate("window.__game.G.clock = 1"); pg.wait_for_selector("#trainResult:not(.hidden)", timeout=60000); time.sleep(.4)
    pg.screenshot(path=f"{S}/d_spar_result.png"); print("spar ->", pg.text_content("#trainResult")[:300])
    pg.click("#trDone"); time.sleep(.6)
    pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='rest']"); time.sleep(.5); print("rest ->", pg.text_content("#trainResult")[:160]); pg.click("#trDone"); time.sleep(.5)
    print("end", st()); print("errors:", errs[:6]); b.close()
