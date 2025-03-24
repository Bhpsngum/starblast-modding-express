let OPTIONS = {
	digits: 6,
	max_tries: 3,
	cooldown: 0.1,
	time_limit: 15,
	include_shortcuts: false,
	on_start: function (ship) {
		ship.set({ idle: true, collider: false, x: 0, y: 0 });
	},
	on_success: function (ship, { code, custom_data }) {
		ship.set({ type: 101, idle: false, collider: true });
		return `${ship.name} (ID ${ship.id}) joined with PIN ${code}.`;
	},
	on_fail: function (ship) {
		return `${ship.name} (ID ${ship.id}) failed to join with PIN.`;
	}
}

let code_prefix = "ui_pin_keypad_";

const failShip = function (ship, message) {
	ship.custom.pin_data.status = "FAILED";
	ship.custom.pin_data.custom_data = null;
	ship.custom.pin_data.code = null;
	ship.custom.pin_data.current_attempt = "";
	ship.custom.pin_data.finished_at = game.step;
	sendMessage(ship, message, true);
	if ("function" == typeof OPTIONS.on_fail) try {
		let errorMessage = OPTIONS.on_fail(ship);
		if (errorMessage) echo(`[[bg;orange;][PIN\\] ${errorMessage}]`);
	}
	catch (e) {}
}

const sendCurrentGuess = function (ship) {
	ship.setUIComponent({
		id: "ui_pin_input",
		position: [35, 25, 30, 10],
		components: [
			{ type: "text", position: [2.5, 2.5, 95, 95], value: (ship.custom.pin_data.current_attempt + "_").slice(0, OPTIONS.digits), color: "#fff" }
		]
	});
}

const sendMessage = function (ship, messsage, isError = false) {
	ship.setUIComponent({
		id: "ui_pin_notice",
		position: [40, 35, 20, 5],
		components: [
			{ type: "text", position: [2.5, 2.5, 95, 95], value: messsage, color: isError ? "#FFA500" : "#0f0" }
		]
	});
}

const showKeypad = function (ship, id) {
	let rowIndex, columnIndex, content, shortcut = id;

	switch (shortcut) {
		case "enter":
			rowIndex = 3;
			columnIndex = 0;
			content = "\u{23ce}";
			shortcut = String.fromCharCode(13);
			break;
		case "backspace":
			rowIndex = 3;
			columnIndex = 2;
			content = "\u{232b}";
			shortcut = String.fromCharCode(8);
			break;
		case "0":
			rowIndex = 3;
			columnIndex = 1;
			content = "0";
			break;
		default:
			rowIndex = Math.trunc((shortcut - 1) / 3);
			columnIndex = (shortcut - 1) % 3;
			content = shortcut;
	}
	
	ship.setUIComponent({
		id: code_prefix + id,
		clickable: true,
		position: [columnIndex * 11 + 35, rowIndex * 11.5 + 45, 8, 9],
		shortcut: OPTIONS.include_shortcuts ? shortcut : null,
		components: [
			{ type: "box", position: [0, 0, 100, 100], fill: "#00f", stroke: "#fff", width: 5 },
			{ type: "text", position: [2.5, 2.5, 95, 95], value: content, color: "#fff" },
		]
	});
}

let codeManager;

