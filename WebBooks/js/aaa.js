(function ($) {
	var state = false;
	var functionList = [];
	var run = function (arr) {
		try {
			if (false === arr.shift()()) {
				return $.freetimeExecute.stop();
			}
		} catch (error) { }

		if (arr.length) {
			run.t = setTimeout(run, 100, arr);
		} else {
			state = false;
		}
	};

	$.freetimeExecute = function (callback) {
		if ($.isFunction(callback)) {
			functionList.push(callback);
			if (!state) {
				$.freetimeExecute.run();
			}
		}
	};

	$.freetimeExecute.run = function () {
		state = true;
		run.t = setTimeout(run, 100, functionList);
	};

	$.freetimeExecute.wait = function () {
		clearTimeout(run.t);
	};

	$.freetimeExecute.stop = function () {
		clearTimeout(run.t);
		functionList.length = 0;
		state = false;
	};

	$.freetimeExecute.each = function (obj, callback) {
		$.each(obj, function (key, value) {
			$.freetimeExecute(function () {
				return callback.call(value, key, value);
			});
		});
	};

}(jQuery));

function repeatedlyGet(url, callback, num = 5) {
	if (num < 0) { return callback(""); }
	fetch(url).then(a => a.text()).then(callback).catch(function () {
		repeatedlyGet(url, callback, num--);
	});
};

var r_zhangjie = /^((?:序|((?:第|)(?:一|0*1)))(?:章|篇|))|前言/;