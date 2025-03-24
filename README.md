# Starblast Modding Express
Middleware-driven and player-driven feature for Starblast Modding, inspired by Express.js

## Installation
To get this feature, copy any of the file in [`dist`](./dist) folder to **the start** of your code.
## Usage
### Create a modding express object
```js
const mod = ModdingExpress();
```

You can also assign to global scope for easier debugging (for mod editor purposes only):
```js
globalThis.mod = mod;
```

The modding express object exposes these functions
#### `mod.load(identifierOrConfigObject, options, force = false)`
Loads the middleware.

Parameters:
- `identifierOrConfigObject`: can be a middleware config object, a URL string, or a string of middleware name (if the middleware you want to load is within the [`middleware`](./middleware) folder)
- `options`: Options you want to pass to the middleware upon loading, please check documentation of that middleware for more information
- `force`: Whether to force bypassing cache and re-fetches the resources (if cache hit)

Returns:

Exposed values from the middleware, please check documentation of that middleware for more information.

### Casual mod methods
Instead of using `this`, now you can register multiple handlers for a single event by using `mod.bind(name, ...handlers)`.

Supported handler names are `tick`, `event`, `playerTick` and `playerEvent`.

```js
mod.bind("tick", function (game, stop) {
	
}, function (game) {

});

mod.bind("event", function (event, game, stop) {
	
}, function (event, game) {
	
});

mod.options = {
	root_mode: "survival"
}

mod.bind("playerTick", function (ship, game, stop) {
	// custom, executes for every ship in your mod every tick
});

mod.bind("playerEvent", function (ship, event, game, stop) {
	// custom event handler for every ships in your mod
});
```
You can also call `mod.unbind(name, ...handlers)` to remove unwanted handlers.

All handler functions are bound to `this` context of the mod by default, and`mod.options` will act as a base options for the middlewares to run.

For backwards compatibilty, modding express will also register values from your `this` context if exists.

Note that modification to values of `this` context of mod is discouraged, as it can introduce problem with the Modding Express code.

Instead, modify their modding-express equivalent values.

### `mod.bind(event_name, ...handlers)`
Add given handler function(s) to a specific event, supported events: `tick`, `event`, `playerTick` and `playerEvent`.

### `mod.unbind(event_name, ...handlers)`
Remove given handler function(s) to a specific event, supported events: `tick`, `event`, `playerTick` and `playerEvent`.

If you provide no handlers, it removes all existing handlers for given event.
### `mod.replace(event_name, existing_handler, ...new_handlers)`
Replace an existing handler in given event with one or more handlers, supported events: `tick`, `event`, `playerTick` and `playerEvent`.

- If called with no existing handler and new handlers, this function does nothing.
- If called with only existing handler, it removes that handler from event (if exists).
- If given existing handler does not exist in the event, it appends new handlers to the event instead.

### `mod.options`
The `this.options` object. This field is immutable.

### `mod.sourceURLs`
List of all middleware URLs loaded by the mod. This field is immutable.

For Modding Space ports, you need to provide results from this field to create MS-compatible mod code.

## Notes
- Upon first mod load, your tab can be lagging for a while, this is because of synchronous run within mod editor.

	The duration of the lag depends on your network connection, middleware complexity and amount of middlewares you are loading into the mod.
- When loading source URL, it is preferred to load from Raw GitHub content sites (other than github.com) due to CORS blocking.

## Modding Space ports
The current version of Modding Express does not work in Modding Space.

A MS-compatible version is in the progress.
