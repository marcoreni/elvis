import './application.scss';
import './application_print.scss';

// jQuery's dist UMD build sets `noGlobal` when loaded under CommonJS, so it does not attach
// itself to `window` on its own. Inline page scripts in the devise / simple / static_pages
// layouts (which don't load jQuery from a CDN, unlike application.html.erb) and the vendored
// inspinia plugins below (`}(window.jQuery)`) both need it there, so expose it explicitly
// before anything that consumes it. See also the "jQuery: CDN vs bundle" note in KnownIssues.md.
import jQuery from 'jquery';
window.jQuery = window.$ = jQuery;

import 'jquery-ujs';
import '../inspinia/js/jquery-3.1.1.min.js';
import '../inspinia/js/plugins/metisMenu/jquery.metisMenu.js';
import '../inspinia/js/plugins/slimscroll/jquery.slimscroll.js';
import '../inspinia/js/plugins/slimscroll/jquery.slimscroll.js';
import '../inspinia/js/plugins/jasny/jasny-bootstrap.js';
import '../inspinia/js/bootstrap.js';
import '../inspinia/js/inspinia.js';
import '../inspinia/font-awesome/js/all';

import '../i18n';

FontAwesome.config.autoReplaceSvg = "nest";

// Support component names relative to this directory:
var componentRequireContext = require.context(
  'components',
  true,
  /(?<!\.test)\.(jsx?|tsx?)$/
);

// Support images directory
require.context('../images', true, /\.(gif|jpg|png|svg)$/i);

var ReactRailsUJS = require('react_ujs');
ReactRailsUJS.useContext(componentRequireContext);
