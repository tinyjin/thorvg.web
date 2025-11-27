# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@thorvg/canvas-kit is a TypeScript wrapper around ThorVG's WebAssembly bindings, providing a Three.js-style OOP API for high-performance vector graphics rendering. It supports WebGPU, WebGL, and Software rendering backends.

## Development Commands

### Building
```bash
# Full build (WASM + TypeScript)
npm run build

# Watch mode for development
npm run build:watch

# Clean build artifacts
npm run clean
```

**Important**: Building requires the `EMSDK` environment variable to be set to your Emscripten SDK path. The build process:
1. Runs `wasm_setup.sh` which calls `wasm_build.sh` to compile ThorVG WASM
2. Uses meson + ninja to build with the `wasm_canvaskit` binding
3. Copies `thorvg.wasm` and `thorvg.js` to `dist/`
4. Runs Rollup to bundle TypeScript into ESM, CJS, and UMD formats

### Linting
```bash
# Lint TypeScript files
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Testing
Tests are not yet implemented (`npm test` will fail).

## Architecture

### Module Initialization Flow

1. **ThorVG.init({ renderer })** - Loads WASM module and initializes the engine
   - Sets `globalThis.__ThorVGModule`
   - Calls internal `initEngine()` function with specified renderer (default: 'gl')
   - Returns ready-to-use namespace
2. Create Canvas/Shape/Scene objects - All constructors require the module to be initialized first

**Example:**
```typescript
// Initialize ThorVG with backend
const TVG = await ThorVG.init({
  locateFile: (path) => '../dist/' + path.split('/').pop(),
  renderer: 'wg'
});

// Ready to use
const canvas = new TVG.Canvas('#canvas', { renderer: 'wg' });
```

### Core Classes Hierarchy

```
WasmObject (base for all WASM-backed objects)
├── Paint (base for all renderable objects)
│   ├── Shape (vector paths and primitives)
│   └── Scene (container for multiple paints)
├── Fill (base for gradients)
│   ├── LinearGradient
│   └── RadialGradient
└── Canvas (renderer, not a WasmObject)
```

### Memory Management

- **FinalizationRegistry**: Automatic cleanup when objects go out of scope (see `src/core/Registry.ts`)
- **Manual disposal**: Call `.dispose()` on Paint objects or `.destroy()` on Canvas
- Each WASM-backed class has a `_cleanup()` method that calls the appropriate `_tvg_*_unref()` or deletion function
- The module maintains separate registries for Shape, Scene, Picture, Text, and Gradient objects

### Key Design Patterns

1. **Fluent API**: All setter methods return `this` for method chaining
2. **Module accessor**: `getModule()` from `src/core/Module.ts` retrieves the global WASM module
3. **Pointer management**: WASM pointers are stored in private fields (e.g., `#ptr`) and accessed via getters
4. **Dual getter/setter methods**: Methods like `opacity()` and `visible()` use TypeScript overloads for both getting and setting

### WASM Bindings Location

The TypeScript code wraps C API functions exposed by ThorVG's `wasm_canvaskit` binding. The actual WASM compilation happens in the `thorvg/` submodule (symlinked to `../../thorvg`). The build output is in `thorvg/build_wasm_canvaskit/src/bindings/wasm/`.

### Canvas Rendering Flow

1. Create Canvas with renderer type ('sw', 'gl', 'wg')
2. For 'sw' backend: Canvas creates a buffer and syncs to HTML canvas via `putImageData()`
3. For 'gl'/'wg' backends: Canvas renders directly to WebGL/WebGPU context
4. Call `canvas.render()` to execute draw → sync → update cycle

## TypeScript Configuration

- **Strict mode**: All strict flags enabled (`strict: true`, `noImplicitAny`, `strictNullChecks`, etc.)
- **Target**: ES2020 with WeakRef support for FinalizationRegistry
- **Module**: ESNext with bundler resolution
- **Path alias**: `@/*` maps to `src/*`

## File Structure

- `src/core/` - Core infrastructure (Module, Registry, WasmObject, errors)
- `src/paint/` - Paint hierarchy (Paint base, Shape, Scene)
- `src/canvas/` - Canvas renderer
- `src/fill/` - Gradient fills
- `src/constants.ts` - Enums and type definitions
- `src/types/emscripten.d.ts` - TypeScript definitions for WASM module
- `wasm_build.sh` - Builds ThorVG WASM with meson/ninja
- `wasm_setup.sh` - Wrapper that calls build script and copies output to dist/

## Documentation

- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete API documentation (English)
- **[USAGE.md](./USAGE.md)** - Usage guide with practical examples (English)
- **[API_REFERENCE.ko.md](./API_REFERENCE.ko.md)** - API documentation in Korean
- **[USAGE.ko.md](./USAGE.ko.md)** - Usage guide in Korean

## Common Patterns

### Initialization
```typescript
// Initialize ThorVG
const TVG = await ThorVG.init({
  locateFile: (path) => '../dist/' + path.split('/').pop(),
  renderer: 'wg'
});
```

### Creating and rendering shapes
```typescript
const shape = new TVG.Shape();
shape.appendRect(x, y, w, h, { rx, ry });
shape.fill(r, g, b, a);
canvas.add(shape);
canvas.render();
```

### Using gradients
```typescript
const gradient = new TVG.LinearGradient(x1, y1, x2, y2);
gradient.addStop(offset, [r, g, b, a]);
shape.fill(gradient);
```

### Memory cleanup
```typescript
// Automatic (preferred)
{
  const shape = new TVG.Shape();
  canvas.add(shape);
} // GC + FinalizationRegistry handles cleanup

// Manual (for large objects or immediate cleanup)
shape.dispose();
canvas.destroy();
```

## Backend-Specific Notes

- **Software (sw)**: CPU rendering, works everywhere. Canvas buffer is copied to HTML canvas context.
- **WebGL (gl)**: Hardware accelerated, requires WebGL context. Direct rendering to canvas.
- **WebGPU (wg)**: Best performance, requires modern browser. Async initialization handled internally.

## Rollup Configuration

The package builds three output formats:
- **ESM** (`dist/canvas-kit.esm.js`): For modern bundlers
- **CJS** (`dist/canvas-kit.cjs.js`): For Node.js
- **UMD** (`dist/canvas-kit.js`): For direct browser use

All outputs are minified with terser (console/debugger stripped, 3 compression passes).
