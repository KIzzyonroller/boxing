"""Inject assets/boxer.glb into game/index.template.html.
dist/index.html loads three.js from the CDN (what gets published);
test.html loads it from node_modules so headless tests run offline."""
import base64, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, "game", "index.template.html"), encoding="utf-8").read()
glb = base64.b64encode(open(os.path.join(root, "assets", "boxer.glb"), "rb").read()).decode()
page = src.replace("__GLB__", glb)
os.makedirs(os.path.join(root, "dist"), exist_ok=True)
open(os.path.join(root, "dist", "index.html"), "w", encoding="utf-8").write(page)
test = page.replace("https://cdn.jsdelivr.net/npm/three@0.160.0/", "/node_modules/three/")
open(os.path.join(root, "test.html"), "w", encoding="utf-8").write(test)
print("built dist/index.html,", len(page), "bytes")
