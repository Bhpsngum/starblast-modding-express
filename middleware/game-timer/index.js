return {
	name: "Game Timer",
	author: "Bhpsngum",
	description: "A middleware to manage tick-synchronized timers.",
	license: "MIT",
	version: "1.0.0",
	load: function (instance) {
		if (!game.custom.timeManager) game.custom.timeManager = { id_pool: 0, jobs: new Map() };
		let timeManager = game.custom.timeManager;

		instance.bind("tick", function (game) {
			for (let i of timeManager.jobs) {
				let job = i[1];
				if (game.step >= job.time) {
					try {
						job.f.call(game, ...job.args);
					}
					catch (err) {
						console.error(err);
					}
					if (job.repeat) job.time += job.interval;
					else timeManager.jobs.delete(i[0]);
				}
			}
		});

		this.exports = {
			setTimeout: function (f, time, ...args) {
				let id = timeManager.id_pool++;
				if ("string" === typeof f) f = (function () { eval(f) });
				timeManager.jobs.set(id, { f, time: game.step + +time, args, repeat: false });
				return id;
			},
			setInterval: function (f, time, ...args) {
				let id = timeManager.id_pool++;
				time = +time;
				if ("string" === typeof f) f = (function () { eval(f) });
				timeManager.jobs.set(id, { f, time: game.step + +time, interval: time, args, repeat: true });
				return id;
			},
			clearTimeout: function (id) {
				timeManager.jobs.delete(id);
			},
			clearInterval: function (id) {
				timeManager.jobs.delete(id);
			}
		};
	},
	exports: {}
}
