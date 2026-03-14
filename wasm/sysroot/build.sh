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
AR="${LLVM_PREFIX:-/opt/homebrew/opt/llvm}/bin/llvm-ar"

MUSL="$EMSDK_ROOT/upstream/emscripten/system/lib/libc/musl"
EMSDK_SYSROOT="$EMSDK_ROOT/upstream/emscripten/cache/sysroot"

# Use -isystem for sysroot headers + musl internal headers
CFLAGS="-isystem${EMSDK_SYSROOT}/include -Oz -flto -DNDEBUG -DEMSCRIPTEN_OPTIMIZE_FOR_OZ"
CFLAGS="$CFLAGS -I${MUSL}/src/internal -I${MUSL}/src/include"
CFLAGS="$CFLAGS -I${MUSL}/arch/emscripten -I${MUSL}/arch/generic"

echo "=== Building minimal wasm32 sysroot ==="

rm -rf "$BUILD"
mkdir -p "$BUILD"/{string,math,ctype}
mkdir -p "$LIB"

# 1. String functions from musl
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

# 5. Additional musl functions (from build_extra.sh findings)
echo "Building additional libc functions..."
EXTRA_OK=0
for path in \
  string/strdup string/strcspn string/strspn \
  string/strcasecmp string/strncasecmp \
  ctype/isxdigit \
  prng/rand prng/__rand48_step prng/__seed48 \
  stdio/snprintf \
  ; do
  name=$(basename "$path")
  src="$MUSL/src/$path.c"
  if [ -f "$src" ]; then
    "$CC" $CFLAGS -c "$src" -o "$BUILD/string/extra_$name.o" 2>/dev/null && EXTRA_OK=$((EXTRA_OK+1))
  fi
done
# Also stdlib functions
for f in "$MUSL/src/stdlib/"*.c "$MUSL/src/errno/"*.c; do
  name=$(basename "$f" .c)
  $CC $CFLAGS -c "$f" -o "$BUILD/string/extra_${name}.o" 2>/dev/null && EXTRA_OK=$((EXTRA_OK+1))
done
echo "  $EXTRA_OK extra functions compiled"

# Create archives (only libc.a and libm.a - dlmalloc/libc++/compiler-rt from emsdk)
echo ""
echo "Creating archives..."
$AR rcs "$LIB/libc.a" "$BUILD"/string/*.o "$BUILD"/ctype/*.o
$AR rcs "$LIB/libm.a" "$BUILD"/math/*.o

echo ""
echo "=== Sysroot built ==="
ls -lh "$LIB/"
echo ""
echo "Total:"
du -sh "$LIB/"
