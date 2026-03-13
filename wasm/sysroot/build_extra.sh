#!/bin/bash
set -e

CC="/Users/jinny/Work/LottieFiles/thorvg.web/wasm/clang_wasm32_cc_wrapper.sh"
EMSDK_SYSROOT="/Users/jinny/Dev/emsdk/upstream/emscripten/cache/sysroot"
MUSL="/Users/jinny/Dev/emsdk/upstream/emscripten/system/lib/libc/musl"
BUILD="/Users/jinny/Work/LottieFiles/thorvg.web/wasm/sysroot/build/extra"
AR="/Users/jinny/Dev/emsdk/upstream/bin/llvm-ar"
LIB="/Users/jinny/Work/LottieFiles/thorvg.web/wasm/sysroot/lib/wasm32"

mkdir -p "$BUILD"

compile_c() {
  local src="$1"
  local out="$2"
  "$CC" -isystem "$EMSDK_SYSROOT/include" -Oz -flto -DNDEBUG -DEMSCRIPTEN_OPTIMIZE_FOR_OZ \
    -I"$MUSL/src/internal" -I"$MUSL/src/include" \
    -I"$MUSL/arch/emscripten" -I"$MUSL/arch/generic" \
    -c "$src" -o "$out"
}

PATHS="string/memcmp string/strdup string/strcspn string/strspn string/strcasecmp string/strncasecmp ctype/isxdigit prng/rand prng/__rand48_step prng/__seed48 stdio/snprintf stdio/vsnprintf"

OK=0
FAIL=0
for path in $PATHS; do
  name=$(basename "$path")
  src="$MUSL/src/$path.c"
  if [ -f "$src" ]; then
    if compile_c "$src" "$BUILD/$name.o" 2>/dev/null; then
      echo "OK: $name"
      OK=$((OK+1))
    else
      echo "FAIL: $name"
      compile_c "$src" "$BUILD/$name.o" 2>&1 | head -3
      FAIL=$((FAIL+1))
    fi
  else
    echo "NOT FOUND: $path"
  fi
done

echo ""
echo "OK: $OK, FAIL: $FAIL"
echo "Objects: $(ls "$BUILD"/*.o 2>/dev/null | wc -l | tr -d ' ')"

# Rebuild libc.a
SYSROOT_BUILD="/Users/jinny/Work/LottieFiles/thorvg.web/wasm/sysroot/build"
"$AR" rcs "$LIB/libc.a" "$SYSROOT_BUILD"/string/*.o "$SYSROOT_BUILD"/ctype/*.o "$SYSROOT_BUILD"/runtime/*.o "$BUILD"/*.o
echo "libc.a: $(ls -lh "$LIB/libc.a" | awk '{print $5}')"
