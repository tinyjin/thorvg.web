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

// Initialize ThorVG
const TVG = await ThorVG.init({
  locateFile: (path) => `/wasm/${path}`
});

// Create canvas with auto-detected best renderer
const canvas = new TVG.Canvas('#myCanvas', {
  renderer: 'auto', // 'sw' | 'gl' | 'wg' | 'auto'
  width: 800,
  height: 600
});

// Draw shapes with fluent API
const rect = new TVG.Shape()
  .appendRect(0, 0, 200, 150, { rx: 10, ry: 10 })
  .fill(255, 0, 0, 255)
  .translate(100, 100);

const circle = new TVG.Shape()
  .appendCircle(0, 0, 80, 80)
  .fill(0, 100, 255, 255)
  .stroke({ width: 5, color: [0, 0, 0, 255] })
  .translate(500, 200);

// Add to canvas and render
canvas.add(rect, circle).render();
```

## Advanced Usage

### Gradients

```typescript
const gradient = new TVG.LinearGradient(0, 0, 200, 0)
  .addStop(0, [255, 0, 0, 255])
  .addStop(0.5, [255, 255, 0, 255])
  .addStop(1, [0, 0, 255, 255])
  .spread('pad');

const shape = new TVG.Shape()
  .appendRect(0, 0, 200, 100)
  .fill(gradient);
```

### Scene Composition

```typescript
const scene = new TVG.Scene()
  .translate(50, 50)
  .rotate(45)
  .opacity(0.8);

scene.add(shape1, shape2, shape3);
canvas.add(scene);
```

### Memory Management

```typescript
// Automatic cleanup when objects go out of scope
{
  const shape = new TVG.Shape();
  canvas.add(shape);
} // shape's WASM memory freed by FinalizationRegistry

// Explicit cleanup (recommended for large objects)
shape.dispose();

// Canvas lifecycle
canvas.destroy();  // Free canvas memory, module stays alive
TVG.term();        // Terminate WASM module completely
```

## API Reference

### ThorVG Initialization

- `ThorVG.init(options?)` - Initialize the WASM module
- `TVG.term()` - Terminate the WASM module

### Canvas

- `new TVG.Canvas(selector, options)` - Create a canvas
- `canvas.add(...paints)` - Add paints to canvas
- `canvas.remove(paint?)` - Remove paint(s)
- `canvas.clear()` - Clear all paints
- `canvas.render()` - Render the canvas
- `canvas.resize(width, height)` - Resize canvas
- `canvas.destroy()` - Destroy canvas and free memory

### Shape

- `new TVG.Shape()` - Create a shape
- `shape.moveTo(x, y)` - Move to point
- `shape.lineTo(x, y)` - Line to point
- `shape.cubicTo(...)` - Cubic bezier curve
- `shape.close()` - Close path
- `shape.appendRect(x, y, w, h, options?)` - Add rectangle
- `shape.appendCircle(cx, cy, rx, ry?)` - Add circle/ellipse
- `shape.fill(color | gradient)` - Set fill
- `shape.stroke(width | options)` - Set stroke

### Scene

- `new TVG.Scene()` - Create a scene
- `scene.add(...paints)` - Add paints to scene
- `scene.remove(paint?)` - Remove paint(s)
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

- `new TVG.LinearGradient(x1, y1, x2, y2)` - Linear gradient
- `new TVG.RadialGradient(cx, cy, r, fx?, fy?, fr?)` - Radial gradient
- `gradient.addStop(offset, color)` - Add color stop
- `gradient.spread(type)` - Set spread method ('pad' | 'reflect' | 'repeat')

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
