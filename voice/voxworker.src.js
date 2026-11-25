// Announcer voice worker: Kokoro-82M (the voice Jarvis uses, bm_lewis) running on ONNX Runtime Web.
import * as ort from 'onnxruntime-web/wasm';
import { kokoroPhonemize } from './normalize.js';
import VOCAB from './vocab.json';

const base = new URL('./', self.location.href).href;
let session = null, styles = {}, ready = null;

function b64bytes(s) {
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s);
  const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
async function fetchAll(urls, onProgress) {
  const parts = []; let got = 0;
  let cache = null; try { cache = await caches.open('boxing-vox-v2'); } catch (e) { }
  for (const u of urls) {
    let r = null; try { r = cache && await cache.match(base + u); } catch (e) { }
    if (!r) { r = await fetch(base + u); if (!r.ok) throw new Error(u + ' ' + r.status); try { cache && await cache.put(base + u, r.clone()); } catch (e) { } }
    const b = b64bytes((await r.json()).b64); got += b.length; parts.push(b); onProgress && onProgress(got);
  }
  const out = new Uint8Array(got); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
async function init(cfg) {
  ort.env.wasm.wasmPaths = { mjs: base + 'vox/ort-wasm-simd-threaded.mjs', wasm: base + 'vox/ort-wasm-simd-threaded.wasm' };
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
  const model = await fetchAll(cfg.model, n => postMessage({ type: 'progress', loaded: n, total: cfg.bytes }));
  session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  for (const [name, file] of Object.entries(cfg.voices)) styles[name] = new Float32Array((await fetchAll([file])).buffer);
}
async function speak(text, voice, speed) {
  const ph = await kokoroPhonemize(text, voice[0]);
  const ids = [0]; for (const ch of ph) { const id = VOCAB[ch]; if (id !== undefined) ids.push(id); if (ids.length > 510) break; } ids.push(0);
  const st = styles[voice], n = Math.min(ids.length - 2, 509);
  const feeds = {
    tokens: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    style: new ort.Tensor('float32', st.slice(n * 256, n * 256 + 256), [1, 256]),
    speed: new ort.Tensor('float32', new Float32Array([speed]), [1])
  };
  const out = await session.run(feeds);
  return out.audio.data;
}
let chain = Promise.resolve();
onmessage = e => {
  const m = e.data;
  if (m.type === 'init') { ready = init(m.cfg).then(() => postMessage({ type: 'ready' }), err => postMessage({ type: 'error', error: String(err && err.message || err) })); return; }
  if (m.type === 'speak') chain = chain.then(async () => {
    try { await ready; const t0 = performance.now(); const pcm = await speak(m.text, m.voice, m.speed); postMessage({ type: 'audio', id: m.id, pcm, ms: performance.now() - t0 }, [pcm.buffer]); }
    catch (err) { postMessage({ type: 'audio', id: m.id, error: String(err && err.message || err) }); }
  });
};
