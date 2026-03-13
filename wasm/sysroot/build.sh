#!/bin/bash
set -e

# Build minimal sysroot for wasm32-unknown-unknown
# Compiles only needed functions from musl source + dlmalloc + custom sbrk

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/src"
BUILD="$SCRIPT_DIR/build"
LIB="$SCRIPT_DIR/lib/wasm32"

EMSDK_ROOT="${EMSDK:-/Users/jinny/Dev/emsdk}"
CC="$SCRIPT_DIR/../clang_wasm32_cc_wrapper.sh"
CXX="$SCRIPT_DIR/../clang_wasm32_wrapper.sh"
AR="$EMSDK_ROOT/upstream/bin/llvm-ar"

MUSL="$EMSDK_ROOT/upstream/emscripten/system/lib/libc/musl"
EMSDK_SYSROOT="$EMSDK_ROOT/upstream/emscripten/cache/sysroot"

# Use -isystem for sysroot headers + musl internal headers
CFLAGS="-isystem${EMSDK_SYSROOT}/include -Oz -flto -DNDEBUG -DEMSCRIPTEN_OPTIMIZE_FOR_OZ"
CFLAGS="$CFLAGS -I${MUSL}/src/internal -I${MUSL}/src/include"
CFLAGS="$CFLAGS -I${MUSL}/arch/emscripten -I${MUSL}/arch/generic"

echo "=== Building minimal wasm32 sysroot ==="

rm -rf "$BUILD"
mkdir -p "$BUILD"/{string,math,ctype,runtime,dlmalloc,cxx}
mkdir -p "$LIB"

# 1. Runtime (sbrk, abort)
echo "Building runtime..."
$CC $CFLAGS -c "$SRC/runtime/sbrk.c" -o "$BUILD/runtime/sbrk.o"
$CC $CFLAGS -c "$SRC/runtime/abort.c" -o "$BUILD/runtime/abort.o"

# 2. String functions from musl
echo "Building string functions..."
STRING_FUNCS="memcpy memset memmove memcmp memchr strlen strcmp strncmp strcpy strncpy strcat strncat strchr strrchr strstr stpcpy stpncpy strtok_r"
STRING_OK=0
for name in $STRING_FUNCS; do
  f="$MUSL/src/string/$name.c"
  if [ -f "$f" ]; then
    $CC $CFLAGS -c "$f" -o "$BUILD/string/$name.o" 2>/dev/null && STRING_OK=$((STRING_OK+1)) || echo "  FAIL: $name"
  fi
done
echo "  $STRING_OK string functions compiled"

# 3. Ctype functions from musl
echo "Building ctype functions..."
CTYPE_FUNCS="isspace isdigit tolower toupper isalpha isalnum"
for name in $CTYPE_FUNCS; do
  f="$MUSL/src/ctype/$name.c"
  [ -f "$f" ] && $CC $CFLAGS -c "$f" -o "$BUILD/ctype/$name.o" 2>/dev/null || echo "  FAIL: $name"
done

# 4. Math functions from musl (including internal helpers)
echo "Building math functions..."
MATH_OK=0
MATH_FAIL=0
for f in "$MUSL/src/math/"*.c; do
  name=$(basename "$f" .c)
  if $CC $CFLAGS -c "$f" -o "$BUILD/math/$name.o" 2>/dev/null; then
    MATH_OK=$((MATH_OK+1))
  else
    MATH_FAIL=$((MATH_FAIL+1))
  fi
done
echo "  $MATH_OK math functions compiled, $MATH_FAIL skipped"

# 5. Additional musl functions needed
echo "Building additional libc functions..."
# strtod/strtof/strtol etc for number parsing
EXTRA_FUNCS=""
for dir in stdlib errno; do
  for f in "$MUSL/src/$dir/"*.c; do
    name=$(basename "$f" .c)
    $CC $CFLAGS -c "$f" -o "$BUILD/string/${dir}_${name}.o" 2>/dev/null && EXTRA_FUNCS="$EXTRA_FUNCS $name"
  done
done
echo "  Extra: $EXTRA_FUNCS"

# 6. dlmalloc with custom sbrk
echo "Building dlmalloc..."
$CC $CFLAGS \
  -DMALLOC_FAILURE_ACTION= \
  -DABORT_ON_ASSERT_FAILURE=0 \
  -DLACKS_SYS_MMAN_H=1 \
  -DLACKS_UNISTD_H=1 \
  -DLACKS_SYS_PARAM_H=1 \
  -DLACKS_FCNTL_H=1 \
  -DHAVE_MORECORE=1 \
  -DMORECORE=sbrk \
  -DMORECORE_CANNOT_TRIM=1 \
  -DHAVE_MMAP=0 \
  '-Dgetpagesize()=65536' \
  -c "$SRC/dlmalloc/dlmalloc.c" -o "$BUILD/dlmalloc/dlmalloc.o"

# 7. C++ minimal (operator new/delete)
echo "Building C++ minimal..."
$CXX --sysroot="$EMSDK_SYSROOT" -Oz -flto -fno-exceptions -std=c++17 \
  -c "$SRC/cxx/new.cpp" -o "$BUILD/cxx/new.o"

# Create archives
echo ""
echo "Creating archives..."
$AR rcs "$LIB/libc.a" "$BUILD"/string/*.o "$BUILD"/ctype/*.o "$BUILD"/runtime/*.o
$AR rcs "$LIB/libm.a" "$BUILD"/math/*.o
$AR rcs "$LIB/libdlmalloc.a" "$BUILD"/dlmalloc/dlmalloc.o
$AR rcs "$LIB/libcxx_minimal.a" "$BUILD"/cxx/new.o

echo ""
echo "=== Sysroot built ==="
ls -lh "$LIB/"
echo ""
echo "Total:"
du -sh "$LIB/"
