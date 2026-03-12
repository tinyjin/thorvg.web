/**
 * ThorVG WebCanvas - Preset Entry Point
 *
 * This module is used for engine-specific preset builds (sw, gl, wg, etc.).
 * The renderer is locked at build time via the `__RENDERER__` placeholder,
 * which is replaced by the Rollup build configuration.
 *
 * @packageDocumentation
 * @module
 */

import type { ThorVGModule } from './types/emscripten';
import { SwCanvas, GlCanvas, WgCanvas } from './core/Canvas';
import { Shape } from './core/Shape';
import { Scene } from './core/Scene';
import { Picture } from './core/Picture';
import { Text } from './core/Text';
import { Animation } from './core/Animation';
import { LinearGradient } from './core/LinearGradient';
import { RadialGradient } from './core/RadialGradient';
import { Font } from './core/Font';
import { ThorVGResultCode, ThorVGError, setGlobalErrorHandler, handleError, type ErrorHandler } from './common/errors';
import * as constants from './common/constants';
import type { RendererType } from './common/constants';
import { setGlobalThreadCount } from './interop/module';
import ThorVGModuleFactory from '../dist/thorvg'; // Aliased per-preset by Rollup

const THORVG_VERSION = '__THORVG_VERSION__';
const PRESET_RENDERER: RendererType = '__RENDERER__' as RendererType; // Replaced at build time

/**
 * Initialization options for preset builds.
 * The renderer is pre-configured and cannot be overridden.
 *
 * @category Initialization
 */
export interface PresetInitOptions {
  /** Optional function to locate WASM files. If not provided, assumes WASM files are in the same directory as the JavaScript bundle. */
  locateFile?: (path: string) => string;
  /** Global error handler for all ThorVG operations. If provided, errors will be passed to this handler instead of being thrown. */
  onError?: ErrorHandler;
  /**
   * Number of worker threads for parallel rendering.
   * Only effective when using the pthread preset (`@thorvg/webcanvas/pthread`).
   *
   * @defaultValue 0 (single-threaded)
   *
   * @remarks
   * - Requires the pthread preset WASM binary compiled with thread support
   * - Requires SharedArrayBuffer support (COOP/COEP headers must be set on the server)
   * - Higher values increase memory usage but improve rendering performance for complex scenes
   * - Recommended: `navigator.hardwareConcurrency` or a fraction of available cores
   */
  threadCount?: number;
}

type PresetCanvasType =
  typeof PRESET_RENDERER extends 'sw' ? typeof SwCanvas :
  typeof PRESET_RENDERER extends 'gl' ? typeof GlCanvas :
  typeof WgCanvas;

export interface PresetThorVGNamespace {
  Canvas: PresetCanvasType;
  Shape: typeof Shape;
  Scene: typeof Scene;
  Picture: typeof Picture;
  Text: typeof Text;
  Animation: typeof Animation;
  LinearGradient: typeof LinearGradient;
  RadialGradient: typeof RadialGradient;
  Font: typeof Font;
  // Enums
  BlendMethod: typeof constants.BlendMethod;
  StrokeCap: typeof constants.StrokeCap;
  StrokeJoin: typeof constants.StrokeJoin;
  FillRule: typeof constants.FillRule;
  GradientSpread: typeof constants.GradientSpread;
  CompositeMethod: typeof constants.CompositeMethod;
  MaskMethod: typeof constants.MaskMethod;
  SceneEffect: typeof constants.SceneEffect;
  TextWrapMode: typeof constants.TextWrapMode;
  ColorSpace: typeof constants.ColorSpace;
  /** ThorVG engine version string */
  version: string;
  /** The renderer type locked for this preset build */
  renderer: RendererType;
  term(): void;
}

let Module: ThorVGModule | null = null;
let initialized = false;

/**
 * Internal function to initialize ThorVG engine
 * For WebGPU renderer, this handles async initialization
 * For SW/GL renderers, this is a no-op
 */
async function initEngine(): Promise<void> {
  if (!Module) {
    handleError('ThorVG module not loaded. Call init() first.', 'initEngine');
    return;
  }

  // SW and GL renderers don't need module initialization
  if (PRESET_RENDERER !== 'wg') {
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
    handleError('ThorVG WebGPU initialization failed', 'initEngine');
    return;
  }
}

