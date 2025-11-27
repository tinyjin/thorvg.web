# ThorVG Web Monorepo

This repository has been reorganized into a pnpm workspace monorepo containing multiple packages.

## Packages

### [@thorvg/lottie-player](./packages/lottie-player)

A web Lottie player using ThorVG as a renderer. Provides a custom web component for easily embedding Lottie animations.

**Installation:**
```bash
npm install @thorvg/lottie-player
```

**Key Features:**
- Multiple rendering backends (Software, WebGL, WebGPU)
- Lite variants for smaller bundle sizes
- Custom web component `<lottie-player>`
- Full Lottie specification support

### [@thorvg/canvas-kit](./packages/canvas-kit) *NEW*

A TypeScript Canvas API for ThorVG, providing a Three.js-like OOP interface for vector graphics.

**Installation:**
```bash
npm install @thorvg/canvas-kit
```

**Key Features:**
- Intuitive TypeScript API with full type safety
- Automatic memory management
- Method chaining / fluent API
- Multiple rendering backends (SW, WebGL, WebGPU)
- Full ThorVG feature support (shapes, scenes, gradients, effects)

**Quick Example:**
```typescript
import ThorVG from '@thorvg/canvas-kit';

const TVG = await ThorVG.init();
const canvas = new TVG.Canvas('#canvas', { renderer: 'auto' });

const shape = new TVG.Shape()
  .appendRect(0, 0, 200, 150, { rx: 10 })
  .fill(255, 0, 0, 255)
  .translate(100, 100);

canvas.add(shape).render();
```

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Emscripten SDK (for building WASM)
- Meson build system

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @thorvg/lottie-player build
pnpm --filter @thorvg/canvas-kit build
```

### Workspace Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Clean all packages
pnpm clean

# Run tests
pnpm test

# Lint code
pnpm lint
pnpm lint:fix
```

## Project Structure

```
thorvg.web/
├── packages/
│   ├── lottie-player/     # Lottie player package
│   │   ├── src/           # TypeScript source
│   │   ├── example/       # Usage examples
│   │   ├── dist/          # Build output
│   │   └── package.json
│   └── canvas-kit/        # Canvas API package
│       ├── src/           # TypeScript source
│       ├── example/       # Usage examples
│       ├── dist/          # Build output
│       └── package.json
├── thorvg/                # ThorVG submodule (shared)
├── pnpm-workspace.yaml    # Workspace configuration
└── package.json           # Root package
```

## Building WASM

Each package has its own WASM build scripts:

### Lottie Player
```bash
cd packages/lottie-player
sh ./wasm_setup.sh
```

### Canvas Kit
```bash
cd packages/canvas-kit
sh ./wasm_setup.sh
```

## Migration Notes

If you were using the old monolithic structure:

- **Lottie Player**: The package is now in `packages/lottie-player/`. All functionality remains the same, just the directory structure changed.
- **Canvas Kit**: This is a new package providing a high-level TypeScript API for ThorVG.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Ensure tests pass
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [ThorVG Website](https://thorvg.org)
- [ThorVG GitHub](https://github.com/thorvg/thorvg)
- [Documentation](https://thorvg.org/docs)
- [Discord Community](https://discord.gg/n25xj6J6HM)
