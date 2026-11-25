"""Walk the menus, settings, tutorial, career trophies, quick fight + pause, slots and persistence in headless Chromium."""
import sys, time, json
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/test.html"
S = sys.argv[1] if len(sys.argv) > 1 else "shots"
errors = []
def shot(pg, n): pg.screenshot(path=f"{S}/m_{n}.png")
def ev(pg, js): return pg.evaluate(js)
def wait(pg, js, t=60000): pg.wait_for_function(js, timeout=t)

with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto(URL); wait(pg, "window.__game !== undefined"); time.sleep(1.5)
    print("start mode:", ev(pg, "window.__game.MODE")); shot(pg, "01_menu")

    # settings: rebind jab to F, broadcast camera, audio tab
    pg.click("#mSet"); time.sleep(.3)
    pg.click("[data-bind='jab']"); time.sleep(.2); pg.keyboard.press("KeyF"); time.sleep(.3)
    print("jab bound to:", ev(pg, "window.__game.SET.keys.jab")); shot(pg, "02_controls")
    pg.click("[data-tab='camera']"); pg.locator("[data-set='cam.view']").nth(1).click(); time.sleep(.2)
    pg.click("[data-tab='audio']"); time.sleep(.3); shot(pg, "03_audio")
    pg.click("[data-tab='camera']"); pg.locator("[data-set='cam.view']").nth(0).click()
    pg.click("#sBack"); time.sleep(.4)

    # tutorial
    pg.click("#mTut"); time.sleep(2); shot(pg, "04_tut_move")
    pg.keyboard.down("KeyD"); wait(pg, "window.__game.TUT.i >= 1", 90000); pg.keyboard.up("KeyD"); print("move step done")
    def presses(key, step, n=8, gap=.7):
        for _ in range(n):
            if ev(pg, f"window.__game.TUT.i > {step}"): return True
            pg.keyboard.press(key); time.sleep(gap)
        return ev(pg, f"window.__game.TUT.i > {step}")
    time.sleep(1.2); shot(pg, "05_tut_jab")
    print("jab:", presses("KeyF", 1)); time.sleep(1)
    print("cross:", presses("KeyK", 2)); time.sleep(1)
    ok = False
    for _ in range(6):
        if ev(pg, "window.__game.TUT.i > 3"): ok = True; break
        pg.keyboard.press("KeyF"); time.sleep(.15); pg.keyboard.press("KeyK"); time.sleep(1.1)
    print("one-two:", ok or ev(pg, "window.__game.TUT.i > 3")); time.sleep(1)
    print("hook:", presses("KeyU", 4)); time.sleep(1)
    print("upper:", presses("KeyI", 5)); time.sleep(1)
    ok = False
    pg.keyboard.down("ShiftLeft")
    for _ in range(6):
        if ev(pg, "window.__game.TUT.i > 6"): ok = True; break
        pg.keyboard.press("KeyF"); time.sleep(.8)
    pg.keyboard.up("ShiftLeft"); print("body:", ok or ev(pg, "window.__game.TUT.i > 6")); time.sleep(1)
    pg.keyboard.down("Space"); time.sleep(3); shot(pg, "06_tut_block")
    try: wait(pg, "window.__game.TUT.i > 7", 60000); print("block: True")
    except Exception: print("block: False", ev(pg, "window.__game.TUT.n"))
    pg.keyboard.up("Space"); time.sleep(1)
    # slipping needs timing: watch the trainer's jab and slip as it starts
    slipped = False; t0 = time.time()
    while time.time() - t0 < 60 and not slipped:
        if ev(pg, "window.__game.TUT.fireIn != null"):
            time.sleep(.05); pg.keyboard.press("KeyQ"); time.sleep(1.2)
        slipped = ev(pg, "window.__game.TUT.i > 8"); time.sleep(.03)
    print("slip:", slipped)
    if not slipped: pg.click("#cSkip")
    time.sleep(1.2); shot(pg, "07_tut_info"); pg.click("#cNext"); time.sleep(.5); shot(pg, "08_tut_done")
    print("tutDone:", ev(pg, "window.__game.SAVE.tutDone"))
    pg.click("#cMenu"); time.sleep(1)

    # career: create, records, force a fight night, KO win -> trophies
    pg.click("#mNew"); time.sleep(.6); pg.fill("#fName", "Kizzy Torres"); pg.click("#saveF"); time.sleep(1.5)
    shot(pg, "09_hub"); pg.click("#recBtn"); time.sleep(.4); shot(pg, "10_records"); pg.click("#rcBack"); time.sleep(.3)
    ev(pg, "(()=>{window.__game.PR.fightIn=0;})()"); ev(pg, "window.__game.toHub()"); time.sleep(.5)
    pg.click("#fightBtn"); time.sleep(.4); pg.click("#walkBtn"); time.sleep(2.5)
    pg.keyboard.press("Escape"); time.sleep(.6); shot(pg, "11_pause")
    print("paused:", ev(pg, "window.__game.G.paused"))
    pg.click("#pzSet"); time.sleep(.3); pg.click("#sBack"); time.sleep(.3); pg.click("#pzResume"); time.sleep(.5)
    print("resumed:", not ev(pg, "window.__game.G.paused"))
    ev(pg, "(()=>{const g=window.__game; g.O.head=1; g.knockdown(g.O,g.P); g.O.down.getUp=99;})()")
    wait(pg, "!document.getElementById('over').classList.contains('hidden')", 120000); time.sleep(.4)
    shot(pg, "12_result"); print("result:", pg.text_content("#over")[:420])
    pg.click("#homeBtn"); time.sleep(1); pg.click("#troBtn"); time.sleep(2.5); shot(pg, "13_trophies")
    print("trophies:", ev(pg, "Object.keys(window.__game.PR.trophies)"))
    pg.click("#trBack"); time.sleep(.5); pg.click("#recBtn"); time.sleep(.3); shot(pg, "14_records_after"); pg.click("#rcBack")
    pg.click("#menuBtn"); time.sleep(.8)

    # quick fight: Legend, 6 rounds, 1:00, leave via pause
    pg.click("#mQuick"); time.sleep(.5)
    pg.locator("[data-q='diff'][data-v='3']").click(); pg.locator("[data-q='rounds'][data-v='6']").click(); pg.locator("[data-q='len'][data-v='60']").click()
    shot(pg, "15_quick"); pg.click("#qGo"); time.sleep(2.5)
    print("quick cfg:", ev(pg, "({rounds: window.__game.G.rounds, len: window.__game.G.roundLen, opp: window.__game.O.name})"))
    shot(pg, "16_quick_fight")
    pg.click("#pauseBtn"); time.sleep(.4); pg.click("#pzQuit"); time.sleep(.2); pg.click("#pzYes")
    wait(pg, "!document.getElementById('over').classList.contains('hidden')", 60000); time.sleep(.3)
    print("quick record:", ev(pg, "window.__game.SAVE.qf")); pg.click("#homeBtn"); time.sleep(.6)

    # slots: new career in slot 2, cancel; delete-confirm flow on slot 1, then keep
    pg.click("#mSlots"); time.sleep(.4); shot(pg, "17_slots")
    pg.locator("[data-new='1']").click(); time.sleep(.5); pg.click("#cancelF"); time.sleep(.4)
    print("back on slots:", pg.is_visible("#slots"))
    pg.locator("[data-ask='0']").click(); time.sleep(.2); shot(pg, "18_slot_delete_confirm"); pg.locator("[data-keep]").click()
    pg.click("#slBack"); time.sleep(.5)

    # persistence
    pg.reload(); wait(pg, "window.__game !== undefined"); time.sleep(1.2)
    print("after reload:", ev(pg, "({jab: window.__game.SET.keys.jab, slots: window.__game.SAVE.slots.map(s=>s&&s.name), qf: window.__game.SAVE.qf, tut: window.__game.SAVE.tutDone, trophies: Object.keys(window.__game.PR.trophies)})"))
    shot(pg, "19_menu_after")

    m = b.new_page(viewport={"width": 390, "height": 760}, has_touch=True, is_mobile=True)
    m.goto(URL); wait(m, "window.__game !== undefined"); time.sleep(2); m.screenshot(path=f"{S}/m_20_mobile_menu.png")
    b.close()
print("ERRORS:", json.dumps(errors[:15], indent=1))
