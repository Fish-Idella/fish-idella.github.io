// document.addEventListener('deviceready', function() {
// document.addEventListener('DOMContentLoaded', function() {
const WEB_BOOK_PARSE = {
    "www.bxwx.tv": {
        "bookName": "#info>h1",
        "cover": "#fmimg>img",
        "firstListURL": "",
        "list": "div.listmain>dl>*",
        "content": "#content"
    },
    "www.bigee.cc": {
        "search": "https://www.bigee.cc/s?q={query}",
        'searchList': "body > div.wrap > div.so_list.bookcase > div.type_show > div.bookbox",
        'searchCover': "div.box > div.bookimg > a > img",
        "searchName": 'div.box > div.bookinfo > h4 > a',
        "searchAuthor": "div.box > div.bookinfo > div.author",
        "searchUptime": "div.box > div.bookinfo > div.uptime",

        "bookName": "body > div.book > div.info > h1",
        "cover": "body > div.book > div.info > div.cover > img",
        "firstListURL": "",
        "list": "body div.listmain dd > a",
        "content": "#chaptercontent"
    },
};


PuSet.fn.reverse = Array.prototype.reverse;

const storage = new PuSet.Storage("WEB_BOOKS_DB", "1.0");
storage.then(function () {

    const TYPE_NOT = "not is url";

    let CurrentBook;
    let loading = false;

    function unix_timestamp(isSeconds, string = 0) {
        const timestamp = Date.now();
        return string + (isSeconds ? Math.floor(timestamp / 1000) : timestamp);
    }

    function getImageBase64(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = function () {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = this.naturalHeight;
                canvas.width = this.naturalWidth;
                context.drawImage(this, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            }
            image.onerror = reject;
            image.src = src;
        });
    }

    function saveShuInfo(data) {
        storage.setItem("BOOKS", data).then(function () {
            // console.log("Save ")
        }).catch(function () {
            alert("error");
        });
    }

    function getAndParseHtml(url, callback) {

        if (!url.startsWith("http")) {
            callback("", TYPE_NOT);
            return
        }

        const r = /charset=('|"|\s*)([\w-]+)\1/i;

        function read(data, test_type, callback) {
            const reader = new FileReader();
            reader.readAsText(data, test_type);
            reader.onload = function () {
                const text = reader.result;
                const test = text.substring(0, text.indexOf('</head>')).replace(/\s/g, "").toLowerCase();
                const type = test.match(r)?.[2];
                if (!type || type == test_type) {
                    callback(text, type);
                } else {
                    read(data, type, callback);
                }
            }
        }
        fetch(url).then(a => a.blob()).then(data => read(data, "utf-8", callback)).catch(function () {
            loading = false;
        });
    }

    function getChapter(bookInfo, id, callback) {

        function a(list_obj, chapter) {
            const url = new URL(chapter.url);
            const obj = WEB_BOOK_PARSE[url.host];
            getAndParseHtml(url.href, function (html, type) {
                if (type === TYPE_NOT) {
                    callback(chapter.name, "", list_obj);
                    return;
                }
                // chapter.html = html;
                const text = PuSet.parseHTML(html).querySelector(obj.content).innerHTML;
                const result = text.split(/<br[^>]*\/?>/).map(function (srt) {
                    const result = srt.trim();
                    if (result) {
                        return `<p>${result}</p>`;
                    }
                }).filter(a => "string" == typeof a).join("");
                storage.setItem((chapter.id = bookInfo.chapter + unix_timestamp(false, "-CONTENT")), result);
                storage.setItem(bookInfo.chapter, list_obj);
                callback(chapter.name, result, list_obj);
            });
        }

        storage.getItem(bookInfo.chapter).then(function (request) {
            const list_obj = request.result;
            const chapter = list_obj[id];
            if (!chapter) {
                console.log("全书完")
                return;
            }
            // console.log(list_obj, id)
            if (chapter.id) {
                storage.getItem(chapter.id).then(function (request) {
                    const text = request.result;
                    if (text) {
                        callback(chapter.name, text, list_obj);
                    } else {
                        a(list_obj, chapter);
                    }
                });
            } else {
                a(list_obj, chapter);
            }
        });
    }

    /**
     * 
     * @param {number} chapter_index 章节
     * @param {number} index 段落
     * @param {boolean} update 更新章节列表
     */
    function openBook(chapter_index, index, update) {
        _shuben_content.innerHTML = "";
        getChapter(CurrentBook, chapter_index, function (name, text, list) {
            if (update && Object.assign(vm_chapter.data, list));
            const div = document.createElement("div");
            div.dataset.chapter = chapter_index;
            div.innerHTML = `<h2>${name}</h2>` + text;
            _shuben_content.appendChild(div);
            if (index > 0) {
                _shuben_content.scrollTo(0, div.children.item(index).offsetTop);
            }
        });
        _shuben.classList.remove("hide");
    }

    const _shujia = document.querySelector("#shujia > div.body.fc > #shujia-box");
    const _button_tianjia = document.querySelector("#shujia > div.body.fc > #shujia-box > #tianjia");

    const _shuben = document.querySelector("#shuben");
    const _shuben_content = _shuben.querySelector(".content");
    const _shuben_list = _shuben.querySelector(".list");
    const _shuben_menu = _shuben.querySelector(".menu");
    const _menu = document.querySelector("#menu");
    const _add = document.getElementById("add");

    const _shuben_list_scroll = _shuben_list.querySelector("ul.scroll");

    const vm_chapter = PuSet.View({
        target: _shuben_list_scroll,
        template: document.createElement("li"),
        data: [],
        item: function (i) {
            return this.data[i];
        },
        layout: function (target, value, key) {
            target.innerHTML = value.name;
            target.title = key;
        }
    });

    function search(value) {
        // TODO 搜索
        alert(value)
    }

    // 初始化主题
    storage.getItem("THEME").then(function (request) {
        const key = request.result || "default";
        _shuben_content.setAttribute("theme", key);
        const _theme = _shuben_menu.querySelector(`.theme .radio-box input[type=radio][title=${key}]`);
        _theme.checked = true;
        window.PuSetWebView?.setBackgroundColor(_theme.getAttribute("backgroundColor"));
    });

    storage.getItem("BOOKS").then(function (request) {
        const SHU_INFO = request.result || {};
        // 2024-01-01
        const order = 1704038400;
        window.SHU_INFO = SHU_INFO;

        const vm_books = PuSet.View({
            target: _shujia,
            selector: document.querySelector("#shujia > div.body.fc > #shujia-box > div.book[v-hide]"),
            insert: _button_tianjia,
            data: SHU_INFO,
            loadIcon: function (data, base) {
                return new Promise((resolve, reject) => {
                    const rg = src => getImageBase64(src).then(a => resolve(a)).catch(reject);
                    if (data) {
                        storage.getItem(data).then(function (request) {
                            const result = request.result;
                            if (result.startsWith("data:")) {
                                resolve(result);
                            } else rg(base);
                        });
                    } else rg(base);
                });
            },
            layout: function (target, value, key) {
                target.title = key;
                target.style.order = value.index;
                target.querySelector(".shuming").innerHTML = value.bookName;

                this.loadIcon(value.dataIcon, value.baseIcon).then(function (data) {
                    const key = value.dataIcon || unix_timestamp(false, "COVER");
                    storage.setItem((value.dataIcon = key), data);
                    target.querySelector(".shu").style.backgroundImage = `url(${data})`;
                    saveShuInfo(SHU_INFO);
                });
            }
        });

        _button_tianjia.addEventListener("click", function () {
            _add.classList.remove("hide");
        });

        _add.querySelector("#search-cancel").addEventListener("click", function () {
            _add.classList.add("hide");
        });

        const _search_value = _add.querySelector("#search-value");
        _add.querySelector("#search-button").addEventListener("click", function () {
            const base = _search_value.value.trim();
            // 空内容
            if (base.length == 0) return _search_value.focus();

            if (base.startsWith("http")) {
                const url = (new URL(base)).href;
                getAndParseHtml(url, function (text, type) {

                    if (type === TYPE_NOT) return;

                    const noscript = text.replace(/<script((?!<\/script>).)*?<\/script>/gi, "");
                    const bookInfo = {
                        bookName: "", // 书名
                        baseIcon: "", // 原始书本封面
                        dataIcon: "", // 本地化书本封面
                        index: order - unix_timestamp(true, 0), // 排序
                        firstListURL: url, // 章节列表首页链接
                        currentListURL: url, // 当前章节页面链接
                        yhcId: 0, // 当前已经缓存到的最新章节的id
                        yddId: 0, // 已经读到的章节
                        duanluo: 0, // 段落
                        chapter: unix_timestamp(false, "CHAPTER") // 章节目录缓存
                    };

                    const html = PuSet.parseHTML(noscript);
                    const obj = WEB_BOOK_PARSE[new URL(url).host];
                    if (obj) {
                        bookInfo.bookName = html.querySelector(obj.bookName).innerHTML;
                        bookInfo.baseIcon = new URL(html.querySelector(obj.cover).getAttribute("src"), url).href;
                        bookInfo.firstListURL = new URL(obj.firstListURL, url).href;
                        bookInfo.currentListURL = bookInfo.firstListURL;
                        // 获取章节列表
                        const list = html.querySelectorAll(obj.list);
                        const list_obj = { length: list.length };
                        PuSet.each(list, function (target, i) {
                            list_obj[i] = {
                                name: target.innerHTML, // 章节名
                                // html: "", // 章节内容链接的初始HTML
                                url: new URL(target.getAttribute("href"), bookInfo.currentListURL).href, // 章节内容链接
                                id: "", // 章节缓存在本地的id，已设置表示已缓存
                            };
                        });
                        storage.setItem(bookInfo.chapter, list_obj);
                    } else {
                        alert("不支持的网站，请联系开发者QQ：565713022");
                    }

                    vm_books.data[url] = bookInfo;
                    saveShuInfo(SHU_INFO);
                });
                _add.classList.add("hide");
            } else {
                search(base);
            }
        });

        // 打开书本
        PuSet(_shujia).on("click", ".book", function () {
            CurrentBook = SHU_INFO[this.title];
            CurrentBook.index = order - unix_timestamp(true, 0);
            this.style.order = CurrentBook.index;
            openBook(CurrentBook.yddId, CurrentBook.duanluo, true);
            saveShuInfo(SHU_INFO);
        });

        let saveShuInfoTimeout = 0;

        // 正文滑动
        _shuben_content.addEventListener("scroll", function () {

            // 更新当前阅读进度
            clearTimeout(saveShuInfoTimeout);
            PuSet(_shuben_content.children).reverse().each((target) => {
                const height = target.offsetTop - this.scrollTop;
                if (height < 0) {
                    CurrentBook.yddId = (target.dataset.chapter - 0);
                    PuSet(target.children).each((child, i) => {
                        if ((height + child.offsetTop) > 0) {
                            CurrentBook.duanluo = Math.max(0, i - 1);
                            saveShuInfoTimeout = setTimeout(() => saveShuInfo(SHU_INFO), 1000);
                            return false;
                        }
                    });
                    return false;
                }
            });


            // 判断是否需要加载下一章节
            if (loading == false && ((this.scrollHeight - this.scrollTop) < (this.clientHeight * 3))) {
                loading = true;
                const chapter_index = CurrentBook.yddId + 1;
                getChapter(CurrentBook, chapter_index, function (name, text) {
                    loading = false;
                    saveShuInfo(SHU_INFO);
                    const children = _shuben_content.querySelectorAll("div");
                    const div = children.length > 5 ? children.item(0) : document.createElement("div");
                    div.dataset.chapter = chapter_index;
                    div.innerHTML = `<h2>${name}</h2>` + text;
                    _shuben_content.appendChild(div);
                });
            }
        });

        _shuben_content.addEventListener("click", function () {
            _shuben_menu.classList.remove("hide")
        });

        const MENU_FUNCTION = {
            /**
             * 打开目录
             * @param {Element} target 
             */
            "chapter": function (target) {
                _shuben_list_scroll.querySelectorAll(".select").forEach(function (li) {
                    li.classList.remove("select");
                });
                _shuben_list.classList.remove("hide");
                _shuben_menu.classList.add("hide");

                const _current_item = _shuben_list_scroll.children.item(CurrentBook.yddId);
                _current_item.classList.add("select");
                _shuben_list_scroll.scrollTo(0, _current_item.offsetTop - 50);
            },
            "home": function (target) {
                _shuben.classList.add("hide");
                _shuben_menu.classList.add("hide");
            },
            "reset": function (target) {
                parseSettings(null, true);
            },
            "cancel": function (target) {
                _shuben_menu.classList.add("hide");
            }
        }

        PuSet(_shuben_menu.querySelector(".button-box")).on("click", "button", function () {
            const fn = MENU_FUNCTION[this.className];
            if ("function" == typeof fn) {
                fn(this);
            }
        })

    }).catch(function () {
        storage.setItem("BOOKS", {}).then(function () {
            alert("需要重新启动")
        });
    });

    // 关闭目录
    _shuben_list.querySelector("button#list-close").addEventListener("click", function () {
        _shuben_list.classList.add("hide");
    });

    // 选择章节
    PuSet(_shuben_list.querySelector("ul.scroll")).on("click", "li", function () {
        openBook(CurrentBook.yddId = +this.title, 0, false);
        _shuben_list.classList.add("hide");
    });

    const _style_content = document.getElementById("style-content");
    let settings;
    function parseSettings(obj, layout) {
        settings = obj || { 'text-size': 20, 'text-margin': 10, 'text-spaced': 30 };
        _style_content.textContent = `#shuben>.content{font-size: ${settings['text-size']
            }px;}#shuben>.content p{margin-inline: ${settings['text-margin']
            }px;line-height: ${settings['text-spaced']}px}`;

        storage.setItem("SETTINGS", settings);
        if (layout) for (let key in settings) {
            _shuben_menu.querySelector('#' + key).value = settings[key];
        }
    }

    storage.getItem("SETTINGS").then(function (request) {
        parseSettings(request.result, true);
    });

    // 
    _shuben_menu.addEventListener("click", function (ev) {
        if (ev.target === _shuben_menu) {
            _shuben_menu.classList.add("hide");
        }
    })

    PuSet(_shuben_menu.querySelectorAll(".range input[type=text]")).on("click", function (ev) {
        const key = this.id;
        if (ev.srcEvent.clientX > (this.clientWidth / 2)) {
            this.value = settings[key] = Math.min(settings[key] + 1, 100);
        } else {
            this.value = settings[key] = Math.max(settings[key] - 1, 0);
        }
        parseSettings(settings, false);
    });

    PuSet(_shuben_menu.querySelectorAll(".theme .radio-box input[type=radio]")).on("change", function () {
        const theme = this.title;
        _shuben_content.setAttribute("theme", theme);
        storage.setItem("THEME", theme);
        window.PuSetWebView?.setBackgroundColor(this.getAttribute("backgroundColor"));
    });

});
