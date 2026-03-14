#!/bin/bash
# Wrapper around clang (C mode) that always passes --target=wasm32-unknown-unknown
exec /opt/homebrew/opt/llvm/bin/clang --target=wasm32-unknown-unknown "$@"
