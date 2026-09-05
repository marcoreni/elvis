// Must be first: puts jQuery on `window` as an import side effect, before the inspinia plugin
// imports below are evaluated (they read `window.jQuery` at module-eval time). See the file's
// header comment for why this cannot just be a statement in this module body.
import '../expose-jquery';

import './application.scss';
import './application_print.scss';

import Rails from "@rails/ujs";
import '../inspinia/js/plugins/metisMenu/jquery.metisMenu.js';
import '../inspinia/js/plugins/slimscroll/jquery.slimscroll.js';
import '../inspinia/js/plugins/jasny/jasny-bootstrap.js';
import '../inspinia/js/bootstrap.js';
import '../inspinia/js/inspinia.js';
import '../inspinia/font-awesome/js/all';

import '../i18n';

import wrapComponentRequireContext from '../tools/componentRequireContext';

Rails.start();
FontAwesome.config.autoReplaceSvg = "nest";

// Support component names relative to this directory. Wrapped so react_ujs's extensionless
// lookups (`reqctx("./PasswordInput")`) resolve against the extension-anchored context map --
// see frontend/tools/componentRequireContext.js.
var componentRequireContext = wrapComponentRequireContext(require.context(
  'components',
  true,
  /^((?!\.test\.).)*\.(jsx?|tsx?)$/
));

// Support images directory
require.context('../images', true, /\.(gif|jpg|png|svg)$/i);

var ReactRailsUJS = require('react_ujs');
ReactRailsUJS.useContext(componentRequireContext);
