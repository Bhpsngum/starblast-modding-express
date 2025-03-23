# Starblast Modding Express
Middleware-driven and player-driven feature for Starblast Modding, inspired by Express.js

## Installation
To get this feature, copy any of the file in [./dist](`dist`) folder to **the start** of your code.
## Usage
### Create a modding express object
```js
const mod = ModdingExpress();
```

The modding express object exposes these functions
#### `mod.load(identifierOrConfigObject, options, force = false)`
Loads the middleware.

Parameters:
- `identifierOrConfigObject`: can be a middleware config object, a URL string, or a string of middleware name (if the middleware you want to load is within the [./middleware](middleware) folder)
- `options`: Options you want to pass to the middleware upon loading, please check documentation of that middleware for more information
- `force`: Whether to force bypassing cache and re-fetches the resources (if cache hit)

Returns:
Exposed values from the middleware, please check documentation of that middleware for more information.

### Casual mod methods
Instead of using `this`, now replaces with your modding express object:

```js
mod.tick = function (game) {
	// global custom tick handler
}

mod.event = function (event, game) {
	// global custom event handler
}

mod.options = {
	root_mode: "survival"
}

mod.playerTick = function (ship, game) {
	// custom, executes for every ship in your mod every tick
}

mod.playerEvent = function (ship, event, game) {
	// custom event handler for every ships in your mod
}

```
`mod.tick` and `mod.event` will execute after their respective middleware execution chance is finished, while `mod.options` will act as a base options for the middlewares to run.

For backwards compatibilty, modding express will take values from your `this` context if it's mising.

Note that modification to values of `this` context of mod is discouraged, as it can introduce problem with the Modding Express code.

Instead, modify their modding-express equivalent values.

### `initialize()`
Intialize your mod, this is preferably called after you load all the middleware and define your own custom game functions.
