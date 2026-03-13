#!/bin/bash

# Pure Clang WASM32 Build Script for WebCanvas (SW renderer only)
# No Emscripten runtime - uses clang directly with emsdk sysroot for libc/libc++

set -e

EMSDK_ROOT="${EMSDK:-/Users/jinny/Dev/emsdk}"
CLANG="$EMSDK_ROOT/upstream/bin/clang++"
WASM_LD="$EMSDK_ROOT/upstream/bin/wasm-ld"
LLVM_AR="$EMSDK_ROOT/upstream/bin/llvm-ar"
WASM_OPT="${WASM_OPT:-/Users/jinny/Dev/binaryen/bin/wasm-opt}"
SYSROOT="$EMSDK_ROOT/upstream/emscripten/cache/sysroot"
SYSLIB="$SYSROOT/lib/wasm32-emscripten/lto"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
THORVG_DIR="$PROJECT_ROOT/thorvg"
WASM_DIR="$PROJECT_ROOT/wasm"
BUILD_DIR="$SCRIPT_DIR/build_wasm_clang"

echo "=== Pure Clang WASM32 Build (SW only) ==="
echo "Clang: $CLANG"
echo "Sysroot: $SYSROOT"

# Verify tools
if [ ! -f "$CLANG" ]; then
  echo "Error: clang++ not found at $CLANG"
  exit 1
fi

# Step 1: Build ThorVG core library with meson
echo ""
echo "=== Step 1: Building ThorVG core (SW only) ==="
cd "$THORVG_DIR"
rm -rf build_wasm_clang

# Use the clang cross-file
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
echo "ThorVG library: $(ls -lh "$THORVG_LIB" | awk '{print $5}')"

# Step 2: Compile bindings
echo ""
echo "=== Step 2: Compiling WebCanvas bindings ==="
cd "$SCRIPT_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy config header
cp "$THORVG_DIR/build_wasm_clang/config.h" "$WASM_DIR/webcanvas/config.h"

"$WASM_DIR/clang_wasm32_wrapper.sh" \
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

echo "Bindings compiled: $(ls -lh "$BUILD_DIR/bindings.o" | awk '{print $5}')"

# Step 3: Link final wasm
echo ""
echo "=== Step 3: Linking final WASM ==="

# Exported C API functions (matching Emscripten build's EXPORTED_FUNCTIONS)
EXPORTS=(
  # WebCanvas bindings
  tvg_wcanvas_init tvg_wcanvas_term tvg_wcanvas_create tvg_wcanvas_destroy
  tvg_wcanvas_resize tvg_wcanvas_render tvg_wcanvas_render_size
  tvg_wcanvas_ptr tvg_wcanvas_error tvg_wcanvas_clear
  tvg_wcanvas_width tvg_wcanvas_height
  # Memory
  malloc free
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
  # Memory export
  memory
)

# Write export flags to response file (avoids argument length issues)
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
  "$SYSLIB/libc.a" \
  "$SYSLIB/libc++-noexcept.a" \
  "$SYSLIB/libc++abi-noexcept.a" \
  "$SYSLIB/libdlmalloc.a" \
  "$SYSLIB/libcompiler_rt.a"

echo "Linked WASM: $(ls -lh "$BUILD_DIR/thorvg.wasm" | awk '{print $5}')"

# Step 4: Optimize with wasm-opt
echo ""
echo "=== Step 4: Optimizing with wasm-opt ==="
if [ -f "$WASM_OPT" ]; then
  $WASM_OPT -Oz -all \
    -o "$BUILD_DIR/thorvg_opt.wasm" \
    "$BUILD_DIR/thorvg.wasm"
  echo "Optimized WASM: $(ls -lh "$BUILD_DIR/thorvg_opt.wasm" | awk '{print $5}')"
else
  echo "Warning: wasm-opt not found, skipping optimization"
  cp "$BUILD_DIR/thorvg.wasm" "$BUILD_DIR/thorvg_opt.wasm"
fi

# Cleanup
rm "$WASM_DIR/webcanvas/config.h"

# Summary
echo ""
echo "=== Build Summary ==="
echo "Output: $BUILD_DIR/thorvg_opt.wasm"
ls -lh "$BUILD_DIR/thorvg.wasm" "$BUILD_DIR/thorvg_opt.wasm"
echo ""
echo "Emscripten SW build for comparison:"
ls -lh "$SCRIPT_DIR/dist/sw/thorvg.wasm" 2>/dev/null || echo "(not available)"
ls -lh "$SCRIPT_DIR/dist/sw-lite/thorvg.wasm" 2>/dev/null || echo "(not available)"
