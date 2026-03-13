/*
 * Minimal abort for wasm32. Traps the wasm instance.
 */

_Noreturn void abort(void) {
    __builtin_trap();
}
