"""Screenshots of the fight presentation: each intro shot, the lit arena in a fight, a knockdown orbit, the winner shot."""
import time, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=60000)
    time.sleep(.8); pg.screenshot(path=f"{S}/i0_open.png"); time.sleep(3); pg.screenshot(path=f"{S}/i1_menu.png")
    pg.click("#mQuick"); time.sleep(.4); pg.click("#qGo")
    seen = set(); t0 = time.time()
    while time.time() - t0 < 120:
        st = pg.evaluate("({s: window.__game.G.state, i: window.__game.G.state === 'intro' ? (window.__game.TUT, document.getElementById('caption').textContent.slice(0,40)) : ''})")
        shot_name = pg.evaluate("(() => { const g = window.__game; return g.G.state === 'intro' ? 'intro' : g.G.state; })()")
        if st["s"] != "intro": break
        i = pg.evaluate("window.__game.G.state === 'intro' ? document.getElementById('lower').classList.contains('hidden') : null")
        cap = st["i"]
        if cap and cap not in seen:
            seen.add(cap); time.sleep(1.6); pg.screenshot(path=f"{S}/i2_intro_{len(seen)}.png"); print("intro line:", cap)
        time.sleep(.3)
    print("state after intro:", pg.evaluate("window.__game.G.state"))
    time.sleep(2.5); pg.screenshot(path=f"{S}/i3_fight.png")
    pg.keyboard.press("KeyC"); time.sleep(2); pg.screenshot(path=f"{S}/i4_broadcast.png"); pg.keyboard.press("KeyC")
    pg.evaluate("() => { const g = window.__game; g.O.head = 1; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }")
    time.sleep(3.5); pg.screenshot(path=f"{S}/i5_knockdown.png")
    pg.wait_for_function("window.__game.G.state === 'over'", timeout=90000); time.sleep(3.5); pg.screenshot(path=f"{S}/i6_winner.png")
    print("caption at end:", pg.text_content("#caption")[:160])
    print("errors:", errs[:5])
    b.close()