return {
	name: "PIN Manager",
	description: "A middleware to manage PINs for players.",
	author: "Bhpsngum",
	license: "MIT",
	version: "1.0.0",
	load: function (instance, options) {
		Object.assign(OPTIONS, options);
		if (game.custom.PIN_DATA == null) game.custom.PIN_DATA = new Map();
		codeManager = {
			pool: game.custom.PIN_DATA,
			create: function (custom_data, expiry = 60) {
				let code;
				do {
					code = "";
					for (let i = 0; i < OPTIONS.digits; ++i) {
						code += Math.trunc(Math.random() * 10);
					}
				}
				while (this.pool.has(code));
				
				this.pool.set(code, {
					timeout: game.step + expiry * 60,
					custom_data
				});
				
				return code;
			}
		};

		instance.bind("playerTick", function (ship, game, stop) {
			if (!ship.custom.pin_data) {
				if (ship.alive) {
					ship.custom.pin_data = {
						status: "PENDING",
						code: null,
						custom_data: null,
						issued_at: game.step,
						tries: 0,
						current_attempt: ""
					}
		
					if ("function" == typeof OPTIONS.on_start) try {
						OPTIONS.on_start(ship);
					}
					catch (e) {}
		
					sendCurrentGuess(ship);
					sendMessage(ship, "");
		
					for (let i = 0; i < 10; ++i) showKeypad(ship, i.toString());
		
					showKeypad(ship, "enter");
					showKeypad(ship, "backspace");
		
					ship.setUIComponent({
						id: "ui_pin_message",
						position: [0, 0, 100, 100],
						components: [
							{ type: "box", position: [0, 0, 100, 100], fill: "#000" },
							{ type: "text", position: [25, 5, 50, 25], value: "Please enter your PIN", color: "#ff0" },
							{ type: "box", position: [35, 25, 30, 10], fill: "#f00", stroke: "#fff", width: 5 },
						]
					});
				}
	
				stop();
			}
			else if (ship.custom.pin_data.status == "PENDING" && game.step - ship.custom.pin_data.issued_at > OPTIONS.time_limit * 60) {
				failShip(ship, "Timed out.");
				stop();
			}
		});

		instance.bind("playerEvent", function (ship, event, game, stop) {
			let { name, id: component } = event;
	
			if (name !== "ui_component_clicked" || "string" !== typeof component) return;
			
			if (component.startsWith(code_prefix)) stop();
			
			if (
				ship.custom.pin_data?.status == "PENDING" &&
				(ship.custom.pin_data.last_keypress == null || game.step - ship.custom.pin_data.last_keypress > OPTIONS.cooldown * 60)
			) {
				let { pin_data } = ship.custom;
				pin_data.last_keypress = game.step;
				let key = component.replace(code_prefix, "");
	
				switch (key) {
					case "enter":
						if (pin_data.current_attempt.length < OPTIONS.digits) {
							sendMessage(ship, "Not enough digits.", true);
							break;
						}
	
						let currentData = codeManager.pool.get(pin_data.current_attempt);
						if (currentData) codeManager.pool.delete(pin_data.current_attempt);
	
						if (currentData && currentData.timeout > game.step) {
							let code = pin_data.current_attempt;
							pin_data.code = code;
							pin_data.custom_data = currentData.custom_data;
							codeManager.pool.delete(code);
							pin_data.status = "VERIFIED";
							pin_data.finished_at = game.step;
							for (let i = 0; i < 10; ++i) ship.setUIComponent({ id: code_prefix + i, visible: false, position: [0, 0, 0, 0] });
							for (let i of ["backspace", "enter"]) ship.setUIComponent({ id: code_prefix + i, visible: false, position: [0, 0, 0, 0] });
	
							for (let i of ["input", "notice", "message"]) ship.setUIComponent({ id: "ui_pin_" + i, visible: false, position: [0, 0, 0, 0] });
								
							if ("function" == typeof OPTIONS.on_success) try {
								let message = OPTIONS.on_success(ship, pin_data);
								if (message) echo(`[[bg;#66ff00;][PIN\\] ${message}]`);
							}
							catch (e) {}
						}
						else {
							++pin_data.tries;
							let { max_tries } = OPTIONS, message = "Incorrect PIN.";
							if (max_tries && Number.isFinite(max_tries)) {
								if (pin_data.tries >= max_tries) {
									failShip(ship, "Too many failed attempts.");
									break;
								}
								else {
									let attempt = max_tries - pin_data.tries;
									message += attempt > 1 ? ` ${attempt} tries left.` : ` Last chance.`;
								}
							}
							sendMessage(ship, message, true);
							if (pin_data.current_attempt) {
								pin_data.current_attempt = "";
								sendCurrentGuess(ship);
							}
						}
						break;
					case "backspace":
						if (pin_data.current_attempt.length < 1) break;
						pin_data.current_attempt = pin_data.current_attempt.slice(0, -1);
						sendCurrentGuess(ship);
						break;
					default:
						if (/^\d$/.test(key) && pin_data.current_attempt.length < OPTIONS.digits) {
							pin_data.current_attempt += key;
							sendCurrentGuess(ship);
						}
				}
			}
		});
	},
	exports: {
		create: function (custom_data, expiry) {
			return codeManager.create(custom_data, expiry);
		},
		isVerified: function (ship) {
			return ship.custom.pin_data?.status == "VERIFIED";
		}
	}
}
