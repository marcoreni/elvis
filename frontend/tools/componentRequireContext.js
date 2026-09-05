// react_ujs looks components up by name without a file extension: internally it calls
// `reqctx("./" + componentName)` (see react_ujs `src/getConstructor/fromRequireContext.js`),
// e.g. `reqctx("./PasswordInput")`.
//
// Under webpack that resolved fine: webpack's `require.context` adds an extensionless alias key
// (`"./PasswordInput"`) to the context map for every file whose extension is in
// `resolve.extensions`, in addition to the real key (`"./PasswordInput.jsx"`).
//
// rspack (2.x) does NOT: when `require.context` is given a `regExp`, the generated context map
// contains only the keys that match that regExp. Our regExp is anchored on the extension
// (`...\.(jsx?|tsx?)$`, so that `*.test.jsx` files stay out of the bundle), so the extensionless
// alias never matches and never gets added. `reqctx("./PasswordInput")` then throws
// `Cannot find module './PasswordInput'` and the component fails to mount.
//
// This wraps a `require.context` result so an inexact request (typically extensionless) falls
// back to the matching real key. Exact hits still take the fast path.
export default function wrapComponentRequireContext(context) {
    const wrapped = function (request) {
        try {
            return context(request);
        } catch (err) {
            const match = context
                .keys()
                .find(key => key.replace(/\.(jsx?|tsx?)$/, "") === request);

            if (match) {
                return context(match);
            }

            throw err;
        }
    };

    wrapped.keys = () => context.keys();
    wrapped.resolve = request => context.resolve(request);
    wrapped.id = context.id;

    return wrapped;
}
