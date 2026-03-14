/**
 * Lightweight ThorVG WASM loader - replaces Emscripten's 107KB JS glue (~3KB).
 *
 * Loads a pure clang-built wasm and returns an object compatible with
 * Emscripten's module interface, so existing TypeScript code works unchanged.
 */

import type { ThorVGModule, TvgCanvasInstance } from '../types/emscripten';

/**
 * TvgCanvas JS wrapper that mimics Embind's TvgCanvas class.
 * Delegates to flat C exports from tvgWasmWebCanvasClang.cpp.
 */
// Wasm exports accessor (set during init)
let _wasm: any = null;
let _memory: WebAssembly.Memory;

class TvgCanvasWrapper implements TvgCanvasInstance {
  #ctx: number;

  constructor(_engineType: string, _selector: string, width: number, height: number) {
    this.#ctx = _wasm['tvg_wcanvas_create'](width, height);
  }

  error(): string {
    const ptr = _wasm['tvg_wcanvas_error'](this.#ctx) as number;
    if (!ptr) return 'null context';
    const view = new Uint8Array(_memory.buffer, ptr, 256);
    let str = '';
    for (let i = 0; i < 256 && (view[i] ?? 0) !== 0; i++) str += String.fromCharCode(view[i]!);
    return str;
  }

  resize(width: number, height: number): boolean {
    return _wasm['tvg_wcanvas_resize'](this.#ctx, width, height) === 0;
  }

  clear(): boolean {
    return _wasm['tvg_wcanvas_clear'](this.#ctx) === 0;
  }

  render(): ArrayBuffer {
    const ptr = _wasm['tvg_wcanvas_render'](this.#ctx) as number;
    const size = _wasm['tvg_wcanvas_render_size'](this.#ctx) as number;
    if (!ptr || !size) return new ArrayBuffer(0);
    // Return a copy (Embind does the same via typed_memory_view → ArrayBuffer)
    // A copy is needed because memory.buffer can be invalidated by memory.grow
    return new Uint8Array(_memory.buffer, ptr, size).slice().buffer;
  }

  size(): { width: number; height: number } {
    return {
      width: _wasm['tvg_wcanvas_width'](this.#ctx) as number,
      height: _wasm['tvg_wcanvas_height'](this.#ctx) as number,
    };
  }

  ptr(): number {
    return _wasm['tvg_wcanvas_ptr'](this.#ctx) as number;
  }

  delete(): void {
    if (this.#ctx) {
      _wasm['tvg_wcanvas_destroy'](this.#ctx);
      this.#ctx = 0;
    }
  }
}

/**
 * Emscripten-compatible module factory.
 * Drop-in replacement for `import ThorVGModuleFactory from '../dist/thorvg'`.
 */
export default async function ThorVGModuleFactory(
  options: { locateFile?: (path: string) => string } = {}
): Promise<ThorVGModule> {
  // Resolve wasm URL
  const locateFile = options.locateFile ?? ((path: string) => path);
  const wasmUrl = locateFile('thorvg.wasm');

  // Fetch wasm
  const response = await fetch(wasmUrl);
  const bytes = await response.arrayBuffer();

  // Instantiate with minimal imports
  let instance: WebAssembly.Instance;

  const imports: WebAssembly.Imports = {
    env: {
      // JerryScript (Lottie expressions)
      setjmp: () => 0,
      longjmp: () => { console.error('longjmp called'); },

      // dlmalloc memory growth
      emscripten_resize_heap: (requestedSize: number): number => {
        const cur = _memory.buffer.byteLength;
        if (requestedSize <= cur) return 1;
        try { _memory.grow(Math.ceil((requestedSize - cur) / 65536)); return 1; }
        catch { return 0; }
      },
      emscripten_get_heap_size: (): number => _memory.buffer.byteLength,

      abort: () => { throw new Error('abort'); },
      __cxa_atexit: () => 0,
      __errno_location: () => 0,

      // libc stubs
      strtol: () => 0,
      vsnprintf: () => 0,
      vfprintf: () => 0,
      fputc: () => 0,
      time: () => 0,
      __strchrnul: (s: number, c: number): number => {
        const mem = new Uint8Array(_memory.buffer);
        let i = s;
        while (mem[i] !== 0 && mem[i] !== (c & 0xff)) i++;
        return i;
      },
      __memrchr: (s: number, c: number, n: number): number => {
        const mem = new Uint8Array(_memory.buffer);
        for (let i = s + n - 1; i >= s; i--) {
          if (mem[i] === (c & 0xff)) return i;
        }
        return 0;
      },
    },
    wasi_snapshot_preview1: {
      fd_write: () => 0,
      fd_close: () => 0,
      fd_seek: () => 0,
    },
  };

  const result = await WebAssembly.instantiate(bytes, imports);
  instance = result.instance;

  _wasm = instance.exports;
  _memory = _wasm['memory'] as WebAssembly.Memory;

  // Build module object compatible with EmscriptenModule & ThorVGCAPI
  const module: any = {
    // Heap views (getters so they refresh after memory.grow)
    get HEAPU8() { return new Uint8Array(_memory.buffer); },
    get HEAP8() { return new Int8Array(_memory.buffer); },
    get HEAPU16() { return new Uint16Array(_memory.buffer); },
    get HEAP16() { return new Int16Array(_memory.buffer); },
    get HEAPU32() { return new Uint32Array(_memory.buffer); },
    get HEAP32() { return new Int32Array(_memory.buffer); },
    get HEAPF32() { return new Float32Array(_memory.buffer); },
    get HEAPF64() { return new Float64Array(_memory.buffer); },

    // Memory management
    _malloc: _wasm['malloc'],
    _free: _wasm['free'],

    // TvgCanvas class (Embind replacement)
    TvgCanvas: TvgCanvasWrapper,

    // init/term
    init: () => _wasm['tvg_wcanvas_init']() as number,
    term: () => _wasm['tvg_wcanvas_term'](),
  };

  // Map all tvg_* exports as _tvg_* (Emscripten convention)
  for (const name of Object.keys(_wasm)) {
    if (name.startsWith('tvg_') && typeof _wasm[name] === 'function') {
      module[`_${name}`] = _wasm[name];
    }
  }

  return module as ThorVGModule;
}
