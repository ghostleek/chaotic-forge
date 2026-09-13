/**
 * Bundles the headless hero-path test with esbuild (browser globals stubbed)
 * and runs it in Node. No browser, no rendering, no randomness.
 */
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = await mkdtemp(join(tmpdir(), "modeshift-test-"));
const outfile = join(dir, "hero-path.mjs");

// Minimal DOM surface the simulation touches (pointer lock + reduced motion).
globalThis.document = globalThis.document ?? { pointerLockElement: null, exitPointerLock() {} };
globalThis.window = globalThis.window ?? { matchMedia: () => ({ matches: false }) };

await build({
  entryPoints: ["scripts/hero-path.test.ts"],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  define: { "import.meta.env.DEV": "false", "import.meta.env.VITE_ASTRA_ENDPOINT": "undefined" },
  logLevel: "error",
});

try {
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(dir, { recursive: true, force: true });
}
