"""Balance check: a button-masher bot and a smart-boxer bot each fight the AI in fast headless simulations.
The masher should lose; the smart boxer should do clearly better."""
import sys, time, json
from playwright.sync_api import sync_playwright
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6
LEVEL = float(sys.argv[2]) if len(sys.argv) > 2 else .5
BOTS = r"""
window.__bots = {
  masher: () => { const B = { t: 0 }; return dt => {
    const g = window.__game, P = g.P, O = g.O, d = P.pos.distanceTo(O.pos);
    if (P.down) { B.m = (B.m || 0) - dt; if (B.m <= 0) { B.m = .1; g.onAction('block'); } return; }
    g.held.up = d > .7; g.held.down = false; g.held.block = false;
    B.t -= dt; if (B.t <= 0) { B.t = .12; g.onAction(['jab', 'cross', 'hook', 'upper'][Math.random() * 4 | 0]); }
  }; },
  smart: () => { const B = { t: .5 }; return dt => {
    const g = window.__game, P = g.P, O = g.O, d = P.pos.distanceTo(O.pos), op = O.punch;
    if (P.down) { B.m = (B.m || 0) - dt; if (B.m <= 0) { B.m = .1; g.onAction('block'); } return; }
    g.held.up = d > .92 && P.stam > 35; g.held.down = P.stam < 30 || d < .7;
    g.held.block = !!(op && op.phase < 2 && !P.punch);
    if (op && op.phase === 0 && !op._seen) { op._seen = 1; if (op.d.path === 'straight' && Math.random() < .4) { g.held.block = false; g.onAction(Math.random() < .5 ? 'slipL' : 'slipR'); } }
    if (op && op.phase === 2 && !op._ctr && d < .95 && P.stam > 20) { op._ctr = 1; if (Math.random() < .6) g.onAction(d < .8 ? 'hook' : 'cross'); }
    B.t -= dt;
    if (B.t <= 0 && P.stam > 35 && d < .98 && !op) {
      B.t = .7 + Math.random() * .6;
      const c = [['jab'], ['jab', 'cross'], ['jab', 'jab'], ['jab', 'cross', 'hook']][Math.random() * 4 | 0];
      g.held.body = Math.random() < .25; c.forEach(a => g.onAction(a)); g.held.body = false;
    }
  }; },
  human: () => { const B = { t: .5, seen: null, rt: 0 }; return dt => {
    // the smart boxer, but it only reacts to a punch about 0.2 s after it starts, like a person
    const g = window.__game, P = g.P, O = g.O, d = P.pos.distanceTo(O.pos), op = O.punch;
    if (P.down) { B.m = (B.m || 0) - dt; if (B.m <= 0) { B.m = .1; g.onAction('block'); } return; }
    g.held.up = d > .92 && P.stam > 35; g.held.down = P.stam < 30 || d < .7;
    if (op && B.seen !== op) { B.seen = op; B.rt = .18 + Math.random() * .1; }
    if (op) B.rt -= dt;
    g.held.block = !!(op && B.rt <= 0 && op.phase < 2 && !P.punch);
    if (op && B.rt <= 0 && !op._slip) { op._slip = 1; if (op.phase < 2 && op.d.path === 'straight' && Math.random() < .3) { g.held.block = false; g.onAction(Math.random() < .5 ? 'slipL' : 'slipR'); } }
    if (op && op.phase === 2 && !op._ctr && d < .95 && P.stam > 20) { op._ctr = 1; if (Math.random() < .5) g.onAction(d < .8 ? 'hook' : 'cross'); }
    B.t -= dt;
    if (B.t <= 0 && P.stam > 35 && d < .98 && !op) {
      B.t = .7 + Math.random() * .6;
      const c = [['jab'], ['jab', 'cross'], ['jab', 'jab'], ['jab', 'cross', 'hook']][Math.random() * 4 | 0];
      g.held.body = Math.random() < .25; c.forEach(a => g.onAction(a)); g.held.body = false;
    }
  }; }
};
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 640, "height": 360}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game !== undefined", timeout=60000); time.sleep(1)
    pg.evaluate(BOTS)
    for bot in (sys.argv[3].split(",") if len(sys.argv) > 3 else ["masher", "smart", "human"]):
        wins = 0; rows = []
        t0 = time.time()
        for i in range(N):
            r = pg.evaluate(f"window.__game.simFight({{ level: {LEVEL}, rounds: 2, len: 60, bot: window.__bots.{bot}() }})")
            wins += 1 if r.get("won") else 0
            rows.append(f"{'W' if r.get('won') else 'D' if r.get('draw') else 'L'} {r.get('how')}  you {r['you']['landed']}/{r['you']['thrown']} down {r['you']['downs']}  ai {r['ai']['landed']}/{r['ai']['thrown']} down {r['ai']['downs']}")
        print(f"{bot}: won {wins} of {N} vs level {LEVEL}  ({time.time()-t0:.0f}s)")
        for x in rows: print("   ", x)
    print("errors:", errs[:5])
    b.close()
