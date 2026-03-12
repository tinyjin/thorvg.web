# @thorvg/webcanvas Preset Guide

`@thorvg/webcanvas` provides engine-specific preset builds to optimize WASM and bundle size for your use case.

| Preset | Import Path | WASM | JS (ESM) | Total |
|---|---|---|---|---|
| Default (all engines) | `@thorvg/webcanvas` | 836K | 123K | 959K |
| Pthread (all engines + threads) | `@thorvg/webcanvas/pthread` | ~1.2M | 123K | ~1.3M |
| Software | `@thorvg/webcanvas/sw` | 614K | 81K | 695K |
| WebGL | `@thorvg/webcanvas/gl` | 613K | 99K | 712K |
| WebGPU | `@thorvg/webcanvas/wg` | 646K | 104K | 750K |
| Software Lite | `@thorvg/webcanvas/sw-lite` | 244K | 80K | 324K |
| WebGL Lite | `@thorvg/webcanvas/gl-lite` | 242K | 98K | 340K |
| WebGPU Lite | `@thorvg/webcanvas/wg-lite` | 278K | 103K | 381K |

---

## 1. Default (All Engines)

The default import includes all three rendering engines (Software, WebGL, WebGPU) and all loaders (SVG, Lottie, PNG, JPG, WebP, TTF). Use this when you need runtime flexibility to switch between renderers.

```typescript
import ThorVG from '@thorvg/webcanvas';

// Select renderer at runtime
const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
  renderer: 'gl', // 'sw' | 'gl' | 'wg'
});

const canvas = new TVG.Canvas('#canvas', { width: 800, height: 600 });

const shape = new TVG.Shape();
shape.appendRect(100, 100, 200, 150, 10)
     .fill(255, 0, 0, 255);

canvas.add(shape).render();
```

### When to use

- Your application supports multiple renderers and lets users choose at runtime.
- You need all image format loaders (SVG, PNG, JPG, WebP, TTF).
- Bundle size is not a primary concern.

---

## 2. Pthread (All Engines + Multi-Threading)

The pthread preset includes all rendering engines and loaders — same as the default — but with **multi-threading support** via Web Workers and SharedArrayBuffer. ThorVG's internal TaskScheduler distributes rendering work across threads for improved performance on complex scenes.

> **ESM only.** This preset uses top-level `await` for WASM thread initialization, so only the ESM bundle is provided.

```typescript
import ThorVG from '@thorvg/webcanvas/pthread';

const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
  renderer: 'gl',
  threadCount: navigator.hardwareConcurrency, // Use all available CPU cores
});

const canvas = new TVG.Canvas('#canvas', { width: 800, height: 600 });

const animation = new TVG.Animation();
await animation.load(lottieJsonString);
canvas.add(animation.picture);

function loop() {
  animation.frame(animation.frame + 1);
  canvas.update().render();
  requestAnimationFrame(loop);
}
loop();
```

### Server Requirements

SharedArrayBuffer requires the following HTTP headers on the page that loads the WASM module:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without these headers, the browser will block SharedArrayBuffer and thread creation will fail.

**Next.js example** (`next.config.mjs`):

```javascript
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    }];
  },
};
```

**Vite example** (`vite.config.ts`):

```typescript
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

### WASM File Serving

The pthread preset generates an additional `thorvg.worker.js` file alongside `thorvg.wasm`. Both must be served from the path returned by `locateFile`:

```
dist/pthread/
  thorvg.wasm        # WASM binary with thread support
  thorvg.worker.js   # Web Worker script for thread pool
```

The `locateFile` callback handles both files automatically:

```typescript
const TVG = await ThorVG.init({
  locateFile: (path) => `/static/wasm/${path}`,
  // resolves: /static/wasm/thorvg.wasm
  // resolves: /static/wasm/thorvg.worker.js
});
```

If using a bundler like webpack, make sure both files are copied to the output directory:

```javascript
// webpack - copy both wasm and worker files
import wasmUrl from '@thorvg/webcanvas/dist/pthread/thorvg.wasm';
import workerUrl from '@thorvg/webcanvas/dist/pthread/thorvg.worker.js';

const TVG = await ThorVG.init({
  locateFile: (path) => {
    if (path.endsWith('.wasm')) return wasmUrl;
    if (path.endsWith('.worker.js')) return workerUrl;
    return path;
  },
});
```

### `threadCount` Option

| Value | Behavior |
|---|---|
| `navigator.hardwareConcurrency` | Use all available CPU cores (recommended) |
| `Math.floor(navigator.hardwareConcurrency / 2)` | Use half of available cores |
| Specific number (e.g., `4`) | Fixed thread count |
| `0` (default) | Single-threaded — same behavior as non-pthread presets |

### When to use

- Your application renders complex vector scenes or many simultaneous Lottie animations.
- You need better rendering throughput on multi-core devices.
- Your server can set COOP/COEP headers for SharedArrayBuffer support.
- Bundle size increase (~40% larger WASM) is acceptable for the performance gain.

---

## 3. Engine-Specific Presets

Engine-specific presets include a single rendering engine with all loaders. The renderer is locked at build time — no need to specify it at runtime.

### Software Renderer (`/sw`)

CPU-based rendering. Works in Web Workers without a canvas element. Best compatibility across all environments.

```typescript
import ThorVG from '@thorvg/webcanvas/sw';

const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
});

// TVG.Canvas is SwCanvas — no renderer option needed
const canvas = new TVG.Canvas('#canvas', { width: 800, height: 600 });

// Software renderer supports getFrameData() for offscreen rendering
const animation = new TVG.Animation();
await animation.load(lottieData);
canvas.add(animation.picture);
canvas.update().render();

