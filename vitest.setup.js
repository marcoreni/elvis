import "@testing-library/jest-dom/vitest";

// frontend/components/utils/index.js reads this at module-load time (Rails renders it on every
// real page via csrf_meta_tags); jsdom's blank document has none, so provide one for imports that
// transitively pull in that module.
document.head.innerHTML += '<meta name="csrf-token" content="test-csrf-token">';

// jsdom doesn't implement matchMedia at all. Not needed until the sweetalert2 v11 bump: v11's
// icon-rendering path (renderIcon, reached whenever a valid `icon` option is set) calls it, v7's
// didn't -- any test that lets a real (unmocked) swal.fire() with an icon actually render hits
// this otherwise.
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
