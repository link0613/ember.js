/**
@module ember
@submodule ember-routing-views
*/

import View from "ember-views/views/view";
import { _Metamorph } from "ember-views/views/metamorph_view";

import topLevelViewTemplate from "ember-htmlbars/templates/top-level-view";
topLevelViewTemplate.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

export var CoreOutletView = View.extend({
  defaultTemplate: topLevelViewTemplate,

  init: function() {
    this._super();
    this._outlets = [];
  },

  setOutletState: function(state) {
    this.outletState = { main: state };

    if (this.env) {
      this.env.outletState = this.outletState;
    }

    if (this.lastResult) {
      // Dirty any render nodes that correspond to outlets
      for (var i = 0; i < this._outlets.length; i++) {
        this._outlets[i].isDirty = true;
      }

      this._outlets = [];

      this.scheduleRevalidate();
    }
  }
});

export var OutletView = CoreOutletView.extend(_Metamorph);
