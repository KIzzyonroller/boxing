"""Simulate the published artifact's account save: a mock window.claude whose db returns deep-frozen data,
holding an old (v1) single-profile career. The game must load it, migrate it into slot 1, and save v2 back."""
import time, json
from playwright.sync_api import sync_playwright

OLD = {"profile": {"v": 1, "created": True, "name": "Old Career", "nick": "", "w": 4, "h": 178, "reach": 183, "build": 1, "skin": 2,
       "trunks": 0, "gloves": 0, "trim": 3, "stats": {"power": 58, "speed": 55, "chin": 51, "cardio": 48}, "pts": 0,
       "am": {"w": 1, "l": 0}, "pro": {"w": 0, "l": 0, "d": 0, "ko": 0}, "stage": "amateur", "rank": None, "week": 5, "fightIn": 3,
       "rounds": 3, "next": {"name": "Owen Kowalski", "style": 1, "w": 4, "h": 180, "reach": 182, "build": 1, "skin": 2, "trunks": 1,
       "gloves": 1, "trim": 3, "stats": {"power": 40, "speed": 40, "chin": 40, "cardio": 40}, "level": .1, "rec": {"w": 1, "l": 0}},
       "history": [{"wk": 4, "opp": "Marcus Abara", "res": "W", "how": "KO", "stage": "amateur"}], "cam": 0}}
MOCK = """
(() => {
  const deepFreeze = o => { if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; };
  let stored = %s; window.__written = [];
  const doc = { get: async () => ({ exists: true, data: () => deepFreeze(JSON.parse(JSON.stringify(stored))) }),
                set: async d => { window.__written.push(d); stored = d; } };
  const db = { doc: () => doc, collection: () => ({ doc: () => doc }) };
  const user = { id: async () => 'u123' };
  window.claude = { use: async n => n === 'db' ? db : n === 'user' ? user : null };
})();
""" % json.dumps(OLD)
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.add_init_script(MOCK)
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=240000); pg.evaluate("window.__noReplay = true"); time.sleep(1)
    print("mode:", pg.evaluate("window.__game.MODE"), "| load text:", pg.text_content("#loadTxt"))
    print("slot 1:", pg.evaluate("window.__game.SAVE.slots[0] && window.__game.SAVE.slots[0].name"), "| saved to:", pg.evaluate("document.querySelector('#menu').textContent.includes('your account')"))
    pg.click("#mContinue"); time.sleep(1); pg.click("#trainBtn"); time.sleep(.3); pg.click("[data-auto='road']"); time.sleep(.8)
    w = pg.evaluate("window.__written.length ? window.__written[window.__written.length-1].save : null")
    print("wrote back v2:", w and w["v"], "| slot 1 week:", w and w["slots"][0]["week"])
    # second load reads the v2 save we just wrote, frozen again
    pg.reload(); pg.wait_for_function("window.__game !== undefined", timeout=240000); pg.evaluate("window.__noReplay = true"); time.sleep(1)
    print("after reload mode:", pg.evaluate("window.__game.MODE"))
    print("ERRORS:", errs)
    b.close()
