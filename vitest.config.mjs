import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["frontend/**/*.test.{js,jsx,ts,tsx}"],
        setupFiles: ["./vitest.setup.js"],
        globals: true,
        server: {
            deps: {
                // styled-components (a react-loader-spinner@8 dependency) ships CJS
                // without an "exports" map; Node's default-import interop for that
                // CJS build returns the whole exports object instead of the `styled`
                // default export, breaking `styled.div` calls. Forcing these through
                // Vite's transform (instead of native Node resolution) picks up the
                // real ESM build and its correct default export.
                inline: [/react-loader-spinner/, /styled-components/],
            },
        },
    },
});
