//     Backpusher.js 0.0.1
//     (c) 2011 Pusher.
//     Backpusher may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://github.com/pusher/backpusher

;(function(exports, undefined){
  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backpusher = function(channel, collection, options) {
    if (!(this instanceof Backpusher)) {
      return new Backpusher(channel, collection, options);
    }

    // Bind for the connection established, so
    // we can setup the socket_id param.
    if (channel.pusher.connection) {
      channel.pusher.connection.bind('connected', function() {
        Backbone.pusher_socket_id = channel.pusher.connection.socket_id;
      });
    } else {
      channel.pusher.bind('pusher:connection_established', function() {
        Backbone.pusher_socket_id = channel.pusher.socket_id;
      });
    }

    // Options is currently unused:
    this.options = (options || {});
    this.channel = channel;
    this.collection = collection;

    if (this.options.events) {
      this.events = this.options.events;
    } else {
      this.events = Backpusher.defaultEvents;
    }

    this._bindEvents();
    this.initialize(channel, collection, options);
  };

  _.extend(Backpusher.prototype, Backbone.Events, {
    initialize: function() {},

    _bindEvents: function() {
      if (!this.events) return;

      for (var event in this.events) {
        this.channel.bind(event, _.bind(this.events[event], this));
      }
    },

    _add: function(model) {
      var Collection = this.collection;
      model = new Collection.model(model);

      Collection.add(model);
      this.trigger('remote_create', model);

      return model;
    }
  });

  Backpusher.defaultEvents = {
    created: function(pushed_model) {
      return this._add(pushed_model);
    },

    updated: function(pushed_model) {
      var model = this.collection.get(pushed_model);

      if (model) {
        model = model.set(pushed_model);

        this.trigger('remote_update', model);

        return model;
      } else {
        return this._add(pushed_model);
      }
    },

    destroyed: function(pushed_model) {
      var model = this.collection.get(pushed_model);

      if (model) {
        this.collection.remove(model);
        this.trigger('remote_destroy', model);

        return model;
      }
    }
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read'  : 'GET'
  };

  // Add socket ID to every Backbone.sync request
  var origBackboneSync = Backbone.sync;
  Backbone.sync = function(method, model, options) {
    options.headers = _.extend(
      { 'X-Pusher-Socket-ID': Backbone.pusher_socket_id },
      options.headers
    );

    origBackboneSync(method, model, options);
  };

  // Export:
  exports.Backpusher = Backpusher;
})((typeof exports !== 'undefined' ? exports : this));