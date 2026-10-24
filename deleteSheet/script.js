(function() {

	var strings = outString({
		title: "删除CSS无用表单",
		title2: "转换结果",
		c_css: "传入CSS文件",
		c_html: "传入html文件",
		c_select: "传入选择器",
		z_css: "选择需要处理CSS文本文档，可以是本地文件，网络文件，或直接编辑文档",
		z_html: "选择CSS运行的HTML文件，可以是本地文件，网络文件，或直接编辑文档，文档中最好不要出现JavaScript代码，可不选",
		z_e: "输入要保留的CSS选择器，以半角字符逗号(,)隔开，一般填HTML文件中不存在的选择器（JavaScript中定义的选择器），可不选",
		s_File: "选择本地文件",
		ok: "确认",
		l1: "删除无用选择器",
		l2: "删除无用样式表",
		url: "在这里输入文档或文件的路径…",
		read: "正在读取文件内容",
		write: "解析内容中",
		del: "正在删除无用信息",
		alert: "必须传入CSS",
		select: "选取",
		select1: "重选"
	});

	var each = [].forEach;
	var indexOf = [].indexOf;

	function inArray(elem, arr, i) {
		return (arr == null ? -1 : indexOf.call(arr, elem, i)) >= 0;
	}

	var URL = window.webkitURL || window.URL;

	Element.prototype.on = Element.prototype.addEventListener;

	String.prototype.trim = function() {
		return this.replace(/\s+/g, " ").replace(/(^\s*)|(\s*$)/g, "");
	};

	var object = {
		css: "",
		html: "",
		select: [],
		text: {}
	};

	var type = "";

	document.addEventListener('DOMContentLoaded',
	function() {

		function getText(url) {

			var xmlhttp = null;
			if (window.XMLHttpRequest) { // code for Firefox, Opera, IE7, etc.
				xmlhttp = new XMLHttpRequest();
			} else if (window.ActiveXObject) { // code for IE6, IE5
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			}
			if (xmlhttp != null) {
				xmlhttp.onreadystatechange = function() {
					if (xmlhttp.readyState == 4) {
						var status = this.status;
						if (status >= 200 && status < 300 || status === 304 || status == 0) {
							e_text.value = this.responseText;

							e_ok.disabled = false;
						}
					}
				};
				xmlhttp.open("GET", url, true);
				xmlhttp.send();
			} else {
				alert("Your browser does not support XMLHTTP.");
			}
		}

		this.find = function(select) {
			var self = this.querySelectorAll(select);
			self.each = each;
			self.on = function(type, fn) {
				this.each(function(a) {
					a.on(type, fn, !1);
				});
				return this;
			};
			return self;
		};

		document.find("#_file").on("change",
		function() {
			try {
				getText(URL.createObjectURL(this.files[0]));
			} catch(err) {
				alert(err);
			}
		});

		document.find("#select>li>.zhushi~input[type=button]").on("click",
		function(event) {
			type = this.title;

			e_text.value = object.text[type] || "";

			e_title.innerHTML = strings["c_" + type];
			e_select.style.display = "none";
			e_body.style.display = "block";
		});

		var e_select = document.find("#select").item(0);
		var e_body = document.find("#body").item(0);
		var e_li = document.find("textarea#text+li").item(0);

		var e_title = document.find("#title").on("click",
		function() {

			if (type) object.text[type] = e_text.value;
			this.innerHTML = strings.title;

			e_select.style.display = "block";
			e_body.style.display = "none";
			e_text.style.height = "calc(100% - 50px)";
			e_li.style.display = "block";
		}).item(0);

		var e_text = document.find("textarea#text").on("keyup",
		function() {
			e_ok.disabled = !this.value;
		}).on("change",
		function() {
			e_ok.disabled = !this.value;
		}).item(0);

		var e_ok = document.find("#ok").on("click",
		function() {

			var value = e_text.value.trim();

			if (value.indexOf("file://") == 0 || value.indexOf("http://") == 0 || /^\s*\.+\/\S+\.\S+\s*$/.test(value)) {
				return getText(value),
				e_ok.disabled = true;
			} else {
				if (type == "select") {
					object[type] = value.split(/\s*\,\s*/g);
					// alert(object[type].length)
				} else {
					object[type] = value;
				}
				e_title.click();
				document.find("input[title=" + type + "]").item(0).value = strings.select1;
			}
		}).item(0);

		var e_check1 = document.find("#check1").item(0);
		var e_check2 = document.find("#check2").item(0);

		document.find("#_ok").on("click",
		function() {
			if (!object.css) {
				return alert(strings.alert);
			}
			type = "";

			object.in_css = [];
			object.out_css = [];
			object.over_css = [];
			object.css = object.css.replace(/\/\*[\s\S]*?\*\//g, "");
			for (var i = 0,
			l = 0,
			s = ""; i < object.css.length; i++) {
				s += object.css[i];

				if (object.css[i] == ";" && s.indexOf("{") < 0) {
					object.in_css.push(s.trim());
					s = "";
				} else if (object.css[i] == "{") {
					l++;
				} else if (object.css[i] == "}") {
					l--;
					if (l == 0) {

						object.in_css.push(s.trim());
						s = "";
					}
				}
			}

			// Roc.alert(object.in_css);
			if (e_check1.checked) {

				document.find("#newwindow").item(0).innerHTML = "<iframe></iframe>";

				var dom = document.find("#newwindow iframe").item(0).contentWindow;

				dom.alert = function(m) {
					//  alert("非网页弹出：\n" + m);
				};

				dom = dom.document;

				if (object.html) {
					dom.write(object.html);
				}

				// alert(1);
				object.in_css.forEach(function(a, key) {

					// 
					var _index = 0;
					if ((_index = a.indexOf("{")) >= 0) {
						var selector = a.substr(0, _index).trim().split(/\s*\,\s*/g);
						var sheet = a.substr(_index);

						// alert(2);
						selector.forEach(function(b, i) {
							if (b == "*") {
								// true
							} else {

								if (b[0] == ":") {
									// true
								} else if (b.indexOf("::") >= 0) {
									//true
								} else {

									// alert(3);
									var c = b.replace(/\:\w+(\W)/g, "$1").replace(/\:\w+$/, "");

									// alert(c);
									if (!inArray(b, object.select) && !inArray(c, object.select) && (function() {

										try {
											return dom.querySelectorAll(c).length == 0
										} catch(e) {
											return false;
										}

									})()) {
										selector[i] = "";
									}
								}
							}
						});

						var string_selector;
						if (string_selector = selector.join().replace(/\,+/g, ",").replace(/(^\,*)|(\,*$)/g, "")) {

							object.out_css.push(string_selector + sheet);

						}

					} else {
						object.out_css.push(a);
					}
				});

			} else {
				object.out_css = object.in_css;
			}

			if (e_check2.checked) {

				document.find("#newwindow").item(0).innerHTML = "<iframe></iframe>";

				var dom = document.find("#newwindow iframe").item(0).contentDocument;

				dom.write("<style></style>");

				var style = dom.querySelector("style");

				object.out_css.forEach(function(a, key) {

					var _index = 0;
					if ((_index = a.indexOf("{")) >= 0) {
						var selector = a.substr(0, _index).trim().split(/\s*\,\s*/g);
						style.innerHTML = a;

						try {
							object.over_css.push(selector + "{" + style.sheet.rules[0].style.cssText + "}");
						} catch(e) {
							object.over_css.push(a);
						}

					} else {
						object.over_css.push(a);
					}
				});

				object.out_css = object.over_css;

			}

			e_text.value = object.out_css.join("");

			e_select.style.display = "none";
			e_body.style.display = "block";
			e_text.style.height = "100%";
			e_li.style.display = "none";
			e_title.innerHTML = strings.title2;
		});

	});

})();

function outString(obj) {
	document.addEventListener('DOMContentLoaded',
	function() {

		var elements = document.querySelectorAll("*");
		var attrs;
		var key, value;

		[].forEach.call(elements,
		function(element) {
			if (attrs = element.getAttribute("attr")) {
				attrs = attrs.split(/\s*(?:,|;)\s*/);

				element.removeAttribute("attr");
				attrs.forEach(function(attr) {
					attr = attr.split(/\s*\:\s*/);

					value = obj["" + attr[1]] || "";

					if ((key = attr[0]) == "html") {
						key = "innerHTML";
					} else if (key == "text") {
						key = "innerText";
					}

					if (key in element) {
						element[key] = value;
					} else {
						element.setAttribute(key, value);
					}
				})
			}
		});

	},
	false);

	return obj;
}