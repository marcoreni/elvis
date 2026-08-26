import { defineConfig } from "vitest/config";
import esbuild from "esbuild";

// Unlike the Babel/webpack pipeline this app actually builds with (which treats every .js file
// as potentially containing JSX), Vite's own esbuild integration only enables JSX parsing for
// .jsx/.tsx — its `esbuild.loader`/`include` config option does not extend that to .js despite
// looking like it should. Plenty of frontend/**/*.js files (e.g. tools/format.js) have JSX in
// them, so transform those explicitly instead of renaming every such file.
const jsxInJsFiles = () => ({
    name: "jsx-in-js-files",
    enforce: "pre",
    async transform(code, id) {
        if (!id.includes("/frontend/") || !id.endsWith(".js")) return null;

        const result = await esbuild.transform(code, {
            loader: "jsx",
            sourcefile: id,
        });

        return { code: result.code, map: result.map };
    },
});

export default defineConfig({
    plugins: [jsxInJsFiles()],
    test: {
        environment: "jsdom",
        include: ["frontend/**/*.test.{js,jsx}"],
        setupFiles: ["./vitest.setup.js"],
        globals: true,
    },
});
