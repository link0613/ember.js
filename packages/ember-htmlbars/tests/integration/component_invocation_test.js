import EmberView from "ember-views/views/view";
import Registry from "container/registry";
import jQuery from "ember-views/system/jquery";
import compile from "ember-template-compiler/system/compile";
import ComponentLookup from 'ember-views/component_lookup';
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import run from "ember-metal/run_loop";

var registry, container, view;

QUnit.module('component - invocation', {
  setup: function() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.optionsForType('helper', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown: function() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('non-block without properties', function() {
  expect(1);

  registry.register('template:components/non-block', compile('In layout'));

  view = EmberView.extend({
    template: compile('{{non-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout');
});

QUnit.test('block without properties', function() {
  expect(1);

  registry.register('template:components/with-block', compile('In layout - {{yield}}'));

  view = EmberView.extend({
    template: compile('{{#with-block}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - In template');
});

QUnit.test('non-block with properties on attrs', function() {
  expect(1);

  registry.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp="something here"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('non-block with properties on attrs and component class', function() {
  registry.register('component:non-block', Component.extend());
  registry.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp="something here"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('rerendering component with attrs from parent', function() {
  var willUpdate = 0;
  var willReceiveAttrs = 0;

  registry.register('component:non-block', Component.extend({
    willReceiveAttrs: function() {
      willReceiveAttrs++;
    },

    willUpdate: function() {
      willUpdate++;
    }
  }));
  registry.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp=view.someProp}}'),
    container: container,
    someProp: "wycats"
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: wycats');

  run(function() {
    view.set('someProp', 'tomdale');
  });

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  equal(willReceiveAttrs, 0, "The willReceiveAttrs hook did not fire");
  equal(willUpdate, 1, "The willUpdate hook fired once");

  Ember.run(view, 'rerender');

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  equal(willReceiveAttrs, 1, "The willReceiveAttrs hook fired once");
  equal(willUpdate, 2, "The willUpdate hook fired again");
});

QUnit.test('rerendering component with attrs from parent invokes willReceiveAttrs', function() {
  var component;
  var attrsReceived;
  var attrsUpdated;

  registry.register('component:non-block', Component.extend({
    willReceiveAttrs: function(nextAttrs) {
      attrsReceived = nextAttrs;
    },
    willUpdate: function(attrs) {
      attrsUpdated = attrs;
    },
    didInsertElement: function() {
      deepEqual(this.attrs, { someObj: { prop: "wycats" } }, "The attrs were set");
      component = this;
    }
  }));
  registry.register('template:components/non-block', compile('In layout - someProp: {{unbound attrs.someObj.prop}}'));

  view = EmberView.extend({
    template: compile('{{non-block someObj=view.someObj}}'),
    container: container,
    someObj: { prop: "wycats" }
  }).create();

  runAppend(view);

  ok(component, "The component was inserted");
  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: wycats');

  run(function() {
    view.set('someObj.prop', 'tomdale');
  });

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: wycats', "precond - unbound attributes do not observe changes");

  run(function() {
    component.rerender();
  });

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  strictEqual(attrsReceived, undefined, "The attrs were not received");
  deepEqual(attrsUpdated, { someObj: { prop: "tomdale" } }, "The attrs were updated");

  // TODO: Confirm that attribute lifecycle hooks were invoked
});


QUnit.test('[DEPRECATED] non-block with properties on self', function() {
  expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

  registry.register('template:components/non-block', compile('In layout - someProp: {{someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp="something here"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('block with properties on attrs', function() {
  expect(1);

  registry.register('template:components/with-block', compile('In layout - someProp: {{attrs.someProp}} - {{yield}}'));

  view = EmberView.extend({
    template: compile('{{#with-block someProp="something here"}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
});

QUnit.test('[DEPRECATED] block with properties on self', function() {
  expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

  registry.register('template:components/with-block', compile('In layout - someProp: {{someProp}} - {{yield}}'));

  view = EmberView.extend({
    template: compile('{{#with-block someProp="something here"}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
});

if (Ember.FEATURES.isEnabled('ember-views-component-block-info')) {
  QUnit.test('`Component.prototype.hasBlock` when block supplied', function() {
    expect(1);

    registry.register('template:components/with-block', compile('{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}'));

    view = EmberView.extend({
      template: compile('{{#with-block}}In template{{/with-block}}'),
      container: container
    }).create();

    runAppend(view);

    equal(jQuery('#qunit-fixture').text(), 'In template');
  });

  QUnit.test('`Component.prototype.hasBlock` when no block supplied', function() {
    expect(1);

    registry.register('template:components/with-block', compile('{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}'));

    view = EmberView.extend({
      template: compile('{{with-block}}'),
      container: container
    }).create();

    runAppend(view);

    equal(jQuery('#qunit-fixture').text(), 'No Block!');
  });

  QUnit.test('`Component.prototype.hasBlockParams` when block param supplied', function() {
    expect(1);

    registry.register('template:components/with-block', compile('{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} No Block!{{/if}}'));

    view = EmberView.extend({
      template: compile('{{#with-block as |something|}}In template{{/with-block}}'),
      container: container
    }).create();

    runAppend(view);

    equal(jQuery('#qunit-fixture').text(), 'In template - In Component');
  });

  QUnit.test('`Component.prototype.hasBlockParams` when no block param supplied', function() {
    expect(1);

    registry.register('template:components/with-block', compile('{{#if hasBlockParams}}{{yield this}}{{else}}{{yield}} No Block Param!{{/if}}'));

    view = EmberView.extend({
      template: compile('{{#with-block}}In block{{/with-block}}'),
      container: container
    }).create();

    runAppend(view);

    equal(jQuery('#qunit-fixture').text(), 'In block No Block Param!');
  });
}
