import time
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    m = b.new_page(viewport={"width":390,"height":760}, has_touch=True, is_mobile=True)
    m.goto("http://127.0.0.1:8765/test.html"); m.wait_for_function("window.__game!==undefined", timeout=60000); time.sleep(1)
    m.screenshot(path="shots/8_mobile_intro.png")
    m.click("#goBtn"); time.sleep(7); m.screenshot(path="shots/9_mobile_fight.png")
    b.close()
