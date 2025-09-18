const MainUI = (function (attrs, list) {
    const rs = /\s+/g;
    const settings = Object.assign(function settings(code) {
        const [a, b, ...args] = String(code).split(rs);
        if (settings.q === a && list[b]) {
            return list[b].fn.apply(settings, args);
        }
        return false;
    }, { SETTINGS: list }, attrs);

    for (const key in list) {
        settings.s.push(`--set ${key} ${list[key].fx || ""}`);
    }

    return settings;

}({
    ADD: "add",

    REMOVE: "remove",

    // 透明图片
    a: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

    // 黑色图片
    b: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=",

    // 白色图片
    w: "data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAUAAAEALAAAAAABAAEAAAICRAEAOw==",

    isFirst: true,

    GS: null,

    p: false,

    q: "--set",

    /**
     * 不能改名
     * @type {string[]}
     */
    s: [],

    background: {
        // 每次刷新都是随机图片
        random: {
            landscape: "https://bing.ioliu.cn/v1/rand",
            portrait: "https://source.unsplash.com/random",
            cartoon: "http://img.xjh.me/random_img.php", // HTML
            0: 'https://www.dmoe.cc/random.php',
            1: 'https://cdn.seovx.com/?mom=302',
        },
        // Bing 官方每日一图
        bing: "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1" // JSON
    },

    /**
     * 
     * @param {Date} date 
     * @returns 
     */
    isToday: function (date) {
        return (new Date()).toDateString() === date.toDateString();
    },

    /**
     * 从本地选择一张图片，并获取图片的 Base64 Data URL
     */
    async localImageDataURL() {
        return new Promise((resolve, reject) => {
            const selector = document.createElement("input");
            selector.type = "file";
            selector.accept = "image/*";
            selector.addEventListener("change", function () {
                if (selector.files.length == 0) {
                    reject(new Error("用户未选择文件"));
                    return;
                }
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => reject(fr.error);
                fr.readAsDataURL(selector.files.item(0));
            }, { once: true });
            selector.addEventListener("cancel", () => reject(new Error("用户取消选择")), { once: true });
            selector.click();
        });
    },

    async loadImage(src, origin) {
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
                img.src = URL.createObjectURL(src);
            } else {
                reject(img);
            }
        });
    },

    async compressImage(image, width = 128, height = 128) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0, width, height);
        return canvas.toDataURL("image/png");
    },

    jsonp(src) {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.addEventListener("loadend", function loadend() {
            script.removeEventListener("loadend", loadend);
            script.remove();
        });
        document.head.appendChild(script);
        script.src = src;
    },

    resetBackground() {
        Interpreter.get('background').loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
    },

    boolean_show_weather(type, value) {
        MainUI.GS.boolean_show_weather = value
    },

    boolean_main_show_links(type, value) {
        MainUI.showLink(MainUI.GS.boolean_main_show_links = value)
    },

    boolean_main_show_add_button(type, value) {
        MainUI.showAddLinkButton(MainUI.GS.boolean_main_show_add_button = value);
    },

    boolean_random_wallpaper(type, value) {
        MainUI.GS.boolean_random_wallpaper = value;
        if (MainUI.GS.boolean_random_wallpaper) {
            MainUI.GS.string_background_type = MainUI.GS.boolean_bing_wallpaper ? "bing" : "image";
            MainUI.GS.string_background_src = '/api/random_wallpaper_provider.php';
        } else {
            MainUI.GS.string_background_type = "file";
        }
        MainUI.resetBackground();
    },

    boolean_bing_wallpaper(type, value) {
        MainUI.GS.boolean_random_wallpaper = true;
        MainUI.GS.boolean_bing_wallpaper = value;
        MainUI.GS.string_background_type = value ? "bing" : "image";
        MainUI.resetBackground();
    },

    boolean_image_wallpaper(type, value) {
        if (type === "checkbox") {
            MainUI.GS.boolean_image_wallpaper = value;
            MainUI.GS.string_background_type = value ? 'file' : 'color';
        } else {
            MainUI.GS.boolean_image_wallpaper = true;
            MainUI.GS.string_background_type = type;
        }
        MainUI.resetBackground();

    },
    boolean_search_history(type, value) {
        MainUI.GS.boolean_search_history = value;
        if (!MainUI.GS.boolean_search_history) {
            // 清空搜索历史记录
            storage.setItem("puset-search-history", []);
        }

    },

    string_theme(type, value) {
        MainUI.setUiTheme(MainUI.GS.string_theme = value);

    },

    "default_configuration": function () {
        window.location.href = "/main/reset.html";
    },
    "import_configuration": function (type, value) {
        MainUI.SETTINGS.import_configuration.fn(value);
    },
    "export_configuration": function (type, value) {
        if (type === "button") {
            MainUI.SETTINGS.export_configuration.fn();
        }
    },

    onchange(psid, type, value) {
        if ((this[psid] || (() => console.log("未定义的配置项：", psid, type, value)))(type, value) === false) {
            return;
        }
        saveLocalConfigure();
    },

    updataWeather() {
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
}, {
    /**
     * 设置背景图片
     * @param {String} type 类型 [video: 视频, image: 图片, file: 本地文件, random: 随机网络图片, bing: Bing每日一图, color: 颜色代码]
     * @param {String} value 值 [url:, color:,]
     */
    "background": {
        fx: "[type], [value]",
        fn: function (type = "color", value = "red") {
            MainUI.GS.string_background_type = type;
            MainUI.GS.string_background_src = value;
            switch ("" + type) {
                case "bing": {
                    MainUI.GS.boolean_random_wallpaper = true;
                    MainUI.GS.string_background_src = 0;
                    break;
                }
                case "random": {
                    MainUI.GS.boolean_random_wallpaper = true;
                    break;
                }
                default: {
                    MainUI.GS.boolean_random_wallpaper = false;
                }
            }
            saveLocalConfigure(MainUI.GS);
            Interpreter.get('background').loadBackground(value, type);
        }
    },

    "links": {
        fx: "[type], [json]",
        add(type, json) {
            MainUI.GS.map_all_links.push(obj);
            saveLocalConfigure();
        },
        fn: function (type, json) {
            if (json === undefined) return;
            const obj = ("string" === typeof json) ? JSON.parse(json) : Object.create(json);
            if (type === MainUI.ADD) {
                this.add(MainUI.ADD, obj);
            }
        }
    },

    "city": {
        fx: "[cityName]",
        fn: function (city) {
            MainUI.GS.string_local_city = city;
            MainUI.GS.boolean_auto_ip = false;
            MainUI.GS.boolean_show_weather = true;

            setLocalConfig("puset-local-configure", MainUI.GS);

            MainUI.updataWeather(window.vm_weather);
        }
    },

    "default_configuration": {
        fn: function () {
            window.location.href = "/main/reset.html"
        }
    },

    "import_configuration": {
        fn: function (url) {
            fetch(url).then(a => a.json()).then(json => {
                return storage.setItem("puset-local-configure", btoa(encodeURIComponent(JSON.stringify(json))));
            }).then(() => {
                window.location.reload(true);
            }).catch(function () {
                alert("文件格式不正确或已损坏");
            });
        }
    },

    "export_configuration": {
        fn: function () {
            storage.getItem("puset-local-configure").then(function (request) {
                const date = new Date;
                const save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
                save_link.download = `网页配置 ${date.getFullYear()}-${1 + date.getMonth()}-${date.getDate()}.json`;
                save_link.href = URL.createObjectURL(new Blob([decodeURIComponent(atob(request))], { type: "text/plain" }));
                save_link.dispatchEvent(new MouseEvent('click', { 'view': window, 'bubbles': true, 'cancelable': true }));
            });
        }
    }
}));
