import * as WasmBoyModule from 'wasmboy'

// wasmboy's module shape differs between Vite dev (default export only)
// and a rollup production build (named export only) — support both.
export const WasmBoy = WasmBoyModule.WasmBoy || WasmBoyModule.default?.WasmBoy || WasmBoyModule.default
