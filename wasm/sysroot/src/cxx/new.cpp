/*
 * Minimal C++ operator new/delete for wasm32.
 * Thin wrappers around malloc/free.
 */

extern "C" void* malloc(unsigned long size);
extern "C" void free(void* ptr);

void* operator new(unsigned long size) { return malloc(size); }
void* operator new[](unsigned long size) { return malloc(size); }
void operator delete(void* ptr) noexcept { free(ptr); }
void operator delete[](void* ptr) noexcept { free(ptr); }
void operator delete(void* ptr, unsigned long) noexcept { free(ptr); }
void operator delete[](void* ptr, unsigned long) noexcept { free(ptr); }
