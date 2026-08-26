import "@testing-library/jest-dom/vitest";

// frontend/components/utils/index.js reads this at module-load time (Rails renders it on every
// real page via csrf_meta_tags); jsdom's blank document has none, so provide one for imports that
// transitively pull in that module.
document.head.innerHTML += '<meta name="csrf-token" content="test-csrf-token">';
