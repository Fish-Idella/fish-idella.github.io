const storage = new PuSet.StorageHelper();

function saveLocalConfigure(cofig) {
    storage.setItem("puset-local-configure", btoa(encodeURIComponent(JSON.stringify(cofig || MainUI.GS))));
};

PuSet.load('data/template.html').then(async function () {

    const result = await storage.getItem("puset-local-configure");
    const settings = JSON.parse(result ? decodeURIComponent(atob(result)) : "null") ?? null;

    if ((MainUI.GS = settings) === null) {
        return window.location.replace("/main/reset.html?" + Date.now());
    } else {
        MainUI.setUiTheme = (function () {
            const list = window.matchMedia("(prefers-color-scheme: dark)");
            function themeListener() {
                const hours = new Date().getHours();
                document.body.setAttribute("theme", (list.matches || hours < 6 || hours > 20) ? "dark" : "default");
            }
            return function setUiTheme(theme) {
                // 先移除现有的监听器，避免重复添加
                list.removeEventListener("change", themeListener);

                if ("os" === theme) {
                    // 仅在需要时添加监听器
                    themeListener();
                    list.addEventListener("change", themeListener);
                } else {
                    document.body.setAttribute("theme", theme);
                }
            };
        }());
        MainUI.setUiTheme(settings.string_theme);
        document.body.classList.remove('hide');
    }

    const _main = document.getElementById('main');
    const _search = _main.querySelector("#search");
    const _word = _search.querySelector("input#word");
    const _first_submit = _search.querySelector("[type=submit]"); // 默认的搜索引擎
    const _quickdelete = _search.querySelector("input#word+a.quickdelete");
    const _search_list = _search.querySelector("ul.search-list");
    const _add_link_button = _main.querySelector("#links>#scroll>a#add-link-button");
    
    MainUI.showAddLinkButton = bool => PuSet.show(_add_link_button, bool);
    MainUI.showAddLinkButton(settings.boolean_main_show_add_button);
    MainUI.showLink = bool => _main.classList.toggle("hide-links", !bool);
    MainUI.showLink(settings.boolean_main_show_links);

    // 搜索建议提示列表
    const vm_list = PuSet.ViewManager({
        target: _search_list,
        data: [],
        template: "<li></li>",
        layout: function (target, value) {
            target.dataset.text = value;
            target.textContent = value;
        }
    });

    window.op = Object.assign(function op(obj) {
        vm_list.data.length = obj.s.length;
        vm_list.update(obj.s);
        _search_list.classList.remove("hide");
    }, {
        t: 0,
        s: [],
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

    // 发起搜索事件
    PuSet(_search).on("submit", function (ev) {
        ev.preventDefault();
        const value = _word.value.trim();
        if (value.startsWith("--set")) {
            _word.value = "";
            _word.blur();
            MainUI(value);
        } else if (ev.submitter) {
            const [type, engine] = ev.submitter.id.split("_");
            if ("engine" === type) {
                storage.setItem("puset-search-history", window.op.update(value)).then(function () {
                    const url = (MainUI.GS.map_search_engine[engine].href + encodeURIComponent(value));
                    window.location.href = url;
                });
            }
        }
    });

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
            document.body.classList.add("focus");
            // MainUI.layer_background.classList.add("focus");
        },
        blur() {
            _quickdelete.classList.add("hide");
            _search_list.classList.add("hide");
            document.body.classList.remove("focus");
            // MainUI.layer_background.classList.remove("focus");
        },
        input() {
            clearTimeout(window.op.t);
            const value = _word.value.trim();
            if (value) {
                // _quickdelete.classList.remove("hide");
                window.op.t = setTimeout(function () {
                    if (value.startsWith(MainUI.q)) {
                        window.op(MainUI);
                    } else {
                        MainUI.jsonp("https://suggestion.baidu.com/su?cb=op&wd=" + encodeURIComponent(value));
                    }
                }, 500);
            } else {
                // 如果搜索框没有内容，显示搜索历史
                window.op(window.op);
            }
        }
    });

    // 搜索列表的点击事件
    PuSet(_search_list).on("contextmenu", function (ev) {
        return ev.preventDefault(), false;
    }).on("pointerdown", "li", function pointerdown(ev) {
        ev.preventDefault();
        let text;
        if (text = this.dataset.text) {
            _word.value = text;
            // 如果是 --set 开头的命令行，不直接搜索
            if (_word.value.startsWith(MainUI.q)) return;

            // 如果是鼠标左键按下，直接搜索
            if (ev.button === 0 || ev.buttons === 1) {
                // 不会触发事件监听，不好
                // _search.submit();

                // 采用模拟点击
                _first_submit.click();
            }
        }
    });

    // 搜索框内搜索引擎按钮
    MainUI.vm_search_engine = PuSet.ViewManager({
        target: document.getElementById("search-input"),
        selector: "span.bg.button",
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
                _search.action = array[0];
                _word.name = array[array.length - 2];
            }
        }
    });

    MainUI.vm_links = PuSet.ViewManager({
        target: _main.querySelector('#links>#scroll'),
        selector: '#links>#scroll>a.link-button',
        insert: _add_link_button,
        data: settings.map_all_links,
        onresize(target, value, key) {
            // 火狐浏览器不会自动撑大grid布局
            if ("length" === key) {
                const max = _add_link_button.style.order = (+value + 10);
                target.style.width = `${max * 80}px`;
            }
        },
        layout(target, value, key, index) {
            target.dataset.key = key;
            target.style.order = index + 1;
            target.href = value.href;
            const background = target.querySelector("span.bg");
            background.style.setProperty("background-color", value.background_color ?? "transparent");
            background.style.setProperty("background-image", `url(${value.local_icon || value.icon || (new URL("/favicon.ico", value.href)).href})`);
            target.querySelector("span.title").innerHTML = value.title;
        }
    });

    // 设置背景
    PuSet.get('background').init(true, function (root, options) {
        root.classList.add('view', 'unselect');
        document.body.insertBefore(root, _main);
        options.exec(root, settings, options);
    });

    queueMicrotask(console.log.bind(
        console,
        "%c PuSet %c v2.0.0 %c Yay, you're finally here! ",
        "padding: 2px 6px; border-radius: 3px 0 0 3px; color: #fff; background:rgb(64, 62, 213); font-weight: bold;",
        "padding: 2px 6px; border-radius: 0 0 0 0; color: #fff; background:rgb(96, 118, 183); font-weight: bold;",
        "padding: 2px 6px; border-radius: 0 3px 3px 0; color: rgb(64, 62, 213); background:rgb(171, 181, 210); font-weight: bold;"
    ));
});