/*global ig*/
ig.module(
	'plugins.sequence.manager'
).requires(
	'impact.impact'
).defines(function () {
	'use strict';
	var methods = {};
	ig.Sequence = function (context) {
		var steps = [],
			stepsCopy,
			update,
			name,
			args;
		update = function () {
			if (!stepsCopy || !stepsCopy.length) {
				stepsCopy = steps.slice(0);
			}
			if (steps && steps.length) {
				steps[0]();
			}
		};
		for (name in methods) {
			if (methods.hasOwnProperty(name)) {
				update[name] = methods[name](context, steps);
			}
		}
		update.reset = function () {
			args = [1, 0].concat(stepsCopy.slice(0));
			Array.prototype.splice.apply(steps, args);
		};
		return update;
	};
	ig.Sequence.installMethod = function (name, fn) {
		methods[name] = fn;
	};
	ig.Sequence.installMethod('then', function (context, steps) {
		return function (doThis) {
			steps.push(function () {
				// Update.
				doThis.call(context);
				// End.
				steps.shift();
			});
			return this;
		};
	});
	ig.Sequence.installMethod('thenUntil', function (context, steps) {
		return function (doThis, predicate) {
			steps.push(function () {
				if (!predicate.call(context)) {
					doThis.call(context);
				}

				if (predicate.call(context)) {
					steps.shift();
					var func = steps[0];
					if (func) {
						func();
					}
				}
			});
			return this;
		};
	});
	ig.Sequence.installMethod('waitUntil', function (context, steps) {
		return function (predicate) {
			var doThis = function () {
				return;
			};
			steps.push(function () {
				if (!predicate.call(context)) {
					doThis.call(context);
				}

				if (predicate.call(context)) {
					steps.shift();
					var func = steps[0];
					if (func) {
						func();
					}
				}
			});
			return this;
		};
	});
	ig.Sequence.installMethod('wait', function (context, steps) {
		return function (secs) {
			var decrement = secs;
			steps.push(function () {
				// Update.
				if (decrement) {
					decrement -= ig.system.tick;
				}
				// End.
				if (decrement <= 0) {
					steps.shift();
					// Necessary because of repeat.
					decrement = secs;
				}
			});
			return this;
		};
	});
	ig.Sequence.installMethod('during', function (context, steps) {
		return function (doThis) {
			if (!steps) {
				throw new Error('during only works with previous step!');
			}
			var func = steps[steps.length - 1];
			steps[steps.length - 1] = function () {
				doThis.call(context);
				func();
			};
			return this;
		};
	});
	ig.Sequence.installMethod('repeat', function (context, steps) {
		return function (times) {
			var stepsCopy, originalTimes;
			times = times || Infinity;
			originalTimes = times;
			steps.push(function () {
				times -= 1;
				if (times > 0) {
					var args = stepsCopy.slice(0);
					args.unshift(1, 0);
					Array.prototype.splice.apply(steps, args);
				} else {
					// For successive repeats.
					times = originalTimes;
				}
				// End.
				steps.shift();
			});
			stepsCopy = steps.slice(0);
			return this;
		};
	});
	ig.Sequence.installMethod('every', function (context) {
		return function (sec, doThis) {
			return this.during(
				ig.Sequence(context).wait(sec).then(doThis).repeat()
			);
		};
	});
	ig.Sequence.installMethod('orUntil', function (context, steps) {
		return function (predicate) {
			if (!steps) {
				throw new Error('orUntil only works with previous step!');
			}
			var func = steps[steps.length - 1];
			steps[steps.length - 1] = function () {
				if (predicate.call(context)) {
					steps.shift();
					return;
				}
				func();
			};
			return this;
		};
	});
});