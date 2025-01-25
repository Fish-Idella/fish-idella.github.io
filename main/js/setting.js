const PuSetting = (function (attrs) {
    const rs = /\s+/g;
    const settings = function settings(input) {
        const [a, b, ...args] = ("" + input).split(rs);
        "--set" === a && settings.item?.[b].fn.apply(settings, args);
    };

    for (let key in attrs.item) {
        attrs.s.push(`--set ${key} ${attrs.item[key].fx || ""}`);
    }

    return Object.assign(settings, attrs);
}({
    p: false,
    q: "--set",
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

    item: {
        /**
         * 设置背景图片
         * @param {String} type 类型 [video: 视频, image: 图片, file: 本地文件, random: 随机网络图片, bing: Bing每日一图, color: 颜色代码]
         * @param {String} value 值 [url:, color:,]
         */
        "background": {
            fx: "[type], [value]",
            fn: function (type = "color", value = "red") {

                switch ("" + type) {
                    case "bing": {
                        MainUI.GS.boolean_random_wallpaper = true;
                        MainUI.GS.string_background_src = 0;
                        break;
                    }
                    case "random": {
                        MainUI.GS.string_background_src = value;
                        break;
                    }
                    default: {
                        MainUI.GS.boolean_random_wallpaper = false;
                        MainUI.GS.string_background_src = value;
                    }
                }

                setLocalConfig("puset-local-configure", MainUI.GS);
                MainUI.loadBackground(value, type);
            }
        },

        "links-add": {
            fx: "[title], [url], [iconpath]",
            fn: function (title, url, icon) {

                MainUI.loadImage(icon ? icon : new URL("favicon.ico", url).href).then(function (img) {
                    const obj = {
                        title: title,
                        href: url,
                        icon: img.src,
                        local_icon: ""
                    };

                    MainUI.GS.map_all_links.push(obj);

                    setLocalConfig("puset-local-configure", MainUI.GS);
                }).catch(function (img) {
                    console.log(img)
                });

            }
        },

        "links-remove": {
            fx: "[title]",
            fn: function (title) {
                let length = MainUI.GS.map_all_links.length;
                while (length--) {
                    if (MainUI.GS.map_all_links[length].title == title) {
                        MainUI.GS.map_all_links.splice(length, 1);
                    }
                }
                setLocalConfig("puset-local-configure", MainUI.GS);
            }
        },

        "city": {
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
                fetch(url).then(a => a.text()).then(code => storage.setItem("puset-local-configure", LZString.compress(code)).then(() => {
                    window.location.reload(true);
                })).catch(function () {
                    alert("文件格式不正确或已损坏");
                });
            }
        },

        "export_configuration": {
            fn: function () {
                const save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
                const date = new Date;
                save_link.download = `网页配置 ${date.getFullYear()}-${1 + date.getMonth()}-${date.getDate()}.json`;

                storage.getItem("puset-local-configure").then(function (request) {
                    save_link.href = URLObject.createObjectURL(new Blob([LZString.decompress(request)], { type: "text/plain" }));
                    save_link.dispatchEvent(new MouseEvent('click', {
                        'view': window,
                        'bubbles': true,
                        'cancelable': true
                    }));
                });
            }
        }
    }
}));