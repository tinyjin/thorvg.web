#!/bin/bash

echo "EMSDK: $EMSDK"

# Build default variant with all backends (sw, gl, wg)
rm -rf build_wasm && sh ./wasm_build.sh $EMSDK/
mv thorvg/build_wasm/src/bindings/wasm/thorvg.{wasm,js,d.ts} ./dist