/**
 * Initialize ThorVG WASM module with the preset renderer.
 *
 * This preset build is locked to the `__RENDERER__` renderer.
 * The renderer cannot be overridden at runtime.
 *
 * @category Initialization
 * @param options - Initialization options (renderer is pre-configured)
 * @returns Promise that resolves to ThorVG namespace
 *
 * @example
 * ```typescript
 * import ThorVG from '@thorvg/webcanvas/gl';
 *
 * const TVG = await ThorVG.init({
 *   locateFile: (path) => `/wasm/${path}`
 * });
 *
 * const canvas = new TVG.Canvas('#canvas', { width: 800, height: 600 });
 * ```
 */
async function init(
  options: PresetInitOptions = {},
): Promise<PresetThorVGNamespace> {
  if (initialized) {
    console.warn('ThorVG already initialized');
    return createNamespace();
  }

  const { locateFile, onError, threadCount = 0 } = options;

  // Set the global error handler
  setGlobalErrorHandler(onError);

  // Store thread count for Canvas instances
  setGlobalThreadCount(threadCount);

  // Set global thread count BEFORE loading WASM module
  // This is read by Emscripten's PTHREAD_POOL_SIZE at module initialization (pthread preset only)
  (globalThis as any).__THORVG_THREAD_COUNT = threadCount;

  // Load WASM module
  Module = await ThorVGModuleFactory({
    locateFile: locateFile ?? ((path: string) => path),
  }) as unknown as ThorVGModule;

  // Make Module globally available for class constructors
  (globalThis as any).__ThorVGModule = Module;
  initialized = true;

  // Initialize the engine with preset renderer
  await initEngine();

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

  Module.term();

  // Clear global references
  if ((globalThis as any).__ThorVGModule) {
    delete (globalThis as any).__ThorVGModule;
  }
  delete (globalThis as any).__THORVG_THREAD_COUNT;
  delete (globalThis as any).__ThorVGThreadCount;

  Module = null;
  initialized = false;
  setGlobalThreadCount(0);
}

/**
 * Create namespace with preset-locked Canvas class
 */
function createNamespace(): PresetThorVGNamespace {
  const CanvasClass = PRESET_RENDERER === 'sw' ? SwCanvas : PRESET_RENDERER === 'gl' ? GlCanvas : WgCanvas;

  return {
    Canvas: CanvasClass as PresetCanvasType,
    Shape,
    Scene,
    Picture,
    Text,
    Animation,
    LinearGradient,
    RadialGradient,
    Font,
    // Enums
    BlendMethod: constants.BlendMethod,
    StrokeCap: constants.StrokeCap,
    StrokeJoin: constants.StrokeJoin,
    FillRule: constants.FillRule,
    GradientSpread: constants.GradientSpread,
    CompositeMethod: constants.CompositeMethod,
    MaskMethod: constants.MaskMethod,
    SceneEffect: constants.SceneEffect,
    TextWrapMode: constants.TextWrapMode,
    ColorSpace: constants.ColorSpace,
    version: THORVG_VERSION,
    renderer: PRESET_RENDERER,
    term,
  };
}

// Main export object
const ThorVG = {
  init,
};

export default ThorVG;

// Named exports
export { init, Shape, Scene, Picture, Text, Animation, LinearGradient, RadialGradient, Font, constants, ThorVGResultCode, ThorVGError };

// Re-export types
export type { CanvasOptions } from './core/Canvas';
export type { ErrorContext, ErrorHandler } from './common/errors';
export type { Bounds, Matrix } from './core/Paint';
export type { RectOptions, StrokeOptions } from './core/Shape';
export type { LoadDataOptions, PictureSize } from './core/Picture';
export type { TextLayout, TextOutline } from './core/Text';
export type { AnimationInfo, AnimationSegment } from './core/Animation';
export type { LoadFontOptions, FontType } from './core/Font';
export type { ColorStop } from './core/Fill';
/** @category Canvas */
export type { RendererType } from './common/constants';
/** @category Picture */
export type { MimeType } from './common/constants';
