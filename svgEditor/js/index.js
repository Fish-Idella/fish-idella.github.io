var PuSet = function(argument) {};


PuSet.fullScreen =
	//fullScreen()和exitScreen()有多种实现方式，此处只使用了其中一种
	//全屏
	function fullScreen(targetElement) {
		var element = targetElement || document.documentElement;
		if (element.requestFullscreen) {
			element.requestFullscreen();
		} else if (element.msRequestFullscreen) {
			element.msRequestFullscreen();
		} else if (element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else if (element.webkitRequestFullscreen) {
			element.webkitRequestFullscreen();
		}
	};


PuSet.exitFullscreen =
	//退出全屏 
	function exitFullscreen() {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	};



PuSet.Alert = function(title, message, button, callback) {

	this.view = document.getElementById('view_alert');

	this.argumentlist = arguments;

	return this;

};

PuSet.Alert.prototype = {

	view: null,

	argumentlist: null,

	show: function(time) {

		var argumentlist = this.argumentlist;

		if (argumentlist != null) {

			var view = this.view;
			var title = document.getElementById('title_alert');
			while (title.firstChild) title.removeChild(title.firstChild);
			var message = document.getElementById('message_alert');
			while (message.firstChild) message.removeChild(message.firstChild);

			title.innerText = argumentlist[0] || "";
			message.innerHTML = "<p>" + (argumentlist[1] || "").replace(/\n+/g, "</p><p>") + "</p>";

			var a, key, button;
			if ("object" !== typeof(button = argumentlist[2])) {
				button = {};
				button[argumentlist[2]] = argumentlist[3];
			}

			var control = document.createElement("P");
			control.className = "control";
			control.onclick = (ev) => {
				try {
					button[ev.target.innerText].apply(this);
				} catch (ex) {}
			};

			for (key in button) {
				a = document.createElement("a");
				a.className = "button";
				a.innerText = key;
				control.appendChild(a);
			}

			message.appendChild(control);

			view.classList.remove("hide");

			if (("number" == typeof time) && time > 0) {
				setTimeout(() => this.hide(), time);
			}
		}

		return this;
	},

	hide: function() {
		this.view.classList.add("hide");
	}

};



console.dir(document.body);

new PuSet.Alert("欢迎使用", `注：
此网页动态脚本使用ES6编写，如果点击下方【开始】按钮此提示未消失，可能是当前浏览器不支持。
推荐使用<a href="https://www.google.cn/chrome/">Chrome浏览器最新版本</a>或其他现代浏览器。

让我们现在开始吧！`, "开始", function() {
	this.hide(window.addEventListener("resize", function(argument) {
		if (innerWidth < innerHeight || innerWidth < 500 || innerHeight < 500) {
			new PuSet.Alert("提示\n窗口太小，无法正常运行").show();
		}
	}, false));
	// PuSet.fullScreen();
}).show();