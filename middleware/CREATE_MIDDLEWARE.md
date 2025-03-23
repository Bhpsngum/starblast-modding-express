# Create your own middleware

## Syntax
Your code must include a `return` statement, returning the middleware config object.
## Middleware object
A middleware object can contains these fields:
### `name`
Name of the middleware
### `author`
Author of the middleware
### `license`
License attached to this code, defaults to [ISC](https://en.wikipedia.org/wiki/ISC_license)
### `load(options)`
A function executing when middleware is first loaded, containing these parameters:
- `options`: User-options passed to this middleware

This function binds to the middleware object by default.
### `initialize(game)`
A function executing when user calls `mod.initialize()` (preferably after all middlewares have been loaded)

This function binds to the middleware object by default.
### `tick(game, middleware, stop)`
A function executing every tick, containing these parameters:
- `game`: Game object
- `middleware`: Current middleware config object
- `stop`: This is a function, by default after execution of one midddleware, it will pass control to the next middleware event handler. Call this function to halt this chain after your execution.

This function binds to the `this` context of the mod by default.
### `event(event, game, middleware, stop)`
A function executing at every event received, containing these parameters:
- `event`: Event object
- `game`: Game object
- `middleware`: Current middleware config object
- `stop`: This is a function, by default after execution of one midddleware, it will pass control to the next middleware event handler. Call this function to halt this chain after your execution.

This function binds to the `this` context of the mod by default.
### `playerTick(ship, game, middleware, stop)`
A function executing for a ship at every tick.
Note that this will execute separately after the global `tick` handler above

This function binds to the middleware object by default.
### `playerEvent(ship, event, game, middleware, stop)`
A function, acts as an event handler for a ship.
Note that this will execute separately after the global `event` handler above

This function binds to the middleware object by default.
### `commands`
An array, containing commands config object with these fields:
- `name`: Name of the command
- `handler(input)`: Function executed upon command calls, accepting current user-input string as parameter.
### `exports`
Exposed data to users, this is the returned value after calling `mod.load()` for your module.

## Note
It is noteworthy that any modification of the `this.tick` or `this.event` function won't work, as they are kept the same after each execution to prevent malfunctions.
