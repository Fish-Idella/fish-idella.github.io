"use strict";

const URLObject = window.URL || window.webkitURL || function () { };
if (!URLObject.createObjectURL) {
    Object.assign(URLObject, {
        createObjectURL: function () {
            return "#"
        }
    });
}

var storage = new PuSet.Storage();

// 获取本地配置信息
////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 
 * @param {string} item 键
 * @param {object} defaultCofig 如果本地存储未找到结果时的替代品
 * @returns defaultCofig
 */
function getLocalConfig(item, defaultCofig, then) {
    storage.getItem(item).then(function (request) {
        const result = request.result;
        then(JSON.parse(result ? LZString.decompress(result) : "null") || defaultCofig);
    });
}

/**
 * 
 * @param {string} item  存储键
 * @param {object} cofig 存储对象
 */
function setLocalConfig(item, cofig) {
    storage.setItem(item, LZString.compress(JSON.stringify(cofig)));
}

/**
 * 为元素设置属性
 * @param {HTMLElement} target 元素
 * @param {*} options 参数
 */
// function attr(target, options) {
//     for (let key in options) {
//         target.setAttribute(key, options[key]);
//     }
// }

/**
 * 初始化函数：loadBackground 
 * @param {Element} mBackground 
 * @returns fn
 */
function loadBackgroundFn(mBackground) {
    "use strict";

    const mVideo = document.createElement("video"),
        mCanvas2D = document.createElement("canvas"),
        mCanvas3D = document.createElement("canvas"),
        n = {
            dx: 0,
            dy: 0,
            dw: mCanvas2D.width = mBackground.clientWidth,
            dh: mCanvas2D.height = mBackground.clientHeight
        };

    mVideo.className = "view wallpaper dynamic";
    mVideo.style.background = "#fff";
    mVideo.setAttribute("poster", MainUI.w);
    mCanvas2D.className = "view wallpaper hide";
    mCanvas3D.className = "view wallpaper hide";
    mBackground.appendChild(mVideo);
    mBackground.appendChild(mCanvas2D);
    mBackground.appendChild(mCanvas3D);

    const ctx = mCanvas2D.getContext("2d", { alpha: true });
    const webgl = mCanvas3D.getContext("webgl", { alpha: true });
    const resize = () => {
        let e = mBackground.clientWidth, i = mBackground.clientHeight;
        n.dy = n.dx = 0;
        mCanvas2D.width = n.dw = e, mCanvas2D.height = n.dh = i;
        mCanvas3D.width = e, mCanvas3D.height = i;
    };
    // 设置隐藏属性和改变可见属性的事件的名称
    let hidden, visibilitychange;
    if (typeof document.hidden !== "undefined") {
        hidden = "hidden";
        visibilitychange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilitychange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilitychange = "webkitvisibilitychange";
    }

    let isVideo = false;
    document.addEventListener(visibilitychange, function () {
        if (isVideo) {
            document[hidden] ? mVideo.pause() : mVideo.play();
        }
    });

    window.addEventListener("resize", resize);

    return function loadBackground(path, type) {
        // 初始化背景状态
        // ctx.clearRect(0, 0, n.dw, n.dh);

        // 获取背景类型
        new Promise((resolve, reject) => {
            if (type) {
                resolve(type);
            } else {
                const n = new XMLHttpRequest;
                n.onerror = reject;
                n.onreadystatechange = function () {
                    if (this.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                        n.abort();
                        resolve("" + (n.getResponseHeader("Content-Type") || "color"));
                    }
                };
                n.open("GET", path);
                n.responseType = "blob";
                n.send()
            }
        }).then(function (type) {
            mVideo.pause();
            isVideo = false;
            if (type.startsWith("video")) {
                mVideo.muted = true, mVideo.loop = true;
                mVideo.type = type, mVideo.src = path;
                mVideo.play();
                isVideo = true;
            } else if (type.startsWith("image")) {
                mBackground.setAttribute("style", "opacity:0;");
                MainUI.loadImage(path).then(function () {
                    const d = `background-image:url(${path});`;
                    const n = `${d}transition:opacity 1s;opacity:1;`;
                    mBackground.setAttribute("style", n);
                    mVideo.setAttribute("poster", path);
                    setTimeout(function () {
                        mBackground.setAttribute("style", d);
                    }, 1000);
                });
            } else if (type.startsWith("file")) {
                storage.getItem("local_wallpaper_file").then(function (request) {
                    const file = request.result;
                    if (file) {
                        loadBackground(URLObject.createObjectURL(file), file.type);
                    } else {
                        PuSetting.background("random", "portrait");
                    }
                });
            } else if (type.startsWith("bing")) {
                getLocalConfig("puset-local-bing", {}, function (bing) {
                    if (bing.date == MainUI.dateString) {
                        loadBackground(bing.src, "image");
                    } else {
                        let length = PuSettingAPI.background.bing.length;
                        let canvas = document.createElement("canvas");
                        MainUI.loadImage(PuSettingAPI.background.bing[Math.floor(length * Math.random())] + "?" + Date.now(), true).then(function (img) {
                            let w, h;
                            canvas.width = w = img.naturalWidth;
                            canvas.height = h = img.naturalHeight;

                            canvas.getContext("2d").drawImage(img, 0, 0, w, h);

                            bing = {
                                'date': MainUI.dateString,
                                'src': canvas.toDataURL("image/png")
                            };
                            setLocalConfig("puset-local-bing", bing);
                            loadBackground(bing.src, "image");
                        });
                    }
                });
            } else if (type.startsWith("random")) {
                loadBackground(PuSettingAPI.background.random[path], "image");
            } else {
                mBackground.setAttribute("style", "background:" + path);
                mVideo.removeAttribute("style");
            }
        });
    }
};

