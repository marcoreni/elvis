// By default, this pack is loaded for server-side rendering.
// It must expose react_ujs as `ReactRailsUJS` and prepare a require context.
import wrapComponentRequireContext from "../tools/componentRequireContext";

// Wrapped so react_ujs's extensionless lookups (`reqctx("./PasswordInput")`) resolve against the
// extension-anchored context map -- see frontend/tools/componentRequireContext.js.
var componentRequireContext = wrapComponentRequireContext(require.context(
  "components",
  true,
  /^((?!\.test\.).)*\.(jsx?|tsx?)$/
));

var ReactRailsUJS = require("react_ujs")
ReactRailsUJS.useContext(componentRequireContext)
