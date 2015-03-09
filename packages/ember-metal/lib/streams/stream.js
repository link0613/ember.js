import create from "ember-metal/platform/create";
import {
  getFirstKey,
  getTailPath
} from "ember-metal/path_cache";

/**
@module ember-metal
*/

function Subscriber(callback, context) {
  this.next = null;
  this.prev = null;
  this.callback = callback;
  this.context = context;
}

Subscriber.prototype.removeFrom = function(stream) {
  var next = this.next;
  var prev = this.prev;

  if (prev) {
    prev.next = next;
  } else {
    stream.subscriberHead = next;
  }

  if (next) {
    next.prev = prev;
  } else {
    stream.subscriberTail = prev;
  }

  stream.maybeDeactivate();
};

function Dependency(dependent, stream, callback, context) {
  this.next = null;
  this.prev = null;
  this.dependent = dependent;
  this.stream = stream;
  this.callback = callback;
  this.context = context;
  this.unsubscription = null;
}

Dependency.prototype.subscribe = function() {
  this.unsubscribe = this.stream.subscribe(this.callback, this.context);
};

Dependency.prototype.unsubscribe = function() {
  this.unsubscription();
  this.unsubscription = null;
};

Dependency.prototype.removeFrom = function(stream) {
  var next = this.next;
  var prev = this.prev;

  if (prev) {
    prev.next = next;
  } else {
    stream.dependencyHead = next;
  }

  if (next) {
    next.prev = prev;
  } else {
    stream.dependencyTail = prev;
  }

  if (this.unsubscription) {
    this.unsubscribe();
  }
};

Dependency.prototype.replace = function(stream, callback, context) {
  this.stream = stream;
  this.callback = callback;
  this.context = context;

  if (this.unsubscription) {
    this.unsubscribe();
    this.subscribe();
  }
};

/**
  @public
  @class Stream
  @namespace Ember.stream
  @constructor
*/
function Stream(fn) {
  this.init();
  this.valueFn = fn;
}

