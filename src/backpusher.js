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
    if (channel.pusher.connection.state === 'connected') {
      if(channel.pusher.connection.socket_id) {
        Backbone.pusher_socket_id = channel.pusher.connection.socket_id;
      } else {
        channel.pusher.connection.bind('connected', function() {
          Backbone.pusher_socket_id = channel.pusher.connection.socket_id;
        });
      }
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

  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default JSON-request options.
    var params = _.extend({
      type:         type,
      dataType:     'json'
    }, options);

    if (!(model && model.url)) {
      throw new Error("A 'url' property or function must be specified");
    }

    if (!params.url) {
      params.url = _.isFunction(model.url) ? model.url() : model.url;
      params.url += '?socket_id=' + Backbone.pusher_socket_id;
    }

    // Ensure that we have the appropriate request data.
    if (!params.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data        = params.data ? {model : params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }

    // Make the request.
    return $.ajax(params);
  };

  // Export:
  exports.Backpusher = Backpusher;
})((typeof exports !== 'undefined' ? exports : this));