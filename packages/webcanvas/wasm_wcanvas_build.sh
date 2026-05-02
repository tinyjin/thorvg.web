#!/bin/bash

# WebCanvas WASM Build Script
# Builds ThorVG library + WebCanvas bindings
#
# Usage:
#   ./wasm_wcanvas_build.sh <EMSDK_PATH>              # default (all engines, all loaders)
#   ./wasm_wcanvas_build.sh <ENGINE> <EMSDK_PATH>     # engine-specific build
#
# ENGINE options: sw, gl, wg, sw-lite, gl-lite, wg-lite, pthread

BACKEND="$1"
EMSDK="$2"

if [ -z "$2" ]; then
  BACKEND="all"
  EMSDK="$1"
fi

if [ -z "$EMSDK" ]; then
  echo "Usage: $0 [ENGINE] <EMSDK_PATH>"
  echo "ENGINE: sw, gl, wg, sw-lite, gl-lite, wg-lite, pthread (default: all)"
  exit 1
fi

# Remove trailing slash from EMSDK path
EMSDK="${EMSDK%/}"

# Base exported functions (shared across all engines)
BASE_FUNCTIONS="_tvg_engine_init,_tvg_engine_term,_tvg_swcanvas_create,_tvg_swcanvas_set_target,_tvg_glcanvas_create,_tvg_wgcanvas_create,_tvg_canvas_destroy,_tvg_canvas_add,_tvg_canvas_insert,_tvg_canvas_remove,_tvg_canvas_draw,_tvg_canvas_sync,_tvg_canvas_update,_tvg_canvas_set_viewport,_tvg_shape_new,_tvg_shape_reset,_tvg_shape_move_to,_tvg_shape_line_to,_tvg_shape_cubic_to,_tvg_shape_close,_tvg_shape_append_rect,_tvg_shape_append_circle,_tvg_shape_append_path,_tvg_shape_get_path,_tvg_shape_set_fill_color,_tvg_shape_get_fill_color,_tvg_shape_set_fill_rule,_tvg_shape_get_fill_rule,_tvg_shape_set_trimpath,_tvg_shape_set_stroke_width,_tvg_shape_get_stroke_width,_tvg_shape_set_stroke_color,_tvg_shape_get_stroke_color,_tvg_shape_set_stroke_join,_tvg_shape_get_stroke_join,_tvg_shape_set_stroke_cap,_tvg_shape_get_stroke_cap,_tvg_shape_set_stroke_gradient,_tvg_shape_get_stroke_gradient,_tvg_shape_set_stroke_dash,_tvg_shape_get_stroke_dash,_tvg_shape_set_gradient,_tvg_shape_get_gradient,_tvg_shape_set_stroke_miterlimit,_tvg_paint_rel,_tvg_paint_ref,_tvg_paint_unref,_tvg_paint_get_ref,_tvg_paint_duplicate,_tvg_paint_set_transform,_tvg_paint_get_transform,_tvg_paint_translate,_tvg_paint_scale,_tvg_paint_rotate,_tvg_paint_set_opacity,_tvg_paint_get_opacity,_tvg_paint_set_clip,_tvg_paint_get_clip,_tvg_paint_get_aabb,_tvg_paint_get_obb,_tvg_paint_get_type,_tvg_paint_set_blend_method,_tvg_paint_set_mask_method,_tvg_paint_intersects,_tvg_paint_set_visible,_tvg_paint_get_visible,_tvg_linear_gradient_new,_tvg_linear_gradient_set,_tvg_linear_gradient_get,_tvg_radial_gradient_new,_tvg_radial_gradient_set,_tvg_radial_gradient_get,_tvg_gradient_set_color_stops,_tvg_gradient_get_color_stops,_tvg_gradient_set_spread,_tvg_gradient_get_spread,_tvg_gradient_del,_tvg_scene_new,_tvg_scene_add,_tvg_scene_insert,_tvg_scene_remove,_tvg_scene_clear_effects,_tvg_scene_add_effect_gaussian_blur,_tvg_scene_add_effect_drop_shadow,_tvg_scene_add_effect_fill,_tvg_scene_add_effect_tint,_tvg_scene_add_effect_tritone,_tvg_picture_new,_tvg_picture_load,_tvg_picture_load_raw,_tvg_picture_load_data,_tvg_picture_set_size,_tvg_picture_get_size,_tvg_picture_set_origin,_tvg_picture_get_origin,_tvg_animation_new,_tvg_animation_set_frame,_tvg_animation_get_picture,_tvg_animation_get_frame,_tvg_animation_get_total_frame,_tvg_animation_get_duration,_tvg_animation_set_segment,_tvg_animation_get_segment,_tvg_animation_del,_tvg_text_new,_tvg_text_set_font,_tvg_text_set_size,_tvg_text_set_text,_tvg_text_set_color,_tvg_text_set_gradient,_tvg_text_align,_tvg_text_layout,_tvg_text_wrap_mode,_tvg_text_spacing,_tvg_text_set_italic,_tvg_text_set_outline,_tvg_text_get_text,_tvg_text_line_count,_tvg_text_get_text_metrics,_tvg_text_get_glyph_metrics,_tvg_font_load,_tvg_font_load_data,_tvg_font_unload,_tvg_accessor_new,_tvg_accessor_del,_tvg_accessor_set,_tvg_accessor_generate_id,_tvg_paint_get_id,_tvg_paint_set_id,_tvg_picture_get_paint,_malloc,_free"