Stream.prototype = {
  isStream: true,

  init: function() {
    this.state = 'dirty';
    this.cache = undefined;
    this.subscriberHead = null;
    this.subscriberTail = null;
    this.dependencyHead = null;
    this.dependencyTail = null;
    this.dependency = null;
    this.children = undefined;
    this.dependencies = undefined;
    this._label = undefined;
    this.isActive = false;
    this.gotValueWhileInactive = false;
  },

  removeChild: function(key) {
    delete this.children[key];
  },

  getKey: function(key) {
    if (this.children === undefined) {
      this.children = create(null);
    }

    var keyStream = this.children[key];

    if (keyStream === undefined) {
      keyStream = this._makeChildStream(key);
      this.children[key] = keyStream;
    }

    return keyStream;
  },

  get: function(path) {
    var firstKey = getFirstKey(path);
    var tailPath = getTailPath(path);

    if (this.children === undefined) {
      this.children = create(null);
    }

    var keyStream = this.children[firstKey];

    if (keyStream === undefined) {
      keyStream = this._makeChildStream(firstKey, path);
      this.children[firstKey] = keyStream;
    }

    if (tailPath === undefined) {
      return keyStream;
    } else {
      return keyStream.get(tailPath);
    }
  },

  value: function() {
    if (!this.isActive) {
      this.gotValueWhileInactive = true;
      this.revalidate();
      return this.valueFn();
    }

    if (this.state === 'clean') {
      return this.cache;
    } else if (this.state === 'dirty') {
      this.revalidate();
      var value = this.valueFn();
      this.state = 'clean';
      this.cache = value;
      return value;
    }
    // TODO: Ensure value is never called on a destroyed stream
    // so that we can uncomment this assertion.
    //
    // Ember.assert("Stream error: value was called in an invalid state: " + this.state);
  },

  addDependency: function(stream, callback, context) {
    if (!stream || !stream.isStream) {
      return;
    }

    if (callback === undefined) {
      callback = this.notify;
      context = this;
    }

    var dependency = new Dependency(this, stream, callback, context);

    if (this.isActive) {
      dependency.subscribe();
    }

    if (this.dependencyHead === null) {
      this.dependencyHead = this.dependencyTail = dependency;
    } else {
      var tail = this.dependencyTail;
      tail.next = dependency;
      dependency.prev = tail;
      this.dependencyTail = dependency;
    }

    return dependency;
  },

  subscribeDependencies: function() {
    var dependency = this.dependencyHead;
    while (dependency) {
      var next = dependency.next;
      dependency.subscribe();
      dependency = next;
    }
  },

  unsubscribeDependencies: function() {
    var dependency = this.dependencyHead;
    while (dependency) {
      var next = dependency.next;
      dependency.unsubscribe();
      dependency = next;
    }
  },

  becameActive: function() {},
  becameInactive: function() {},

  // This method is invoked when the value function is called and when
  // a stream becomes active. This allows changes to be made to a stream's
  // input, and only do any work in response if the stream has subscribers
  // or if someone actually gets the stream's value.
  revalidate: function() {},

  maybeActivate: function() {
    if (this.subscriberHead && !this.isActive) {
      this.isActive = true;
      this.subscribeDependencies();
      this.revalidate();
      this.becameActive();
    }
  },

  maybeDeactivate: function() {
    if (!this.subscriberHead && this.isActive) {
      this.isActive = false;
      this.unsubscribeDependencies();
      this.becameInactive();
    }
  },

  valueFn: function() {
    throw new Error("Stream error: valueFn not implemented");
  },

  setValue: function() {
    throw new Error("Stream error: setValue not implemented");
  },

  notify: function() {
    this.notifyExcept();
  },

  notifyExcept: function(callbackToSkip, contextToSkip) {
    if (this.state === 'clean' || this.gotValueWhileInactive) {
      this.gotValueWhileInactive = false;
      this.state = 'dirty';
      this._notifySubscribers(callbackToSkip, contextToSkip);
    }
  },

  subscribe: function(callback, context) {
    var subscriber = new Subscriber(callback, context, this);
    if (this.subscriberHead === null) {
      this.subscriberHead = this.subscriberTail = subscriber;
      this.maybeActivate();
    } else {
      var tail = this.subscriberTail;
      tail.next = subscriber;
      subscriber.prev = tail;
      this.subscriberTail = subscriber;
    }

    var stream = this;
    return function(prune) {
      subscriber.removeFrom(stream);
      if (prune) { stream.prune(); }
    };
  },

  prune: function() {
    if (this.subscriberHead === null) {
      this.destroy(true);
    }
  },

  unsubscribe: function(callback, context) {
    var subscriber = this.subscriberHead;

    while (subscriber) {
      var next = subscriber.next;
      if (subscriber.callback === callback && subscriber.context === context) {
        subscriber.removeFrom(this);
      }
      subscriber = next;
    }
  },

  _notifySubscribers: function(callbackToSkip, contextToSkip) {
    var subscriber = this.subscriberHead;

    while (subscriber) {
      var next = subscriber.next;

      var callback = subscriber.callback;
      var context = subscriber.context;

      subscriber = next;

      if (callback === callbackToSkip && context === contextToSkip) {
        continue;
      }

      if (context === undefined) {
        callback(this);
      } else {
        callback.call(context, this);
      }
    }
  },

  destroy: function(prune) {
    if (this.state !== 'destroyed') {
      this.state = 'destroyed';

      this.subscriberHead = this.subscriberTail = null;
      this.maybeDeactivate();
      this.dependencies = null;

      var dependencies = this.dependencies;

      for (var i=0, l=dependencies.length; i<l; i++) {
        dependencies[i](prune);
      }

      return true;
    }
  },

  isGlobal: function() {
    var stream = this;
    while (stream !== undefined) {
      if (stream._isRoot) {
        return stream._isGlobal;
      }
      stream = stream.source;
    }
  }
};

export default Stream;
