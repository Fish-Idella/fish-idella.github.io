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

$.repeatedlyGet = function (url, callback, num) {

	if ("number" != typeof num) {
		num = 5;
	}
	if (num < 0) { return callback(""); }

	$.get(url, callback, "text").error(function () {
		$.repeatedlyGet(url, callback, num--);
	});
};

PuSet.fn.shift = $.fn.shift = Array.prototype.shift;

function getParent(target) {
	//	target = document.getElementById();

	if (target.nodeName.toLowerCase() == "body") {
		return target;
	}

	var siblings = $(target).siblings();

	if (siblings.length == 0) {
		return getParent(target.parentElement);
	}

	if (siblings[0].nodeName == target.nodeName) {
		return target.parentElement;
	} else {
		return getParent(target.parentElement);
	}
}

function getZhangjieObject(id, data) {

		var result = [], targets = [];

		$.each(PuSet.parseHTML(data).querySelectorAll("a[href]"), function (i, target) {
			if (/^\s?((第|)[0-9一二三四五六七八九十百千万]+(章|篇|))\s?.+$/.test(target.innerHTML.replace(/\s+/g, ""))) {
				//			alert(target.innerHTML);
				targets.push(getParent(target));
			}
		});

		targets = $().add(targets);

		if (targets.length == 1) {
			targets = targets.eq(0);
		} else if (targets.length == 0) {
			return;
		} else {
			return alert("多个列表，未做判断处理"), result;
		}

		targets.find("a").each(function (i, target) {
			result.push({
				"url": formatURL(target.getAttribute("href"), id),
				"name": target.innerText
			});
		});

		return result;
}

function saveZhangjieList(id, url, data) {
	var obj = SHU_INFO[id];
	var url = formatURL(url, id);
	obj.currentListURL = url;
	if (data) {
		PuSet.extend(obj.zhangjie, getZhangjieObject(id, data));
		PuSet.local(SHU_INFO);
	} else {
		$.repeatedlyGet(url, function (data2) {
			PuSet.extend(obj.zhangjie, getZhangjieObject(id, data2));
			PuSet.local(SHU_INFO);
		});
	}
}

function getZhangjieList(id, arr, data) {
	var first, url = formatURL(arr.shift().getAttribute("href"), id);
	//	alert(url);
	$.repeatedlyGet(url, function (d) {
		$(PuSet.parseHTML(d)).find("a").each(function (i, target) {
			if (/^((?:序|((?:第|)(?:一|0*1)))(?:章|篇|))|前言/.test(target.innerHTML.replace(/\s+/g, " "))) {
				SHU_INFO[id].firstListURL = url;
				PuSet.local(SHU_INFO);
				return first = target, false;
			}
		});

		if (first) {
			var $a = $(first);
			saveZhangjieList(id, url, d);
			return;
		}

		if (arr.length) getZhangjieList(id, arr, data);
	});
}

function setZhangjieList(id, num) {
	var cccc;

	if (cccc = SHU_INFO[id].currentListURL) {

		$.repeatedlyGet(cccc, function (data) {

		});

	} else {

		$.repeatedlyGet(id, function (data) {
			var $a = $(PuSet.parseHTML(data)).find("a");
			//			$a.each(function(i, target) {
			//				if (/^((?:序|((?:第|)(?:一|0*1)))(?:章|篇))|前言/.test(target.innerHTML.replace(/\s*/g, ""))) {
			//					first = target;
			//					return false;
			//				}
			//			});
			//			if (first) {
			//				alert(first.innerHTML);
			//				return SHU_INFO[id].firstListURL = id;
			//			}

			var $list = $a.filter(":contains('目录')").toPuSet().mergeDistinct($a.filter(":contains('章节')")).mergeDistinct($a.filter(":contains('开始阅读')"));

			//			PuSet.alert($list);
			getZhangjieList(id, $list, data);

		}, num);
	}
}
