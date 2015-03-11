import Ember from "ember-metal/core";
import defaultEnv from "ember-htmlbars/env";
import { get } from "ember-metal/property_get";

export default function renderView(view, buffer, template) {
  if (!template) {
    return;
  }

  var output;

  Ember.assert('template must be a function. Did you mean to call Ember.Handlebars.compile("...") or specify templateName instead?', typeof template === 'function');
  output = renderLegacyTemplate(view, buffer, template);

  if (output !== undefined) {
    buffer.push(output);
  }
}

// This function only gets called once per render of a "root view" (`appendTo`). Otherwise,
// HTMLBars propagates the existing env and renders templates for a given render node.
export function renderHTMLBarsBlock(view, block, renderNode) {
  //Ember.assert(
    //'The template being rendered by `' + view + '` was compiled with `' + template.revision +
    //'` which does not match `Ember@VERSION_STRING_PLACEHOLDER` (this revision).',
    //template.revision === 'Ember@VERSION_STRING_PLACEHOLDER'
  //);

  var lifecycleHooks = [{ type: 'didInsertElement', view: view }];

  var env = {
    lifecycleHooks: lifecycleHooks,
    view: view,
    outletState: view.outletState,
    container: view.container,
    renderer: view.renderer,
    dom: view.renderer._dom,
    hooks: defaultEnv.hooks,
    helpers: defaultEnv.helpers,
    useFragmentCache: defaultEnv.useFragmentCache
  };

  view.env = env;

  block(env, [], renderNode, null, null);
}

function renderLegacyTemplate(view, buffer, template) {
  var context = get(view, 'context');
  var options = {
    data: {
      view: view,
      buffer: buffer
    }
  };

  return template(context, options);
}
