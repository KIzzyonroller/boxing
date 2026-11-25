"""Package the Kokoro model and voice vectors as JSON (a type the artifact host serves):
dist/vox/kokoro.N.json = {"part": N, "of": K, "b64": "..."}; dist/vox/<voice>.json likewise."""
import base64, json, os, sys, glob
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); vox = os.path.join(root, "dist", "vox")
model = sys.argv[1]; raw = open(model, "rb").read(); CH = 14_000_000
for f in glob.glob(os.path.join(vox, "kokoro.*")): os.remove(f)
parts = [raw[i:i + CH] for i in range(0, len(raw), CH)]
for i, p in enumerate(parts):
    json.dump({"part": i, "of": len(parts), "bytes": len(raw), "b64": base64.b64encode(p).decode()}, open(os.path.join(vox, f"kokoro.{i}.json"), "w"))
for v in ("bm_lewis", "bm_george"):
    b = os.path.join(vox, v + ".bin"); json.dump({"voice": v, "b64": base64.b64encode(open(b, "rb").read()).decode()}, open(os.path.join(vox, v + ".json"), "w")); os.remove(b)
print(len(parts), "model parts,", len(raw), "bytes")
