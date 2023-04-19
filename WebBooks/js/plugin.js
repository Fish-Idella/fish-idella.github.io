/**
 PuSet插件  本地数据库插件

 PuSet.local

 标准插件,不能脱离框架
 */
(function (PuSet) {

	PuSet.local = {
		set: function (name, obj) {
			window.localStorage.removeItem(name);
			window.localStorage.setItem(name, "" + JSON.stringify(obj));
			return obj;
		},

		get: function (name, defObj = {}) {
			const result = window.localStorage.getItem(name);
			if ("string" === typeof result) {
				try {
					return JSON.parse(result);
				} catch (ex) { }
			}
			return this.set(name, defObj);
		},

		remove: function (name) {
			window.localStorage.removeItem(name);
			window.localStorage.setItem(name, "");
			window.localStorage.removeItem(name);
		},

		clear: function () {
			window.localStorage.clear();
		}
	};

}(window.PuSet));

// console.log(typeof JSON.stringify(123)) // string


// hammer插件
(function (jQuery, Hammer) {

	function SetHammerObject(targets, options) {

		var length = targets.length;
		for (let i = 0; i < length; i++) {
			this.push(new Hammer(targets[i], options))
		}
		return this;
	}

	SetHammerObject.prototype = {
		length: 0,
		push: jQuery.fn.push,
		get: jQuery.fn.get,
		each: jQuery.fn.each,

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

	jQuery.fn.hammer = function (options) {
		return new SetHammerObject(this, options);
	};

}(window.jQuery, window.Hammer));

function noWeb() {
	alert("网络请求失败。");
}

function zhangjie_geshihua(num, length) {
	while (num = "" + num, length = length || 3) {
		if (num.length == length) {
			return num;
		} else {
			num = "0" + num;
		}
	}
}

function getNetworkImage(str, callback) {

	const reader = new FileReader();
	const xhr = new XMLHttpRequest();

	reader.onloadend = () => {
		if (reader.readyState === FileReader.DONE) {
			// setLocalCofig('puset-settings', settings);
			callback(reader.result, str);
		} else {
			console.dir(reader);
		}
	};

	xhr.open("get", str, true);
	// 至关重要
	xhr.responseType = "blob";
	xhr.onload = function () {
		reader.readAsDataURL(this.response);
	};

	xhr.send();
}


// 添加新书
function addBook(id) {

	const urlObj = PuSet.url(id);
	const url = urlObj.href;

	if (SHU_INFO[url]) {
		return alert("书籍已经存在，不用重复添加");
	}

	Global.URL = url;

	$.ajax({
		url: url,
		type: "GET",
		contentType: "text/html,charset=utf-8",
		error: noWeb,
		success: function (data) {

			Global.$document = $(PuSet.parseHTML(data.replace(/<script((?!<\/script>)[\w\W]+?)<\/script>/img, "")));

			var bookInfo = SHU_INFO[url] = {
				bookName: "", // 书名
				baseIcon: "", // 原始书本封面
				dataIcon: "", // 本地化书本封面
				index: 1, // 排序
				firstListURL: "", // 章节列表首页链接
				currentListURL: "", // 当前章节页面链接
				yhcId: 0, // 当前已经缓存到的最新章节的id
				yddId: 0, // 已经读到的位置
				chapter: "CHAPTER" + Date.now() // 章节缓存
				// eg
				// {
				// 	name: "",           // 章节名
				//  html: "",           // 章节内容链接的初始HTML
				// 	url: "",            // 章节内容链接
				//  absURL: "",         // 章节内容链接的绝对路径，已设置表示已缓存
				// 	id: "",             // 章节缓存在本地的id
				// }
			};
			PuSet.local.set("shuben", SHU_INFO);

			// console.log(urlObj)
			var host = urlObj.host || urlObj.hostname;
			var parse;

			if (parse = WEB_BOOK_PARSE[host]) {

				bookInfo.bookName = Global.$document.find(parse.bookName).text();
				PuSet.local.set("shuben", SHU_INFO);

				getNetworkImage(PuSet.url(Global.$document.find(parse.cover).attr("src"), url).href, function (data, baseurl) {
					var dataIconID = 'COVER' + Date.now();

					bookInfo.baseIcon = baseurl;
					bookInfo.dataIcon = dataIconID;

					PuSet.local.set(dataIconID, data);
					PuSet.local.set("shuben", SHU_INFO);

					createShuJi(url);
					setZhangjieList(url);
				});

			} else {

				WEB_BOOK_PARSE[host] = null;
				PuSet.local.set("WEB_BOOK_PARSE", WEB_BOOK_PARSE);

				bookInfo.bookName = Global.$document.find("title").text().split(/\s|最新章节|无弹窗|全本阅读|全文阅读|全文TXT|\-|\_|\,/)[0];
				PuSet.local.set("shuben", SHU_INFO);

				var $imgs = Global.$document.find("img");

				if ($imgs.length) {
					Global.$icon.removeClass("hide");
					Global.$icon_body.empty();

					$imgs.each(function (_i, target) {
						$.each(target.attributes, function (_l, attr) {
							getNetworkImage(PuSet.url(attr.value, url), function (data, baseurl) {
								var img = new Image();
								img.onload = function () {
									Global.$icon_body.append($(`<div class="icon flex-vertical" data-src="${data}" data-baseurl="${baseurl}" data-id="${url}"><div class="shu" style="background-image: url(${data});"></div><div class="shuming fc">${img.width + '\u0078' + img.height}</div></div>`));
								};
								img.src = data;
							});
						});
					});
				} else {
					createShuJi(url);
					setZhangjieList(url);
				}
			}

		}
	});
}


function removeShuJi(id, $target) {

	const book = SHU_INFO[id];

	// 移除主页元素
	$target.remove();

	// 删除封面
	PuSet.local.remove(book.dataIcon);

	// 删除缓存的章节
	PuSet.local.get(book.chapter, []).forEach(function (obj) {
		PuSet.local.remove(obj.id);
	});

	// 删除章节列表
	PuSet.local.remove(book.chapter);

	// 删除书籍
	delete SHU_INFO[id];
	PuSet.local.set("shuben", SHU_INFO);
}

function createShuJi(url) {

	var obj = SHU_INFO[url];

	var $li = $(`<div data-id="${url}" class="book flex-vertical" style="order: ${obj.index}"><div class="shu" style="background-image: url(${PuSet.local.get(obj.dataIcon)});"></div><input class="shuming fc" type="text" value="${obj.bookName}" readonly /></div>`);
	var li = $li.get(0);

	Global.$button_tianjia.before($li);
	$li.hammer().on("press", function () {
		Global.$currentTarget = $li;
		Global.$currentObject = obj;
		Global.currentId = url;
		showMenu(li);
	});
}

function showMenu(target) {
	var obj = Global.$currentObject || SHU_INFO[target.title];
	Global.$menuView.removeClass("hide");
	Global.$menuTitle.val(obj.bookName);
}

var WEB_BOOK_PARSE = PuSet.local.get("WEB_BOOK_PARSE", {
	"www.bxwx.tv": {
		bookName: "#info>h1",
		cover: "#fmimg>img",
		firstListURL: "self",
		list: "div.listmain>dl>*",
		content: "#content"
	}
});

function setZhangjieList(url) {
	if (!Global.$document) {
		return $.ajax({
			url: url,
			type: "GET",
			contentType: "text/html,charset=utf-8",
			error: noWeb,
			success: function (data) {
				Global.$document = $(PuSet.parseHTML(data.replace(/<script((?!<\/script>)[\w\W]+?)<\/script>/img, "")));

				setZhangjieList(url);
			}
		});
	}

	var urlObj = PuSet.url(url);
	var host = urlObj.host || urlObj.hostname;
	var parse;

	var book = SHU_INFO[url];
	var zhangjie = PuSet.local.get(book.chapter, []);

	if (parse = WEB_BOOK_PARSE[host]) {
		var firstListURL = parse.firstListURL;
		if (firstListURL !== "self") {
			firstListURL = PuSet.url(Global.$document.find(firstListURL).attr("href"), url);
		}
		book.firstListURL = url;

		setLocalZhangjieList(url, book, zhangjie, parse);
		PuSet.local.set("shuben", SHU_INFO);
	} else {
		alert("网站未收录。");
	}
}

function setLocalZhangjieList(url, book, zhangjie, parse) {

	let a, href;

	book.currentListURL = book.firstListURL;

	$.ajax({
		url: book.currentListURL,
		type: "GET",
		contentType: "text/html,charset=utf-8",
		error: noWeb,
		success: function (data) {
			Global.$document = $(PuSet.parseHTML(data.replace(/<script((?!<\/script>)[\w\W]+?)<\/script>/img, "")));
			Global.$document.find(parse.list).each(function (_i, elem) {

				a = ("A" === elem.nodeName.toUpperCase()) ? elem : elem.querySelector("a");
				href = a ? a.getAttribute("href") : "#";

				zhangjie.push({
					name: elem.innerText,                                      // 章节名
					html: elem.outerHTML,                                      // 章节内容链接的初始HTML
					url: href,                                                 // 章节内容链接
					absURL: PuSet.url(href, url).href,                         // 章节内容链接的绝对路径，已设置表示已缓存
					id: null                                                   // 章节缓存在本地的id
				});
			});

			PuSet.local.set(book.chapter, zhangjie);
		}
	});
}


function openShu(id) {

	const book = SHU_INFO[id];
	var urlObj = PuSet.url(id);
	var host = urlObj.host || urlObj.hostname;
	var parse;

	var zhangjie = PuSet.local.get(book.chapter, []);


	if (book.currentListURL) {

	} else {
		if (parse = WEB_BOOK_PARSE[host]) {

		}
	}
}