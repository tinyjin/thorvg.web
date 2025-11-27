/**
 * Canvas class for rendering ThorVG content
 */

import { getModule } from '../core/Module';
import { Paint } from '../paint/Paint';
import type { RendererType } from '../constants';
import { checkResult } from '../core/errors';
import type { ThorVGEngineInstance } from '../types/emscripten';

export interface CanvasOptions {
  renderer?: RendererType;
  width?: number;
  height?: number;
}

export class Canvas {
  #ptr: number = 0;
  #engine: ThorVGEngineInstance | null = null;
  #backend: string = '';
  #htmlCanvas: HTMLCanvasElement | null = null;

  constructor(selector: string | HTMLCanvasElement, options: CanvasOptions = {}) {
    const { renderer = 'auto', width = 800, height = 600 } = options;

    // Module should already be initialized by ThorVG.init()
    const Module = getModule();

    // Resolve renderer
    let backend = renderer;
    if (renderer === 'auto') {
      backend = this._detectBestRenderer();
    }

    // Create engine wrapper
    this.#engine = new Module.ThorVGEngine();
    const selectorStr = typeof selector === 'string' ? selector : `#${selector.id}`;
    this.#ptr = this.#engine.createCanvas(backend, selectorStr, width, height);

    if (this.#ptr === 0) {
      throw new Error(`Failed to create canvas with ${backend} renderer`);
    }

    this.#backend = backend;

    // Store HTML canvas reference
    if (typeof selector === 'string') {
      this.#htmlCanvas = document.querySelector(selector);
    } else {
      this.#htmlCanvas = selector;
    }
  }

  private _detectBestRenderer(): string {
    // Try WebGPU > WebGL > Software
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      return 'wg';
    }

    // Check WebGL support
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) return 'gl';
    }

    return 'sw';
  }

  /**
   * Add paints to the canvas
   */
  public add(...paints: Paint[]): this {
    const Module = getModule();
    for (const paint of paints) {
      const result = Module._tvg_canvas_push(this.#ptr, (paint as any).ptr);
      checkResult(result, 'add');
    }
    return this;
  }

  /**
   * Remove paint(s) from the canvas
   * If no paint is provided, removes all paints
   */
  public remove(paint?: Paint): this {
    if (paint) {
      const Module = getModule();
      const result = Module._tvg_canvas_remove(this.#ptr, (paint as any).ptr);
      checkResult(result, 'remove');
    } else {
      if (this.#engine) {
        this.#engine.clear();
      }
    }
    return this;
  }

  /**
   * Clear all paints from the canvas
   */
  public clear(): this {
    if (this.#engine) {
      this.#engine.clear();
    }
    return this;
  }

  /**
   * Render the canvas
   */
  public render(): this {
    const Module = getModule();

    const result1 = Module._tvg_canvas_update(this.#ptr);
    checkResult(result1, 'render (update)');

    const result2 = Module._tvg_canvas_draw(this.#ptr, 1);
    checkResult(result2, 'render (draw)');

    const result3 = Module._tvg_canvas_sync(this.#ptr);
    checkResult(result3, 'render (sync)');

    // For SW backend, copy to HTML canvas
    if (this.#backend === 'sw') {
      this._updateHTMLCanvas();
    }

    return this;
  }

  private _updateHTMLCanvas(): void {
    if (!this.#engine || !this.#htmlCanvas) return;

    const buffer = this.#engine.render();
    const size = this.#engine.size();

    if (buffer && this.#htmlCanvas) {
      const ctx = this.#htmlCanvas.getContext('2d');
      if (ctx) {
        const imageData = new ImageData(
          new Uint8ClampedArray(buffer),
          size.width,
          size.height
        );
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }

  /**
   * Resize the canvas
   */
  public resize(width: number, height: number): this {
    if (this.#engine) {
      this.#engine.resize(width, height);
    }
    return this;
  }

  /**
   * Set viewport for rendering
   */
  public viewport(x: number, y: number, w: number, h: number): this {
    const Module = getModule();
    const result = Module._tvg_canvas_set_viewport(this.#ptr, x, y, w, h);
    checkResult(result, 'viewport');
    return this;
  }

  /**
   * Destroy this canvas and free its WASM memory
   * Module stays alive, you can create new canvas
   */
  public destroy(): void {
    // Clear all paints from canvas
    this.clear();

    // Delete canvas
    if (this.#ptr) {
      // Canvas is deleted automatically by ThorVGEngine
      this.#ptr = 0;
    }

    // Cleanup engine
    if (this.#engine) {
      this.#engine.delete();
      this.#engine = null;
    }

    // Clear HTML canvas if SW backend
    if (this.#htmlCanvas && this.#backend === 'sw') {
      const ctx = this.#htmlCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.#htmlCanvas.width, this.#htmlCanvas.height);
      }
    }
  }

  /**
   * Get the backend renderer being used
   */
  public get backend(): string {
    return this.#backend;
  }
}
