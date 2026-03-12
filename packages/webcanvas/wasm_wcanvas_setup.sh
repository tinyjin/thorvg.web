#!/bin/bash

# WebCanvas WASM Setup Script
# Builds WASM for all presets and copies output to dist/

echo "EMSDK: $EMSDK"

if [ -z "$EMSDK" ]; then
  echo "ERROR: EMSDK environment variable is not set!"
  echo "Please set EMSDK to your Emscripten SDK path."
  exit 1
fi

build_preset() {
  local ENGINE="$1"
  local DEST="$2"

  echo ""
  echo "================================================"
  echo "Building preset: ${ENGINE:-default}"
  echo "================================================"

  rm -rf build_wasm_wcanvas

  if [ -z "$ENGINE" ]; then
    sh ./wasm_wcanvas_build.sh "$EMSDK/"
  else
    sh ./wasm_wcanvas_build.sh "$ENGINE" "$EMSDK/"
  fi

  if [ $? -ne 0 ]; then
    echo "WASM build failed for preset: ${ENGINE:-default}"
    exit 1
  fi

  mkdir -p "$DEST"

  if [ -z "$ENGINE" ]; then
    # Default build: include .d.ts
    mv build_wasm_wcanvas/thorvg.js "$DEST/"
    mv build_wasm_wcanvas/thorvg.wasm "$DEST/"
    mv build_wasm_wcanvas/thorvg.d.ts "$DEST/"
  else
    mv build_wasm_wcanvas/thorvg.js "$DEST/"
    mv build_wasm_wcanvas/thorvg.wasm "$DEST/"
    # Copy worker file if present (pthread builds generate this for Web Worker threads)
    if [ -f build_wasm_wcanvas/thorvg.worker.js ]; then
      mv build_wasm_wcanvas/thorvg.worker.js "$DEST/"
    fi
  fi

  echo "Preset ${ENGINE:-default} completed:"
  ls -lh "$DEST"/thorvg.*
}

# Default (all engines, all loaders)
build_preset "" "./dist"

# Full presets (single engine, all loaders)
build_preset "sw" "./dist/sw"
build_preset "gl" "./dist/gl"
build_preset "wg" "./dist/wg"

# Lite presets (single engine, minimal loaders)
build_preset "sw-lite" "./dist/sw-lite"
build_preset "gl-lite" "./dist/gl-lite"
build_preset "wg-lite" "./dist/wg-lite"

# Pthread preset (all engines, all loaders, thread support)
build_preset "pthread" "./dist/pthread"

# Cleanup
rm -rf build_wasm_wcanvas

echo ""
echo "================================================"
echo "All WASM presets built successfully!"
echo "================================================"
echo ""
echo "Preset sizes:"
for dir in dist dist/sw dist/gl dist/wg dist/sw-lite dist/gl-lite dist/wg-lite dist/pthread; do
  if [ -f "$dir/thorvg.wasm" ]; then
    SIZE=$(ls -lh "$dir/thorvg.wasm" | awk '{print $5}')
    echo "  $dir/thorvg.wasm: $SIZE"
  fi
done
