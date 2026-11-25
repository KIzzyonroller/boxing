"""Batch 5: creator extras, camp planner, week events, referee habits, fouls and deductions, standing eights,
cutman, taunts, pivots, crowd, photo mode, tournaments, the daily challenge and legends."""
import time, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
fails = []
def check(n, ok, info=""): print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info else "")); (None if ok else fails.append(n))
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 960, "height": 600}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=240000); pg.evaluate("window.__noReplay = true"); time.sleep(1)
    ev = pg.evaluate; G = "window.__game"
    # creator extras
    pg.click("#mNew"); time.sleep(.6); pg.fill("#fName", "Extra Test")
    pg.click("[data-x='shoes'][data-v='15921128']"); time.sleep(.2); pg.click("[data-tat='2']"); time.sleep(.2); pg.click("[data-ps='slugger']"); time.sleep(.2); pg.click("[data-wt='1']"); time.sleep(.3)
    ev("document.getElementById('fFw').value = 106; document.getElementById('fFw').dispatchEvent(new Event('input'))")
    pg.screenshot(path=f"{S}/x_creator.png"); pg.click("#saveF"); time.sleep(1)
    pr = ev(f"(() => {{ const p = {G}.PR; return [p.shoes, p.tattoo, p.pstyle, p.walkTheme, p.face && p.face.w] }})()")
    check("creator extras saved", pr[1] == 2 and pr[2] == 'slugger' and pr[3] == 1 and abs(pr[4] - 1.06) < .01, str(pr))
    check("tattoos visible", ev(f"{G}.P.tats[0].visible && {G}.P.tats[1].visible"))
    # camp planner
    ev(f"{G}.toHub()"); time.sleep(.4); pg.click("#trainBtn"); time.sleep(.3); pg.click("#tCamp"); time.sleep(.3); pg.click("[data-camp='power']"); time.sleep(.5)
    check("camp ran to fight week", ev(f"{G}.PR.fightIn") == 0 and "Camp done" in pg.text_content("#trainResult")); pg.screenshot(path=f"{S}/x_camp.png"); pg.click("#trDone"); time.sleep(.4)
    # amateur fight: referee name, standing eight, foul, taunt, pivot, cutman
    pg.click("#fightBtn"); time.sleep(.4); pg.click("#walkBtn"); time.sleep(1)
    check("referee picked", bool(ev(f"{G}.REFS.ref && {G}.REFS.ref.name")))
    t0 = time.time(); robe = False
    while ev(f"{G}.G.state") == "intro" and time.time() - t0 < 120:
        if ev(f"{G}.P.robe.visible || {G}.O.robe.visible"): robe = True
        if "referee tonight" in pg.text_content("#caption"): break
        time.sleep(.3)
    check("robe worn on the ring walk", robe); pg.keyboard.press("Space"); time.sleep(1)
    ev("window.__noAI = true")
    ev(f"{G}.onAction('taunt')"); time.sleep(.1); check("taunt", ev(f"{G}.P.taunt > 0"))
    time.sleep(1); ev(f"{G}.onAction('pivot')"); time.sleep(.05); check("pivot", ev(f"!!{G}.P.pivotD"))
    time.sleep(.6); ev(f"{G}.foul({G}.O, 'low blows'); {G}.foul({G}.O, 'low blows'); {G}.foul({G}.O, 'low blows')"); time.sleep(1.5)
    check("foul deduction recorded", ev(f"{G}.G.deduct[1]") >= 1, str(ev(f"{G}.G.deduct")))
    ev(f"{G}.standingEight({G}.O)"); time.sleep(.5); pg.screenshot(path=f"{S}/x_eight.png"); check("standing eight", ev(f"!!{G}.G.eight"))
    t0 = time.time()
    while ev(f"!!{G}.G.eight") and time.time() - t0 < 60: time.sleep(.3)
    check("eight count finishes", not ev(f"!!{G}.G.eight"))
    ev(f"{G}.P.cut = {{ side: 'L', sev: .8 }}; {G}.G.clock = .2"); pg.wait_for_selector("#brk:not(.hidden)", timeout=30000); time.sleep(.4)
    check("cutman in the corner", pg.locator("#cmBtn").count() == 1); pg.screenshot(path=f"{S}/x_cutman.png")
    for i in range(3): pg.click("#cmBtn"); time.sleep(.37)
    pg.click("#nextBtn"); time.sleep(1)
    # photo mode
    pg.keyboard.press("Escape"); time.sleep(.4); pg.click("#pzPhoto"); time.sleep(.8); pg.mouse.move(480, 300); pg.mouse.down(); pg.mouse.move(600, 260); pg.mouse.up(); time.sleep(.6)
    pg.click("#phSnap"); time.sleep(1); check("photo taken", pg.locator("#photoShot img").count() == 1); pg.screenshot(path=f"{S}/x_photo.png")
    pg.click("#phClose"); pg.click("#phExit"); time.sleep(.4); pg.click("#pzResume"); time.sleep(.3)
    ev("window.__noAI = false"); ev(f"(() => {{ const g = {G}; g.O.head = -5; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }})()")
    pg.wait_for_selector("#over:not(.hidden)", timeout=120000); check("amateur fight result", "win" in pg.text_content("#over").lower())
    # tournament
    ev(f"{G}.toMenu()"); time.sleep(.4); pg.click("#mTour"); time.sleep(.5); pg.screenshot(path=f"{S}/x_tourney.png"); check("bracket", pg.locator(".bracket li").count() == 3)
    pg.click("#tGo"); time.sleep(1.5); pg.keyboard.press("Space"); time.sleep(1)
    ev(f"(() => {{ const g = {G}; g.O.head = -5; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }})()"); pg.wait_for_selector("#over:not(.hidden)", timeout=120000)
    check("tournament advances", ev(f"{G}.SAVE.tourney.round") == 1); pg.click("#againBtn"); time.sleep(.5); check("back to bracket", "Semifinal" in pg.text_content("#quick"))
    # daily challenge
    ev(f"{G}.toMenu()"); time.sleep(.4); pg.click("#mDaily"); time.sleep(.5); pg.screenshot(path=f"{S}/x_daily.png"); pg.click("#dGo"); time.sleep(1.5); pg.keyboard.press("Space"); time.sleep(1)
    ev(f"(() => {{ const g = {G}; g.O.head = -5; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }})()"); pg.wait_for_selector("#over:not(.hidden)", timeout=120000)
    check("daily result saved", bool(ev(f"Object.keys({G}.SAVE.daily || {{}}).length")))
    # legends
    ev(f"{G}.toMenu()"); time.sleep(.3); pg.click("#mQuick"); time.sleep(.4)
    check("legends listed, locked", pg.locator("#qL option[disabled]").count() == 6)
    ev(f"{G}.PR.trophies.champion = {{ wk: 1 }}; {G}.openQuick()"); time.sleep(.3)
    check("legend unlocks with a title", pg.locator("#qL option:not([disabled])").count() >= 3)
    print("ERRORS:", errs[:6]); print("FAILED:", fails); b.close()