var MainUI = {

    // 透明图片
    a: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

    // 黑色图片
    b: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=",

    // 白色图片
    w: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2P4DwQACfsD/Z8fLAAAAAAASUVORK5CYII=",

    isFirst: true,

    loadImage: function (src, origin) {
        return new Promise((resolve, reject) => {
            let img = new Image;
            if (origin) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => resolve(img);
            img.onerror = () => reject(img);
            if ("string" === typeof src) {
                img.src = src;
            } else if (src.type) {
                img.src = URLObject.createObjectURL(src);
            } else {
                reject(img);
            }
        });
    },

    jsonp: function jsonp(src, complete) {
        var script, callback;
        script = document.createElement("script");
        script.src = src;
        script.addEventListener("load", callback = function () {
            script.remove();
            callback = null;
        });
        script.addEventListener("error", callback);

        // Use native DOM manipulation to avoid our domManip AJAX trickery
        document.head.appendChild(script);
    },

    onchange: function (psid, type, value) {
        switch (psid) {
            case "boolean_show_weather":
            case "boolean_auto_ip":
            case "string_local_city": {
                this.updataWeather();
                break;
            }
            case "boolean_main_show_add_button": {
                this.showAddLinkButton(MainUI.GS.boolean_main_show_add_button);
                break;
            }
            case "boolean_main_show_links": {
                this.showLinks(MainUI.GS.boolean_main_show_links);
                break;
            }
            case "map_search_engine":
            case "map_search_engine_show": {
                Object.assign(MainUI.vm_search_engine.data, MainUI.GS.map_search_engine_show);
                break;
            }
            case "boolean_random_wallpaper": {
                if (value) {
                    if (MainUI.GS.boolean_bing_wallpaper) {
                        MainUI.GS.string_background_type = 'bing';
                    } else {
                        MainUI.GS.string_background_type = 'random';
                        MainUI.GS.string_background_src = 'portrait';
                    }
                } else {
                    MainUI.GS.string_background_type = 'file';
                }
                MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
                break;
            }
            case "boolean_bing_wallpaper": {
                if (value) {
                    MainUI.GS.string_background_type = 'bing';
                } else {
                    MainUI.GS.string_background_type = 'random';
                    MainUI.GS.string_background_src = 'portrait';
                }
                MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
                break;
            }
            case "boolean_file_wallpaper": {
                if (type == "checkbox") {

                    if (value) {
                        MainUI.GS.string_background_type = 'file';
                        MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
                    } else {
                        MainUI.GS.string_background_type = 'color';
                    }

                } else {
                    const file = MainUI.GS.boolean_file_wallpaper;
                    MainUI.GS.boolean_file_wallpaper = true;
                    storage.setItem("local_wallpaper_file", file).then(() => {
                        MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
                    });
                }
                break;
            }
            case "string_background_src": {
                MainUI.GS.string_background_type = 'color';
                MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
                break;
            }
            case "boolean_show_icp": {
                if (value) {
                    document.getElementById("about").classList.remove("hide")
                } else {
                    document.getElementById("about").classList.add("hide")
                }
                break;
            }
            default: {
                console.log(psid)
                console.dir(MainUI.GS)
            }
        }
    },

    showAddLinkButton: function (bool) {
        PuSet.View.show(this.add_link_button, bool);
    },

    updataWeather: function () {
        const vm_weather = this.vm_weather;
        if (MainUI.GS.boolean_show_weather) {
            PuSet.View.show(vm_weather.target, true);
            ParseWeather.getWeatherInfo(MainUI.GS.boolean_auto_ip ? ParseWeather.AUTO : MainUI.GS.string_local_city, MainUI.today, function (info) {
                // console.dir(info)
                const hours = MainUI.today.getHours();
                const isNight = (hours < 7 || hours > 18);
                vm_weather.data.location = MainUI.GS.boolean_auto_ip;
                vm_weather.data.city = info.name;
                vm_weather.data.temperature = {
                    temperature: ParseWeather.ifDefault(info.temperature, (info.low + "&#126;" + info.high), info.temperature),
                    title: info.title || "气温",
                    color: info.severity
                };
                vm_weather.data.text = isNight ? info.nightText : info.dayText;
                vm_weather.data.windScale = ParseWeather.ifDefault(info.windScale, (isNight ? info.nightWindScale : info.dayWindScale), info.windScale);
            });
        } else {
            PuSet.View.show(vm_weather.target, false);
        }
    }
};

