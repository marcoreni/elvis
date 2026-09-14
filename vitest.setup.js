import "@testing-library/jest-dom/vitest";

// frontend/components/utils/index.js reads this at module-load time (Rails renders it on every
// real page via csrf_meta_tags); jsdom's blank document has none, so provide one for imports that
// transitively pull in that module.
document.head.innerHTML += '<meta name="csrf-token" content="test-csrf-token">';

// jsdom doesn't implement matchMedia at all. Not needed until the sweetalert2 v11 bump, whose
// popup-rendering path queries `prefers-color-scheme` unconditionally (v7's didn't) -- any test
// that lets a real (unmocked) swal.fire() actually render hits this otherwise.
window.matchMedia =
    window.matchMedia ||
    function matchMediaStub(query) {
        return {
            matches: false,
            media: query,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        };
    };
