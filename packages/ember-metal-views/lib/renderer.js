import DOMHelper from "dom-helper";
import environment from "ember-metal/environment";
import RenderBuffer from "ember-views/system/render_buffer";
import run from "ember-metal/run_loop";
import { get } from "ember-metal/property_get";
import {
  _instrumentStart,
  subscribers
} from "ember-metal/instrumentation";

var domHelper = environment.hasDOM ? new DOMHelper() : null;

function Renderer(_helper, _destinedForDOM) {
  this._dom = _helper || domHelper;
}

Renderer.prototype.renderTopLevelView =
  function Renderer_renderTopLevelView(view, morph) {
    var newlyCreated = view.newlyCreated = [view];

    var contentMorph = this.contentMorphForView(view, morph);

    var template = get(view, 'layout') || get(view, 'template');
    var result = view.renderTemplate(view, contentMorph.contextualElement, template);

    view.lastResult = result;
    contentMorph.setNode(result.fragment);

    for (var i=0, l=newlyCreated.length; i<l; i++) {
      this.didInsertElement(newlyCreated[i]);
    }

    view.newlyCreated = null;
  };

// This entry point is called from top-level `view.appendTo`
Renderer.prototype.appendTo =
  function Renderer_appendTo(view, target) {
    var morph = this._dom.appendMorph(target);
    run.scheduleOnce('render', this, this.renderTopLevelView, view, morph);
  };

// This entry point is called by the `#view` keyword in templates
Renderer.prototype.contentMorphForView =
  function Renderer_contentMorphForView(view, morph) {
    return contentMorphForView(view, morph, this._dom);
  };

Renderer.prototype.willCreateElement = function (view) {
  if (subscribers.length && view.instrumentDetails) {
    view._instrumentEnd = _instrumentStart('render.'+view.instrumentName, function viewInstrumentDetails() {
      var details = {};
      view.instrumentDetails(details);
      return details;
    });
  }
  if (view._transitionTo) {
    view._transitionTo('inBuffer');
  }
}; // inBuffer

Renderer.prototype.didCreateElement = function (view) {
  if (view._transitionTo) {
    view._transitionTo('hasElement');
  }
  if (view._instrumentEnd) {
    view._instrumentEnd();
  }
}; // hasElement

Renderer.prototype.willInsertElement = function (view) {
  if (view.trigger) { view.trigger('willInsertElement'); }
}; // will place into DOM

Renderer.prototype.didInsertElement = function (view) {
  if (view._transitionTo) {
    view._transitionTo('inDOM');
  }

  if (view.trigger) { view.trigger('didInsertElement'); }
}; // inDOM // placed into DOM

Renderer.prototype.willRemoveElement = function (view) {};

Renderer.prototype.willDestroyElement = function (view) {
  if (view._willDestroyElement) {
    view._willDestroyElement();
  }
  if (view.trigger) {
    view.trigger('willDestroyElement');
    view.trigger('willClearRender');
  }
};

Renderer.prototype.didDestroyElement = function (view) {
  view.element = null;
  if (view._transitionTo) {
    view._transitionTo('preRender');
  }
}; // element destroyed so view.destroy shouldn't try to remove it removedFromDOM

export default Renderer;

function contentMorphForView(view, morph, dom) {
  var buffer = new RenderBuffer(dom);
  var contextualElement = morph.contextualElement;
  var contentMorph;

  view.renderer.willCreateElement(view);

  var tagName = view.tagName;

  if (tagName !== null && typeof tagName === 'object' && tagName.isDescriptor) {
    tagName = get(view, 'tagName');
    Ember.deprecate('In the future using a computed property to define tagName will not be permitted. That value will be respected, but changing it will not update the element.', !tagName);
  }

  var classNameBindings = view.classNameBindings;
  var taglessViewWithClassBindings = tagName === '' && (classNameBindings && classNameBindings.length > 0);

  if (tagName === null || tagName === undefined) {
    tagName = 'div';
  }

  Ember.assert('You cannot use `classNameBindings` on a tag-less view: ' + view.toString(), !taglessViewWithClassBindings);

  buffer.reset(tagName, contextualElement);

  var element;

  if (tagName !== '') {
    if (view.applyAttributesToBuffer) {
      view.applyAttributesToBuffer(buffer);
    }
    element = buffer.generateElement();
  }

  if (element && element.nodeType === 1) {
    view.element = element;
    contentMorph = dom.insertMorphBefore(element, null);
    morph.childNodes = [contentMorph];
    morph.setContent(element);
  } else {
    contentMorph = morph;
  }

  view.renderer.didCreateElement(view);

  return contentMorph;
}
