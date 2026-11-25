"""Walk the career loop in headless Chromium: create a fighter, train (mitt work + sims), fight night, result, back to the gym."""
import sys, time, json
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/test.html"
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
errors = []
def shot(pg, name): pg.screenshot(path=f"{S}/{name}.png")
def state(pg): return pg.evaluate("() => { const g = window.__game; return {mode: g.MODE, week: g.PR.week, fightIn: g.PR.fightIn, stats: g.PR.stats, am: g.PR.am, stage: g.PR.stage, next: g.PR.next && g.PR.next.name, fstate: g.G.state} }")

with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto(URL); pg.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1.5)
    shot(pg, "c0_creator")
    # try to start without a name -> error message
    pg.click("#saveF"); time.sleep(.3)
    print("no-name msg:", pg.text_content("#fErr"))
    pg.fill("#fName", "Kizzy Torres"); pg.fill("#fNick", "The Engine")
    pg.select_option("#fW", "5"); time.sleep(.3)
    pg.locator("[data-b='2']").click(); time.sleep(.2)
    for _ in range(8): pg.locator("[data-s='power'][data-d='1']").click()
    for _ in range(6): pg.locator("[data-s='speed'][data-d='1']").click()
    for _ in range(6): pg.locator("[data-s='chin'][data-d='1']").click()
    pg.locator("[data-s='cardio'][data-d='1']").click()   # no points left: should not change
    pg.locator("[data-k='trunks'][data-i='5']").click(); time.sleep(.8)
    shot(pg, "c1_creator_filled")
    pg.click("#saveF"); time.sleep(2)
    shot(pg, "c2_hub"); print("after create:", state(pg))
    # mitt work
    pg.click("#trainBtn"); time.sleep(.5); shot(pg, "c3_trainmenu")
    pg.click("[data-t='mitts']"); time.sleep(2.5)
    keymap = {1: "KeyJ", 2: "KeyK", 3: "KeyU", 6: "KeyI"}
    for c in range(10):
        pg.wait_for_function("() => { const t = window.__game.TR; return t.done || (t.seq && t.wait <= 0 && t.pos === 0); }", timeout=30000)
        if pg.evaluate("window.__game.TR.done"): break
        seq = pg.evaluate("window.__game.TR.seq")
        for i, n in enumerate(seq):
            pg.keyboard.press(keymap[n]); time.sleep(0.25)
            if c == 2 and i == 0: shot(pg, "c4_mitts")
        time.sleep(0.3)
    pg.wait_for_selector("#trainResult:not(.hidden)", timeout=30000); time.sleep(.5)
    shot(pg, "c5_mitt_result"); print("mitt result:", pg.text_content("#trainResult")[:300])
    pg.click("#trDone"); time.sleep(1)
    # two sim sessions to reach fight night
    for t in ["bag", "road"]:
        pg.click("#trainBtn"); time.sleep(.3); pg.click(f"[data-t='{t}']"); time.sleep(.4); pg.click("#trDone"); time.sleep(.6)
    print("before fight:", state(pg)); shot(pg, "c6_hub_fightnight")
    pg.click("#fightBtn"); time.sleep(.6); shot(pg, "c7_prefight")
    pg.click("#walkBtn"); time.sleep(3); shot(pg, "c8_fight")
    pg.keyboard.down("KeyW"); time.sleep(.5); pg.keyboard.up("KeyW")
    for k in ["KeyJ", "KeyK", "KeyJ", "KeyU"]: pg.keyboard.press(k); time.sleep(.3)
    # force a KO win to test the result flow
    pg.evaluate("() => { const g = window.__game; g.O.head = 1; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }")
    pg.wait_for_selector("#over:not(.hidden)", timeout=90000); time.sleep(.5)
    shot(pg, "c9_result"); print("result:", pg.text_content("#over")[:400])
    pg.click("#homeBtn"); time.sleep(1.5); shot(pg, "c10_hub_after"); print("after fight:", state(pg))
    # reload: does the career persist (local fallback in tests)?
    pg.reload(); pg.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1)
    print("after reload:", state(pg))
    # phone
    m = b.new_page(viewport={"width": 390, "height": 760}, has_touch=True, is_mobile=True)
    m.goto(URL); m.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1.5)
    m.screenshot(path=f"{S}/c11_mobile_creator.png")
    b.close()
print("ERRORS:", json.dumps(errors[:15], indent=1))
