let timeManager;

return {
	name: "Game Timer",
	author: "Bhpsngum",
	license: "MIT",
	load: function () {
		if (!game.custom.timeManager) game.custom.timeManager = { id_pool: 0, jobs: new Map() };
		timeManager = game.custom.timeManager;
	},
	exports: {
		setTimeout: function (f, time, ...args) {
			let id = timeManager.id_pool++;
			if ("string" === typeof f) f = Function(f).bind(game);
			timeManager.jobs.set(id, { f, time: game.step + +time, args, repeat: false });
			return id;
		},
		setInterval: function (f, time, ...args) {
			let id = timeManager.id_pool++;
			time = +time;
			if ("string" === typeof f) f = Function(f).bind(game);
			timeManager.jobs.set(id, { f, time: game.step + +time, interval: time, args, repeat: true });
			return id;
		},
		clearTimeout: function (id) {
			timeManager.jobs.delete(id);
		},
		clearInterval: function (id) {
			timeManager.jobs.delete(id);
		}
	},
	tick: function (game) {
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
	}
}
