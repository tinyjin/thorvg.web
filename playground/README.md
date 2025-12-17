# ThorVG Playground

Interactive playground for exploring ThorVG Canvas Kit examples with real-time code editing and preview.

## Features

- 📦 **Showcase Gallery**: Browse through curated examples organized by category
- 🎨 **Live Preview**: See your code changes rendered in real-time on canvas
- 💻 **Monaco Editor**: Full-featured code editor with syntax highlighting
- 📋 **Copy-Paste Ready**: All examples include complete, working code with imports
- 🔄 **Auto-run Mode**: Automatically execute code as you type
- 🎯 **Multiple Categories**: Basic shapes, gradients, transforms, animations, text, and media
- ⚡ **Pre-loaded Runtime**: ThorVG is initialized once, code executes instantly

## How It Works

The playground uses a clever approach to balance developer experience and runtime performance:

1. **Editor Shows Full Code**: Examples display complete code including `import` statements and initialization - exactly what you'd use in a real project
2. **Runtime Pre-loads ThorVG**: The Canvas Kit is imported and initialized once when the page loads
3. **Execution Strips Imports**: When running code, import statements are removed and the pre-loaded `TVG` and `canvas` instances are injected
4. **Instant Execution**: Your code runs immediately using the already-initialized ThorVG runtime

This means you can copy examples directly to your projects while enjoying instant feedback in the playground!

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager
- ThorVG Canvas Kit built in `../packages/canvas-kit`

### Installation

1. **Install dependencies:**

   ```bash
   cd playground
   yarn install
   ```

   This automatically links to the local `@thorvg/canvas-kit` package.

2. **Copy Canvas Kit WASM files:**

   ```bash
   yarn setup
   ```

   This copies the WASM files from `../packages/canvas-kit/dist/` to `public/canvas-kit/`.

   > **Note:** If canvas-kit hasn't been built yet:
   > ```bash
   > cd ../packages/canvas-kit
   > pnpm install && pnpm build
   > cd ../../playground
   > yarn setup
   > ```

3. **Start the development server:**

   ```bash
   yarn dev
   ```

4. **Open your browser:**

   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
playground/
├── app/                        # Next.js app directory
│   ├── page.tsx               # Main page (showcase grid)
│   ├── layout.tsx             # Root layout
│   └── showcase/[id]/         # Dynamic showcase pages
│       └── page.tsx           # Individual example viewer
├── components/                 # React components
│   ├── CodeEditor.tsx         # Monaco-based code editor
│   └── CanvasPreview.tsx      # Canvas preview with ThorVG integration
├── lib/                        # Library code
│   ├── examples/              # All showcase examples
│   │   ├── types.ts           # TypeScript definitions
│   │   ├── basic-shapes.ts    # Basic shapes example
│   │   ├── gradients.ts       # Gradients example
│   │   ├── transform-*.ts     # Transform examples
│   │   ├── text-*.ts          # Text examples
│   │   ├── picture-svg.ts     # SVG picture example
│   │   ├── lottie-animation.ts # Lottie example
│   │   └── index.ts           # Exports all examples
│   └── useThorVG.ts           # ThorVG React hook (optional)
├── public/                     # Static files
│   └── canvas-kit/            # Canvas Kit WASM files (copied via setup)
├── types/                      # TypeScript type definitions
│   └── thorvg.d.ts            # ThorVG module types
└── README.md                   # This file
```

## Usage

### Main Page (Grid View)

Browse all available examples organized by category:
- **Basic**: Fundamental shapes, gradients, transforms
- **Animation**: Animated graphics using requestAnimationFrame
- **Text**: Text rendering with fonts and effects
- **Media**: SVG, images, and Lottie animations

Click any tile to view the full code and live preview.

### Showcase Detail Page

The detail page has a split-panel layout:

**Left Panel - Canvas Preview:**
- Live rendering of your code
- Zoom control (50%-200%)
- Grid overlay toggle
- Dark canvas mode
- Clear and Run buttons

**Right Panel - Code Editor:**
- Monaco editor with TypeScript support
- Syntax highlighting
- Auto-completion
- Line numbers

**Controls:**
- **Auto Run**: Automatically execute code when you type
- **Reset**: Restore original example code
- **Copy Code**: Copy the complete code to clipboard

**Navigation:**
- Previous/Next buttons to browse examples

## Adding New Examples

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions.

Quick version:

1. Create `lib/examples/my-example.ts`:

```typescript
import { ShowcaseExample } from './types';

export const myExample: ShowcaseExample = {
  id: 'my-example',
  title: 'My Example',
  description: 'What this demonstrates',
  category: 'basic',
  code: `import { init } from '@thorvg/canvas-kit';

const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/canvas-kit/' + path.split('/').pop()
});

const canvas = new TVG.Canvas('#canvas', {
  width: 600,
  height: 600,
  renderer: 'gl'
});

// Your code here
const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
shape.fill(255, 100, 100, 255);

canvas.add(shape);
canvas.render();
`
};
```

2. Export it in `lib/examples/index.ts`:

```typescript
import { myExample } from './my-example';

export const showcaseExamples: ShowcaseExample[] = [
  // ... existing examples
  myExample,
];
```

Your example will automatically appear in the grid!

## Technical Details

### Import Stripping

The `CanvasPreview` component strips import/export statements before execution:

```typescript
const executableCode = code
  .split('\n')
  .filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('import ') &&
           !trimmed.startsWith('export ');
  })
  .join('\n');
```

### Context Injection

Pre-loaded modules are injected into the execution context:

```typescript
const executeFunction = new Function(
  'TVG',           // Pre-initialized ThorVG instance
  'canvas',        // Pre-created canvas instance
  'requestAnimationFrame',  // Wrapped RAF for cleanup
  'performance',   // For timing
  'console',       // For debugging
  executableCode
);

await executeFunction(TVG, canvas, wrappedRAF, performance, console);
```

This allows user code to work as-is without modifications!

## Available Scripts

- `yarn dev` - Start development server (port 3001)
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn setup` - Copy Canvas Kit files to public directory

## Technologies Used

- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type-safe development
- **Monaco Editor**: VS Code's editor in the browser
- **Tailwind CSS**: Utility-first CSS framework
- **ThorVG Canvas Kit**: High-performance vector graphics (local package)

## Notes

- Standalone project using Yarn (not part of pnpm workspace)
- Runs on port 3001 by default
- Links to local `@thorvg/canvas-kit` package via `file:../packages/canvas-kit`
- WASM files must be in `public/canvas-kit/` for runtime loading

## Troubleshooting

### Canvas Kit not found

Run the setup script:
```bash
yarn setup
```

### Build the canvas-kit first

If canvas-kit isn't built:
```bash
cd ../packages/canvas-kit
pnpm build
cd ../../playground
yarn setup
```

### Port already in use

Change the port in `package.json` or:
```bash
yarn dev -- -p 3002
```

## License

This playground is part of the ThorVG project. See the main project for license information.
