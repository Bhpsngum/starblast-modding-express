const ModdingExpress = (function(){
	let _this = this;
	return function (opts) {
		if (!game.custom.__MODDING_EXPRESS_DATA__) game.custom.__MODDING_EXPRESS_DATA__ = {
			loaders: new Map(),
		};
	
		let moduleStack = [];
	
		let { terminal, commands } = game.modding, { echo } = terminal;
	
		let message = function (msg) {
			echo(`[[bg;#fff;]&lsqb;ModdingExpress&rsqb; ${msg.replace(/\[/g, "&lsqb;").replace(/\]/g, "&rsqb;")}]`);
		}
	
		let error = function (msg) {
			echo(`[[bg;orange;]&lsqb;ModdingExpress&rsqb; ${msg.replace(/\[/g, "&lsqb;").replace(/\]/g, "&rsqb;")}]`);
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
			if (!obj) {
				if (!reference) error(`Failed to resolve middleware from ${reference}: Received value is blank.`);
				else error("Failed to resolve a blank middleware.");
				throw "";
			}
	
			let init = safeExec(obj.load, obj, opts);
	
			if (!init.success) {
				error(`Failed to run load script for middleware ${moduleName(obj)}, caught error:`);
				error(init.error?.stack || "");
				throw "";
			}
	
			moduleStack.push(obj);
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
	
		return {
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
			initialize: function () {
				let self = this;
				// initialize and load options + commands

				for (let mod of moduleStack) {
					let init = safeExec(mod.initialize, mod, game);
		
					if (!init.success) {
						error(`Failed to run initialization script for middleware ${moduleName(mod)}, caught error:`);
						error(init.error?.stack || "");
					}

					mod.options = mod.options || _this.options;
					_this.options = {};

					if ("object" === typeof mod.options) {
						Object.assign(_this.options, mod.options);
					}
					else {
						let optLoad = safeExec(mod.options, mod, _this.options);
						if (!optLoad.success) {
							error(`Failed to load options for middleware ${moduleName(mod)}, caught error:`);
							error(optLoad.error?.stack || "");
						}
					}

					if (Array.isArray(mod.commands)) {
						let i = 0;
						for (let command of mod.commands) {
							let index = i++;
							if (!command) continue;

							if (!command.name) {
								error(`Failed to load command index ${index} in ${moduleName(mod)}: Missing command name.`);
								continue;
							}

							if ("function" !== typeof command.handler) {
								error(`Failed to load command '${command.name}' in ${moduleName(mod)}: Missing command handler function.`);
								continue;
							}

							commands[command.name] = command.handler;
						}
					}
				}

				// load tick
				mod.tick = mod.tick || _this.tick;
				let tick = function (game) {
					for (let mod of moduleStack) {
						let halt = false;
						let stop = function () {
							halt = true;
						}

						let tick = safeExec(mod.tick, _this, game, mod, stop);

						if (!tick.success) {
							error(`Failed to run tick script for middleware ${moduleName(mod)}, caught error:`);
							error(tick.error?.stack || "");
						}

						if (halt) break;
					}

					safeExec(self.tick, _this, game);

					for (let ship of game.ships) {
						for (let mod of moduleStack) {
							let halt = false;
							let stop = function () {
								halt = true;
							}

							let tick = safeExec(mod.playerTick, mod, ship, game, mod, stop);

							if (!tick.success) {
								error(`Failed to run player tick script for middleware ${moduleName(mod)}, caught error:`);
								error(tick.error?.stack || "");
							}

							if (halt) break;
						}

						safeExec(self.playerTick, _this, ship, game);
					}
				}

				_this.tick = function (game) {
					tick(game);
					if (_this.tick !== tick) _this.tick = tick;
				}

				// load event
				mod.event = mod.event || _this.event;
				let Event = function (event, game) {
					for (let mod of moduleStack) {
						let halt = false;
						let stop = function () {
							halt = true;
						}

						let eventExec = safeExec(mod.event, mod, event, game, mod, stop);

						if (!eventExec.success) {
							error(`Failed to run event script for middleware ${moduleName(mod)}, caught error:`);
							error(eventExec.error?.stack || "");
						}

						if (halt) break;
					}

					safeExec(self.event, _this, event, game);

					let ship = event.killer || event.ship;

					if (ship) {
						for (let mod of moduleStack) {
							let halt = false;
							let stop = function () {
								halt = true;
							}

							let shipEvent = safeExec(mod.playerEvent, _this, ship, event, game, mod, stop);

							if (!shipEvent.success) {
								error(`Failed to run player event script for middleware ${moduleName(mod)}, caught error:`);
								error(shipEvent.error?.stack || "");
							}

							if (halt) break;
						}

						safeExec(self.playerEvent, _this, ship, event, game);
					}
				}

				_this.event = function (event, game) {
					Event(event, game);
					if (_this.event !== Event) _this.event = Event;
				}
			}
		}
	}
}).call(this);
