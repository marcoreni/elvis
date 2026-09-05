// jQuery (full build, 3.7.1) is the single source now -- no CDN tag, no vendored copies. Its dist
// UMD sets `noGlobal` under CommonJS so it doesn't attach to `window` itself; the inline page
// scripts across the layouts and the vendored inspinia plugins (`}(window.jQuery)`) both read it
// off `window`.
//
// This MUST stay in its own module, imported before any consumer. ES `import` declarations are
// hoisted: every `import` in a module body is evaluated (in source order) before the first plain
// statement of that body runs. If `window.jQuery = window.$ = jQuery` lived as a statement in
// app.js, it would run *after* `import '../inspinia/.../jasny-bootstrap.js'` had already been
// evaluated -- and jasny-bootstrap reads `window.jQuery` at eval time (`}(window.jQuery)`), so it
// would see `undefined` and throw `Cannot read properties of undefined (reading 'support')`.
// As its own first import, this runs as a side effect before the plugin imports evaluate.
import jQuery from "jquery";

window.jQuery = window.$ = jQuery;