// UI 交互区
// 准备完毕，加载组件，绑定事件监听
storage.then(() => getLocalConfig("puset-local-configure", null, function (settings) {

    MainUI.today = new Date;
    MainUI.GS = settings;

    null == MainUI.GS && window.location.replace("/main/reset.html?" + Date.now());

    // console.info('%cconsole.info', 'color: green;');

    const mSearch = document.getElementById("search");
    const mWord = document.getElementById("word");
    const mBackground = document.getElementById("background");
    const mLinks = document.getElementById("links");

    MainUI.dateString = ParseWeather.getDateString(MainUI.today);

    // 快速链接
    MainUI.showLinks = function (bool) {
        if (bool) {
            mSearch.classList.remove("only");
            mLinks.classList.remove("hide")
        } else {
            mSearch.classList.add("only");
            mLinks.classList.add("hide")
        }
    }

    MainUI.showLinks(MainUI.GS.boolean_main_show_links);
    MainUI.add_link_button = document.getElementById("add-link-button");
    MainUI.showAddLinkButton(MainUI.GS.boolean_main_show_add_button);
    MainUI.vm_scroll = PuSet.View({
        target: document.getElementById("scroll"),
        selector: "a.link-button",
        insert: "#add-link-button",
        data: MainUI.GS.map_all_links,
        onresize: function (target, value, key) {
            if ("length" === key) {
                target.style.width = `${(+value + 1) * 96}px`;
            }
        },
        layout: function (target, value, key) {
            target.dataset.key = key;
            target.href = value.href;
            const background = target.querySelector("span.bg");
            background.style["background-image"] = `url(${value.local_icon || value.icon || (new URLObject("/favicon.ico", value.href)).href})`;
            if (value.transparent) {
                background.classList.add("transparent");
            } else {
                background.classList.remove("transparent");
            }
            target.querySelector("span.title").innerHTML = value.title;
        }
    });
    // document.addEventListener("click", function() {
    //     _menu_links.classList.add("hide");
    // });

    // 搜索建议提示列表
    const mList = document.getElementById("list");
    const vm_list = PuSet.View({
        target: mList,
        data: [],
        selector: "li",
        layout: function (target, value, key) {
            target.dataset.text = value;
            target.querySelector("span").innerHTML = value;
        }
    });

    window.op = Object.assign(function op(obj) {
        mList.classList.remove("hide");
        // console.dir(obj)
        Object.assign(vm_list.data, obj.s);
    }, { t: 0 });

    // 搜索框文本发生变化事件
    mWord.addEventListener("input", function () {
        clearTimeout(window.op.t);

        const value = mWord.value.trim();

        if (value) {
            window.op.t = setTimeout(function () {
                if (value.startsWith("--set")) {
                    window.op(PuSettingAPI);
                } else {
                    MainUI.jsonp("https://suggestion.baidu.com/su?cb=op&wd=" + encodeURIComponent(value));
                }
            }, 500);
        } else {
            mList.classList.add("hide");
        }
    });

    mWord.addEventListener("focus", function () {
        mSearch.classList.add("focus");
        mBackground.classList.add("scale");
    });

    mWord.addEventListener("blur", function () {
        mSearch.classList.remove("focus");
        mBackground.classList.remove("scale");
    });

    // 搜索列表点击事件，取消鼠标按下事件冒泡
    mList.addEventListener("mousedown", ev => ev.preventDefault());
    mList.addEventListener("click", function (ev) {
        ev.preventDefault();
        let text, parent = ev.target.parentElement;
        if (parent && (text = parent.dataset.text)) {
            mWord.value = text;
            if (ev.target === parent.firstElementChild) {
                mSearch.submit();
            }
        }
    });

    // 搜索框内搜索引擎按钮
    MainUI.vm_search_engine = PuSet.View({
        target: document.getElementById("search-input"),
        selector: "span.bg.s_btn_wr",
        data: MainUI.GS.map_search_engine_show,
        layout: function (target, value, key) {
            const button = target.querySelector("button");
            const list = MainUI.GS.map_search_engine[value];
            button.id = "engine_" + value;
            button.title = list.title;

            const src = list.local_icon || list.icon || "/svg/search.svg";

            if (src.startsWith("data:")) {
                target.querySelector("button").innerHTML = '<img src="' + src + '">';
            } else fetch(src).then(a => a.text()).then(function (data) {
                target.querySelector("button").innerHTML = data;
            });

            if (key == 0) {
                const array = list.href.split(/\?|\=|\&/);
                mSearch.action = array[0];
                mWord.name = array[array.length - 2];
            }
        }
    });

    // 发起搜索事件
    mSearch.addEventListener("submit", function (ev) {
        ev.preventDefault();
        const value = mWord.value.trim();
        if (value.startsWith("--set")) {
            PuSetting(value);
            mWord.value = "";
            mWord.blur();
        } else if (ev.submitter) {
            const [type, engine] = ev.submitter.id.split("_");
            if ("engine" == type) {
                window.location.href = (MainUI.GS.map_search_engine[engine].href + encodeURIComponent(value));
            }
        }
    });

    // 天气
    MainUI.vm_weather = PuSet.View({
        target: document.getElementById("weather"),
        hidden: true,
        layout: function (target, value, key) {
            let item = target.querySelector("." + key);
            switch (key) {
                case "location": {
                    PuSet.View.show(item, value);
                    break;
                }
                case "temperature": {

                    target.title = value.title;
                    target.style.color = value.color;

                    item.innerHTML = value.temperature + "&#32;&#8451;";
                    break;
                }
                default: {
                    if (item) {
                        PuSet.View.show(item, ParseWeather.ifDefault(value, false, true));
                        item.innerHTML = value;
                    }
                }
            }
        }
    });
    MainUI.updataWeather();

    // 背景图片或视频
    MainUI.loadBackground = loadBackgroundFn(mBackground);
    MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);

}));