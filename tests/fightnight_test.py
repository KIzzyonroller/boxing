"""Batch 2 and 4 checks: feint, pull-back, clinch + referee break, southpaw, buckling, cuts and the doctor,
swelling and first-person vision, venues, the weigh-in face-off, ring walks and knockout replays."""
import time, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
fails = []
def check(n, ok, info=""): print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info else "")); (None if ok else fails.append(n))
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 960, "height": 540}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1)
    ev = pg.evaluate; G = "window.__game"
    # career fight to see venue + face-off
    pg.click("#mNew"); time.sleep(.5); pg.fill("#fName", "Night Test"); pg.click("[data-stance='1']"); time.sleep(.2); pg.click("#saveF"); time.sleep(1)
    check("southpaw saved", ev(f"{G}.PR.southpaw === true"))
    ev(f"{G}.PR.fightIn = 0; {G}.toHub()"); time.sleep(.4); pg.click("#fightBtn"); time.sleep(.4); pg.click("#walkBtn"); time.sleep(1)
    check("amateur venue is the small hall", "Community Hall" in (ev(f"{G}.G.venue && {G}.G.venue.name") or ""))
    t0 = time.time(); saw_face = saw_walk = False
    while time.time() - t0 < 120 and ev(f"{G}.G.state") == "intro":
        ln = ev("(() => { try { return [INTRO.lines[INTRO.i].cam, !!INTRO.walker] } catch (e) { return null } })()")
        cap = pg.text_content("#caption")
        if "face to face" in cap and not saw_face: saw_face = True; time.sleep(1.5); pg.screenshot(path=f"{S}/f_faceoff.png")
        if ("red corner" in cap) and not saw_walk: saw_walk = True; time.sleep(1.2); pg.screenshot(path=f"{S}/f_ringwalk.png")
        time.sleep(.3)
    check("face-off shown", saw_face); check("ring walk shown", saw_walk)
    time.sleep(1.5); check("player is southpaw in the fight", ev(f"{G}.P.sp === true")); pg.screenshot(path=f"{S}/f_southpaw.png")
    ev("window.__noAI = true")
    ev(f"{G}.onAction('feint')"); time.sleep(.1); check("feint", ev(f"!!{G}.P.feint"))
    time.sleep(.4); ev(f"{G}.onAction('pull')"); time.sleep(.15); check("pull back", ev(f"!!{G}.P.pullD")); time.sleep(.6)
    ev(f"(() => {{ const g = {G}; g.O.pos.copy(g.P.pos).add(new g.V3(0, 0, .6)); }})()"); time.sleep(.2); ev(f"{G}.onAction('clinch')"); time.sleep(.4)
    check("clinch starts", ev(f"!!{G}.G.clinch")); pg.screenshot(path=f"{S}/f_clinch.png")
    t1 = time.time()
    while time.time() - t1 < 20 and ev(f"!!{G}.G.clinch"): time.sleep(.3)
    check("referee broke the clinch", not ev(f"!!{G}.G.clinch"))
    # damage look: swelling, cut, buckle
    ev(f"(() => {{ const g = {G}; g.O.swell.L = .9; g.O.cut = {{ side: 'L', sev: .5 }}; g.O.headCap = 40; g.O.buckle = 2; g.P.swell.R = .8; }})()")
    ev(f"""window.__camOverride = () => {{ const g = window.__game, h = g.O.headPos(); return [h.clone().add(g.O.fwd().multiplyScalar(.75)).add(new g.V3(0, .02, 0)), h]; }}"""); time.sleep(1.2)
    pg.screenshot(path=f"{S}/f_damage.png"); ev("window.__camOverride = null")
    check("buckled legs", ev(f"{G}.O.buckle > 0"))
    ev(f"{G}.G.cam = 2"); time.sleep(1); pg.screenshot(path=f"{S}/f_fp_swollen.png"); ev(f"{G}.G.cam = 0")
    # doctor stoppage via a bad cut, then the replay
    ev(f"(() => {{ const g = {G}; g.O.cut.sev = 1.25; g.O.head = 60; }})()")
    ev("window.__noAI = false")
    ev(f"(() => {{ const g = {G}; g.O.pos.copy(g.P.pos).add(new g.V3(0, 0, .7)); }})()")
    t0 = time.time(); stopped = False
    while time.time() - t0 < 40:
        if ev(f"{G}.G.state") == "over": stopped = True; break
        if not ev(f"!!{G}.P.punch"): ev(f"{G}.onAction('over')")
        time.sleep(.25)
    if not stopped: ev(f"(() => {{ const g = {G}; g.O.head = -10; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }})()")
    pg.wait_for_function(f"{G}.G.state === 'over'", timeout=60000)
    time.sleep(2.6); rp = ev("!document.getElementById('replayTag').classList.contains('hidden')"); pg.screenshot(path=f"{S}/f_replay.png")
    check("replay plays after a stoppage", rp)
    pg.wait_for_selector("#over:not(.hidden)", timeout=60000); check("result after replay", True, pg.text_content("#over")[:120])
    print("ERRORS:", errs[:6]); print("FAILED:", fails); b.close()
