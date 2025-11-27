/**
 * Font utility for loading custom fonts
 * Fonts are globally available once loaded
 */

import { getModule } from './Module';
import { checkResult } from './errors';

export type FontFormat = 'ttf' | 'otf';

export interface LoadFontOptions {
  /** Font format (e.g., 'ttf', 'otf') */
  format?: FontFormat;
  /** Whether to copy the data (default: true) */
  copy?: boolean;
}

/**
 * Font loader utility
 * Fonts are loaded globally and can be referenced by name in Text objects
 */
export class Font {
  /**
   * Load font from raw data (Uint8Array)
   * @param name - Unique name to identify this font
   * @param data - Raw font data
   * @param options - Load options
   */
  public static load(name: string, data: Uint8Array, options: LoadFontOptions = {}): void {
    const Module = getModule();
    const { format = 'ttf', copy = true } = options;

    // Allocate memory for font name
    const namePtr = Module._malloc(name.length + 1);
    Module.HEAPU8.set(new TextEncoder().encode(name), namePtr);
    Module.HEAPU8[namePtr + name.length] = 0;

    // Allocate memory for font data
    const dataPtr = Module._malloc(data.length);
    Module.HEAPU8.set(data, dataPtr);

    // Allocate memory for format/mimetype
    const mimePtr = Module._malloc(format.length + 1);
    Module.HEAPU8.set(new TextEncoder().encode(format), mimePtr);
    Module.HEAPU8[mimePtr + format.length] = 0;

    try {
      const result = Module._tvg_font_load_data(namePtr, dataPtr, data.length, mimePtr, copy ? 1 : 0);
      checkResult(result, `Font.load("${name}")`);
    } finally {
      Module._free(namePtr);
      Module._free(dataPtr);
      Module._free(mimePtr);
    }
  }

  /**
   * Load font from file path (for Node.js or when file system is available)
   * @param name - Unique name to identify this font
   * @param path - File path to load
   */
  public static loadFromPath(name: string, path: string): void {
    const Module = getModule();

    const namePtr = Module._malloc(name.length + 1);
    Module.HEAPU8.set(new TextEncoder().encode(name), namePtr);
    Module.HEAPU8[namePtr + name.length] = 0;

    try {
      const result = Module._tvg_font_load(namePtr, path);
      checkResult(result, `Font.loadFromPath("${name}", "${path}")`);
    } finally {
      Module._free(namePtr);
    }
  }

  /**
   * Unload a previously loaded font
   * @param name - Font name to unload
   */
  public static unload(name: string): void {
    const Module = getModule();

    const namePtr = Module._malloc(name.length + 1);
    Module.HEAPU8.set(new TextEncoder().encode(name), namePtr);
    Module.HEAPU8[namePtr + name.length] = 0;

    try {
      const result = Module._tvg_font_unload(namePtr);
      checkResult(result, `Font.unload("${name}")`);
    } finally {
      Module._free(namePtr);
    }
  }
}