# Engine-specific canvas create functions
SW_CANVAS_FUNCTIONS="_tvg_swcanvas_create,_tvg_swcanvas_set_target"
GL_CANVAS_FUNCTIONS="_tvg_glcanvas_create"
WG_CANVAS_FUNCTIONS="_tvg_wgcanvas_create"
ALL_CANVAS_FUNCTIONS="${SW_CANVAS_FUNCTIONS},${GL_CANVAS_FUNCTIONS},${WG_CANVAS_FUNCTIONS}"

# Define exported runtime methods for WebCanvas
EXPORTED_RUNTIME_METHODS="HEAPU8,HEAP32,HEAPF32,addFunction,removeFunction"

# Determine engine-specific settings
case "$BACKEND" in
  sw)
    CROSS_FILE="wasm32_sw.txt"
    ENGINES="cpu"
    LOADERS="lottie,jpg,png,webp,ttf"
    EXTRA="lottie_exp"
    SAVERS="all"
    CANVAS_FUNCTIONS="${SW_CANVAS_FUNCTIONS}"
    ;;
  gl)
    CROSS_FILE="wasm32_gl.txt"
    ENGINES="gl"
    LOADERS="lottie,jpg,png,webp,ttf"
    EXTRA="lottie_exp"
    SAVERS="all"
    CANVAS_FUNCTIONS="${GL_CANVAS_FUNCTIONS}"
    ;;
  wg)
    CROSS_FILE="wasm32_wg.txt"
    ENGINES="wg"
    LOADERS="lottie,jpg,png,webp,ttf"
    EXTRA="lottie_exp"
    SAVERS="all"
    CANVAS_FUNCTIONS="${WG_CANVAS_FUNCTIONS}"
    ;;
  sw-lite)
    CROSS_FILE="wasm32_sw.txt"
    ENGINES="cpu"
    LOADERS="lottie,png"
    EXTRA=""
    SAVERS=""
    CANVAS_FUNCTIONS="${SW_CANVAS_FUNCTIONS}"
    ;;
  gl-lite)
    CROSS_FILE="wasm32_gl.txt"
    ENGINES="gl"
    LOADERS="lottie,png"
    EXTRA=""
    SAVERS=""
    CANVAS_FUNCTIONS="${GL_CANVAS_FUNCTIONS}"
    ;;
  wg-lite)
    CROSS_FILE="wasm32_wg.txt"
    ENGINES="wg"
    LOADERS="lottie,png"
    EXTRA=""
    SAVERS=""
    CANVAS_FUNCTIONS="${WG_CANVAS_FUNCTIONS}"
    ;;
  pthread)
    CROSS_FILE="wasm32.txt"
    ENGINES="all"
    LOADERS="all"
    EXTRA="lottie_exp"
    SAVERS="all"
    CANVAS_FUNCTIONS="${ALL_CANVAS_FUNCTIONS}"
    PTHREAD="true"
    ;;
  all)
    CROSS_FILE="wasm32.txt"
    ENGINES="all"
    LOADERS="all"
    EXTRA="lottie_exp"
    SAVERS="all"
    CANVAS_FUNCTIONS="${ALL_CANVAS_FUNCTIONS}"
    ;;
  *)
    echo "Unknown engine: $BACKEND"
    echo "Valid options: sw, gl, wg, sw-lite, gl-lite, wg-lite, pthread"
    exit 1
    ;;
esac

EXPORTED_FUNCTIONS="${CANVAS_FUNCTIONS},${BASE_FUNCTIONS}"

# Step 1: Build ThorVG library
cd ../../thorvg
rm -rf build_wasm_wcanvas

# Generate temporary cross file with WebCanvas specific modifications
# 1. Replace EMSDK: placeholder with actual path
# 2. Remove -fno-exceptions from cpp_args
# 3. Remove --closure=1 and -sEXPORTED_RUNTIME_METHODS=FS from cpp_link_args
# 4. Add WebCanvas specific flags
# 5. For pthread: add -pthread compile/link flags, SharedArrayBuffer memory settings,
#    and dynamic thread pool size via PTHREAD_POOL_SIZE
if [ "$BACKEND" = "all" ]; then
  sed "s|EMSDK:|$EMSDK/|g" ../wasm/${CROSS_FILE} | \
    sed "s|, '-fno-exceptions'||g" | \
    sed "s|'-fno-exceptions', ||g" | \
    sed "s|, '--closure=1'||g" | \
    sed "s|, '-sEXPORTED_RUNTIME_METHODS=FS'||g" | \
    sed "s|'--bind'|'--bind', '--emit-tsd=thorvg.d.ts', '-sEXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}', '-sEXPORTED_RUNTIME_METHODS=${EXPORTED_RUNTIME_METHODS}', '-sDISABLE_EXCEPTION_CATCHING=0', '-sDISABLE_EXCEPTION_THROWING=0', '-sALLOW_TABLE_GROWTH=1', '-sINITIAL_TABLE=128'|g" > /tmp/.wasm_webcanvas_cross.txt
