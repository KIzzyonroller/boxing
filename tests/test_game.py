"""Drive the game in headless Chromium: screenshots + console errors + a scripted exchange."""
import sys, time, json
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/test.html"
shots = sys.argv[1] if len(sys.argv) > 1 else "shots"
errors = []
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.on("console", lambda m: m.type in ("error", "warning") and errors.append(f"{m.type}: {m.text}"))
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto(URL)
    pg.wait_for_function("window.__game !== undefined", timeout=60000)
    time.sleep(1.5)
    pg.screenshot(path=f"{shots}/0_intro.png")
    pg.click("#goBtn")
    time.sleep(2.0)
    pg.screenshot(path=f"{shots}/1_start.png")
    # walk in and throw a combo
    pg.keyboard.down("KeyW"); time.sleep(0.6); pg.keyboard.up("KeyW")
    pg.keyboard.press("KeyJ"); time.sleep(0.12)
    pg.screenshot(path=f"{shots}/2_jab.png")
    time.sleep(0.25); pg.keyboard.press("KeyK"); time.sleep(0.16)
    pg.screenshot(path=f"{shots}/3_cross.png")
    time.sleep(0.3); pg.keyboard.press("KeyU"); time.sleep(0.2)
    pg.screenshot(path=f"{shots}/4_hook.png")
    # let it play for a while with random inputs
    import random
    for i in range(40):
        k = random.choice(["KeyJ", "KeyJ", "KeyK", "KeyU", "KeyI", "KeyQ", "KeyE"])
        pg.keyboard.press(k); time.sleep(random.uniform(0.15, 0.45))
    pg.keyboard.press("KeyC"); time.sleep(0.8)
    pg.screenshot(path=f"{shots}/5_broadcast.png")
    state = pg.evaluate("""() => { const g=window.__game; const f=x=>({head:+x.head.toFixed(1),body:+x.body.toFixed(1),stam:+x.stam.toFixed(1),pos:[+x.pos.x.toFixed(2),+x.pos.z.toFixed(2)],st:x.st,down:!!x.down});
        return {state:g.G.state, clock:+g.G.clock.toFixed(1), P:f(g.P), O:f(g.O)} }""")
    print(json.dumps(state))
    # force a knockdown of the opponent to test the count
    pg.evaluate("() => { const g=window.__game; g.O.head = 1; g.knockdown(g.O, g.P); }")
    time.sleep(1.4); pg.screenshot(path=f"{shots}/6_knockdown.png")
    time.sleep(9); pg.screenshot(path=f"{shots}/7_count.png")
    print(pg.evaluate("() => ({state: window.__game.G.state, down: !!window.__game.O.down, msg: document.getElementById('msg').textContent, over: document.getElementById('over').textContent.slice(0,200)})"))
    # mobile layout check
    m = b.new_page(viewport={"width": 390, "height": 760}, has_touch=True, is_mobile=True)
    m.goto(URL); m.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1)
    m.screenshot(path=f"{shots}/8_mobile_intro.png")
    m.click("#goBtn"); time.sleep(1.5); m.screenshot(path=f"{shots}/9_mobile_fight.png")
    b.close()
print("ERRORS:", json.dumps(errors[:20], indent=1))
