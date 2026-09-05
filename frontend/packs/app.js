import './application.scss';
import './application_print.scss';

// jQuery (full build, 3.7.1) is the single source now -- no CDN tag, no vendored copies. Its dist
// UMD sets `noGlobal` under CommonJS so it doesn't attach to `window` itself; the inline page
// scripts across the layouts and the vendored inspinia plugins below (`}(window.jQuery)`) both
// need it there, so expose it explicitly before anything that consumes it.
import jQuery from 'jquery';
window.jQuery = window.$ = jQuery;

import Rails from "@rails/ujs";
import '../inspinia/js/plugins/metisMenu/jquery.metisMenu.js';
import '../inspinia/js/plugins/slimscroll/jquery.slimscroll.js';
import '../inspinia/js/plugins/jasny/jasny-bootstrap.js';
import '../inspinia/js/bootstrap.js';
import '../inspinia/js/inspinia.js';
import '../inspinia/font-awesome/js/all';

import '../i18n';

Rails.start();
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