elif [ "$PTHREAD" = "true" ]; then
  sed "s|EMSDK:|$EMSDK/|g" ../wasm/${CROSS_FILE} | \
    sed "s|, '-fno-exceptions'||g" | \
    sed "s|'-fno-exceptions', ||g" | \
    sed "s|, '--closure=1'||g" | \
    sed "s|, '-sEXPORTED_RUNTIME_METHODS=FS'||g" | \
    sed "s|cpp_args = \[|cpp_args = ['-pthread', |g" | \
    sed "s|'--bind'|'--bind', '-pthread', '-sPTHREAD_POOL_SIZE=(typeof globalThis.__THORVG_THREAD_COUNT !== \"undefined\" ? globalThis.__THORVG_THREAD_COUNT : (typeof navigator !== \"undefined\" \&\& navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4))', '-sPTHREAD_POOL_SIZE_STRICT=0', '-sINITIAL_MEMORY=134217728', '-sALLOW_MEMORY_GROWTH=1', '-sEXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}', '-sEXPORTED_RUNTIME_METHODS=${EXPORTED_RUNTIME_METHODS}', '-sDISABLE_EXCEPTION_CATCHING=0', '-sDISABLE_EXCEPTION_THROWING=0', '-sALLOW_TABLE_GROWTH=1', '-sINITIAL_TABLE=128'|g" > /tmp/.wasm_webcanvas_cross.txt
else
  sed "s|EMSDK:|$EMSDK/|g" ../wasm/${CROSS_FILE} | \
    sed "s|, '-fno-exceptions'||g" | \
    sed "s|'-fno-exceptions', ||g" | \
    sed "s|, '--closure=1'||g" | \
    sed "s|, '-sEXPORTED_RUNTIME_METHODS=FS'||g" | \
    sed "s|'--bind'|'--bind', '-sEXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}', '-sEXPORTED_RUNTIME_METHODS=${EXPORTED_RUNTIME_METHODS}', '-sDISABLE_EXCEPTION_CATCHING=0', '-sDISABLE_EXCEPTION_THROWING=0', '-sALLOW_TABLE_GROWTH=1', '-sINITIAL_TABLE=128'|g" > /tmp/.wasm_webcanvas_cross.txt
fi

# Note: Always pass -Dthreads=false for Emscripten builds.
# Emscripten handles pthread via the -pthread compiler/linker flag, not via a separate library.
# ThorVG's meson.build does find_library('pthread') when threads=true, which fails on Emscripten.
# For pthread builds, we inject THORVG_THREAD_SUPPORT into config.h after meson setup instead.
MESON_ARGS="-Db_lto=true -Ddefault_library=static -Dstatic=true -Dthreads=false -Dfile=false -Dbindings=capi -Dpartial=true"
MESON_ARGS="${MESON_ARGS} -Dengines=${ENGINES} -Dloaders=${LOADERS}"

# Always pass -Dextra to override default (which includes openmp, incompatible with Emscripten)
MESON_ARGS="${MESON_ARGS} -Dextra=${EXTRA:-}"

if [ -n "$SAVERS" ]; then
  MESON_ARGS="${MESON_ARGS} -Dsavers=${SAVERS}"
fi

meson setup \
  ${MESON_ARGS} \
  --cross-file /tmp/.wasm_webcanvas_cross.txt \
  build_wasm_wcanvas

if [ $? -ne 0 ]; then
  echo "ThorVG library meson setup failed!"
  exit 1
fi

# For pthread builds: inject THORVG_THREAD_SUPPORT into config.h
# This enables ThorVG's TaskScheduler and thread-safe locks.
# The actual pthread support comes from -pthread in cpp_args/cpp_link_args.
if [ "$PTHREAD" = "true" ]; then
  echo "" >> build_wasm_wcanvas/config.h
  echo "#define THORVG_THREAD_SUPPORT 1" >> build_wasm_wcanvas/config.h
fi

ninja -C build_wasm_wcanvas/

if [ $? -ne 0 ]; then
  echo "ThorVG library build failed!"
  exit 1
fi

cd ../packages/webcanvas

# Step 2: Build WASM bindings
rm -rf build_wasm_wcanvas

cp ../../thorvg/build_wasm_wcanvas/config.h ../../wasm/webcanvas/config.h
meson setup -Db_lto=true --cross-file /tmp/.wasm_webcanvas_cross.txt build_wasm_wcanvas ../../wasm/webcanvas

if [ $? -ne 0 ]; then
  echo "WebCanvas bindings meson setup failed!"
  exit 1
fi

ninja -C build_wasm_wcanvas/

if [ $? -ne 0 ]; then
  echo "WebCanvas bindings build failed!"
  exit 1
fi

rm ../../wasm/webcanvas/config.h

echo "Build completed successfully! (engine: $BACKEND)"
ls -lrt build_wasm_wcanvas/*.js build_wasm_wcanvas/*.wasm
