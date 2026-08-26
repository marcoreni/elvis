module.exports = {
    testEnvironment: "jsdom",
    moduleFileExtensions: ["js", "jsx", "json"],
    testMatch: ["<rootDir>/frontend/**/*.test.{js,jsx}"],
    transform: {
        "^.+\\.jsx?$": "babel-jest",
    },
    setupFiles: ["<rootDir>/jest.setup.js"],
};
