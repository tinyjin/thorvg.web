#!/bin/bash
# Wrapper around clang++ that always passes --target=wasm32-unknown-unknown
exec /Users/jinny/Dev/emsdk/upstream/bin/clang++ --target=wasm32-unknown-unknown "$@"
