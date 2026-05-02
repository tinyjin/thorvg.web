/**
 * Render text with fonts and styling
 * @category Text
 */

import { Paint } from './Paint';
import type { Point } from './Paint';
import { Fill } from './Fill';
import { getModule, allocString } from '../interop/module';
import { textRegistry } from '../interop/registry';
import { checkResult } from '../common/errors';
import { TextWrapMode } from '../common/constants';

/**
 * @category Text
 */
export interface TextLayout {
  width: number;
  height?: number;
}

/**
 * @category Text
 */
export interface TextOutline {
  width: number;
  color: readonly [number, number, number]; // RGB
}

/**
 * Font-level vertical metrics for a text object.
 *
 * Values reflect the configured font size but do **not** include
 * any paint-level transformations (translate, scale, rotate).
 *
 * @category Text
 */
export interface TextMetrics {
  /** Distance from the baseline to the top of the tallest glyph (positive). */
  ascent: number;
  /** Distance from the baseline to the bottom of the lowest glyph (negative per TTF convention). */
  descent: number;
  /** Additional spacing recommended between consecutive lines (leading). */
  linegap: number;
  /** Total line advance: ascent − descent + linegap. */
  advance: number;
}

/**
 * Layout metrics for an individual glyph.
 *
 * Values reflect the configured font size but do **not** include
 * any paint-level transformations (translate, scale, rotate).
 *
 * @category Text
 */
export interface GlyphMetrics {
  /** Horizontal advance — the distance the pen moves along the baseline after this glyph. */
  advance: number;
  /** Bearing from the origin to the glyph's visible bound along the inline-start direction. */
  bearing: number;
  /** Minimum point of the glyph bounding box in local glyph space. */
  min: Point;
  /** Maximum point of the glyph bounding box in local glyph space. */
  max: Point;
}

/**
 * Text rendering class with font support
 * @category Text
 *
 * @example
 * ```typescript
 * // Basic text rendering
 * const text = new TVG.Text();
 * text.font('Arial', 48)
 *     .text('Hello ThorVG!')
 *     .fill(50, 50, 50, 255)
 *     .translate(100, 200);
 *
 * canvas.add(text);
 * ```
 *
 * @example
 * ```typescript
 * // Text with custom font and styling
 * // Load custom font first
 * const fontData = await fetch('/fonts/custom.ttf').then(r => r.arrayBuffer());
 * TVG.Font.load('CustomFont', new Uint8Array(fontData));
 *
 * const text = new TVG.Text();
 * text.font('CustomFont', 64)
 *     .text('Custom Font')
 *     .fill(100, 150, 255, 255)
 *     .stroke(50, 50, 50, 255, 2);
 *
 * canvas.add(text);
 * ```
 *
 * @example
 * ```typescript
 * // Multi-line text with wrapping
 * const text = new TVG.Text();
 * text.font('Arial')
 *     .fontSize(24)
 *     .text('This is a long text that will wrap across multiple lines')
 *     .fill(50, 50, 50)
 *     .layout(300, 200)
 *     .wrap(TextWrapMode.Word);
 *
 * canvas.add(text);
 * ```
 */
export class Text extends Paint {
  constructor(ptr?: number, skipRegistry: boolean = false) {
    const Module = getModule();
    if (!ptr) {
      ptr = Module._tvg_text_new();
    }
    super(ptr, skipRegistry ? undefined : textRegistry);
  }

  protected _createInstance(ptr: number): Text {
    // Create text from existing pointer (for duplicate)
    return new Text(ptr);
  }

  /**
   * Set the font to use for this text.
   * @param name - Font name
    */
  public font(name: string): this {
    const Module = getModule();

    const namePtr = Module._malloc(name.length + 1);
    Module.HEAPU8.set(new TextEncoder().encode(name), namePtr);
    Module.HEAPU8[namePtr + name.length] = 0;

    try {
      const result = Module._tvg_text_set_font(this.ptr, namePtr);
      checkResult(result, 'font');
    } finally {
      Module._free(namePtr);
    }

    return this;
  }

