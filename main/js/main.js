"use strict";

const URLObject = window.URL || window.webkitURL || function () { };
if (!URLObject.createObjectURL) {
    Object.assign(URLObject, {
        createObjectURL: function () {
            return "#"
        }
    });
}

var storage = new PuSet.StorageHelper();

// 获取本地配置信息
////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 
 * @param {string} item 键
 * @param {object} defaultCofig 如果本地存储未找到结果时的替代品
 * @returns defaultCofig
 */
function getLocalConfig(item, defaultCofig, then) {
    storage.getItem(item).then(function (result) {
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

function corsGet(url, type = 'text/html') {
    return fetch('/api/get', {
        method: 'post',
        headers: {
            // POST 必须的表头
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: `path=${encodeURIComponent(url)}&type=${type};charset=UTF-8`
    });
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
        // mMask = document.createElement("div"),
        n = {
            hide: false,
            dx: 0,
            dy: 0,
            dw: mCanvas2D.width = mCanvas3D.width = mBackground.clientWidth,
            dh: mCanvas2D.height = mCanvas3D.height = mBackground.clientHeight
        };

    const initVideo = function () {
        mVideo.muted = true, mVideo.loop = true;
        mVideo.src = "#background";
        mVideo.setAttribute("poster", MainUI.a);
        mVideo.removeAttribute("style");
    };

    mVideo.className = "view wallpaper dynamic";
    initVideo();

    mCanvas2D.className = "view wallpaper hide";
    mCanvas3D.className = "view wallpaper hide";

    // mMask.className = "view wallpaper mask";

    mBackground.appendChild(mVideo);
    mBackground.appendChild(mCanvas2D);
    mBackground.appendChild(mCanvas3D);
    // mBackground.appendChild(mMask);

    const ctx = mCanvas2D.getContext("2d", { alpha: true });
    const webgl = mCanvas3D.getContext("webgl", { alpha: true });

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
        n.hide = document[hidden];
        if (isVideo) {
            n.hide ? mVideo.pause() : mVideo.play();
        }
    });

    window.addEventListener("resize", function () {
        const w = mBackground.clientWidth, h = mBackground.clientHeight;
        n.dy = n.dx = 0;
        mCanvas2D.width = n.dw = w;
        mCanvas2D.height = n.dh = h;
        mCanvas3D.width = w, mCanvas3D.height = h;
    });

    function loadImageBackground(path) {
        MainUI.loadImage(path).then(function () {
            initVideo();
            mBackground.setAttribute("style", `background-image:url(${path});`);
            mBackground?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000, iterations: 1 });
        });
    }

    return function loadBackground(path, type) {
        // 初始化背景状态
        // ctx.clearRect(0, 0, n.dw, n.dh);

        // 获取背景类型
        new Promise((resolve, reject) => {
            if (type) {
                resolve(type);
            } else {
                const xhr = new XMLHttpRequest;
                xhr.onerror = reject;
                xhr.onreadystatechange = function () {
                    if (this.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                        xhr.abort();
                        resolve("" + (xhr.getResponseHeader("Content-Type") || "color"));
                    }
                };
                xhr.open("GET", path);
                xhr.responseType = "blob";
                xhr.send()
            }
        }).then(function (type) {
            mVideo.pause();
            isVideo = false;
            if (type.startsWith("animation")) {
                fetch(path).then(b => b.text()).then(function (script) {
                    const fn = eval(script);
                    if ("function" == typeof fn && fn(ctx, webgl, n));
                }).catch(function () {
                    console.error("error: " + path);
                });
            } else if (type.startsWith("video")) {
                initVideo();
                mVideo.type = type, mVideo.src = path;
                mVideo.play();
                isVideo = true;
            } else if (type.startsWith("image")) {
                return loadImageBackground(path);
            } else if (type.startsWith("file")) {
                storage.getItem("puset-local-wallpaper").then(function (file) {
                    if (file) {
                        loadBackground(URLObject.createObjectURL(file), file.type);
                    }
                });
            } else if (type.startsWith("bing")) {
                let localFile = null;
                storage.getItem("puset-local-wallpaper-bing").then(function (file) {
                    if ((localFile = file) && MainUI.isToday(localFile.lastModifiedDate)) {
                        loadBackground(URLObject.createObjectURL(localFile), localFile.type);
                    } else throw "overdue";
                }).catch(function () {
                    corsGet(PuSetting.background.bing, 'application/json').then(a => a.json()).then(function (json) {
                        return MainUI.loadImage((new URL(json?.images?.[0]?.url, PuSetting.background.bing)).href, true);
                    }).then(function (img) {
                        const canvas = document.createElement("canvas");
                        const w = canvas.width = img.naturalWidth;
                        const h = canvas.height = img.naturalHeight;
                        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                        canvas.toBlob(function (blob) {
                            localFile = new File([blob], "wallpaper", { type: blob.type });
                            storage.setItem("puset-local-wallpaper-bing", localFile);
                            loadBackground(URLObject.createObjectURL(localFile), localFile.type);
                        });
                    }).catch(function () {
                        console.warn("无法获取最新 bing 壁纸");
                        if (localFile) {
                            loadBackground(URLObject.createObjectURL(localFile), localFile.type);
                        }
                    });
                });
            } else if (type.startsWith("random")) {
                loadImageBackground(PuSetting.background.random[path]);
            } else {
                initVideo();
                mBackground.setAttribute("style", "background:" + path);
            }
        });
    }
};

