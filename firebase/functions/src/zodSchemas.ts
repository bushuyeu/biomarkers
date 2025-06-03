// @ts-nocheck
/**
 * Local shim for Zod schemas used inside Cloud Functions.
 *
 * We deliberately `require()` the real schema file at runtime instead of letting
 * TypeScript pull it into the compilation tree. This avoids the
 *   error TS6059: File 'X' is not under 'rootDir' …
 * because the real file lives outside firebase/functions/src.
 *
 * If you later move the canonical schemas into a shared workspace or copy them
 * into functions/, you can delete this shim and switch back to a normal
 * `export * from "..."`.
 */

const realSchemas = require("../../../src/lib/zodSchemas");

// Re-export everything from the loaded module so the original names are intact.
module.exports = realSchemas;

/**
 * Re-export biomarker Zod schemas for Cloud Functions.
 *
 * `rootDir` now allows importing files outside `src/`, so a normal re-export
 * gives full type information without the runtime `require` shim.
 */

export * from "../../../src/lib/zodSchemas";