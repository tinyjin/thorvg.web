/**
 * ThorVG Canvas Kit - TypeScript API for ThorVG
 */

import type { ThorVGModule } from './types/emscripten';
import { Canvas } from './canvas/Canvas';
import { Shape } from './paint/Shape';
import { Scene } from './paint/Scene';
import { Picture } from './paint/Picture';
import { Text } from './paint/Text';
import { LinearGradient } from './fill/LinearGradient';
import { RadialGradient } from './fill/RadialGradient';
import { Font } from './core/Font';
import * as constants from './constants';
// @ts-ignore - thorvg.js is generated during build
import ThorVGModuleFactory from '../dist/thorvg.js';

export interface InitOptions {
  locateFile?: (path: string) => string;
}

export interface ThorVGNamespace {
  Canvas: typeof Canvas;
  Shape: typeof Shape;
  Scene: typeof Scene;
  Picture: typeof Picture;
  Text: typeof Text;
  LinearGradient: typeof LinearGradient;
  RadialGradient: typeof RadialGradient;
  Font: typeof Font;
  ThorVGInit(engineType?: 'sw' | 'gl' | 'wg'): Promise<void>;
  term(): void;
}

let Module: ThorVGModule | null = null;
let initialized = false;

/**
 * Initialize ThorVG engine (call after loading the module)
 * For WebGPU backend, this handles async initialization
 * For SW/GL backends, this is a no-op but still recommended to call
 */
async function ThorVGInit(engineType: 'sw' | 'gl' | 'wg' = 'sw'): Promise<void> {
  if (!Module) {
    throw new Error('ThorVG module not loaded. Call init() first.');
  }

  // SW and GL renderers don't need module initialization
  if (engineType !== 'wg') {
    return;
  }

  // WebGPU requires async initialization
  let status: number;
  let attempts = 0;
  const MAX_ATTEMPTS = 50;

  do {
    status = Module.init();
    if (status === 2) {
      // WebGPU initialization pending, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
  } while (status === 2 && attempts < MAX_ATTEMPTS);

  if (status === 1) {
    throw new Error('ThorVG WebGPU initialization failed');
  }
}

/**
 * Initialize ThorVG WASM module
 */
async function init(options: InitOptions = {}): Promise<ThorVGNamespace> {
  if (initialized) {
    console.warn('ThorVG already initialized');
    return createNamespace();
  }

  const { locateFile } = options;

  // Load WASM module
  Module = await ThorVGModuleFactory({
    locateFile: locateFile ?? ((path: string) => path),
  }) as ThorVGModule;

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
    Picture,
    Text,
    LinearGradient,
    RadialGradient,
    Font,
    ThorVGInit,
    term,
  };
}

// Main export object
const ThorVG = {
  init,
};

export default ThorVG;

// Named exports for advanced usage
export { init, ThorVGInit, Canvas, Shape, Scene, Picture, Text, LinearGradient, RadialGradient, Font, constants };

// Re-export types
export type { CanvasOptions } from './canvas/Canvas';
export type { Bounds } from './paint/Paint';
export type { RectOptions, StrokeOptions } from './paint/Shape';
export type { LoadDataOptions, PictureFormat, PictureSize } from './paint/Picture';
export type { TextAlign, TextLayout, TextOutline } from './paint/Text';
export type { LoadFontOptions, FontFormat } from './core/Font';
export type { ColorStop } from './fill/Fill';
export type { RendererType, StrokeCapType, StrokeJoinType, GradientSpreadType, TextWrapModeType } from './constants';

// Re-export enums
export {
  BlendMethod,
  StrokeCap,
  StrokeJoin,
  FillRule,
  GradientSpread,
  CompositeMethod,
  TextWrapMode,
} from './constants';
