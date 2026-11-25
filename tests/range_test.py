import time, json
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":960,"height":540})
    pg.goto("http://127.0.0.1:8765/test.html"); pg.wait_for_function("window.__game!==undefined", timeout=60000)
    pg.click("#goBtn"); time.sleep(1); pg.evaluate("window.__noAI=true")
    res={}
    for key,name,body in [("KeyU","hook",False),("KeyU","hook-body",True)]:
        row=[]
        for d in [0.7,0.8,0.9,1.0,1.1,1.2]:
            pg.evaluate(f"""()=>{{const g=window.__game; const V=g.P.pos.constructor;
              g.P.reset(new V(0,0,0),0); g.O.reset(new V(0,0,{d}),Math.PI); g.P.stam=100; g.O.head=100; g.O.body=100;}}""")
            time.sleep(0.5)
            if body: pg.keyboard.down("ShiftLeft")
            pg.keyboard.press(key)
            if body: pg.keyboard.up("ShiftLeft")
            time.sleep(1.3)
            r=pg.evaluate("()=>{const g=window.__game; return [g.P.st.landed, +(100-g.O.head).toFixed(1), +(100-g.O.body).toFixed(1), +g.P.pos.distanceTo(g.O.pos).toFixed(2), g.O.down?1:0]}")
            row.append((d,r[0]>0,r[1],r[2],r[3]))
        res[name]=row
    for k,v in res.items(): print(k.ljust(11), "  ".join(f"{d}:{'HIT' if h else 'miss'}({hd or bd})" for d,h,hd,bd,_,_ in [(*x,0) for x in v]))
    pg.evaluate("window.__noAI=false")
    b.close()
