# @thorvg/canvas-kit

A high-performance TypeScript Canvas API for ThorVG, providing a Three.js-like OOP interface for vector graphics rendering using WebAssembly.

## Features

- 🎨 **Intuitive OOP API** - Three.js-style fluent interface
- 🔒 **Type-Safe** - Full TypeScript support with strict typing
- 🚀 **High Performance** - WebGPU, WebGL, and Software rendering backends
- 🧹 **Automatic Memory Management** - FinalizationRegistry for cleanup
- ⚡ **Method Chaining** - Ergonomic fluent API design
- 🎯 **Zero Overhead** - Direct WASM bindings with no performance penalty

## Installation

```bash
npm install @thorvg/canvas-kit
# or
pnpm add @thorvg/canvas-kit
# or
yarn add @thorvg/canvas-kit
```

## Quick Start

```typescript
import ThorVG from '@thorvg/canvas-kit';

// Step 1: Load WASM module
const tvg = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`
});

// Step 2: Initialize engine (especially important for WebGPU)
await tvg.ThorVGInit('sw'); // 'sw' | 'gl' | 'wg'

// Step 3: Create canvas
const canvas = new tvg.Canvas('#myCanvas', {
  backend: 'sw',
  width: 800,
  height: 600
});

// Step 4: Draw shapes with fluent API
const rect = new tvg.Shape();
rect.appendRect(100, 100, 200, 150, { rx: 10, ry: 10 });
rect.fill(255, 0, 0, 255);

const circle = new tvg.Shape();
circle.appendCircle(500, 200, 80, 80);
circle.fill(0, 100, 255, 255);
circle.stroke({ width: 5, color: [0, 0, 0, 255] });

// Step 5: Add to canvas and render
canvas.add(rect, circle);
canvas.render();
```

> **Important**: Always call `ThorVGInit()` before creating canvases. For WebGPU backend, this handles async initialization. For SW/GL backends, it's a no-op but still recommended.

## Advanced Usage

### Gradients

```typescript
const gradient = new tvg.LinearGradient(0, 0, 200, 0);
gradient.addStop(0, [255, 0, 0, 255]);
gradient.addStop(0.5, [255, 255, 0, 255]);
gradient.addStop(1, [0, 0, 255, 255]);
gradient.spread('pad');

const shape = new tvg.Shape();
shape.appendRect(0, 0, 200, 100);
shape.fill(gradient);
```

### Scene Composition

```typescript
const scene = new tvg.Scene();
scene.translate(50, 50);
scene.rotate(45);
scene.opacity(0.8);

scene.add(shape1, shape2, shape3);
canvas.add(scene);
canvas.render();
```

### Memory Management

```typescript
// Automatic cleanup when objects go out of scope
{
  const shape = new tvg.Shape();
  canvas.add(shape);
} // shape's WASM memory freed by FinalizationRegistry

// Explicit cleanup (recommended for large objects)
shape.dispose();

// Canvas lifecycle
canvas.clear();    // Clear all paints from canvas
canvas.render();   // Re-render after clearing
tvg.term();        // Terminate WASM module completely
```

## API Reference

### ThorVG Initialization

- `ThorVG.init(options?)` - Load the WASM module
- `tvg.ThorVGInit(engineType?)` - Initialize engine ('sw' | 'gl' | 'wg')
  - For WebGPU: Handles async initialization, waits until ready
  - For SW/GL: No-op but recommended to call for consistency
- `tvg.term()` - Terminate the WASM module

### Canvas

- `new tvg.Canvas(selector, options)` - Create a canvas
- `canvas.add(...paints)` - Add paints to canvas
- `canvas.remove(paint?)` - Remove paint (or all if no argument)
- `canvas.clear()` - Clear all paints
- `canvas.render()` - Update and render the canvas

### Shape

- `new tvg.Shape()` - Create a shape
- `shape.moveTo(x, y)` - Move to point
- `shape.lineTo(x, y)` - Line to point
- `shape.cubicTo(cx1, cy1, cx2, cy2, x, y)` - Cubic bezier curve
- `shape.close()` - Close path
- `shape.appendRect(x, y, w, h, options?)` - Add rectangle
  - Options: `{ rx?, ry?, clockwise? }`
- `shape.appendCircle(cx, cy, rx, ry?, clockwise?)` - Add circle/ellipse
- `shape.fill(r, g, b, a?)` - Set fill color
- `shape.fill(gradient)` - Set fill gradient
- `shape.stroke(width)` - Set stroke width
- `shape.stroke(options)` - Set full stroke options
  - Options: `{ width?, color?, gradient?, cap?, join?, miterLimit? }`

### Scene

- `new tvg.Scene()` - Create a scene
- `scene.add(...paints)` - Add paints to scene
- `scene.remove(paint?)` - Remove paint (or all if no argument)
- `scene.clear()` - Clear all paints

### Paint (Base for Shape/Scene)

- `paint.translate(x, y)` - Translate
- `paint.rotate(angle)` - Rotate (degrees)
- `paint.scale(sx, sy?)` - Scale
- `paint.opacity(value?)` - Get/set opacity (0-1)
- `paint.visible(value?)` - Get/set visibility
- `paint.bounds()` - Get bounding box
- `paint.duplicate()` - Duplicate paint
- `paint.dispose()` - Free memory

### Gradients

- `new tvg.LinearGradient(x1, y1, x2, y2)` - Linear gradient
- `new tvg.RadialGradient(cx, cy, r)` - Radial gradient
- `gradient.addStop(offset, color)` - Add color stop (color as `[r, g, b, a]`)
- `gradient.spread(type)` - Set spread method (`'pad'` | `'reflect'` | `'repeat'`)

## Renderers

- **WebGPU (wg)**: Best performance, modern browsers only
- **WebGL (gl)**: Good performance, wide browser support
- **Software (sw)**: CPU rendering, works everywhere
- **Auto**: Automatically selects best available renderer

## Browser Support

- Chrome/Edge: All renderers
- Firefox: WebGL and Software
- Safari: WebGL and Software

## License

MIT License - see LICENSE file for details.

## Links

- [ThorVG Website](https://thorvg.org)
- [GitHub Repository](https://github.com/thorvg/thorvg.web)
- [Documentation](https://thorvg.org/docs)
