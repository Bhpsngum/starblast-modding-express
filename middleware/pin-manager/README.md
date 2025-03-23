# PIN Manager
Create and manage PIN upon player joins

## Installation
```js
const PIN = mod.load("pin-manager", OPTIONS);
```

`OPTIONS` object are as follows:
```js
{
	digits: 6, // number of digits
	max_tries: 3, // maximum number of tries before fail, set to `null` or `Infinity` to disable this option.
	cooldown: 0.1, // cooldown when a keypad button is clicked, in seconds
	time_limit: 15, // max time allowed for anyone to try a code before they will be kicked, in seconds
	include_shortcuts: false, // to include shortcuts, note that this may override some native keybinds
	// function to run before prompting PIN screen
	on_start: function (ship) {
		ship.set({ idle: true, collider: false, x: 0, y: 0 });
	},
	// function to run on success verification
	on_success: function (ship, { code, custom_data }) {
		ship.set({ type: 101, idle: false, collider: true });
		return `${ship.name} (ID ${ship.id}) joined with PIN ${code}.`;
	},
	// function to run on failed verification
	on_fail: function (ship) {
		return `${ship.name} (ID ${ship.id}) failed to join with PIN.`;
	}
}
```

## Usage
### Create a PIN
```js
PIN.create(expiry, additional_info);
```

Parameters:
- `expiry`: Expiry in seconds (synced to game ticking)
- `additional_info`: Info associated with this PIN

Returns:

String containing a PIN code used for verification

### Check if user is verified
```js
PIN.isVerified(ship)
```

Returns:

A boolean, indicating wether user has been verified

### Accessing addtional info
For every ship, `ship.custom.PIN_DATA` (if exists) is an object contains these fields:
- `custom_data`: Additional info associated with the verified PIN
- `issued_at`: Game tick at when the verification is issued
- `finished_at`: Game tick at when the verification is done
- `status`: Status of verification, can be one of the following: PENDING, VERIFIED, FAILED
- `code`: The code that this player used for verification
