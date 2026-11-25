"""Quick fight with the Kokoro announcer voice on (test.html?vox): checks the model loads, intro lines
are voiced in Lewis's voice, commentary and the result are voiced, and records the timing."""
import time, json, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1280, "height": 720}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.add_init_script("""window.__voxlog = []; const _st = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.sampleRate === 24000) window.__voxlog.push({ t: performance.now() | 0, secs: +this.buffer.duration.toFixed(2), cap: (document.getElementById('caption') || {}).textContent }); return _st.apply(this, a); };""")
    pg.goto("http://127.0.0.1:8765/test.html?vox"); pg.wait_for_function("window.__game !== undefined", timeout=60000)
    pg.mouse.click(640, 400)
    t0 = time.time()
    pg.wait_for_function("document.querySelector('#mQuick') && true"); 
    for i in range(240):
        st = pg.evaluate("(() => { const g = window.__game; return g.SET ? 1 : 0 })()"); time.sleep(.5)
        k = pg.evaluate("(() => { try { return [VOX.kState] } catch(e) { return null } })()")
        break
    pg.click("#mQuick"); time.sleep(.4); pg.click("#qGo")
    pg.wait_for_function("window.__game.G.state === 'fight'", timeout=180000)
    print("intro took", round(time.time() - t0, 1), "s")
    time.sleep(3)
    pg.evaluate("() => { const g = window.__game; g.O.head = 1; g.knockdown(g.O, g.P); g.O.down.getUp = 99; }")
    pg.wait_for_function("window.__game.G.state === 'over'", timeout=90000); time.sleep(25)
    for e in pg.evaluate("window.__voxlog"): print(e)
    print("errors:", errs[:5]); b.close()
