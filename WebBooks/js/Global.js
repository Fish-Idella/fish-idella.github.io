var Global = {
	$document: $(document),
	$currentTarget: null,
	$currentObject: null
};
/**
Global.$window = $(window).on("resize", function() {

	});
*/

// 截取字符串 第index个char
String.prototype.cut = function (char, index) {
	if (this.indexOf(char) < 0) {
		return this;
	}

	index = parseInt(index) || 0;

	var i = 0, j = 0, length = this.length;

	if (index < 0) {
		for (; length >= 0; length--) {
			if (this[length] == char) {
				index++;
				if (index == 0) {
					return this.substring(0, length + 1);
				}
			}
		}
	} else {
		for (; i < length; i++) {
			if (this[i] == char) {
				if (j == index) {
					return this.substring(0, i + 1);
				}
				j++;
			}
		}
	}
	return this;
};

// hammer插件
(function (PuSet, Hammer) {

	function SetHammerObject(targets, options) {

		var length = this.length = targets.length;
		while (length--) {
			this[length] = new Hammer(targets[length], options);
		}
		return this;
	}

	SetHammerObject.prototype = {
		length: 0,
		get: PuSet.prototype.get,
		each: PuSet.prototype.each,

		on: function (type, callback) {
			return this.each(function (i, hammer) {
				hammer.on(type, callback);
			});
		},

		off: function (type, callback) {
			return this.each(function (i, hammer) {
				hammer.off(type, callback);
			});
		}
	};

	PuSet.fn.hammer = function (options) {
		return new SetHammerObject(this, options);
	};

}(window.$, window.Hammer));

/**
 PuSet插件  本地数据库插件

 PuSet.local

 标准插件,不能脱离框架
 */
(function (PuSet) {

	PuSet.local = function (obj) {

		if (obj) {
			window.localStorage.removeItem("shuben");
			window.localStorage.setItem("shuben", JSON.stringify(obj));
		} else {
			if (window.localStorage.getItem("shuben")) {
				return JSON.parse(window.localStorage.getItem("shuben"));
			} else {
				window.localStorage.setItem("shuben", "{}");
				return {};
			}
		}
	};

	PuSet.local.clear = function () {
		window.localStorage.clear();
	};

}(window.PuSet));


function zhangjie_geshihua(num, length) {
	while (num = "" + num, length = length || 3) {
		if (num.length == length) {
			return num;
		} else {
			num = "0" + num;
		}
	}
}

function careatList(url) {

	if (SHU_INFO[url]) {
		return alert("书籍已经存在，不用重复添加");
	}

	$.get(url, function (data) {
		var $document = $(PuSet.parseHTML(data));
		var title = $document.find("title").text().split(/\s|最新章节|无弹窗|全本阅读|\-|\_|\,/)[0];
		setIcon(url, title, $document.find("img"));
	}, "text").error(function () {
		alert("URL Error");
	});
}

function setImageBox(url, src, title) {
	var li = document.createElement("li");
	li.innerHTML = '<div class="shu" style="background:url(' + src + ');"></div><div class="shuming">' + title + '</div>';
	li.addEventListener("click", function () {
		Global.$icon.hide();
		SHU_INFO[url].icon = src;
		PuSet.local(SHU_INFO);
		createShuJi(url);
		setZhangjieList(url);
	}, false);
	Global.$icon_body.append(li);
}

function formatURL(relative, absolute) {
	var root = absolute.replace(/^((?:http|ftp|https|file)\:\/{2,3}[^\/]+?\/).*$/, "$1");
	var url = absolute.substring(root.length);
	var path = url.cut("/", -1);

	if (/^(file|ftp|http|https)\:\/{2,3}/.test(relative)) {
		return relative;
	} else if (relative[0] == "/") {
		return root + relative.substring(1);
	} else if (relative.indexOf("./") == 0) {
		return root + path + relative.substring(2);
	} else if (relative.indexOf("../") == 0) {
		// BUG
		return root + path + relative.replace(/^(\.\.\/)+/, "/");
	} else {
		return root + path + relative;
	}
}

function setIcon(id, title, $imgs) {

	add_shuji(id, title);

	if (!$imgs.length) { return createShuJi(id), setZhangjieList(id); }

	Global.$icon.show();

	$imgs.each(function (i, target) {
		$.each(target.attributes, function (l, attr) {
			var img = new Image(), value = attr.value;
			img.onload = function () {
				setImageBox(id, this.src, this.width + '\u0078' + this.height);
			};

			img.src = formatURL(value, id);
		});
	});
}

function add_shuji(id, title) {
	SHU_INFO[id] = {
		'bookName': '' + title,
		'icon': "",
		index: 1,
		firstListURL: "",
		currentListURL: "",
		yhcId: 0, // 当前已经缓存的最新章节的id
		yddId: 0, // 已经读到的位置
		zhangjie: []
	};

	PuSet.local(SHU_INFO);
}

function removeShuJi(id, $target) {
	$target.remove();

	// 删除章节

	delete SHU_INFO[id];
	PuSet.local(SHU_INFO);
}

function createShuJi(id) {

	var obj = SHU_INFO[id];

	// var li = document.createElement("li");
	var name = obj.bookName;
	// li.title = id;
	// li.style.order = "" + obj.index;
	// li.innerHTML = '<div class="shu moren">' + name + '</div><div class="shu" style="background:url(' + obj.icon + ');"></div><input class="shuming" value="' + name + '" readonly>';


	var li = $(
`<div title="${id}" class="flex-vertical" style="order: ${obj.index}">
	<div class="shu" style="background-image: url(${obj.icon});"></div>
	<div class="shuming fc">${name}</div>
</div>`);


	var $li = Global.$button_tianjia.before(li).prev().click(function () {
		openSHU(li.title);
	});
	$li.hammer().on("press", function () {
		Global.$currentTarget = $li;
		Global.$currentObject = obj;
		Global.currentId = id;
		showMenu(li);
	});
}


function showMenu(target) {
	var obj = Global.$currentObject || SHU_INFO[target.title];
	try {
		Global.$menuView.fadeIn();
		/*.css({
			"width": "0",
			"height": "0",
			"top": "50%",
			"left": "50%",
			"display": "block"
		}).animate({
			"width": "100%",
			"height": "100%",
			"top": "0",
			"left": "0"
		}, 300);*/
	} catch (err) {
		alert(err);
	}
	Global.$menuTitle.val(obj.bookName);
}


function openSHU(id) {
	var obj = SHU_INFO[id];
	var zj = obj.zhangjie;
	var zjxx = zj[obj.yddId || 0];

	if (zjxx in window.localStorage) {
		Global.$shuben.show().html(window.localStorage[zjxx]);
	} else {
		setZhangjieList(id);
		alert("");
	}
}


function getList(url) {
	// p String
	// returns Object

	var result = {};

	if (!url) {
		return null;
	}



	return result;
}