let MainUI = {

    // 透明图片
    a: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

    // 黑色图片
    b: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=",

    // 白色图片
    w: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2P4DwQACfsD/Z8fLAAAAAAASUVORK5CYII=",

    isFirst: true,

    GS: null,

    /**
     * 
     * @param {Date} date 
     * @returns 
     */
    isToday: function (date) {
        return (new Date()).toDateString() === date.toDateString();
    },

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
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.addEventListener("loadend", ev => script.remove());

        // Use native DOM manipulation to avoid our domManip AJAX trickery
        document.head.appendChild(script);
        script.src = src;
    },

    onchange: function (psid, type, value) {
        switch (psid) {
            case "boolean_show_weather":
            case "boolean_auto_ip":
            case "string_local_city": {
                storage.removeItem("puset-local-weather-current").then(x => {
                    this.updataWeather();
                });
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
                    storage.setItem("puset-local-wallpaper", file).then(() => {
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
            case "map_color_set": {
                if (type === "radio") {
                    MainUI.GS.string_theme = value;
                    document.body.setAttribute("theme", value);
                }
                break
            }
            default: {
                console.log(psid)
                console.dir(arguments)
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
            const today = new Date;
            ParseWeather.getWeatherInfo(MainUI.GS.boolean_auto_ip ? ParseWeather.AUTO : MainUI.GS.string_local_city, today, function (info) {
                if (!(info instanceof ParseWeather)) {
                    vm_weather.data.city = "无法获取天气";
                    return;
                }
                const hours = today.getHours();
                const isNight = (hours < 7 || hours > 18);
                vm_weather.data.location = MainUI.GS.boolean_auto_ip;
                vm_weather.data.city = info.name;
                vm_weather.data.temperature = {
                    temperature: ParseWeather.ifDefault(info.temperature, (info.low + "&#126;" + info.high), info.temperature),
                    title: info.title || "",
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
    null == (MainUI.GS = settings) && window.location.replace("/main/reset.html?" + Date.now());
    
    document.body.setAttribute("theme", settings.string_theme);

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
    MainUI.showLinks(settings.boolean_main_show_links);

    // 添加按钮
    MainUI.add_link_button = document.getElementById("add-link-button");
    MainUI.showAddLinkButton(settings.boolean_main_show_add_button);

    MainUI.vm_scroll = PuSet.View({
        target: document.getElementById("scroll"),
        selector: "a.link-button",
        insert: "#add-link-button",
        data: settings.map_all_links,
        onresize: function (target, value, key) {
            // 火狐浏览器不会自动撑大grid布局
            if ("length" === key) {
                target.style.width = `${(+value + 1) * 80}px`;
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
        Object.assign(vm_list.data, obj.s);
    }, { t: 0 });

    // 搜索框文本发生变化事件
    mWord.addEventListener("input", function () {
        clearTimeout(window.op.t);

        const value = mWord.value.trim();
        if (value) {
            window.op.t = setTimeout(function () {
                if (value.startsWith("--set")) {
                    window.op(PuSetting);
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
        data: settings.map_search_engine_show,
        layout: function (target, value, key) {
            const button = target.querySelector("button");
            const list = settings.map_search_engine[value];
            button.id = "engine_" + value;
            button.title = list.title;

            const src = list.local_icon || list.icon || "/mediae/svg/search.svg";

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
                window.location.href = (settings.map_search_engine[engine].href + encodeURIComponent(value));
            }
        }
    });

    MainUI.onchange('boolean_show_icp', null, settings.boolean_show_icp);

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
                    const tips = target.querySelector('.tips');
                    tips.innerHTML = value.title;
                    tips.style.color = value.color;

                    item.innerHTML = value.temperature + "&#8451;";
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
    MainUI.loadBackground(settings.string_background_src, settings.string_background_type);
    // MainUI.loadBackground( "animation/point.js", "animation");

}));