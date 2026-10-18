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

// jsdom implements getClientRects()/getBoundingClientRect() on Element but not on Range; real
// browsers implement both. ProseMirror's scroll handling passes a Range to coordsAtPos(), newly
// reachable under React 19 + @testing-library/react 16, where it surfaces as an intermittent
// uncaught TypeError. Empty rects are fine: singleRect() falls back to getBoundingClientRect().
if (typeof Range.prototype.getClientRects !== "function") {
    Range.prototype.getClientRects = function getClientRectsStub() {
        return [];
    };
}
if (typeof Range.prototype.getBoundingClientRect !== "function") {
    Range.prototype.getBoundingClientRect =
        function getBoundingClientRectStub() {
            return {
                x: 0,
                y: 0,
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                width: 0,
                height: 0,
                toJSON: () => ({}),
            };
        };
}

// A real (unmocked) swal.fire() -- several component tests let one render for real rather than
// mocking sweetalert2 -- schedules an internal `setTimeout(..., 10)` on popup-open
// (SHOW_CLASS_TIMEOUT in sweetalert2's source) that it never exposes a handle for, so nothing
// (including Swal.close()) can cancel it. If that popup opens near the end of a test file, the
// 10ms timer can still be pending when Vitest tears down that file's jsdom environment, and fires
// into a dead `window` ("ReferenceError: window is not defined" from sweetalert2's
// hasCssAnimation/setScrollingVisibility) -- an unhandled error that doesn't fail the individual
// test but does fail the run's exit code. Give any such timer a moment to fire while the
// environment is still alive, once per file, rather than mocking sweetalert2 in every test that
// happens to render one for real.
afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
});
