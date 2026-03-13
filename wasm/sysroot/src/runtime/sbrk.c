/*
 * Minimal sbrk implementation for wasm32 using native memory.grow.
 * No Emscripten or WASI dependency.
 */

#include <stdint.h>

/* Provided by wasm-ld */
extern unsigned char __heap_base;
extern unsigned char __data_end;

static uintptr_t heap_end = 0;

void* sbrk(intptr_t increment) {
    if (heap_end == 0) {
        heap_end = (uintptr_t)&__heap_base;
    }

    uintptr_t old = heap_end;
    uintptr_t new_end = old + increment;

    /* Check if we need to grow memory */
    uintptr_t current_memory = (uintptr_t)__builtin_wasm_memory_size(0) * 65536;
    if (new_end > current_memory) {
        uintptr_t pages_needed = (new_end - current_memory + 65535) / 65536;
        if (__builtin_wasm_memory_grow(0, pages_needed) == (unsigned long)-1) {
            return (void*)-1; /* Out of memory */
        }
    }

    heap_end = new_end;
    return (void*)old;
}
