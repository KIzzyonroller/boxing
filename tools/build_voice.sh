#!/bin/sh
# Builds the announcer voice files that sit next to dist/index.html:
#   dist/voxworker.js           Kokoro text-to-speech worker (phonemizer + ONNX Runtime Web)
#   dist/vox/kokoro.N.json      Kokoro-82M v1.0 int8 model as base64 JSON parts (the host serves JSON, not raw .onnx; each under 20 MiB)
#   dist/vox/bm_lewis.json, bm_george.json   voice style vectors (Lewis is the voice Jarvis uses)
#   dist/vox/ort-wasm-simd-threaded.{mjs,wasm}
set -e
cd "$(dirname "$0")/../voice"
[ -d node_modules ] || npm i --ignore-scripts --no-save kokoro-js@1.2.1 phonemizer@1.2.1 onnxruntime-web@1.31.1 esbuild >/dev/null
[ -x node_modules/.bin/esbuild ] || node node_modules/esbuild/install.js
node_modules/.bin/esbuild voxworker.src.js --bundle --format=esm --minify --loader:.json=json --outfile=../dist/voxworker.js --log-level=warning
mkdir -p ../dist/vox
cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm ../dist/vox/
[ -f ../dist/vox/bm_lewis.json ] || cp node_modules/kokoro-js/voices/bm_lewis.bin node_modules/kokoro-js/voices/bm_george.bin ../dist/vox/
if [ ! -f ../dist/vox/kokoro.0.json ]; then
  curl -sSL -o /tmp/kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
  python3 ../tools/pack_voice.py /tmp/kokoro.onnx && rm /tmp/kokoro.onnx
fi
echo "voice files built"