  /**
   * Set the text content (UTF-8 supported)
   * @param content - Text content to display
   */
  public text(content: string): this {
    const Module = getModule();

    const textBytes = new TextEncoder().encode(content);
    const textPtr = Module._malloc(textBytes.length + 1);
    Module.HEAPU8.set(textBytes, textPtr);
    Module.HEAPU8[textPtr + textBytes.length] = 0;

    try {
      const result = Module._tvg_text_set_text(this.ptr, textPtr);
      checkResult(result, 'text');
    } finally {
      Module._free(textPtr);
    }

    return this;
  }

  /**
   * Set the font size
   * @param size - Font size in pixels
   */
  public fontSize(size: number): this {
    const Module = getModule();
    const result = Module._tvg_text_set_size(this.ptr, size);
    checkResult(result, 'fontSize');
    return this;
  }

  /**
   * Set text color (RGB) or fill with gradient
   */
  public fill(gradient: Fill): this;
  public fill(r: number, g: number, b: number): this;
  public fill(gradientOrR: Fill | number, g?: number, b?: number): this {
    const Module = getModule();

    if (gradientOrR instanceof Fill) {
      gradientOrR['_applyStops']();
      const result = Module._tvg_text_set_gradient(this.ptr, gradientOrR.ptr);
      checkResult(result, 'fill (gradient)');
      gradientOrR._markFilled();
    } else if (typeof gradientOrR === 'number' && g !== undefined && b !== undefined) {
      // RGB color
      const result = Module._tvg_text_set_color(this.ptr, gradientOrR, g, b);
      checkResult(result, 'fill (color)');
    } else {
      throw new TypeError('Invalid fill arguments');
    }

    return this;
  }

  /**
   * Set text alignment/anchor point
   * @param x - Horizontal alignment/anchor in [0..1]: 0=left/start, 0.5=center, 1=right/end (Default: 0)
   * @param y - Vertical alignment/anchor in [0..1]: 0=top, 0.5=middle, 1=bottom (Default: 0)
   */
  public align(x: number, y: number): this {
    const Module = getModule();
    const result = Module._tvg_text_align(this.ptr, x, y);
    checkResult(result, 'align');
    return this;
  }

  /**
   * Set text layout constraints (for wrapping)
   * @param width - Maximum width (0 = no constraint)
   * @param height - Maximum height (0 = no constraint)
   */
  public layout(width: number, height: number = 0): this {
    const Module = getModule();
    const result = Module._tvg_text_layout(this.ptr, width, height);
    checkResult(result, 'layout');
    return this;
  }

  /**
   * Set text wrap mode
   * @param mode - Wrap mode: TextWrapMode.None, TextWrapMode.Character, TextWrapMode.Word, TextWrapMode.Smart, or TextWrapMode.Ellipsis
   */
  public wrap(mode: TextWrapMode): this {
    const Module = getModule();
    const result = Module._tvg_text_wrap_mode(this.ptr, mode);
    checkResult(result, 'wrap');
    return this;
  }

  /**
   * Set text spacing (letter and line spacing)
   * @param letter - Letter spacing scale factor (1.0 = default, >1.0 = wider, <1.0 = narrower)
   * @param line - Line spacing scale factor (1.0 = default, >1.0 = wider, <1.0 = narrower)
   */
  public spacing(letter: number, line: number): this {
    const Module = getModule();
    const result = Module._tvg_text_spacing(this.ptr, letter, line);
    checkResult(result, 'spacing');
    return this;
  }

  /**
   * Set italic style with shear factor
   * @param shear - Shear factor (0.0 = no italic, default: 0.18, typical range: 0.1-0.3)
   */
  public italic(shear: number = 0.18): this {
    const Module = getModule();
    const result = Module._tvg_text_set_italic(this.ptr, shear);
    checkResult(result, 'italic');
    return this;
  }

