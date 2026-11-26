"""After a knockdown the standing fighter goes to a neutral corner and cannot punch; when the downed fighter
gets up the referee checks him for a moment before the fight goes on, so there is no instant second knockdown."""
import time, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
fails = []
def check(n, ok, info=""): print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info else "")); (None if ok else fails.append(n))
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 800, "height": 450}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=240000); pg.evaluate("window.__noReplay = true")
    ev = pg.evaluate; G = "window.__game"
    pg.click("#mQuick"); time.sleep(.4); pg.click("#qGo"); time.sleep(1.5); pg.keyboard.press("Space"); time.sleep(1)
    ev(f"(() => {{ const g = {G}; g.P.pos.set(0,0,-.3); g.O.pos.set(0,0,.35); g.O.head = 5; g.knockdown(g.O, g.P); g.O.down.getUp = 3; }})()")
    t0 = time.time(); held = 0
    while time.time() - t0 < 90 and ev(f"!!{G}.O.down"):
        ev(f"{G}.held.up = true; {G}.onAction('cross')"); held += 1; time.sleep(.25)
    ev(f"{G}.held.up = false")
    d = ev(f"{G}.P.pos.distanceTo({G}.O.pos)")
    check("standing fighter went to a neutral corner", d > 2.0, f"distance {d:.2f}")
    check("referee checks the fighter after he rises", ev(f"!!{G}.G.restart")); pg.screenshot(path=f"{S}/g_check.png")
    check("no punching during the check", not ev(f"{G}.onAction('cross'), !!{G}.P.punch"))
    t0 = time.time()
    while time.time() - t0 < 60 and ev(f"!!{G}.G.restart"): time.sleep(.3)
    check("fight resumes", not ev(f"!!{G}.G.restart") and ev(f"{G}.G.state") == "fight")
    print("ERRORS:", errs[:5]); print("FAILED:", fails); b.close()
