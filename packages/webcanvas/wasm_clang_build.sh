#!/bin/bash

# Pure Clang WASM32 Build Script for WebCanvas (SW renderer only)
#
# Builds ThorVG wasm without Emscripten compiler (emcc).
# Uses emsdk's LLVM toolchain (clang/wasm-ld) directly + emsdk sysroot headers.
# Custom libc.a/libm.a from musl source for string/math/ctype.
# Emscripten's dlmalloc/libc++/compiler-rt for memory allocation and C++ runtime.
# Result: ~605KB wasm + ~2KB JS loader (vs Emscripten's 614KB + 107KB JS glue)

set -e

LLVM_PREFIX="${LLVM_PREFIX:-/opt/homebrew/opt/llvm}"
WASM_LD="${WASM_LD:-/opt/homebrew/bin/wasm-ld}"
LLVM_AR="$LLVM_PREFIX/bin/llvm-ar"
WASM_OPT="${WASM_OPT:-/Users/jinny/Dev/binaryen/bin/wasm-opt}"
# emsdk sysroot still needed for C/C++ headers and dlmalloc/libc++
EMSDK_ROOT="${EMSDK:-/Users/jinny/Dev/emsdk}"
SYSROOT="$EMSDK_ROOT/upstream/emscripten/cache/sysroot"
SYSLIB="$SYSROOT/lib/wasm32-emscripten/lto"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
THORVG_DIR="$PROJECT_ROOT/thorvg"
WASM_DIR="$PROJECT_ROOT/wasm"
BUILD_DIR="$SCRIPT_DIR/build_wasm_clang"
CUSTOM_LIB="$WASM_DIR/sysroot/lib/wasm32"

echo "=== Pure Clang WASM32 Build (SW only) ==="

# Verify tools
for tool in "$WASM_LD" "$LLVM_AR" "$WASM_DIR/clang_wasm32_wrapper.sh"; do
  if [ ! -f "$tool" ]; then
    echo "Error: $(basename $tool) not found at $tool"
    exit 1
  fi
done

# Step 0: Build custom sysroot (libc.a, libm.a) if needed
if [ ! -f "$CUSTOM_LIB/libc.a" ] || [ ! -f "$CUSTOM_LIB/libm.a" ]; then
  echo ""
  echo "=== Step 0: Building custom sysroot ==="
  bash "$WASM_DIR/sysroot/build.sh"
fi

# Step 1: Build ThorVG core library
echo ""
echo "=== Step 1: Building ThorVG core (SW only) ==="
cd "$THORVG_DIR"
rm -rf build_wasm_clang

meson setup \
  -Db_lto=true \
  -Ddefault_library=static \
  -Dstatic=true \
  -Dloaders="all" \
  -Dsavers="all" \
  -Dthreads=false \
  -Dfile="false" \
  -Dbindings="capi" \
  -Dpartial=true \
  -Dengines="sw" \
  -Dextra="lottie_exp" \
  --cross-file "$WASM_DIR/wasm32_clang.txt" \
  build_wasm_clang

ninja -C build_wasm_clang/

THORVG_LIB="$THORVG_DIR/build_wasm_clang/src/libthorvg-1.a"
if [ ! -f "$THORVG_LIB" ]; then
  echo "Error: libthorvg-1.a not found"
  exit 1
fi

# Step 2: Compile bindings
echo ""
echo "=== Step 2: Compiling WebCanvas bindings ==="
cd "$SCRIPT_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cp "$THORVG_DIR/build_wasm_clang/config.h" "$WASM_DIR/webcanvas/config.h"

"$WASM_DIR/clang_wasm32_wrapper.sh" \
  -I"$WASM_DIR/sysroot/include" \
  --sysroot="$SYSROOT" \
  -std=c++17 -Oz -flto -fno-exceptions \
  -fvisibility=default \
  -DNDEBUG \
  -DTHORVG_SW_RASTER_SUPPORT \
  -I"$THORVG_DIR/inc" \
  -I"$THORVG_DIR/src/common" \
  -I"$THORVG_DIR/src/bindings/capi" \
  -I"$THORVG_DIR/build_wasm_clang" \
  -I"$WASM_DIR/common" \
  -c "$WASM_DIR/webcanvas/tvgWasmWebCanvasClang.cpp" \
  -o "$BUILD_DIR/bindings.o"

rm "$WASM_DIR/webcanvas/config.h"

# Step 3: Link
echo ""
echo "=== Step 3: Linking ==="

