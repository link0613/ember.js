import Ember from "ember-metal/core";

import {
  precompile,
  compile,
  template,
  registerPlugin
} from "ember-template-compiler";

import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import makeBoundHelper from "ember-htmlbars/system/make_bound_helper";

import {
  registerHelper
} from "ember-htmlbars/helpers";
import {
  ifHelper,
  unlessHelper
} from "ember-htmlbars/helpers/if_unless";
import withHelper from "ember-htmlbars/helpers/with";
import logHelper from "ember-htmlbars/helpers/log";
import eachHelper from "ember-htmlbars/helpers/each";

// importing adds template bootstrapping
// initializer to enable embedded templates
import "ember-htmlbars/system/bootstrap";

// importing ember-htmlbars/compat updates the
// Ember.Handlebars global if htmlbars is enabled
import "ember-htmlbars/compat";

registerHelper('if', ifHelper);
registerHelper('unless', unlessHelper);
registerHelper('with', withHelper);
registerHelper('log', logHelper);
registerHelper('each', eachHelper);

Ember.HTMLBars = {
  _registerHelper: registerHelper,
  template: template,
  compile: compile,
  precompile: precompile,
  makeViewHelper: makeViewHelper,
  makeBoundHelper: makeBoundHelper,
  registerPlugin: registerPlugin
};
