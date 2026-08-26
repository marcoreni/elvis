import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["frontend/**/*.test.{js,jsx}"],
        setupFiles: ["./vitest.setup.js"],
        globals: true,
    },
});
