# Code Transformer

Smart pattern-based code transformation for the ThorVG Playground.

## Problem

Users need to see complete, copy-pastable code with imports and initialization, but the playground needs to execute code with pre-loaded modules.

## Solution

Pattern-based transformation that:
1. **Removes** initialization code (imports, init calls, canvas creation)
2. **Preserves** user logic (shapes, rendering, animations)
3. **Works** with any variable names and coding styles

## How It Works

### Before Transformation (What users see)

```typescript
import { init } from '@thorvg/canvas-kit';

const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/canvas-kit/' + path.split('/').pop()
});

const canvas = new TVG.Canvas('#canvas', {
  width: 600,
  height: 600,
  renderer: 'gl'
});

// User's actual code
const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
shape.fill(255, 100, 100, 255);

canvas.add(shape);
canvas.render();
```

### After Transformation (What executes)

```typescript
// User's actual code
const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
shape.fill(255, 100, 100, 255);

canvas.add(shape);
canvas.render();
```

Pre-loaded `TVG` and `canvas` are injected as function parameters.

## Features

### 1. Flexible Variable Names

Works with **any** variable names:

```typescript
// Works with TVG and canvas
const TVG = await init(...);
const canvas = new TVG.Canvas(...);

// Also works with custom names
const thorvg = await init(...);
const ctx = new thorvg.Canvas(...);

// Also works with different styles
let myEngine = await init(...);
var myCanvas = new myEngine.Canvas(...);
```

### 2. Pattern Recognition

Uses regex patterns instead of hardcoded strings:

```typescript
// Removes: import statements
/^import\s+.*?from\s+['"].*?['"];?\s*$/gm

// Removes: await init() calls
/^(const|let|var)\s+\w+\s*=\s*await\s+init\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?\s*$/gm

// Removes: new Canvas() calls
/^(const|let|var)\s+\w+\s*=\s*new\s+\w+\.Canvas\s*\(\s*['"]#?canvas['"],?\s*\{[\s\S]*?\}\s*\)\s*;?\s*$/gm
```

### 3. Preserves Code Structure

- Keeps user logic intact
- Maintains formatting
- Preserves blank lines (cleans up excessive ones)
- Removes explanatory comments but keeps code structure

## Usage

### Basic Transformation

```typescript
import { transformCodeForExecution } from '@/lib/code-transformer';

const userCode = `
import { init } from '@thorvg/canvas-kit';
const TVG = await init({ renderer: 'gl' });
const canvas = new TVG.Canvas('#canvas', { width: 600, height: 600 });

const shape = new TVG.Shape();
canvas.add(shape);
canvas.render();
`;

const executableCode = transformCodeForExecution(userCode);
// Result: only the shape creation and rendering code
```

### Extract Configuration

```typescript
import { extractInitConfig } from '@/lib/code-transformer';

const config = extractInitConfig(userCode);
// { renderer: 'gl', canvasSize: { width: 600, height: 600 } }
```

### Debug Transformation

```typescript
import { debugTransformation } from '@/lib/code-transformer';

const debug = debugTransformation(userCode);
console.log('Original lines:', debug.original.split('\n').length);
console.log('Transformed lines:', debug.transformed.split('\n').length);
console.log('Stripped:', debug.stripped);
console.log('Config:', debug.config);
```

## Integration

In `CanvasPreview.tsx`:

```typescript
const runCode = async () => {
  // Transform: remove init code, keep user logic
  const { transformCodeForExecution } = await import('@/lib/code-transformer');
  const executableCode = transformCodeForExecution(code);

  // Execute with injected context
  const executeFunction = new Function(
    'TVG',      // Pre-loaded
    'canvas',   // Pre-created
    'requestAnimationFrame',
    'performance',
    'console',
    executableCode
  );

  await executeFunction(TVG, canvas, wrappedRAF, performance, console);
};
```

## Test Cases

See `__tests__/code-transformer.test.ts` for comprehensive tests:

✅ Standard pattern with TVG and canvas
✅ Different variable names (thorvg, ctx)
✅ With comments
✅ Multiple imports
✅ No initialization (already injected)

## Benefits

### For Users
- ✅ See complete, working code
- ✅ Copy-paste directly to projects
- ✅ Learn proper initialization patterns

### For Playground
- ✅ Fast execution (no repeated init)
- ✅ Single ThorVG instance
- ✅ Consistent state management
- ✅ Works with any coding style

### For Developers
- ✅ Easy to maintain (pattern-based)
- ✅ Extensible (add new patterns easily)
- ✅ Testable (comprehensive test suite)
- ✅ Debuggable (debug helper included)

## Future Enhancements

Potential improvements:

- [ ] AST-based transformation (more robust)
- [ ] Source maps for error reporting
- [ ] Custom transformation rules per example
- [ ] Syntax validation before execution
- [ ] Auto-detect required injections
