// // document.addEventListener('deviceready', function() {
// // document.addEventListener('DOMContentLoaded', function() {

const storage = new PuSet.Storage("WEB_BOOKS_DB", "1.0");
storage.then(function () {

    const TYPE_NOT = "not is url";

    let CurrentBook;
    let loading = false;

    function saveShuInfo(data) {
        storage.setItem("BOOKS", data).then(function () {
            console.log("Save ")
        }).catch(function () {
            console.log("error")
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
                const result = text.split(/<br[^>]*\/?>/).map(function(srt) {
                    const result = srt.trim();
                    if (result) {
                        return `<p>${result}</p>`;
                    }
                }).filter(a => "string" == typeof a).join("");
                storage.setItem((chapter.id = bookInfo.chapter + "-CONTENT" + Date.now()), result);
                storage.setItem(bookInfo.chapter, list_obj);
                callback(chapter.name, result, list_obj);
            });
        }

        storage.getItem(bookInfo.chapter).then(function (request) {
            const list_obj = request.result;
            const chapter = list_obj[id];
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

    function openBook(chapter_index, update) {
        _shuben_content.innerHTML = "";
        getChapter(CurrentBook, chapter_index, function (name, text, c) {
            if (update && Object.assign(vm_chapter.data, c));
            const div = document.createElement("div");
            div.innerHTML = `<h2>${name}</h2>` + text;
            _shuben_content.appendChild(div);
        });
        _shuben.classList.remove("hide");
    }

    const _shujia = document.querySelector("#shujia > div.body.fc > #shujia-box");
    const _button_tianjia = document.querySelector("#shujia > div.body.fc > #shujia-box > #tianjia");

    const _preview = document.getElementById("preview");
    const _shuben = document.querySelector("#shuben");
    const _shuben_content = _shuben.querySelector(".content");
    const _shuben_list = _shuben.querySelector(".list");
    const _shuben_menu = _shuben.querySelector(".menu");
    const _menu = document.querySelector("#menu");

    const vm_chapter = PuSet.View({
        target: _shuben_list.querySelector("ul"),
        template: document.createElement("li"),
        data: [],
        item: function(i) {
            return this.data[i];
        },
        layout: function(target, value, key) {
            target.innerHTML = value.name;
            target.title = key;
        }
    });

    _shuben_list.querySelector("button#list-close").addEventListener("click", function() {
        _shuben_list.classList.add("hide");
    });

    PuSet(_shuben_list.querySelector("ul.scroll")).on("click", "li", function() {
        openBook(CurrentBook.yddId = +this.title, false);
        _shuben_list.classList.add("hide");
    });

    storage.getItem("BOOKS").then(function (request) {
        const SHU_INFO = request.result || {};
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
                    const key = value.dataIcon || "COVER" + Date.now();
                    storage.setItem((value.dataIcon = key), data);
                    target.querySelector(".shu").style.backgroundImage = `url(${data})`;
                    saveShuInfo(SHU_INFO);
                });
            }
        });

        // 添加新书
        _button_tianjia.addEventListener("click", function (ev) {

            const url = prompt("输入书籍首页的网址", "网页中应当包含书名和封面")?.trim();
            if (!url) return;

            getAndParseHtml(url, function (text, type) {

                if (type === TYPE_NOT) {
                    return;
                }

                const noscript = text.replace(/<script((?!<\/script>).)*?<\/script>/gi, "");
                const bookInfo = {
                    bookName: "", // 书名
                    baseIcon: "", // 原始书本封面
                    dataIcon: "", // 本地化书本封面
                    index: 1, // 排序
                    firstListURL: url, // 章节列表首页链接
                    currentListURL: url, // 当前章节页面链接
                    yhcId: 0, // 当前已经缓存到的最新章节的id
                    yddId: 0, // 已经读到的位置
                    chapter: "CHAPTER" + Date.now() // 章节缓存
                    // eg
                    // {
                    // 	name: "",           // 章节名
                    //  html: "",           // 章节内容链接的初始HTML
                    // 	url: "",            // 章节内容链接
                    //  absURL: "",         // 章节内容链接的绝对路径，已设置表示已缓存
                    // 	id: "",             // 章节缓存在本地的id
                    // }
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
                }
                // else {
                //     _preview.classList.remove("hide");
                //     _preview.contentDocument.documentElement.innerHTML = noscript;
                // }

                vm_books.data[url] = bookInfo;
                saveShuInfo(SHU_INFO);
            });
        });


        PuSet(_shujia).on("click", ".book", function () {
            CurrentBook = SHU_INFO[this.title];
            CurrentBook.index = 0;
            openBook(CurrentBook.yddId, true);
        });


        _shuben_content.addEventListener("scroll", function () {
            if (loading) return;
            if (this.scrollHeight - this.scrollTop < this.clientHeight + 50) {
                loading = true;
                CurrentBook.yddId++;
                getChapter(CurrentBook, CurrentBook.yddId, function (name, text) {
                    loading = false;
                    saveShuInfo(SHU_INFO);
                    const children = _shuben_content.querySelectorAll("div");
                    const div = children.length > 5 ? children.item(0) : document.createElement("div");
                    div.innerHTML = `<h2>${name}</h2>` + text;
                    _shuben_content.appendChild(div)
                });
            }
        });

        _shuben_content.addEventListener("click", function () {
            _shuben_menu.classList.remove("hide")
        });

        const MENU_FUNCTION = {
            "chapter": function(target) {
                _shuben_list.classList.remove("hide");
                _shuben_menu.classList.add("hide");
            },
            "home": function(target) {
                _shuben.classList.add("hide");
                _shuben_menu.classList.add("hide");
            },
            "reset": function(target) {

            },
            "cancel": function(target) {
                _shuben_menu.classList.add("hide");
            }
        }

        PuSet(_shuben_menu.querySelector(".button-box")).on("click", "button", function() {
            const fn = MENU_FUNCTION[ this.className ];
            if ("function" == typeof fn) {
                fn(this);
            }
        })

    }).catch(function () {
        storage.setItem("BOOKS", {}).then(function () {
            alert("需要重新启动")
        });
    });
});
