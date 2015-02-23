/**
@module ember
@submodule ember-routing-views
*/

import View from "ember-views/views/view";
import { _Metamorph } from "ember-views/views/metamorph_view";

import topLevelViewTemplate from "ember-htmlbars/templates/top-level-view";
topLevelViewTemplate.revision = 'Ember@VERSION_STRING_PLACEHOLDER';
import run from "ember-metal/run_loop";

export var CoreOutletView = View.extend({
  defaultTemplate: topLevelViewTemplate,

  init: function() {
    this._super();
    this._outlets = [];
  },

  revalidate: function() {
    this._outlets = [];
    this._super();
  },

  setOutletState: function(state) {
    this.outletState = { main: state };

    if (this.lastResult) {
      // Dirty any render nodes that correspond to outlets
      for (var i = 0; i < this._outlets.length; i++) {
        this._outlets[i].isDirty = true;
      }

      run.scheduleOnce('render', this, 'revalidate');
    }
  }
});

export var OutletView = CoreOutletView.extend(_Metamorph);
