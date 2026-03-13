/**
 * Minimal WASM loader for pure clang/wasm32 builds (no Emscripten runtime).
 *
 * Replaces Emscripten's ~105KB JS glue with a ~2KB loader that provides
 * only the imports the wasm module actually needs.
 */

export interface ClangWasmModule {
  // Memory
  memory: WebAssembly.Memory;
  HEAPU8: Uint8Array;
  HEAPF32: Float32Array;

  // Memory management
  _malloc(size: number): number;
  _free(ptr: number): void;

  // WebCanvas bindings
  tvg_wcanvas_init(): number;
  tvg_wcanvas_term(): void;
  tvg_wcanvas_create(w: number, h: number): number;
  tvg_wcanvas_destroy(ctx: number): void;
  tvg_wcanvas_resize(ctx: number, w: number, h: number): number;
  tvg_wcanvas_render(ctx: number): number;
  tvg_wcanvas_render_size(ctx: number): number;
  tvg_wcanvas_ptr(ctx: number): number;
  tvg_wcanvas_error(ctx: number): number;
  tvg_wcanvas_clear(ctx: number): number;
  tvg_wcanvas_width(ctx: number): number;
  tvg_wcanvas_height(ctx: number): number;

  // Engine
  _tvg_engine_init(engineMethod: number, threads: number): number;
  _tvg_engine_term(engineMethod: number): number;

  // All ThorVG C API functions (prefixed with _tvg_*)
  [key: `_tvg_${string}`]: (...args: number[]) => number;
}

/**
 * Load and instantiate a pure clang wasm module.
 * Provides minimal stubs for the 7 imports the wasm expects:
 *   - env.longjmp, env.setjmp (for JerryScript in Lottie loader)
 *   - wasi_snapshot_preview1.fd_write/fd_close/fd_seek (unused stubs)
 *   - env._abort_js, env.emscripten_resize_heap
 */
export async function loadClangWasm(wasmUrl: string): Promise<ClangWasmModule> {
  const response = await fetch(wasmUrl);
  const bytes = await response.arrayBuffer();

  // setjmp/longjmp implementation for JerryScript
  const jmpBufs = new Map<number, number>();

  const imports: WebAssembly.Imports = {
    env: {
      // setjmp/longjmp - used by JerryScript (Lottie expression engine)
      setjmp: (_buf: number): number => {
        return 0;
      },
      longjmp: (_buf: number, _value: number): void => {
        // In practice this shouldn't be called during normal operation
        console.error('longjmp called - unsupported in this build');
      },
      // Abort
      _abort_js: (): void => {
        throw new Error('abort() called from WASM');
      },
      // Memory growth - the module exports its own memory
      emscripten_resize_heap: (_requestedSize: number): number => {
        // Memory growth is handled by WebAssembly.Memory.grow()
        return 0;
      },
    },
    wasi_snapshot_preview1: {
      // These are stubs - the module doesn't actually use filesystem I/O
      // (built with -Dfile=false)
      fd_write: (_fd: number, _iovs: number, _iovs_len: number, _nwritten: number): number => 0,
      fd_close: (_fd: number): number => 0,
      fd_seek: (_fd: number, _offset: bigint, _whence: number, _newoffset: number): number => 0,
    },
  };

  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const exports = instance.exports as Record<string, WebAssembly.ExportValue>;
  const memory = exports.memory as WebAssembly.Memory;

  // Build module interface
  const module: ClangWasmModule = {
    memory,
    HEAPU8: new Uint8Array(memory.buffer),
    HEAPF32: new Float32Array(memory.buffer),

    _malloc: exports.malloc as (size: number) => number,
    _free: exports.free as (ptr: number) => void,

    // WebCanvas bindings
    tvg_wcanvas_init: exports.tvg_wcanvas_init as () => number,
    tvg_wcanvas_term: exports.tvg_wcanvas_term as () => void,
    tvg_wcanvas_create: exports.tvg_wcanvas_create as (w: number, h: number) => number,
    tvg_wcanvas_destroy: exports.tvg_wcanvas_destroy as (ctx: number) => void,
    tvg_wcanvas_resize: exports.tvg_wcanvas_resize as (ctx: number, w: number, h: number) => number,
    tvg_wcanvas_render: exports.tvg_wcanvas_render as (ctx: number) => number,
    tvg_wcanvas_render_size: exports.tvg_wcanvas_render_size as (ctx: number) => number,
    tvg_wcanvas_ptr: exports.tvg_wcanvas_ptr as (ctx: number) => number,
    tvg_wcanvas_error: exports.tvg_wcanvas_error as (ctx: number) => number,
    tvg_wcanvas_clear: exports.tvg_wcanvas_clear as (ctx: number) => number,
    tvg_wcanvas_width: exports.tvg_wcanvas_width as (ctx: number) => number,
    tvg_wcanvas_height: exports.tvg_wcanvas_height as (ctx: number) => number,

    // Engine
    _tvg_engine_init: exports.tvg_engine_init as (engineMethod: number, threads: number) => number,
    _tvg_engine_term: exports.tvg_engine_term as (engineMethod: number) => number,
  };

  // Proxy all tvg_* exports as _tvg_* (matching Emscripten convention)
  for (const [name, fn] of Object.entries(exports)) {
    if (name.startsWith('tvg_') && typeof fn === 'function') {
      (module as any)[`_${name}`] = fn;
    }
  }

  // Update heap views when memory grows
  const originalGrow = memory.grow.bind(memory);
  memory.grow = (delta: number): number => {
    const result = originalGrow(delta);
    module.HEAPU8 = new Uint8Array(memory.buffer);
    module.HEAPF32 = new Float32Array(memory.buffer);
    return result;
  };

  return module;
}
