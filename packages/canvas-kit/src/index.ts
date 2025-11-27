/**
 * ThorVG Canvas Kit - TypeScript API for ThorVG
 */

import type { ThorVGModule } from './types/emscripten';
import { Canvas } from './canvas/Canvas';
import { Shape } from './paint/Shape';
import { Scene } from './paint/Scene';
import { LinearGradient } from './fill/LinearGradient';
import { RadialGradient } from './fill/RadialGradient';
import * as constants from './constants';

export interface InitOptions {
  locateFile?: (path: string) => string;
}

export interface ThorVGNamespace {
  Canvas: typeof Canvas;
  Shape: typeof Shape;
  Scene: typeof Scene;
  LinearGradient: typeof LinearGradient;
  RadialGradient: typeof RadialGradient;
  term(): void;
}

let Module: ThorVGModule | null = null;
let initialized = false;

/**
 * Initialize ThorVG WASM module
 */
async function init(options: InitOptions = {}): Promise<ThorVGNamespace> {
  if (initialized) {
    console.warn('ThorVG already initialized');
    return createNamespace();
  }

  const { locateFile } = options;

  // Import the WASM module dynamically
  const ThorVGModuleFactory = (await import('../dist/thorvg.js')).default;

  // Load WASM module
  Module = await ThorVGModuleFactory({
    locateFile: locateFile ?? ((path: string) => path),
  });

  // Initialize WebGPU if needed (async)
  let status: number;
  let attempts = 0;
  const MAX_ATTEMPTS = 50;

  do {
    status = Module.init();
    if (status === 2) {
      // WebGPU initialization pending
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
  } while (status === 2 && attempts < MAX_ATTEMPTS);

  if (status === 1) {
    throw new Error('ThorVG initialization failed');
  }

  // Make Module globally available for class constructors
  (globalThis as any).__ThorVGModule = Module;
  initialized = true;

  return createNamespace();
}

/**
 * Terminate ThorVG WASM module
 * After calling this, you must call init() again to use ThorVG
 */
function term(): void {
  if (!initialized || !Module) {
    console.warn('ThorVG not initialized, nothing to terminate');
    return;
  }

  // Terminate ThorVG engine
  Module.term();

  // Clear global reference
  if ((globalThis as any).__ThorVGModule) {
    delete (globalThis as any).__ThorVGModule;
  }

  // Reset state
  Module = null;
  initialized = false;
}

/**
 * Create namespace with all classes
 */
function createNamespace(): ThorVGNamespace {
  return {
    Canvas,
    Shape,
    Scene,
    LinearGradient,
    RadialGradient,
    term,
  };
}

// Main export object
const ThorVG = {
  init,
};

export default ThorVG;

// Named exports for advanced usage
export { init, Canvas, Shape, Scene, LinearGradient, RadialGradient, constants };

// Re-export types
export type {
  InitOptions,
  ThorVGNamespace,
  CanvasOptions,
  Bounds,
  RectOptions,
  StrokeOptions,
  ColorStop,
} from './index';
export type { RendererType, StrokeCapType, StrokeJoinType, GradientSpreadType } from './constants';

// Re-export enums
export {
  BlendMethod,
  StrokeCap,
  StrokeJoin,
  FillRule,
  GradientSpread,
  CompositeMethod,
} from './constants';