EXPORTS=(
  # WebCanvas
  tvg_wcanvas_init tvg_wcanvas_term tvg_wcanvas_create tvg_wcanvas_destroy
  tvg_wcanvas_resize tvg_wcanvas_render tvg_wcanvas_render_size
  tvg_wcanvas_ptr tvg_wcanvas_error tvg_wcanvas_clear
  tvg_wcanvas_width tvg_wcanvas_height
  # Memory
  malloc free memory
  # Engine
  tvg_engine_init tvg_engine_term
  # Canvas
  tvg_swcanvas_create tvg_swcanvas_set_target
  tvg_canvas_destroy tvg_canvas_add tvg_canvas_insert tvg_canvas_remove
  tvg_canvas_draw tvg_canvas_sync tvg_canvas_update tvg_canvas_set_viewport
  # Shape
  tvg_shape_new tvg_shape_reset tvg_shape_move_to tvg_shape_line_to
  tvg_shape_cubic_to tvg_shape_close tvg_shape_append_rect tvg_shape_append_circle
  tvg_shape_append_path tvg_shape_get_path
  tvg_shape_set_fill_color tvg_shape_get_fill_color tvg_shape_set_fill_rule tvg_shape_get_fill_rule
  tvg_shape_set_trimpath tvg_shape_set_stroke_width tvg_shape_get_stroke_width
  tvg_shape_set_stroke_color tvg_shape_get_stroke_color
  tvg_shape_set_stroke_join tvg_shape_get_stroke_join
  tvg_shape_set_stroke_cap tvg_shape_get_stroke_cap
  tvg_shape_set_stroke_gradient tvg_shape_get_stroke_gradient
  tvg_shape_set_stroke_dash tvg_shape_get_stroke_dash
  tvg_shape_set_gradient tvg_shape_get_gradient tvg_shape_set_stroke_miterlimit
  # Paint
  tvg_paint_rel tvg_paint_ref tvg_paint_unref tvg_paint_get_ref tvg_paint_duplicate
  tvg_paint_set_transform tvg_paint_get_transform
  tvg_paint_translate tvg_paint_scale tvg_paint_rotate
  tvg_paint_set_opacity tvg_paint_get_opacity
  tvg_paint_set_clip tvg_paint_get_clip tvg_paint_get_aabb tvg_paint_get_obb
  tvg_paint_get_type tvg_paint_set_blend_method tvg_paint_set_mask_method
  tvg_paint_intersects tvg_paint_set_visible tvg_paint_get_visible
  # Gradient
  tvg_linear_gradient_new tvg_linear_gradient_set tvg_linear_gradient_get
  tvg_radial_gradient_new tvg_radial_gradient_set tvg_radial_gradient_get
  tvg_gradient_set_color_stops tvg_gradient_get_color_stops
  tvg_gradient_set_spread tvg_gradient_get_spread tvg_gradient_del
  # Scene
  tvg_scene_new tvg_scene_add tvg_scene_insert tvg_scene_remove tvg_scene_clear_effects
  tvg_scene_add_effect_gaussian_blur tvg_scene_add_effect_drop_shadow
  tvg_scene_add_effect_fill tvg_scene_add_effect_tint tvg_scene_add_effect_tritone
  # Picture
  tvg_picture_new tvg_picture_load tvg_picture_load_raw tvg_picture_load_data
  tvg_picture_set_size tvg_picture_get_size tvg_picture_set_origin tvg_picture_get_origin
  # Animation
  tvg_animation_new tvg_animation_set_frame tvg_animation_get_picture
  tvg_animation_get_frame tvg_animation_get_total_frame tvg_animation_get_duration
  tvg_animation_set_segment tvg_animation_get_segment tvg_animation_del
  # Text
  tvg_text_new tvg_text_set_font tvg_text_set_size tvg_text_set_text tvg_text_set_color
  tvg_text_set_gradient tvg_text_align tvg_text_layout tvg_text_wrap_mode
  tvg_text_spacing tvg_text_set_italic tvg_text_set_outline
  # Font
  tvg_font_load tvg_font_load_data tvg_font_unload
  # Accessor
  tvg_accessor_new tvg_accessor_del tvg_accessor_set
)

EXPORT_FILE="$BUILD_DIR/exports.txt"
: > "$EXPORT_FILE"
for sym in "${EXPORTS[@]}"; do
  echo "--export=$sym" >> "$EXPORT_FILE"
done

$WASM_LD \
  --no-entry \
  --lto-O3 -O3 \
  --gc-sections \
  --strip-all \
  --allow-undefined \
  @"$EXPORT_FILE" \
  -o "$BUILD_DIR/thorvg.wasm" \
  "$BUILD_DIR/bindings.o" \
  "$THORVG_LIB" \
  "$CUSTOM_LIB/libc.a" \
  "$CUSTOM_LIB/libm.a" \
  "$SYSLIB/libdlmalloc.a" \
  "$SYSLIB/libc++-noexcept.a" \
  "$SYSLIB/libc++abi-noexcept.a" \
  "$SYSLIB/libcompiler_rt.a"

echo "Linked: $(ls -lh "$BUILD_DIR/thorvg.wasm" | awk '{print $5}')"

# Step 4: Optimize
echo ""
echo "=== Step 4: Optimizing ==="
if [ -f "$WASM_OPT" ]; then
  $WASM_OPT -Oz -all --converge \
    --optimize-instructions \
    --dce --remove-unused-module-elements --remove-unused-names \
    --strip-debug --strip-producers \
    --merge-similar-functions --coalesce-locals \
    --reorder-functions --reorder-locals \
    -o "$BUILD_DIR/thorvg_opt.wasm" \
    "$BUILD_DIR/thorvg.wasm"
else
  cp "$BUILD_DIR/thorvg.wasm" "$BUILD_DIR/thorvg_opt.wasm"
fi

echo ""
echo "============================================="
echo "  Output: $BUILD_DIR/thorvg_opt.wasm"
echo "  Size:   $(ls -lh "$BUILD_DIR/thorvg_opt.wasm" | awk '{print $5}')"
echo "============================================="
