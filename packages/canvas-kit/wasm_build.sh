#!/bin/bash

# Canvas Kit WASM Build Script
# Builds ThorVG with Canvas Kit bindings (capi + wasm_beta)

EMSDK="$1"

if [ -z "$EMSDK" ]; then
  echo "Usage: $0 <EMSDK_PATH>"
  exit 1
fi

cd thorvg

# Use unique build directory for canvas-kit
BUILD_DIR="build_wasm_canvaskit"

# Clean previous build
echo "Cleaning previous build..."
rm -rf $BUILD_DIR

# Determine cross file based on available engines
CROSS_FILE="wasm32_canvaskit.txt"

echo "Building with cross file: $CROSS_FILE"

# Replace EMSDK path in cross file
sed "s|EMSDK:|$EMSDK|g" ./cross/$CROSS_FILE > /tmp/.wasm_canvaskit_cross.txt

# Configure meson build
echo "Configuring meson..."
meson setup \
  -Db_lto=true \
  -Ddefault_library=static \
  -Dstatic=true \
  -Dloaders="all" \
  -Dsavers="all" \
  -Dthreads=false \
  -Dfile="false" \
  -Dbindings="capi, wasm_canvaskit" \
  -Dpartial=false \
  -Dengines="all" \
  --cross-file /tmp/.wasm_canvaskit_cross.txt \
  $BUILD_DIR

if [ $? -ne 0 ]; then
  echo "Meson setup failed!"
  exit 1
fi

# Build with ninja
echo "Building with ninja..."
ninja -C $BUILD_DIR/

if [ $? -ne 0 ]; then
  echo "Ninja build failed!"
  exit 1
fi

echo "Build completed successfully!"
ls -lrt $BUILD_DIR/src/bindings/wasm/*.{js,wasm}

cd ..
