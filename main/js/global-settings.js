const MainUI = (function (attrs, list) {
    const rs = /[\n\s]+/g;
    const settings = Object.assign(function settings(code) {
        const [totem, command, ...args] = String(code).split(rs);
        if (settings.totem === totem) {
            return list[command]?.fn.apply(settings, args);
        }
        return false;
    }, { command: list }, attrs);

    for (const key in list) {
        const fx = list[key].fx;
        for (const value in fx) {
            settings.s.push(`--set ${key} ${fx[value]}`);
        }
    }

    return settings;

}({

    // 透明图片
    a: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

    // 黑色图片
    b: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=",

    // 白色图片
    w: "data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAUAAAEALAAAAAABAAEAAAICRAEAOw==",

    // 全局设置的参数
    GS: null,

    // 命令行起始标志
    totem: "--set",

    /*! 不能改名，‘suggest queries’的缩写 */
    s: [],

    // Bing 官方每日一图
    bing_background: "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1", // JSON

    /**
     * bing每日壁纸会用到
     * @param {Date} date 
     * @returns 
     */
    isToday: function (date) {
        const today = new Date;
        if (today?.constructor === date?.constructor) {
            const keys = ['getFullYear', 'getMonth', 'getDate'];
            return keys.every(fx => date[fx]() === today[fx]());
        }
        return false;
    },

    /**
     * 从本地选择一张图片，并获取图片的 Base64 Data URL
     */
    async chooseFile(accept) {
        return new Promise((resolve, reject) => {
            const selector = document.createElement("input");
            selector.type = "file";
            selector.accept = accept || "image/*";
            selector.addEventListener("input", function () {
                if (selector.files.length == 0) {
                    reject("用户未选择文件");
                    return;
                }
                resolve(selector.files.item(0));
            }, { once: true });
            selector.addEventListener("cancel", () => reject("用户取消选择"), { once: true });
            selector.click();
        });
    },

    /**
     * 加载图片，设置壁纸会用到
     * @param {string|File} src 
     * @param {boolean} origin 
     * @returns 
     */
    async loadImage(src, origin) {
        return new Promise((resolve, reject) => {
            const img = new Image;
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

    /**
     * 缩放图片，设置图标会用到
     * @param {Image} image 
     * @param {Number} [width] 
     * @param {Number} [height] 
     * @returns 
     */
    async compressImage(image, width = 128, height = 128) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0, width, height);
        return canvas.toDataURL("image/png");
    },

    loadBackground() { },

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
        MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
    },

    boolean_bing_wallpaper(type, value) {
        MainUI.GS.boolean_random_wallpaper = true;
        MainUI.GS.boolean_bing_wallpaper = value;
        MainUI.GS.string_background_type = value ? "bing" : "image";
        MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
    },

    boolean_image_wallpaper(type, value) {
        if (type === "checkbox") {
            MainUI.GS.boolean_image_wallpaper = value;
            MainUI.GS.string_background_type = value ? 'file' : 'color';
        } else {
            MainUI.GS.boolean_image_wallpaper = true;
            MainUI.GS.string_background_type = type;
        }
        MainUI.loadBackground(MainUI.GS.string_background_src, MainUI.GS.string_background_type);
    },

    boolean_search_history(type, value) {
        MainUI.GS.boolean_search_history = value;
        if (!MainUI.GS.boolean_search_history) {
            window.op.s.length = 0;
            storage.setItem("puset-search-history", window.op(window.op).s);
        }
    },

    string_theme(type, value) {
        MainUI.setUiTheme(MainUI.GS.string_theme = value);
    },

    "default_configuration": function () { },
    "import_configuration": function (type, file) {
        if (type === "file") {
            const fr = new FileReader();
            fr.onloadend = function (ev) {
                try {
                    const json = JSON.parse(ev.target.result);
                    if (confirm("即将覆盖当前配置，确定要导入吗？")) {
                        saveLocalConfigure(json);
                        setTimeout(() => window.location.reload(true), 500);
                    }
                } catch (e) {
                    alert("文件格式不正确或已损坏");
                }
            };
            fr.readAsText(file);
        }
    },
    "export_configuration": function (type, value) {
        if (type === "button") {
            storage.getItem("puset-local-configure").then(function (request) {
                return URL.createObjectURL(new Blob([decodeURIComponent(atob(request))], { type: "text/plain" }));
            }).then(function (url) {
                const date = new Date;
                PuSet.download(url, `网页配置 ${date.getFullYear()}-${1 + date.getMonth()}-${date.getDate()}.json`);
            });
        }
    },

    boolean_show_icp(type, value) {
        MainUI.showICP(MainUI.GS.boolean_show_icp = value);
    },

    onchange(psid, type, value) {
        const fn = this[psid] || function not() {
            console.log("未定义的配置项：", psid, type, value);
            return false;
        };
        if (fn(type, value) === false) {
            return;
        }
        saveLocalConfigure();
    }

}, {

    "toggle": {
        fx: [
            "links",           // 链接
            "search_history",  // 搜索历史
            "icp",             // ICP
            "add_button"       // 添加按钮
        ],
        fn: function (type) {
            switch ("" + type) {
                case "links": {
                    return MainUI.onchange("boolean_main_show_links", "checkbox", !MainUI.GS.boolean_main_show_links);
                }
                case "search_history": {
                    return MainUI.onchange("boolean_search_history", "checkbox", !MainUI.GS.boolean_search_history);
                }
                case "icp": {
                    return MainUI.onchange("boolean_show_icp", "checkbox", !MainUI.GS.boolean_show_icp);
                }
                case "add_button": {
                    return MainUI.onchange("boolean_main_show_add_button", "checkbox", !MainUI.GS.boolean_main_show_add_button);
                }
            }
        }
    },

    "default_configuration": {
        fx: [''],
        fn() {
            MainUI.default_configuration()
        }
    },

    "import_configuration": {
        fx: [''],
        fn: function () {
            MainUI.chooseFile("application/json").then((file) => {
                MainUI.import_configuration("file", file);
            }).catch(error => console.log(error));
        }
    },

    "export_configuration": {
        fx: [''],
        fn: function () {
            MainUI.export_configuration("button");
        }
    },

    "background": {
        fx: [
            'save bing wallpaper',   // 保存
            'choosefile image/png',  // 选择本地文件
            'random',                // 随机网络图片
            'bing',                  // Bing每日一图
            'video [url]',           // 视频
            'image [url]',           // 图片
            'color [color code]'     // 颜色代码
        ],
        /**
         * 设置背景图片
         * @param {String} type 类型
         * @param {String} value 值
         */
        fn: function (type, value) {
            switch ("" + type) {
                case "save": {
                    return void storage.getItem("puset-local-wallpaper-bing").then(file => {
                        const date = file.lastModifiedDate;
                        PuSet.download(URL.createObjectURL(file), `bing-wallpaper-${date.getFullYear()}-${1 + date.getMonth()}-${date.getDate()}.png`);
                    });
                }
                case "":
                case "choosefile": {
                    return MainUI.chooseFile(value || "image/*,video/*")
                        .then((file) => storage.setItem("puset-local-wallpaper", file))
                        .then(function () {
                            MainUI.onchange("boolean_image_wallpaper", "checkbox", true);
                        }).catch(error => {
                            console.log(error);
                        });
                }
                case "bing": {
                    return MainUI.onchange("boolean_bing_wallpaper", "checkbox", true);
                }
                case "random": {
                    MainUI.GS.boolean_bing_wallpaper = false;
                    return MainUI.onchange("boolean_random_wallpaper", "checkbox", true);
                }
                default: {
                    if (!value) return console.log("跳过空背景");
                    MainUI.GS.string_background_src = value;
                    return MainUI.onchange("boolean_image_wallpaper", type, true);
                }
            }
        }
    },

    "city": {
        fx: ['[city name]'],
        fn: function (city) {
            // TODO
        }
    }
}));
