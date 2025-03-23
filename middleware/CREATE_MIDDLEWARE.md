# Create your own middleware

## Syntax
Your code must include a `return` statement, returning the middleware config object.
## Middleware object
A middleware object can contains these fields:
### `name`
Name of the middleware
### `author`
Author of the middleware
### `version`
A string, version of the middleware
### `license`
License attached to this code, defaults to [ISC](https://en.wikipedia.org/wiki/ISC_license)
### `load(instance, options)`
A function executing when middleware is first loaded, containing these parameters:
- `instance`: Modding Express instance.
- `options`: User-options passed to this middleware

This function binds to the middleware object by default.
### `initialize(instance)`
A function executing when user calls `mod.initialize()` (preferably after all middlewares have been loaded), with these parameters:
- `instance`: Modding Express instance.

This function binds to the middleware object by default.
### `commands`
An array, containing commands config object with these fields:
- `name`: Name of the command
- `handler(input)`: Function executed upon command calls, accepting current user-input string as parameter.
### `exports`
Exposed data to users, this is the returned value after calling `mod.load()` for your module.

## Note
It is noteworthy that any modification of the `this.tick` or `this.event` function won't work, as they are kept the same after each execution to prevent malfunctions.
