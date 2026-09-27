// Regression coverage for a real bug found live during item 14's (React 17->18) smoke pass:
// config/rspack/rspack.config.js had a leftover `rspack.IgnorePlugin({ resourceRegExp:
// /^react-dom\/client$/ })`, added 2026-09-05 (feat/bump-shakapacker) with a
// "// FIXME: remove this after react18 migration" comment, specifically to keep the not-yet-
// migrated app from accidentally pulling in the React 18-only `react-dom/client` entry point
// early. Once react/react-dom were actually bumped to 18, this plugin silently broke every
// `import { createRoot } from "react-dom/client"` call at runtime ("Cannot find module
// 'react-dom/client'") -- `yarn build`/`yarn vitest run` both stayed green throughout, since
// neither actually exercises rspack's bundled runtime behavior; only a live page load did.
//
// This can't be a normal component test (vitest transforms via Vite/esbuild, not rspack, so it
// never consults this config at all) -- it reads the config source directly instead, as a static
// tripwire against the exact regression class (an IgnorePlugin, alias, or externals entry that
// would block react-dom's `/client` entry point from resolving).

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rspackConfigPath = path.resolve(
    __dirname,
    "../config/rspack/rspack.config.js"
);

test("rspack.config.js does not block react-dom/client from resolving", () => {
    const source = readFileSync(rspackConfigPath, "utf8");

    // The exact regression: an IgnorePlugin (or any other resolve-blocking entry -- an alias to
    // false, an externals rule, etc.) targeting react-dom's /client entry point specifically.
    expect(source).not.toMatch(/react-dom\\?\/client/);
});
