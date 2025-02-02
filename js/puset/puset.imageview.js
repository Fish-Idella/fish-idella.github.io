(function (PuSet) {
    "use strict";

    const src_loading = "img/loading.webp";
    const src_loading_b = "img/loading.gif";
    const src_error = "img/error.png";

    // 触摸事件允许的误差，如果移动小于指定像素，无视移动
    const deviation = 20;

    const PX = {
        R_NUMBER: /^.*?(\-?\d+(\.\d+)*).*$/,
        /**
         * @param {number} n 
         * @return "npx"
         */
        parse: function (n) {
            return n + "px";
        },
        /**
         * 0px
         */
        zero: "0px",
        /**
         * 100%
         */
        percent: "100%",
        /**
         * -100%
         */
        negative: "-100%"
    };

    /**
     * 
     * @param {number} time      动画需要的时长
     * @param {number} range     位移距离
     * @param {any} data         传入的数据，可省略
     * @param {(process:number, data:data) => boolean} running   运行中的函数，retrun false 中止动画
     * @param {(elapsed:number, data:data) => boolean} done      运行结束的函数，retrun false 中止动画
     */
    function createAnimate(time, range, data, running, done) {

        // 如果第三个参数是function，则默认参数省略了data
        if ("function" === typeof data) {
            [time, range, running, done] = arguments;
            // done = running;
            // running = data;
            // data = null;
        }

        if (time === 0) {
            requestAnimationFrame(() => void running(range, data));
        }

        // 动画开始时的时间戳
        let startTime = undefined;
        // 进度
        let process = 0;
        // 平均速度
        const velocity = range / time;
        const notDone = "function" != typeof done;

        function step(timestamp) {
            startTime === undefined && (startTime = timestamp);

            const elapsed = timestamp - startTime;

            // 如果进度满了
            if (process === range) {

                // 没有done函数，会直接结束
                if (notDone) return;

                // 有done函数，等待done返回值
                if (false === done(elapsed, data)) return;

            } else {
                // 帧动画
                if (false === running(process = Math.min(range, elapsed * velocity), data)) return;
            }
            requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    function itemFilter(array, index) {
        for (let i = 0, s = array.length; i < s; i++) {
            let item = array[i];
            if (item.dataset.index == index) return item
        }
        return null
    }

    /**
     * 
     * @param {HTMLImageElement} img 图片元素
     * @param {number} ch 盒子高度
     * @returns 
     */
    function getWidth(img, ch) {
        const w = img.naturalWidth, h = img.naturalHeight;
        return ch > 0 ? (h > ch ? ch * w / h : w) : 0;
    }

    function loadImage(image, data, i) {
        image.src = src_loading;
        image.width = 800;

        if (data && data.item) {
            const imgv = data.item(i);
            const url = imgv.dataset.src;
            const img = new Image();

            img.onerror = function () {
                if (image.parentElement.dataset.index == i) {
                    image.width = 280;
                    image.src = src_error;
                }
            };
            img.onload = function () {
                if (imgv.dataset.src === url) {
                    imgv.src = url;
                }
                if (image.parentElement.dataset.index == i) {
                    image.width = getWidth(img, image.parentElement.clientHeight);
                    image.src = url;
                }
            };
            img.src = url;
        }
    }

    // 无须验证元素是否存在
    function leftA(elem, postion) {
        elem.style.left = postion;
    }

    // 须要验证元素是否存在
    function leftB(elem, postion) {
        elem && leftA(elem, postion);
    }

    function keep(target, self) {
        leftA(target, PX.zero);
        leftB(self.next, PX.percent);
        leftB(self.previous, PX.negative);
    }

    function next(target, self) {
        leftB(self.previous, PX.negative);
        if (self.next) {
            leftA(self.next, PX.zero);
            leftA(target, PX.negative);
            self.updateLayout(self.children, self.next);
        } else {
            leftA(target, PX.zero);
        }
    }

    function previous(target, self) {
        leftB(self.next, PX.percent);
        if (self.previous) {
            leftA(self.previous, PX.zero);
            leftA(target, PX.percent);
            self.updateLayout(self.children, self.previous);
        } else {
            leftA(target, PX.zero);
        }
    }

    /**
     * 轨迹变化
     */
    const Trajectory = PuSet.createClass({

        // 记录数值变化峰谷
        array: null,

        // 数值是否在增长
        enlarge: false,

        // 记录中最近的一次数值
        current: 0,

        // 峰谷变化次数
        index: 0,

        constructor: function Trajectory() {
            this.array = new Array;
        },
        init: function (i) {
            const length = this.array.length;
            this.array.splice(0, length, i, i);
            this.enlarge = 0;
            this.current = i;
            this.index = 1;
        },
        get: function (num) {
            const array = this.array;
            return num < 0 ? array[num + array.length] : array[num];
        },
        getRange: function (start, end) {
            return this.get(isNaN(end) ? this.index : end) - this.get(isNaN(start) ? 0 : start);
        },
        addIf: function (i) {
            const enlarge = i - this.current;
            if ((this.enlarge > 0 && enlarge < 0) || (this.enlarge < 0 && enlarge > 0)) {
                this.index++;
            }
            this.current = i;
            this.array[this.index] = i;
            this.enlarge = this.getRange(-2, -1);
        }
    });

    PuSet.ImageView = PuSet.createClass({

        target: null,
        content_horizontal: null,
        header: null,
        footer: null,

        previous: null,
        current: null,
        next: null,

        children: null,

        lastString: "",

        toastId: 0,
        toast_content: null,
        toast_view: null,

        content_vertical: null,
        information: null,

        index: 0,
        max: 5,
        middle: 2,

        data: null,
        length: 0,

        width: 0,
        height: 0,

        constructor: function ImageView(target, count = 5) {
            return new init("string" == typeof target ? document.querySelector(target) : target, +count);
        },

        updateLayout: function (children, current) {
            leftA(current, PX.zero);
            this.current = current;
            this.index = +current.dataset.index;

            // 
            this.toast(`第 ${1 + this.index} 张`, 500);

            const childrenV = this.content_vertical.children;

            const previousIndex = this.index - 1;
            if (this.index > 0) {
                this.previous = itemFilter(children, previousIndex);
                const first = this.index - this.middle;
                if (first >= 0) {
                    if (itemFilter(children, first) === null) {
                        const lastIndex = first + this.max;
                        const lastItem = itemFilter(children, lastIndex);
                        lastItem.dataset.index = first;
                        loadImage(lastItem.firstChild, childrenV, first);
                    }
                }
            } else {
                this.previous = null;
            }

            const nextIndex = this.index + 1;
            if (nextIndex < this.length) {
                this.next = itemFilter(children, nextIndex);
                const last = this.index + this.middle;
                if (last < this.length) {
                    if (itemFilter(children, last) === null) {
                        const firstIndex = last - this.max;
                        const firstItem = itemFilter(children, firstIndex);
                        firstItem.dataset.index = last;
                        loadImage(firstItem.firstChild, childrenV, last);
                    }
                }
            } else {
                this.next = null;
            }
        },

        toggleActionBar: function () {
            this.header.classList.toggle("hide");
            this.footer.classList.toggle("hide");
        },

        bind: function (array) {
            if (Array.isArray(array)) {
                this.data = array;
                this.length = array.length;

                const children_horizontal = this.content_horizontal.children;
                const children_vertical = this.content_vertical.children;
                const length = Math.max(this.length, this.max, children_vertical.length);

                let item;

                for (let i = 0; i < length; i++) {
                    // 先填充列表
                    item = this.getVerticalItem(i);
                    if (i < this.length) {
                        item.dataset.src = array[i];
                        item.classList.remove("hide");
                    } else {
                        item.classList.add("hide");
                    }

                    // 可能会用到上面填充的信息
                    if (i < this.max) {
                        item = children_horizontal.item(i);
                        item.dataset.index = i;
                        item.classList.remove("transition");
                        if (i < this.length) {
                            loadImage(item.firstChild, children_vertical, i);
                            leftA(item, PX.percent);
                            item.classList.remove("hide");
                        } else {
                            item.classList.add("hide");
                        }
                    }
                }
                this.updateLayout(children_horizontal, children_horizontal.item(0));
            } else {
                // this.information.innerHTML = '<span class="no-image">没有找到图像资源或处理资源出错。</span>';
                this.information.classList.remove("hide");
            }
            return this;
        },

        wait: function () {
            if (this.or) {
                loadImage(this.current.firstChild, null, 0);
            } else {
                PuSet.each(this.content_vertical.children, (elem) => elem.src = src_loading_b);
            }
        },

        getVerticalItem: function (i) {
            let img;
            if (this.content_vertical) {
                img = this.content_vertical.children.item(i);
                if (img === null) {
                    img = new Image;
                    img.alt = "这是一个看图片的网站";
                    this.content_vertical.appendChild(img);
                }
            }
            img.src = src_loading_b;
            return img;
        },

        toast: function (string, keep = 1000) {
            const self = this;
            const toastId = Date.now();
            if (string === self.lastString && (toastId - self.toastId) < keep) {
                return;
            }

            const toast = self.toast_view;
            self.toast_content.innerHTML = '<span>' + (("" + (self.lastString = string)).replace(/\</g, "&lt;")) + '</span>';

            createAnimate(150, 200, (self.toastId = toastId), function (i) {
                toast.style.bottom = PX.parse(i - 140);
            }, function (time, data) {
                if (self.toastId != data) {
                    return false;
                }
                if (time > keep) {
                    toast.style.bottom = PX.negative;
                    return false;
                }
            });

        },

        init: function (target, i) {
            this.data = new Array(0);
            if (PuSet.isFunction((this.target = target).querySelector)) {

                /**
                 * ImageView 实例
                 * @type {ImageView}
                 */
                const self = this;

                let clone_footer, clone_header;
                const template_header = target.querySelector(".header");
                const template_footer = target.querySelector(".footer");

                if (template_header) {
                    clone_header = document.importNode(template_header.content, true);
                }
                if (template_footer) {
                    clone_footer = document.importNode(template_footer.content, true);
                }

                target.innerHTML = '<header class="image-box hide"></header><section><div class="view horizontal content"></div><div class="view vertical content hide"></div><div class="view information content hide"></div>' +
                    '<table class="toast"><tbody><tr><td class="toast-content"></td></tr></tbody></table></section><footer class="image-box hide"></footer>';
                target.classList.add("image-view");

                const max = Math.max(5, isNaN(i) ? 5 : i);
                this.max = (max % 2 == 0) ? (max + 1) : max;
                this.middle = Math.floor(this.max / 2);

                const n = [
                    `<div style="left: 0px;" data-index="0"><img draggable="false" alt="这是一个看图片的网站" src=${src_loading}></div>`
                ];
                for (let s = 1; s < self.max; s++) {
                    n.push(`<div style="left: 100%;" data-index="${s}"><img draggable="false" alt="这是一个看图片的网站" src=${src_loading}></div>`);
                }

                this.content_horizontal = target.querySelector("section div.horizontal.content");
                this.content_horizontal.innerHTML = n.join("");

                this.header = target.querySelector("header");
                this.footer = target.querySelector("footer");
                if (template_header) {
                    this.header.appendChild(clone_header);
                }
                if (template_footer) {
                    this.footer.appendChild(clone_footer);
                }

                this.information = target.querySelector(".information");
                this.toast_view = target.querySelector(".toast");
                this.toast_content = this.toast_view.querySelector(".toast-content");

                this.children = self.content_horizontal.children;
                this.current = self.children.item(0);

                this.content_vertical = target.querySelector(".vertical.content");

                /**
                 * 获取元素的宽高
                 */
                const getRectangleSize = (function getRectangleSize() {
                    self.width = self.target.clientWidth;
                    self.height = self.target.clientHeight;
                    return getRectangleSize;
                }());

                this.footer.addEventListener("click", function () {
                    self.header.classList.add("hide");
                    self.footer.classList.add("hide");
                });

                window.addEventListener("resize", function () {
                    getRectangleSize();
                    const image = self.current.firstChild;
                    image.width = getWidth(image, self.height);
                });

                let trajectory = new Trajectory();

                PuSet(this.content_horizontal).setManager(function (manager) {
                    manager.get("pan").set({
                        direction: Hammer.DIRECTION_ALL
                    });
                }).action("tap", function (ev) {
                    window.requestAnimationFrame(() => {
                        const i = self.target.clientWidth / 3;
                        if (ev.center.x > 2 * i) {
                            PuSet.each(self.children, (item) => item.classList.remove("transition"));
                            if (self.next) {
                                next(self.current, self);
                            } else {
                                self.toast("已是最后一张");
                            }
                        } else if (ev.center.x > i) {
                            self.toggleActionBar();
                        } else {
                            PuSet.each(self.children, (item) => item.classList.remove("transition"));
                            if (self.previous) {
                                previous(self.current, self);
                            } else {
                                self.toast("已是第一张");
                            }
                        }
                    });
                }).action("panstart", "div", ev => {
                    trajectory.init(ev.deltaX);
                    PuSet.each(self.children, (item) => item.classList.remove("transition"));
                    getRectangleSize();
                }).action("pan", "div", function (ev) {
                    const deltaX = ev.deltaX;
                    trajectory.addIf(deltaX);
                    window.requestAnimationFrame(() => {
                        if (ev.isFinal) {
                            PuSet.each(self.children, (item) => item.classList.add("transition"));
                            const offset = trajectory.enlarge;
                            // console.log(trajectory.getRange(), "+", deltaX)
                            const absX = Math.abs(deltaX);
                            const absO = Math.abs(offset);
                            if ((absX > deviation && offset > 0 && deltaX > 0) || (offset < 0 && absO < deviation)) { // 右划，查看前一张
                                previous(this, self);
                                return;
                            }
                            if ((absX > deviation && offset < 0 && deltaX < 0) || (offset > 0 && absO < deviation)) { // 左划，查看后一张
                                next(this, self);
                                return;
                            }
                            keep(this, self, false);
                        } else {
                            const offset = Math.min((self.previous ? self.width : 50), Math.max((self.next ? -self.width : -50), deltaX));
                            leftB(self.next, PX.parse(Math.max(0, offset + self.width)))
                            leftB(self.previous, PX.parse(Math.min(0, offset - self.width)));
                            leftA(this, PX.parse(offset));
                        }
                    });
                });

            } else {
                console.error("`target` is not an instance of Element.");
            }
            return this;
        }
    }, {

        /**
         * 移除指定元素的所有子元素
         * @param {HTMLElement} elem 
         */
        clear: function (elem) {
            let lastChild;
            while (lastChild = elem.lastChild) {
                elem.removeChild(lastChild);
            }
        }
    });

    const init = PuSet.ImageView.prototype.init;

    init.prototype = PuSet.ImageView.prototype;

}(PuSet));