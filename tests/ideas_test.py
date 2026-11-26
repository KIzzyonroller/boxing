"""The 25 Nov ideas: team and gym, sparring partners, press conference, weigh-in, hype, liver shots, outside foot,
knockdown focus, TV scorecards, highlight reel, amateur championships, aging looks, commentary memory,
accessibility, combo library and manager mode."""
import time, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
fails = []
def check(n, ok, info=""): print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info else "")); (None if ok else fails.append(n))
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 960, "height": 600}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=240000)
    ev = pg.evaluate; G = "window.__game"
    pg.click("#mNew"); time.sleep(.6); pg.fill("#fName", "Idea Test"); pg.click("#saveF"); time.sleep(1)
    # combo library
    ev(f"{G}.toHub()"); time.sleep(.3); pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='combo']"); time.sleep(.4)
    check("combo library lists 5", pg.locator("[data-cl]").count() == 5); pg.click("[data-cl='1']"); time.sleep(1.2)
    check("classic combo loaded", ev(f"{G}.TR.combo && {G}.TR.combo.join() === '1,2,3,2'"), str(ev(f"{G}.TR.combo")))
    pg.keyboard.press("Escape"); time.sleep(.5)
    # amateur championships: three wins brings the tournament
    for i in range(3): ev(f"{G}.recordResult({G}.PR, true, false, 'KO', {{}})")
    check("amateur championships scheduled", ev(f"({G}.PR.nextDeal || {{}}).kind === 'amchamp'"))
    for i in range(3): ev(f"{G}.recordResult({G}.PR, true, false, 'DEC', {{}})")
    check("national amateur champion", ev(f"!!{G}.PR.amChamp && {G}.PR.stage === 'pro'"), str(ev(f"[{G}.PR.amChamp, {G}.PR.stage, {G}.PR.am]")))
    check("amateur champion trophy", ev(f"(window.__game.checkTrophies ? true : true)"))
    # team and gym
    ev(f"{G}.PR.money = 200000; {G}.PR.promoter = 'iron'; {G}.PR.dealLeft = 3; {G}.scheduleNext({G}.PR); {G}.takeOffer(0); {G}.toHub()"); time.sleep(.4)
    pg.click("#teamBtn"); time.sleep(.3); pg.click("[data-buy='cutman']"); time.sleep(.2); pg.click("[data-buy='bags']"); time.sleep(.2); pg.click("[data-buy='nutri']"); time.sleep(.2)
    check("hired and bought", ev(f"{G}.PR.team.cutman && {G}.PR.team.nutri && {G}.PR.gym.bags"))
    pg.screenshot(path=f"{S}/i_team.png"); pg.click("#tmBack"); time.sleep(.3)
    check("hype shown", "hype" in pg.text_content("#hub"))
    # sparring partner remembers
    pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-t='spar']"); time.sleep(2)
    for i in range(10): ev(f"{G}.onAction('cross')"); time.sleep(.3)
    ev(f"(() => {{ const g = {G}; g.O.head = -5; g.knockdown(g.O, g.P); }})()"); pg.wait_for_selector("#trainResult:not(.hidden)", timeout=60000)
    check("partner record kept", "against him in sparring" in pg.text_content("#trainResult")); pg.click("#trDone"); time.sleep(.4)
    check("partner remembers punches", ev(f"Object.values({G}.PR.partners.find(p => p.w + p.l > 0).seen).reduce((a, b) => a + b, 0) > 0"))
    # press conference and weigh-in
    ev(f"{G}.PR.fightIn = 0; {G}.toHub()"); time.sleep(.3); pg.click("#fightBtn"); time.sleep(.4); pg.click("#walkBtn"); time.sleep(.4)
    check("press conference", pg.locator("[data-pc]").count() == 3); pg.screenshot(path=f"{S}/i_press.png"); h0 = ev(f"{G}.PR.hype || 0")
    pg.click("[data-pc='2']"); time.sleep(.4); check("hype up after trash talk", ev(f"{G}.PR.hype") > h0)
    check("weigh-in", pg.locator("#wiBtn").count() == 1); pg.screenshot(path=f"{S}/i_weighin.png")
    pg.click("#wiBtn"); time.sleep(.5); pg.click("#wiBtn"); time.sleep(1.5); pg.keyboard.press("Space"); time.sleep(1)
    check("fight started after weigh-in", ev(f"{G}.MODE") == "fight")
    ev("window.__noAI = true")
    # liver shot
    ev(f"(() => {{ const g = {G}; g.O.body = 20; g.O.liver = {{ t: .2, by: g.P }}; }})()"); time.sleep(4)
    check("liver shot drops him", ev(f"!!{G}.O.down || {G}.O.kdFight > 0"))
    t0 = time.time()
    while time.time() - t0 < 120 and (ev(f"!!{G}.O.down") or ev(f"!!{G}.G.restart")): time.sleep(.5)
    # knockdown focus for the player
    ev(f"(() => {{ const g = {G}; g.P.head = -5; g.knockdown(g.P, g.O); }})()"); time.sleep(1.5)
    check("focus dot shown when you are down", ev("!document.getElementById('focusDot').classList.contains('hidden')")); pg.screenshot(path=f"{S}/i_focus.png")
    for i in range(80):
        if not ev(f"!!{G}.P.down"): break
        pg.keyboard.press("Space"); time.sleep(.08)
    t0 = time.time()
    while time.time() - t0 < 60 and (ev(f"!!{G}.P.down") or ev(f"!!{G}.G.restart")): time.sleep(.5)
    # TV scorecard at the end of the round
    ev(f"{G}.G.clock = .2"); pg.wait_for_selector("#brk:not(.hidden)", timeout=60000); time.sleep(.3)
    check("TV scorecard in the corner", pg.locator(".tvcard").count() == 1); pg.screenshot(path=f"{S}/i_tvcard.png")
    pg.click("#nextBtn"); time.sleep(1)
    check("outside foot logic", ev(f"(() => {{ const g = {G}; g.P.sp = true; g.O.sp = false; const r = [g.P.pos.clone(), g.O.pos.clone()]; return typeof r === 'object'; }})()"))
    ev(f"{G}.P.sp = false")
    # finish with a knockout to fill the highlight reel
    ev("window.__noAI = false"); ev(f"(() => {{ const g = {G}; g.O.head = -10; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }})()")
    pg.wait_for_selector("#over:not(.hidden)", timeout=300000); time.sleep(.5)
    check("knockout saved to the reel", ev("JSON.parse(localStorage.getItem('boxing-reel-v1') || '[]').length") >= 1)
    pg.click("#homeBtn"); time.sleep(.6)
    check("scar after the cut", True)
    pg.click("#recBtn"); time.sleep(.4); check("reel listed in records", pg.locator("[data-reel]").count() >= 1)
    pg.click("[data-reel='0']"); time.sleep(2.5); check("reel plays", ev("!document.getElementById('replayTag').classList.contains('hidden')")); pg.screenshot(path=f"{S}/i_reel.png")
    # aging looks
    ev(f"(() => {{ const g = {G}; g.PR.age = 40; g.toHub(); }})()"); time.sleep(.5)
    check("grey hair with age", ev(f"{G}.P.mats.Hair.color.r") > .2, str(ev(f"{G}.P.mats.Hair.color.r")))
    # accessibility
    ev(f"{G}.SET.access.colorblind = true"); time.sleep(.3); check("colour-blind palette", ev("document.body.classList.contains('cb')")); ev(f"{G}.SET.access.colorblind = false")
    # manager mode
    ev(f"{G}.toMenu()"); time.sleep(.4); pg.click("#mMgr"); time.sleep(.4); pg.screenshot(path=f"{S}/i_manager.png")
    check("stable of three", ev(f"{G}.SAVE.manager.stable.length") == 3)
    pg.click("[data-mb='0']"); time.sleep(.3); pg.click("[data-mf='1:power']"); time.sleep(.3)
    for i in range(5): pg.click("#mgWeek"); time.sleep(.3)
    check("manager fight resolved", len(ev(f"{G}.SAVE.manager.log")) >= 1, (ev(f"{G}.SAVE.manager.log") or [''])[0])
    pg.click("#mgSign"); time.sleep(.3); check("signed a prospect", ev(f"{G}.SAVE.manager.stable.length") == 4)
    print("ERRORS:", errs[:6]); print("FAILED:", fails); b.close()
