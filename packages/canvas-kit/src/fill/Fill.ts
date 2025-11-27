/**
 * Base class for Fill objects (gradients)
 */

import { WasmObject } from '../core/WasmObject';
import { getModule } from '../core/Module';
import type { GradientSpreadType } from '../constants';
import { GradientSpread } from '../constants';

export type ColorStop = readonly [number, number, number, number];

interface ColorStopEntry {
  offset: number;
  color: ColorStop;
}

export abstract class Fill extends WasmObject {
  protected _stops: ColorStopEntry[] = [];

  protected _cleanup(ptr: number): void {
    const Module = getModule();
    Module._tvg_gradient_del(ptr);
  }

  /**
   * Add a color stop to the gradient
   * @param offset - Position of the stop (0.0 to 1.0)
   * @param color - RGBA color [r, g, b, a] where each value is 0-255
   */
  public addStop(offset: number, color: ColorStop): this {
    this._stops.push({ offset, color });
    return this;
  }

  /**
   * Apply collected color stops to the gradient
   */
  protected _applyStops(): void {
    if (this._stops.length === 0) return;

    const Module = getModule();
    const count = this._stops.length;
    const stopsPtr = Module._malloc(count * 20); // ColorStop struct size: 4 bytes (float) + 4 bytes (RGBA)

    for (let i = 0; i < count; i++) {
      const stop = this._stops[i]!;
      const offset = stopsPtr + i * 20;

      // Write offset (float)
      Module.HEAPF32[offset / 4] = stop.offset;

      // Write color (4 bytes)
      Module.HEAPU8[offset + 4] = stop.color[0];
      Module.HEAPU8[offset + 5] = stop.color[1];
      Module.HEAPU8[offset + 6] = stop.color[2];
      Module.HEAPU8[offset + 7] = stop.color[3];
    }

    Module._tvg_gradient_set_color_stops(this.ptr, stopsPtr, count);
    Module._free(stopsPtr);

    this._stops = [];
  }

  /**
   * Set the gradient spread method
   */
  public spread(type: GradientSpreadType): this {
    const Module = getModule();
    const spreadMap: Record<GradientSpreadType, number> = {
      pad: GradientSpread.Pad,
      reflect: GradientSpread.Reflect,
      repeat: GradientSpread.Repeat,
    };
    Module._tvg_gradient_set_spread(this.ptr, spreadMap[type]);
    return this;
  }
}
