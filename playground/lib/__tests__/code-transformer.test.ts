/**
 * Tests for code transformer
 * Run with: node --loader ts-node/esm code-transformer.test.ts
 */

import { transformCodeForExecution, extractInitConfig } from '../code-transformer';

// Test cases with different variable names and patterns
const testCases = [
  {
    name: 'Standard pattern with TVG and canvas',
    input: `import { init } from '@thorvg/canvas-kit';

const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/canvas-kit/' + path.split('/').pop()
});

const canvas = new TVG.Canvas('#canvas', {
  width: 600,
  height: 600,
  renderer: 'gl'
});

const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
shape.fill(255, 100, 100, 255);

canvas.add(shape);
canvas.render();`,
    expected: `const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
shape.fill(255, 100, 100, 255);

canvas.add(shape);
canvas.render();`,
  },

  {
    name: 'Different variable names (thorvg, ctx)',
    input: `import { init } from '@thorvg/canvas-kit';

const thorvg = await init({
  renderer: 'wg',
  locateFile: (path) => '/wasm/' + path
});

const ctx = new thorvg.Canvas('#canvas', {
  width: 800,
  height: 800,
  renderer: 'wg'
});

const rect = new thorvg.Shape();
rect.appendRect(100, 100, 200, 200);
ctx.add(rect);
ctx.render();`,
    expected: `const rect = new thorvg.Shape();
rect.appendRect(100, 100, 200, 200);
ctx.add(rect);
ctx.render();`,
  },

  {
    name: 'With comments',
    input: `import { init } from '@thorvg/canvas-kit';

// Initialize the library
const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/canvas-kit/' + path.split('/').pop()
});

// Create canvas
const canvas = new TVG.Canvas('#canvas', {
  width: 600,
  height: 600,
  renderer: 'gl'
});

// Draw a circle
const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
canvas.add(shape);
canvas.render();`,
    expected: `const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
canvas.add(shape);
canvas.render();`,
  },

  {
    name: 'Multiple imports',
    input: `import { init } from '@thorvg/canvas-kit';
import { someHelper } from './utils';

const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/canvas-kit/' + path.split('/').pop()
});

const canvas = new TVG.Canvas('#canvas', {
  width: 600,
  height: 600,
  renderer: 'gl'
});

const shape = new TVG.Shape();
canvas.add(shape);
canvas.render();`,
    expected: `const shape = new TVG.Shape();
canvas.add(shape);
canvas.render();`,
  },

  {
    name: 'No initialization (already injected)',
    input: `// TVG and canvas are already provided

const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
shape.fill(255, 100, 100, 255);

canvas.add(shape);
canvas.render();`,
    expected: `const shape = new TVG.Shape();
shape.appendCircle(300, 300, 100, 100);
shape.fill(255, 100, 100, 255);

canvas.add(shape);
canvas.render();`,
  },
];

// Run tests
console.log('🧪 Testing Code Transformer\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ name, input, expected }) => {
  const result = transformCodeForExecution(input);
  const resultClean = result.trim().replace(/\s+/g, ' ');
  const expectedClean = expected.trim().replace(/\s+/g, ' ');

  if (resultClean === expectedClean) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    console.log('Expected:', expectedClean);
    console.log('Got:', resultClean);
    console.log('');
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

// Test config extraction
console.log('🔍 Testing Config Extraction\n');

const configTest = `import { init } from '@thorvg/canvas-kit';

const TVG = await init({
  renderer: 'wg',
  locateFile: (path) => '/canvas-kit/' + path
});

const canvas = new TVG.Canvas('#canvas', {
  width: 800,
  height: 600,
  renderer: 'wg'
});`;

const config = extractInitConfig(configTest);
console.log('Extracted config:', JSON.stringify(config, null, 2));

if (config.renderer === 'wg' && config.canvasSize?.width === 800 && config.canvasSize?.height === 600) {
  console.log('✅ Config extraction works correctly\n');
} else {
  console.log('❌ Config extraction failed\n');
}
