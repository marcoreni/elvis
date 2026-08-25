// i18next-parser scans components for t()/<Trans> usage and syncs frontend/locales/**.
// Run with `yarn i18n:extract`. See docs/I18n.md for the namespace convention.
module.exports = {
    locales: ["fr", "en"],
    defaultNamespace: "common",
    defaultValue: "",
    input: ["frontend/components/**/*.{js,jsx}"],
    output: "frontend/locales/$LOCALE/$NAMESPACE.json",
    keySeparator: ".",
    namespaceSeparator: ":",
    createOldCatalogs: false,
    sort: true,
    verbose: false,
};
