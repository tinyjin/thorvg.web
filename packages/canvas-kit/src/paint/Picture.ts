/**
 * Picture class for loading and rendering images and vector files
 * Supports SVG, PNG, JPG, WebP, and Lottie files
 */

import { Paint } from './Paint';
import { getModule } from '../core/Module';
import { pictureRegistry } from '../core/Registry';
import { checkResult } from '../core/errors';

export type PictureFormat = 'svg' | 'png' | 'jpg' | 'jpeg' | 'webp' | 'lottie' | 'json';

export interface LoadDataOptions {
  /** MIME type or format hint (e.g., 'svg', 'png', 'jpg') */
  format?: PictureFormat;
  /** Resource path for resolving relative references */
  resourcePath?: string;
  /** Whether to copy the data (default: false) */
  copy?: boolean;
}

export interface PictureSize {
  width: number;
  height: number;
}

export class Picture extends Paint {
  constructor(ptr?: number) {
    const Module = getModule();
    if (!ptr) {
      ptr = Module._tvg_picture_new();
    }

    super(ptr, pictureRegistry);
  }

  protected _createInstance(ptr: number): Picture {
    // Create picture from existing pointer (for duplicate)
    const picture = Object.create(Picture.prototype) as Picture;
    Object.setPrototypeOf(picture, Picture.prototype);
    picture.ptr = ptr;
    return picture;
  }

  /**
   * Load picture from raw data (Uint8Array or string for SVG)
   * @param data - Raw image data as Uint8Array or SVG string
   * @param options - Load options including format hint
   */
  public loadData(data: Uint8Array | string, options: LoadDataOptions = {}): this {
    const Module = getModule();
    const { format = 'svg', resourcePath = '', copy = false } = options;

    // Convert string to Uint8Array if needed
    const dataArray = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    // Allocate WASM memory
    const dataPtr = Module._malloc(dataArray.length);
    Module.HEAPU8.set(dataArray, dataPtr);

    try {
      const result = Module._tvg_picture_load_data(
        this.ptr,
        dataPtr,
        dataArray.length,
        format,
        resourcePath,
        copy ? 1 : 0
      );
      checkResult(result, 'loadData');
    } finally {
      Module._free(dataPtr);
    }

    return this;
  }

  /**
   * Load picture from file path (for Node.js or when file system is available)
   * @param path - File path to load
   */
  public load(path: string): this {
    const Module = getModule();
    const result = Module._tvg_picture_load(this.ptr, path);
    checkResult(result, 'load');
    return this;
  }

  /**
   * Set the size of the picture (scales it)
   * @param width - Target width
   * @param height - Target height
   */
  public size(width: number, height: number): this;
  /**
   * Get the current size of the picture
   */
  public size(): PictureSize;
  public size(width?: number, height?: number): this | PictureSize {
    const Module = getModule();

    if (width !== undefined && height !== undefined) {
      // Setter
      const result = Module._tvg_picture_set_size(this.ptr, width, height);
      checkResult(result, 'size (set)');
      return this;
    }

    // Getter
    const sizePtr = Module._malloc(8); // 2 floats (4 bytes each)
    try {
      Module._tvg_picture_get_size(this.ptr, sizePtr, sizePtr + 4);
      const sizeView = new Float32Array(Module.HEAPF32.buffer, sizePtr, 2);
      return {
        width: sizeView[0]!,
        height: sizeView[1]!,
      };
    } finally {
      Module._free(sizePtr);
    }
  }

}
