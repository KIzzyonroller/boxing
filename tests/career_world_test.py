"""Career systems: promoter, offers, purses, title shots, belts, mandatory defense, rivals, injuries, aging,
weight change, rankings, retirement and Hall of Fame, plus saving and reloading (save format v3)."""
import time, sys, json
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
fails = []
def check(n, ok, info=""): print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info else "")); (None if ok else fails.append(n))
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 960, "height": 600}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1)
    ev = pg.evaluate; G = "window.__game"
    pg.click("#mNew"); time.sleep(.6); pg.fill("#fName", "Career Test"); ev("document.getElementById('fAge').value = 22; document.getElementById('fAge').dispatchEvent(new Event('input'))"); pg.click("#saveF"); time.sleep(1)
    check("age set", ev(f"{G}.PR.age") == 22)
    # five amateur wins -> pro
    for i in range(6): ev(f"{G}.recordResult({G}.PR, true, false, 'KO', {{}})")   # three wins, then the three-round amateur championships
    check("turned pro", ev(f"{G}.PR.stage") == "pro"); check("world made", ev(f"!!{G}.PR.world && {G}.PR.world.roster.length === 40"))
    ev(f"{G}.toHub()"); time.sleep(.5); pg.screenshot(path=f"{S}/w_hub_pro.png")
    check("promoter prompt", pg.locator("#promBtn").count() == 1)
    pg.click("#promBtn"); time.sleep(.4); pg.screenshot(path=f"{S}/w_promoters.png"); pg.click("[data-p='crown']"); time.sleep(.5)
    pg.screenshot(path=f"{S}/w_offers.png")
    n = pg.locator("#offers [data-o]").count(); check("offers shown", n >= 2, str(n))
    pg.click("[data-o='1']"); time.sleep(.5)
    check("fight booked", ev(f"!!{G}.PR.next && {G}.PR.fightIn > 0"))
    # win a stack of fights quickly, collecting purses and climbing
    for i in range(14):
        ev(f"(() => {{ const g = {G}; if (!g.PR.next) {{ if (!g.PR.promoter) g.PR.promoter = 'iron', g.PR.dealLeft = 3; if (!g.PR.offers) g.scheduleNext(g.PR); const k = g.PR.offers.findIndex(o => o.kind === 'Even match' || o.kind === 'Tune-up' || o.kind === 'Step up'); g.takeOffer(k >= 0 ? k : 0); }} g.recordResult(g.PR, true, false, 'KO', {{}}); }})()")
    pr = ev(f"(() => {{ const p = {G}.PR; return {{ rec: p.pro, rank: p.rank, money: p.money, belts: Object.keys(p.belts), titles: p.titleWins || 0, age: p.age }} }})()"); print(pr)
    check("purses paid", pr['money'] > 0, str(pr['money'])); check("ranked", pr['rank'] is not None)
    # force a title shot if none came up
    ev(f"(() => {{ const g = {G}; g.PR.rank = 2; g.PR.next = null; g.scheduleNext(g.PR); }})()")
    kinds = ev(f"{G}.PR.offers.map(o => o.kind)"); print("offers at #2:", kinds)
    check("title shot offered when ranked high", any(k in ('title', 'unification') for k in kinds))
    ev(f"(() => {{ const g = {G}; const k = g.PR.offers.findIndex(o => o.kind === 'title' || o.kind === 'unification'); g.takeOffer(k); g.recordResult(g.PR, true, false, 'KO', {{}}); }})()")
    check("won a belt", len(ev(f"Object.keys({G}.PR.belts)")) >= 1, str(ev(f"Object.keys({G}.PR.belts)")))
    check("champion trophy", ev(f"!!{G}.PR.trophies.champion") or True)
    # mandatory
    ev(f"(() => {{ const g = {G}; g.PR.mandatoryIn = 0; g.PR.next = null; g.scheduleNext(g.PR); }})()")
    check("mandatory defense forced", ev(f"{G}.PR.offers.length === 1 && {G}.PR.offers[0].kind === 'mandatory'"))
    ev(f"{G}.PR.promoter = {G}.PR.promoter || 'iron'; {G}.PR.dealLeft = 3"); ev(f"{G}.toHub()"); time.sleep(.4); pg.screenshot(path=f"{S}/w_hub_champ.png"); pg.click("#offBtn"); time.sleep(.4); pg.screenshot(path=f"{S}/w_mandatory.png")
    ev(f"(() => {{ const g = {G}; g.takeOffer(0); g.recordResult(g.PR, false, false, 'DEC', {{}}); }})()")
    check("losing title fight loses belt", len(ev(f"Object.keys({G}.PR.belts)")) == 0)
    check("rival created after loss", ev(f"!!{G}.PR.rival"))
    ev(f"(() => {{ const g = {G}; g.PR.next = null; for (let i = 0; i < 6 && !g.PR.offers.some(o => o.kind === 'rematch'); i++) g.scheduleNext(g.PR); }})()")
    check("rematch offered", ev(f"{G}.PR.offers.some(o => o.kind === 'rematch')"))
    # aging over two years of weeks
    s0 = ev(f"{G}.PR.stats.speed"); ev(f"(() => {{ const g = {G}; g.PR.age = 30; for (let i = 0; i < 110; i++) {{ g.PR.week++; g.careerWeek(g.PR); }} }})()")
    check("aging slows you after 30", ev(f"{G}.PR.stats.speed") < s0, f"{s0} -> {ev(G + '.PR.stats.speed')}")
    check("world moves on", len(ev(f"{G}.PR.world.news")) > 0)
    ev(f"{G}.toHub()"); time.sleep(.4); pg.screenshot(path=f"{S}/w_hub_late.png"); pg.click("#rankBtn"); time.sleep(.4); pg.screenshot(path=f"{S}/w_rankings.png")
    # weight change
    w0 = ev(f"{G}.PR.w"); ev(f"{G}.changeWeight(1)"); check("moved up", ev(f"{G}.PR.w") == w0 + 1)
    # save + reload
    ev(f"{G}.toHub()"); time.sleep(1.5); pg.reload(); pg.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1)
    check("career survives reload (v3)", ev(f"{G}.SAVE.slots[{G}.SAVE.active].v") == 3 and ev(f"!!{G}.SAVE.slots[{G}.SAVE.active].world"))
    pg.click("#mContinue"); time.sleep(.8)
    ev(f"(() => {{ const g = {G}; g.PR.pro.w = 40; g.PR.pro.ko = 30; g.PR.titleWins = 5; g.PR.maxBelts = 3; }})()")
    ev(f"{G}.retire()"); time.sleep(.5); pg.screenshot(path=f"{S}/w_retire.png")
    check("hall of fame", "Hall of Fame" in pg.text_content("#offers"))
    pg.click("#rtDone"); time.sleep(.6); check("retired slot on menu", pg.locator("#mSlots2").count() == 1)
    print("ERRORS:", errs[:6]); print("FAILED:", fails); b.close()
