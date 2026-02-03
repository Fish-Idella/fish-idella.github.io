const storage = StorageHelper.open();
// 辅助函数：定义并立即调用
const defineAndCall = (methodName, func, param) => (MainUI[methodName] = func)(param);
function saveLocalConfigure(cofig) {
    storage.setItem("puset-local-configure", btoa(encodeURIComponent(JSON.stringify(cofig || MainUI.GS))));
};

PuSet.load("data/template-main.html").then(() => storage.getItem("puset-local-configure")).then(function (result) {
    const settings = JSON.parse(result ? decodeURIComponent(atob(result)) : "null") ?? null;

    const _body = document.body;
    const _main = document.getElementById('main');
    const _search = _main.querySelector("#search");
    const _word = _search.querySelector("input#word");

    _search.addEventListener("submit", function (ev) {
        // 发起搜索事件
        ev.preventDefault();
        const value = _word.value.trim();
        if (value.startsWith(MainUI.totem)) {
            _word.value = "";
            _word.blur();
            MainUI(value);
        } else {
            const engine = ev?.submitter.dataset.id;
            if (engine) {
                storage.setItem("puset-search-history", window.op.update(value)).then(function () {
                    const url = (MainUI.GS.map_search_engine[engine].href + encodeURIComponent(value));
                    window.location.href = url;
                });
            }
        }
    });

    PuSet.get("reset").init(true, function (root, options) {
        _body.appendChild(root);
        options.exec(root, MainUI, options);
    });

    if ((MainUI.GS = settings) === null) {
        return MainUI.default_configuration();
    }

    const list = window.matchMedia("(prefers-color-scheme: dark)");
    function themeListener() {
        const hours = new Date().getHours();
        _body.setAttribute("theme", (list.matches || hours < 6 || hours > 20) ? "dark" : "default");
    }

    defineAndCall('showLink', bool => _main.classList.toggle("hide-links", !bool), settings.boolean_main_show_links);
    defineAndCall('showICP', bool => _main.classList.toggle("hide-icp", !bool), settings.boolean_show_icp);
    defineAndCall("setUiTheme", function setUiTheme(theme) {
        // 先移除现有的监听器，避免重复添加
        list.removeEventListener("change", themeListener);
        _body.classList.remove('hide');

        if ("os" === theme) {
            // 仅在需要时添加监听器
            themeListener();
            list.addEventListener("change", themeListener);
        } else {
            _body.setAttribute("theme", theme);
        }
    }, settings.string_theme);

    const _first_submit = _search.querySelector("[type=submit]"); // 默认的搜索引擎
    //const // _quickdelete = _search.querySelector("input#word+a.quickdelete");
    const _search_list = _search.querySelector("ul.search-list");

    // 搜索建议提示列表
    window.op = Object.assign(function op(obj) {
        op.vm_list.data.length = obj.s.length;
        op.vm_list.update(obj.s);
        _search_list.classList.remove("hide");
        return obj;
    }, {
        t: 0,
        s: [],

        vm_list: PuSet.ViewManager({
            target: _search_list,
            data: [],
            template: "<li></li>",
            layout: function (target, value) {
                target.textContent = value;
            }
        }).on("contextmenu", function (ev) {
            ev.preventDefault();
            return false;
        }).on("pointerdown", function (ev, text) {
            ev.preventDefault();
            _word.value = text;
            // 如果是 --set 开头的命令行，不直接搜索
            if (_word.value.startsWith(MainUI.totem)) return;

            // 如果是鼠标左键按下，直接搜索
            if (ev.button === 0 || ev.buttons === 1) {
                // 不会触发事件监听，不好
                // _search.submit();

                // 采用模拟点击
                _first_submit.click();
            }
        }),

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

        update(text) {
            if (!MainUI.GS.boolean_search_history) {
                this.s.length = 0;
                return this.s;
            }
            const index = this.s.indexOf(text);
            if (index === 0) return this.s;
            if (index > 0) this.s.splice(index, 1);
            this.s.unshift(text);
            if (this.s.length > 10) this.s.length = 10;
            return this.s;
        }
    });

    // 异步读取搜索历史
    storage.getItem("puset-search-history").then(value => Array.isArray(value) && Object.assign(window.op.s, value));

    const se = {
        "baidu": {
            href: "https://www.baidu.com/s?wd={{word}}",
            suggest: "https://suggestion.baidu.com/su?cb=op&wd={{word}}",
            icon: "https://www.baidu.com/favicon.ico"
        },
        "google": {
            href: "https://www.google.com/search?q={{word}}",
            suggest: "http://suggestqueries.google.com/complete/search?client=firefox&q={{word}}",
            icon: "https://www.google.com/favicon.ico"
        },
        "bing": {
            href: "https://cn.bing.com/search?q={{word}}",
            suggest: "http://api.bing.com/qsonhs.aspx?q={{word}}&type=cb&cb=op",
            icon: "https://cn.bing.com/favicon.ico"
        },
        "360": {
            href: "https://www.so.com/s?ie=utf-8&fr=none&src=360sou_newhome&q={{word}}",
            suggest: "https://sug.so.360.cn/suggest?word={{word}}&format=jsonp&callback=op",
            icon: "https://www.so.com/favicon.ico"
        }
    };

    // 搜索框相关事件
    PuSet(_word).on({
        focus() {
            if (_word.value) {
                // _quickdelete.classList.remove("hide");
            } else {
                // 如果搜索框没有内容，显示搜索历史
                window.op(window.op);
            }
            _search_list.classList.remove("hide");
            _body.classList.add("focus");
        },
        blur() {
            // _quickdelete.classList.add("hide");
            _search_list.classList.add("hide");
            _body.classList.remove("focus");
        },
        input() {
            clearTimeout(window.op.t);
            const value = _word.value.trim();
            if (value) {
                // _quickdelete.classList.remove("hide");
                window.op.t = setTimeout(function () {
                    if (value.startsWith(MainUI.totem)) {
                        const index = value.lastIndexOf(" ");
                        const start = (index === -1 || index === 5) ? value : value.slice(0, index);
                        window.op({ s: MainUI.s.filter(item => item.startsWith(start)) });
                    } else {
                        window.op.jsonp(se.baidu.suggest.replace("{{word}}", encodeURIComponent(value)));
                    }
                }, 500);
            } else {
                // _quickdelete.classList.add("hide");
                // 如果搜索框没有内容，显示搜索历史
                window.op(window.op);
            }
        }
    });


    // 搜索框内搜索引擎按钮
    MainUI.vm_search_engine = PuSet.ViewManager({
        target: document.getElementById("search-input"),
        selector: "span.bg.button",
        data: settings.map_search_engine_show,
        layout(target, value, key) {
            const button = target.querySelector("button");
            const list = settings.map_search_engine[value];
            button.dataset.id = value;
            button.title = list.title;

            const src = list.local_icon || list.icon || "/mediae/svg/search.svg";

            if (src.startsWith("data:")) {
                target.querySelector("button").innerHTML = '<img src="' + src + '">';
            } else fetch(src).then(a => a.text()).then(function (data) {
                target.querySelector("button").innerHTML = data;
            });

            if (key == 0) {
                const array = list.href.split(/\?|\=|\&/);
                _search.action = array[0];
                _word.name = array[array.length - 2];
            }
        }
    });

    // 设置背景
    PuSet.get('background').init(true, function (root, options) {
        root.classList.add('view', 'unselect');
        _body.insertBefore(root, _main);
        options.exec(root, MainUI, options);
    });

    PuSet.get("image-selector").init(true, function (root, options) {
        _body.appendChild(root);
        options.exec(root, MainUI, options);
    });

    PuSet.get("link-manager").init(true, function (root, options) {
        _body.appendChild(root);
        options.exec(root, MainUI, options);

        const _add_link_button = _main.querySelector("#links>#scroll>a#add-link-button");
        _add_link_button.addEventListener("click", function (event) {
            event.preventDefault();
            MainUI.openLinkManager('-1');
        });

        // 获取滚动容器元素
        const _scroll = _main.querySelector('#links>#scroll');
        MainUI.showAddLinkButton = function () {
            MainUI.vm_links.onresize(_scroll, MainUI.vm_links.data.length, "length");
        };

        /**
         * 
         * @param {Event} event 
         * @param {number} sourceKey 被拖拽元素初始索引
         * @param {number} targetIndex 被放置元素初始索引
         * @param {Element} self 被放置元素
         * @param {Element} dragging 被拖拽元素
         * @returns 
         */
        const getTargetIndex = function (event, sourceKey, targetIndex, self, dragging) {
            // 处理拖拽元素拖到自身的情况
            if (self === dragging) {
                const order = Number(dragging.style.order);
                // console.log({ sourceKey, targetIndex, order });
                if (order > sourceKey) {
                    return order - 2;
                } else {
                    return order;
                }
            } else {
                // 非自身拖拽时：若鼠标在目标元素左半部分，且源索引小于目标索引，目标索引减1（调整插入位置）
                if (event.offsetX < (self.offsetWidth / 2) && sourceKey < targetIndex) {
                    targetIndex--;
                }
                return targetIndex;
            }
        };

        MainUI.vm_links = PuSet.ViewManager({
            target: _scroll,
            selector: ':scope>a.link-button',
            insert: _add_link_button,
            data: settings.map_all_links,
            onresize(target, value) {
                const bool = settings.boolean_main_show_add_button;
                const max = PuSet.show(_add_link_button, bool).style.order = (+value + (bool ? 1 : 0));
                // 火狐浏览器不会自动撑大grid布局
                const width = _word.clientHeight || _word.offsetHeight;
                target.style.width = `${max * width * 2}px`;
            },
            layout(target, value, key) {
                target.dataset.key = key;
                target.style.order = Number(key) + 1;
                target.href = value.href;
                const background = target.querySelector("span.bg");
                background.style.setProperty("background-color", value.background_color ?? "transparent");
                background.style.setProperty("background-image", `url(${value.local_icon || value.icon || (new URL("/favicon.ico", value.href)).href})`);
                target.querySelector("span.title").innerHTML = value.title;
            }
        }).on("contextmenu", function (event) {
            event.preventDefault();
            MainUI.openLinkManager(this.dataset.key);
        }).on("dragstart", function (event) {
            // 拖动开始事件处理
            // 阻止事件冒泡
            event.stopPropagation();
            // 设置拖拽数据为当前元素的data-key属性值
            _scroll._dragging = this;
            event.dataTransfer.setData("text/plain", this.dataset.key);
            // 设置允许的拖拽操作类型为移动
            event.dataTransfer.effectAllowed = "move";

            setTimeout(() => this.classList.add("dragging"));
        }).on("dragover", function dragover(event) {
            // 拖拽经过事件处理
            // 阻止默认行为(允许放置)
            event.preventDefault();
            // 阻止事件冒泡
            event.stopPropagation();
            if (_scroll._dragging === this) return;
            cancelAnimationFrame(dragover.animationFrame);
            dragover.animationFrame = requestAnimationFrame(() => {
                const my_order = Number(this.style.order);
                const isLeftMove = Number(_scroll._dragging.dataset.key) < Number(this.dataset.key);

                _scroll._dragging.style.order = (this.offsetWidth / 2) >= event.offsetX
                    ? isLeftMove ? my_order + 1 : my_order
                    : isLeftMove ? my_order : my_order - 1;
            });
        }).on("dragend", function () {
            _scroll.querySelectorAll("a.dragging").forEach((a) => a.classList.remove("dragging"));
        }).on("drop", function (event) {
            // 放置事件处理
            // 阻止默认行为（避免浏览器默认处理拖拽数据）和事件冒泡
            event.preventDefault();
            event.stopPropagation();

            // 获取拖拽源元素的 data-key（原始索引）
            const sourceKey = Number(event.dataTransfer.getData("text/plain"));
            const targetIndex = getTargetIndex(
                event,
                sourceKey,
                Number(this.dataset.key),
                this,
                _scroll._dragging
            );

            // 若源索引与调整后的目标索引相同，无需排序
            if (sourceKey === targetIndex) {
                console.log("拖动排序：位置不变");
                return;
            }

            // 从数据源中移除拖拽元素（源位置）
            const [movedItem] = MainUI.vm_links.data.splice(sourceKey, 1);
            // 将元素插入到新位置（调整后的目标索引）
            MainUI.vm_links.data.splice(targetIndex, 0, movedItem);

            // 保存排序后的配置到本地存储
            saveLocalConfigure();
        });

    });

    queueMicrotask(console.log.bind(
        console,
        "%c PuSet %c v2.0.0 %c Yay, you're finally here! ",
        "padding: 2px 6px; border-radius: 3px 0 0 3px; color: #fff; background:rgb(64, 62, 213); font-weight: bold;",
        "padding: 2px 6px; border-radius: 0 0 0 0; color: #fff; background:rgb(96, 118, 183); font-weight: bold;",
        "padding: 2px 6px; border-radius: 0 3px 3px 0; color: rgb(64, 62, 213); background:rgb(171, 181, 210); font-weight: bold;"
    ));
});


const proportional = Object.assign(function proportional(options, epsilon = 1e-9) {
    const arr = proportional.keys.filter(key => {
        const value = options[key];
        return "number" !== typeof value || value <= 0;
    });
    if (arr.length === 1) {
        proportional[arr[0]](options);
    } else if (arr.length > 1 || (arr.length < 1 && Math.abs((options.cw * options.oh) - (options.ow * options.ch)) > epsilon)) {
        return null;
    }
    return options;
}, {
    keys: ["cw", "ch", "ow", "oh"],
    cw: options => options.cw = options.ch * options.ow / options.oh,
    ch: options => options.ch = options.cw * options.oh / options.ow,
    ow: options => options.ow = options.cw * options.oh / options.ch,
    oh: options => options.oh = options.ch * options.ow / options.cw
});