const imageData = canvas.getFrameData(); // ImageData for manual compositing
```

### WebGL Renderer (`/gl`)

GPU-accelerated rendering via WebGL 2.0. Recommended for most web applications.

```typescript
import ThorVG from '@thorvg/webcanvas/gl';

const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
});

const canvas = new TVG.Canvas('#canvas', { width: 800, height: 600 });

const picture = new TVG.Picture();
await picture.load(svgString, 'svg');
picture.size(400, 300);

canvas.add(picture).render();
```

### WebGPU Renderer (`/wg`)

Next-generation GPU API. Highest performance, but requires Chrome 113+ or Edge 113+.

```typescript
import ThorVG from '@thorvg/webcanvas/wg';

const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
});

// WebGPU initialization is handled automatically (async device request)
const canvas = new TVG.Canvas('#canvas', { width: 800, height: 600 });

const shape = new TVG.Shape();
shape.appendCircle(400, 300, 100)
     .fill(0, 128, 255, 255);

canvas.add(shape).render();
```

### When to use

- Your application uses a single, known renderer.
- You want smaller WASM size (~26-28% reduction) compared to the default build.
- You still need full loader support (SVG, PNG, JPG, WebP, TTF, Lottie with expressions).

---

## 4. Lite Presets

Lite presets include a single rendering engine with minimal loaders (**Lottie + PNG only**). No SVG, JPG, WebP, TTF loaders. No Lottie expression support. Best for Lottie-focused applications where bundle size is critical.

### Software Lite (`/sw-lite`)

```typescript
import ThorVG from '@thorvg/webcanvas/sw-lite';

const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
});

const canvas = new TVG.Canvas('#canvas', { width: 400, height: 400 });

// Lottie animation — primary use case for lite builds
const animation = new TVG.Animation();
await animation.load(lottieJsonString);
const info = animation.info();

canvas.add(animation.picture);

let start = 0;
function animate(timestamp) {
  if (!start) start = timestamp;
  const elapsed = (timestamp - start) / 1000;
  const frame = (elapsed * info.fps) % info.totalFrame;
  animation.frame(frame);
  canvas.update().render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### WebGL Lite (`/gl-lite`)

```typescript
import ThorVG from '@thorvg/webcanvas/gl-lite';

const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
});

const canvas = new TVG.Canvas('#canvas', { width: 400, height: 400 });

// Load Lottie from a fetched JSON string
const res = await fetch('/animations/loading.json');
const lottieData = await res.text();

const animation = new TVG.Animation();
await animation.load(lottieData);
animation.picture.size(400, 400);

canvas.add(animation.picture);

function loop() {
  animation.frame(animation.frame + 1);
  canvas.update().render();
  requestAnimationFrame(loop);
}
loop();
```

### WebGPU Lite (`/wg-lite`)

```typescript
import ThorVG from '@thorvg/webcanvas/wg-lite';

const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`,
});

const canvas = new TVG.Canvas('#canvas', { width: 400, height: 400 });

const animation = new TVG.Animation();
await animation.load(lottieJsonString);
animation.picture.size(400, 400);

canvas.add(animation.picture);

function loop() {
  animation.frame(animation.frame + 1);
  canvas.update().render();
  requestAnimationFrame(loop);
}
loop();
```

### When to use

- Your application only plays Lottie animations (no SVG, JPG, WebP, or custom fonts).
- Lottie files do not use JavaScript expressions.
- Bundle size is a top priority (~60-66% reduction compared to the default build).
- Ideal for mobile web, embedded widgets, or performance-critical landing pages.

---

## Feature Comparison

| Feature | Default | Pthread | Engine-Specific | Lite |
|---|:---:|:---:|:---:|:---:|
| Software Renderer | O | O | Per preset | Per preset |
| WebGL Renderer | O | O | Per preset | Per preset |
| WebGPU Renderer | O | O | Per preset | Per preset |
| Runtime renderer selection | O | O | X | X |
| Multi-threading | X | O | X | X |
| Lottie loader | O | O | O | O |
| PNG loader | O | O | O | O |
| SVG loader | O | O | O | X |
| JPG loader | O | O | O | X |
| WebP loader | O | O | O | X |
| TTF font loader | O | O | O | X |
| Lottie expressions | O | O | O | X |
| GIF saver | O | O | O | X |
| ESM / CJS / UMD | O | ESM only | O | O |

---

## WASM File Location

All presets require a `thorvg.wasm` file to be served alongside the JavaScript bundle. Use the `locateFile` option to specify where the WASM file is hosted.

```typescript
// CDN
const TVG = await ThorVG.init({
  locateFile: (path) => `https://cdn.example.com/wasm/${path}`,
});

// Relative path
const TVG = await ThorVG.init({
  locateFile: (path) => `/static/wasm/${path}`,
});

// Bundler (e.g., webpack file-loader)
import wasmUrl from '@thorvg/webcanvas/dist/gl/thorvg.wasm';

const TVG = await ThorVG.init({
  locateFile: () => wasmUrl,
});
```

Each preset has its own `thorvg.wasm` in the corresponding `dist/` subdirectory:

```
@thorvg/webcanvas/
  dist/
    thorvg.wasm                # Default (836K)
    pthread/thorvg.wasm        # Pthread (~1.2M)
    pthread/thorvg.worker.js   # Pthread worker script
    sw/thorvg.wasm             # SW only (614K)
    gl/thorvg.wasm             # GL only (613K)
    wg/thorvg.wasm             # WG only (646K)
    sw-lite/thorvg.wasm        # SW lite (244K)
    gl-lite/thorvg.wasm        # GL lite (242K)
    wg-lite/thorvg.wasm        # WG lite (278K)
```