  /**
   * Set text outline (stroke)
   * @param width - Outline width
   * @param r - Red (0-255)
   * @param g - Green (0-255)
   * @param b - Blue (0-255)
   */
  public outline(width: number, r: number, g: number, b: number): this {
    const Module = getModule();
    const result = Module._tvg_text_set_outline(this.ptr, width, r, g, b);
    checkResult(result, 'outline');
    return this;
  }

  /**
   * Get the current text content.
   * @returns The UTF-8 text string, or an empty string if no text has been set.
   */
  public getText(): string {
    const Module = getModule();
    const ptr = Module._tvg_text_get_text(this.ptr);
    if (!ptr) return '';

    // Read null-terminated UTF-8 string from WASM memory
    let end = ptr;
    while (Module.HEAPU8[end] !== 0) end++;
    const bytes = Module.HEAPU8.subarray(ptr, end);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Get the number of lines after layout and wrapping.
   *
   * Reflects the current wrapping configuration set by {@link wrap}.
   * Returns 0 if no text or font has been set.
   */
  public lineCount(): number {
    const Module = getModule();
    return Module._tvg_text_line_count(this.ptr);
  }

  /**
   * Get font-level vertical metrics for this text object.
   *
   * The returned values reflect the font size set via {@link fontSize}
   * but do **not** include paint-level transformations.
   *
   * @returns Font metrics (ascent, descent, linegap, advance), or `null` if no font or size has been set.
   *
   * @example
   * ```typescript
   * const text = new TVG.Text();
   * text.font('Roboto').fontSize(48).text('Hello');
   *
   * const m = text.textMetrics();
   * if (m) {
   *   console.log(`line height: ${m.advance}`);
   * }
   * ```
   */
  public textMetrics(): TextMetrics | null {
    const Module = getModule();
    // Tvg_Text_Metrics: 4 floats (ascent, descent, linegap, advance) = 16 bytes
    const buf = Module._malloc(16);

    try {
      const result = Module._tvg_text_get_text_metrics(this.ptr, buf);
      if (result !== 0) return null;

      const view = new Float32Array(Module.HEAPF32.buffer, buf, 4);
      return {
        ascent: view[0]!,
        descent: view[1]!,
        linegap: view[2]!,
        advance: view[3]!,
      };
    } finally {
      Module._free(buf);
    }
  }

  /**
   * Get layout metrics for a single glyph.
   *
   * The returned values reflect the font size set via {@link fontSize}
   * but do **not** include paint-level transformations.
   *
   * @param ch - A single UTF-8 character.
   * @returns Glyph metrics (advance, bearing, bounding box), or `null` if the font/size is
   *          not set or the character is unsupported.
   *
   * @example
   * ```typescript
   * const text = new TVG.Text();
   * text.font('Roboto').fontSize(48);
   *
   * const g = text.glyphMetrics('A');
   * if (g) {
   *   console.log(`advance: ${g.advance}, width: ${g.max.x - g.min.x}`);
   * }
   * ```
   */
  public glyphMetrics(ch: string): GlyphMetrics | null {
    const Module = getModule();
    const chPtr = allocString(Module, ch);
    // Tvg_Glyph_Metrics: advance(f32) + bearing(f32) + min(2×f32) + max(2×f32) = 24 bytes
    const buf = Module._malloc(24);

    try {
      const result = Module._tvg_text_get_glyph_metrics(this.ptr, chPtr, buf);
      if (result !== 0) return null;

      const view = new Float32Array(Module.HEAPF32.buffer, buf, 6);
      return {
        advance: view[0]!,
        bearing: view[1]!,
        min: { x: view[2]!, y: view[3]! },
        max: { x: view[4]!, y: view[5]! },
      };
    } finally {
      Module._free(chPtr);
      Module._free(buf);
    }
  }
}

// Tvg_Type = 4 (TVG_TYPE_TEXT)
Paint.registerType(4, (ptr) => new Text(ptr, true));
