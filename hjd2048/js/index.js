(function (HJD) {

    "use strict";

    window.HJD = HJD;

    HJD.addElement("title main list image".split(" "));

    /**
     * 主列表选中的项目
     * @type {HTMLAnchorElement} 
     */
    let mCurrentSelected;

    PuSet(HJD.elems.main).on("click", "a", function (ev) {
        ev.preventDefault();

        // 清除之前的选中
        if (mCurrentSelected) {
            mCurrentSelected.classList.remove("select");
        }
        // 重设选中项目
        (mCurrentSelected = this).classList.add("select");

        // 加载子页面
        HJD.loadImageList(HJD.formatURL(mCurrentSelected.getAttribute("href"), HJD.base), mCurrentSelected.innerHTML);

    }).on("scroll", function () {
        if ((this.scrollTop + this.clientHeight * 1.1) > this.scrollHeight) {
            HJD.loadMainList(HJD.MAIN_NEXT, false);
        };
    });

    // 图片滑动翻页
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    HJD.imageView = PuSet.ImageView(HJD.elems.image, 5);

    // 图片展示页标题栏和底部按钮

    HJD.addElement("menu_toggle".split(" "));
    HJD.addElement("vertical_content", HJD.imageView.content_vertical);
    HJD.addElement("information", HJD.elems.image.querySelector(".information"));

    PuSet([HJD.elems.vertical_content, HJD.elems.information]).on("click", function () {
        HJD.imageView.toggleActionBar();
    });

    HJD.change = function () {
        HJD.elems.vertical_content.scrollTo({
            top: 0,
            left: 0
        });
        // 加载图片
        PuSet.each(HJD.elems.vertical_content.children, function (value) {
            const url = value.dataset.src;
            if (url != value.src) {
                Mm.getImage(value, url, function (image, url, ev) {
                    image.src = "img/error.png";
                });
            }
        });
    };
    document.getElementById("menu_toggle").addEventListener("click", function () {
        HJD.elems.information.classList.add("hide");
        if (HJD.or = !HJD.or) {
            HJD.elems.vertical_content.classList.add("hide");
        } else {
            HJD.elems.vertical_content.classList.remove("hide");

            // 要在.remove("hide")之后，否则滑动不生效
            HJD.change();
        }
    });

    document.getElementById("menu_information").addEventListener("click", function () {
        HJD.elems.information.classList.toggle("hide");
    });
    document.getElementById("menu_save").addEventListener("click", function () {
        Mm.downloadGroup(mCurrentSelected.textContent, HJD.imageView.data);
    });

    HJD.imageView.header.addEventListener("click", function () {
        HJD.elems.image.classList.add("hide");
    });

    HJD.elems.title.addEventListener("click", function () {
        HJD.elems.list.classList.toggle("hide");
    });

    // 图片滑动翻页结束
    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    PuSet(HJD.elems.list).on("click", "a", function ({ srcEvent: ev }) {
        ev.preventDefault();
        const target = ev.target;
        HJD.loadMainList(HJD.formatURL(target.getAttribute("href"), HJD.base), target.innerHTML);
        HJD.elems.list.classList.add("hide");
    });

    Mm.addEventListener("global-key", function ({ globalKey: key }) {
        switch (key) {
            case Mm.KEYCODE_BACK: {
                const classList = HJD.elems.image.classList;
                if (classList.contains("hide")) {
                    Mm.entrustEvent(key);
                } else {
                    classList.add("hide");
                }
                break;
            }
            case Mm.KEYCODE_MENU: {
                Mm.entrustEvent(key);
                break;
            }
            default: if (key >= 0) {
                const title = HJD.keys[key];
                HJD.loadMainList(HJD.formatURL(HJD.list[title], HJD.base), title);
                HJD.elems.list.classList.add("hide");
                HJD.elems.image.classList.add("hide");
            }
        }
    });

    // window.zoom = window.showMenu = function () { return false; };

    // HJD.base = window.localStorage.getItem("hjd-base") || HJD.base;

    Mm.hasInterface && window.navigator.userAgent.includes("PuSet") || HJD.elems.title.removeAttribute("class");

    HJD.loadMain();

}({

    // fid-7.html
    base: "https://bbs.zgogc.com/2048/index.php?m=bbs",

    mainPages: ["thread.php?fid-273.html", "thread.php?fid-7.html"],

    loading: false,

    MAIN_NEXT: "this.mainIndex",

    or: true,

    fid: "21",

    mainIndex: 0,

    elems: {},

    list: {},

    keys: null,

    addElement: function (id, elem) {
        if (Array.isArray(id)) {
            id.forEach((value) => this.elems[value] = document.getElementById(value));
        } else {
            this.elems[id] = elem ? elem : document.getElementById(id);
        }
    },

    // TODO
    createAnimation: function (time = 200, callback) {

        let start = 0;
        let animationId;

        const tp = function (timestamp) {

            // 初始化首次开始绘制的实际发生时间
            if (start === 0) { start = timestamp; }

            // 下一次绘制的实际发生时间与初始化的时间差
            if ((timestamp - start) < time) {
                // 执行
                callback(animationId);

                // requestAnimationFrame()自己只会执行一次
                // 所以如果要生成循环的动画，需要在里面自己再去调用它
                animationId = window.requestAnimationFrame(tp);
            }
        };

        animationId = window.requestAnimationFrame(tp);
    },

    formatURL: function (url, base) {
        return (new Mm.URL(url, base)).href;
    },

    loadMain: function () {

        const HJD = this, arr = [];
        this.mainPages.forEach(function (value) {
            arr.push(fetch(HJD.formatURL(value, HJD.base)).then(response => response.text()).then(function (html) {
                return PuSet.parseHTML(html).querySelectorAll("#cate_children > tr.tr3 > th:nth-child(2) > h2 > a.a1");
            }).catch(() => null));
        });

        Promise.all(arr).then(function () {
            arr.forEach(function (response) {
                response.then(function (links) {
                    links && links.forEach(function (elem) {
                        HJD.elems.list.appendChild(elem);
                        let href = HJD.list[elem.textContent] = elem.getAttribute("href");
                        if (HJD.mainIndex === 0 && href.includes(HJD.fid)) {
                            HJD.loadMainList(HJD.formatURL(href, HJD.base), elem.textContent);
                        }
                    });
                });
            });
        }).then(function () {
            HJD.keys = Object.keys(HJD.list);
            if (HJD.keys.length > 0) {
                Mm.setSimpleList(HJD.keys.join("||"));

                if (HJD.mainIndex === 0) {
                    const title = HJD.keys[0];
                    HJD.loadMainList(HJD.formatURL(HJD.list[title], HJD.base), title);
                }
            } else {
                HJD.elems.main.innerHTML = "加载失败";
            }
        });
    },

    r_fid: /^(.+\?fid\-)(\d+)(.+)$/,

    setTitle: function (e) { this.elems.title.innerHTML = e, document.title = e },

    loadMainList: function (url, title) {
        //fid-29
        if ("string" === typeof title) {
            this.setTitle(title);
            this.mainIndex = 1;
            this.elems.main.innerHTML = "";
            if (title = url.match(this.r_fid)) {
                this.fid = title[2];
            }
        }

        if (!this.loading) {
            this.loading = true;

            if (url === this.MAIN_NEXT) {
                this.mainIndex++;
                url = this.formatURL(`thread.php?fid=${this.fid}&page=${this.mainIndex}`, this.base);
            }

            fetch(url).then(r => r.text()).then(html => {
                const links = PuSet.parseHTML(html).querySelectorAll("#ajaxtable tr > td:nth-child(2) > a.subject");
                links.forEach(elem => this.elems.main.appendChild(elem));
            }).catch(() => this.mainIndex--).finally(() => this.loading = false);
        }
    },

    /**
     * 加载图片页面
     * @param {string} url 图片页面地址
     * @param {string} title 新页面的标题
     */
    loadImageList: function (url, title) {
        if (window.stop) {
            // 中止其他网络请求
            window.stop();
        } else if (document.execCommand) {
            document.execCommand("Stop", true);
        }
        const HJD = this;

        if ("string" === typeof title) {
            // 初始化子页面
            HJD.imageView.header.innerHTML = title;
            HJD.elems.information.classList.add("hide");
            HJD.elems.image.classList.remove("hide");
            HJD.imageView.wait();
        }

        // 获取远程数据
        fetch(url).then(r => r.text()).then(function (html) {

            let img, read_tpc;
            const _document = PuSet.parseHTML(html);
            const links = _document.querySelectorAll("#read_tpc ignore_js_op");

            if (!links.length) {
                return HJD.imageView.bind();
            }

            let arr = [];
            links.forEach(function (elem) {
                img = elem.querySelector("img");
                arr.push(img.getAttribute("src"));
                elem.remove();
            });

            // 情报信息
            if (read_tpc = _document.querySelector("#read_tpc")) {
                HJD.elems.information.innerHTML =
                    "女优情报：<br>" + read_tpc.innerHTML.replace(/script/ig, "template");
            }

            if (title) {
                HJD.imageView.bind(arr);
                if (!HJD.or) {
                    HJD.change();
                }
            }

        }).catch(function (e) {
            console.log(e)
            HJD.imageView.bind();
        });
    }

}));