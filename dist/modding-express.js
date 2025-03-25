const ModdingExpress = (function(){
	let _this = this;
	return function (opts = {}) {
		if (!game.custom.__MODDING_EXPRESS_DATA__) game.custom.__MODDING_EXPRESS_DATA__ = {
			loaders: new Map(),
		};

		opts = Object.assign({
			logging: true,
			terminal_output: true,
		}, opts);
	
		let moduleStack = new Map([
			["tick", []],
			["event", []],
			["playerTick", []],
			["playerEvent", []],
		]);
	
		let { terminal, commands } = (game.modding || {}), { echo } = (terminal || {});

		let message, error, warn;

		if (opts.logging) {
			if (opts.terminal_output) {
				message = function (msg) {
					echo(`[[bg;#fff;]&lsqb;ModdingExpress&rsqb; ${msg.replace(/\[/g, "&lsqb;").replace(/\]/g, "&rsqb;")}]`);
				}
		
				error = function (msg) {
					echo(`[[bg;orange;]&lsqb;ModdingExpress&rsqb; ${msg.replace(/\[/g, "&lsqb;").replace(/\]/g, "&rsqb;")}]`);
				}

				warn = function (msg) {
					echo(`[[bg;yellow;]&lsqb;ModdingExpress&rsqb; ${msg.replace(/\[/g, "&lsqb;").replace(/\]/g, "&rsqb;")}]`);
				}
			}
			else {
				message = function (msg) {
					console.log(`[ModdingExpress] ${msg}`);
				}
				error = function (msg) {
					console.error(`[ModdingExpress] ${msg}`);
				}
				warn = function (msg) {
					console.warn(`[ModdingExpress] ${msg}`);
				}

				if (opts.terminal_output) {
					warn(`Warning: Failed to locate terminal internals. Switched to console logging instead.`);
				}
			}
		}
		else message = error = warn = function () {};

		if (!commands) {
			warn(`Warning: Failed to locate terminal internals. Commands will be unavailable.`);
		}

		let globalTick = _this.tick, globalEvent = _this.event, globalOptions = _this.options || {};

		let modTick = function (game) {
			for (let mod of moduleStack.get("tick")) {
				let halt = false;
				let stop = function () {
					halt = true;
				}

				let tick = safeExec(mod, _this, game, stop);

				if (!tick.success) {
					error(`Failed to run tick script, caught error:`);
					error(tick.error?.stack || "");
				}

				if (halt) break;
			}

			for (let ship of game.ships) {
				for (let mod of moduleStack.get("playerTick")) {
					let halt = false;
					let stop = function () {
						halt = true;
					}

					let tick = safeExec(mod, _this, ship, game, stop);

					if (!tick.success) {
						error(`Failed to run player tick script, caught error:`);
						error(tick.error?.stack || "");
					}

					if (halt) break;
				}
			}

			let globalRun = safeExec(globalTick, _this, game);
			if (!globalRun.success)	{
				error(`Failed to run this.tick script, caught error:`);
				error(globalRun.error?.stack || "");
			}
		}

		let modEvent = function (event, game) {
			for (let mod of moduleStack.get("event")) {
				let halt = false;
				let stop = function () {
					halt = true;
				}

				let eventExec = safeExec(mod, _this, event, game, stop);

				if (!eventExec.success) {
					error(`Failed to run event script, caught error:`);
					error(eventExec.error?.stack || "");
				}

				if (halt) break;
			}

			let globalRun = safeExec(globalEvent, _this, event, game);
			if (!globalRun.success) {
				error(`Failed to run this.event script, caught error:`);
				error(globalRun.error?.stack || "");
			}

			let ship = event.killer || event.ship;

			if (ship) {
				for (let mod of moduleStack.get("playerEvent")) {
					let halt = false;
					let stop = function () {
						halt = true;
					}

					let shipEvent = safeExec(mod, _this, ship, event, game, stop);

					if (!shipEvent.success) {
						error(`Failed to run player event script, caught error:`);
						error(shipEvent.error?.stack || "");
					}

					if (halt) break;
				}
			}
		}

		// overwrite tick function
		try {
			Object.defineProperty(_this, "tick", {
				get: function () {
					return modTick;
				},
				set: function (value) {
					globalTick = value;
				}
			});
		}
		catch (e) {
			error("Fatal: Failed to overwrite tick function.");
			return;
		}

		// overwrite event function
		try {
			Object.defineProperty(_this, "event", {
				get: function () {
					return modEvent;
				},
				set: function (value) {
					globalEvent = value;
				}
			});
		}
		catch (e) {
			error("Fatal: Failed to overwrite event function.");
			return;
		}

		// overwrite options
		try {
			Object.defineProperty(_this, "options", {
				get: function () {
					return globalOptions;
				},
				set: function (value) {
					Object.assign(globalOptions, value);
				}
			});
		}
		catch (e) {
			error("Fatal: Failed to overwrite options.");
			return;
		}
	
		let safeExec = function (func, bindThis, ...args) {
			if ("function" === typeof func) try {
				func.call(bindThis, ...args);
			}
			catch (error) {
				return { success: false, error };
			}
	
			return { success: true }
		}
	
		let moduleName = function (obj) {
			return `${obj.name || "Unknown"} (v${obj.version || "1.0"}) by ${obj.author || "Unknown"}`;
		}
	
		let expressData = game.custom.__MODDING_EXPRESS_DATA__;
	
		let loadModule = function (obj, opts, reference = null) {
			// check if we are loading a blank module
			if (!obj) {
				if (reference) error(`Failed to resolve middleware from ${reference}: Received value is blank.`);
				else error("Failed to resolve a blank middleware.");
				throw "";
			}
	
			// run intialization script
			let init = safeExec(obj.load, obj, dist, opts);
	
			if (!init.success) {
				error(`Failed to run load script for middleware ${moduleName(obj)}, caught error:`);
				error(init.error?.stack || "");
				throw "";
			}

			// load commands
			if (commands && Array.isArray(obj.commands)) {
				let i = 0;
				for (let command of obj.commands) {
					let index = i++;
					if (!command) continue;

					if (!command.name) {
						error(`Failed to load command index ${index} in ${moduleName(obj)}: Missing command name.`);
						continue;
					}

					if ("function" !== typeof command.handler) {
						error(`Failed to load command '${command.name}' in ${moduleName(obj)}: Missing command handler function.`);
						continue;
					}

					commands[command.name] = command.handler;
				}
			}
	
			// done
			message(`Loaded module: ${moduleName(obj)}`);
	
			return obj.exports;
		}

		const resolveURL = function (url) {
			url = url.trim();

			try {
				new URL(url);
			}
			catch (e) {
				url = `https://raw.githubusercontent.com/Bhpsngum/starblast-modding-express/refs/heads/main/middleware/${url}/index.js`;
			}

			return url;
		}
	
		let dist = {
			unbind: function (event, ...handlers) {
				let loaders = moduleStack.get(event);
				if (!loaders) return;

				if (!handlers.length) {
					loaders.length = 0;
					return;
				}

				for (let handler of handlers) {
					let index = loaders.indexOf(handler);
					if (index > -1) loaders.splice(index, 1);
				}
			},
			bind: function (event, ...handlers) {
				let loaders = moduleStack.get(event);
				if (!loaders) return;

				loaders.push(...handlers);
			},
			replace: function (event, originalHandler, ...handlers) {
				let loaders = moduleStack.get(event);
				if (!loaders) return;

				let index = loaders.indexOf(originalHandler);
				if (index > -1) loaders.splice(index, 1, ...handlers);
				else loaders.push(...handlers);
			},
			load: function (handle, opts, force = false) {
				if ("string" !== typeof handle) return loadModule(handle, opts);

				handle = resolveURL(handle);
	
				let cachedModule = expressData.loaders.get(handle);
	
				if (!force && cachedModule) return loadModule(cachedModule, opts, handle);
	
				let xmlhttp = new XMLHttpRequest();
	
				xmlhttp.open("GET", handle, false);
	
				try {
					xmlhttp.send();
				}
				catch (e) {
					error(`Failed to resolve URL "${handle}": Fetch failed.`);
					return {};
				}
	
				try {
					cachedModule = Function("game", xmlhttp.responseText)(game);
				}
				catch (e) {
					error(`Failed to resolve URL "${handle}": Error when evaluating code.`);
					error(e.stack);
					return {};
				}
	
				expressData.loaders.set(handle, cachedModule);
	
				try {
					return loadModule(cachedModule, opts, handle);
				}
				catch (e) {
					return {};
				}
			},
		}

		Object.defineProperties(dist, {
			options: {
				configurable: false,
				enumerable: true,
				writable: false,
				value: globalOptions
			},
			sourceURLs: {
				get: function () {
					return [...expressData.loaders.keys()];
				}
			}
		});

		return dist;
	}
}).call(this);
