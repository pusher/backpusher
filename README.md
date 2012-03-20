## Backpusher 0.0.2

## What is this?

Backpusher is a library for using Pusher to sync your Backbone models between clients, the server and other clients.  For details, please read the [article on our blog](http://blog.pusher.com/2011/6/21/backbone-js-now-realtime-with-pusher).

## Breaking change in version 0.0.2

### The change

When Backpusher syncs data via `Backbone.sync()`, it sends the `socket_id` of the client connection that initiated the sync.  In version 0.0.1, this data was sent as a URL parameter.  In version 0.0.2, this data is sent as a header.

### Updating your code

Find any pieces of code that use the `socket_id` sent by a `Backbone.sync()` request.  Update these pieces of code to retrieve the `socket_id` from the headers of the request, rather than the URL.

## Requirements

Backbone.js   0.5.3
Underscore.js 1.2.1
