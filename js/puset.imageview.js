(function (PuSet) {
    "use strict";

    const src_loading = "img/loading-w.gif";
    const src_error = "img/pic-error.jpg";

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
     * @param {number} time        动画需要的时长
     * @param {number} range       位移距离
     * @param {function} callback 
     */
    function createAnimate(time, range, callback) {

        if (time === 0) {
            requestAnimationFrame(() => callback(range));
        }

        // 动画开始时的时间戳
        let startTime = undefined;
        // 平均速度
        const velocity = range / time;

        function step(timestamp) {
            if (startTime === undefined) {
                startTime = timestamp;
            }

            const elapsed = timestamp - startTime;

            if (callback(Math.min(range, (elapsed * velocity))) === false) {
                return;
            }

            if (elapsed < time) {
                requestAnimationFrame(step);
            }
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
            const img = new Image;

            img.onerror = function () {
                if (image.parentElement.dataset.index == i) {
                    image.src = src_error;
                    image.width = 919;
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

    function keep(target, self) {
        target.style.left = PX.zero;
        if (self.next) {
            self.next.style.left = PX.percent;
        }
        if (self.previous) {
            self.previous.style.left = PX.negative;
        }
    }

    function next(target, self) {
        if (self.previous) {
            self.previous.style.left = PX.negative;
        }
        if (self.next) {
            self.next.style.left = PX.zero;
            target.style.left = PX.negative;
            self.updateLayout(self.children, self.next);
        } else {
            target.style.left = PX.zero;
        }
    }

    function previous(target, self) {
        if (self.next) {
            self.next.style.left = PX.percent;
        }
        if (self.previous) {
            self.previous.style.left = PX.zero;
            target.style.left = PX.percent;
            self.updateLayout(self.children, self.previous);
        } else {
            target.style.left = PX.zero;
        }
    }

    /**
     * 轨迹变化
     */
    const Trajectory = PuSet.createClass({

        // 记录数值变化峰谷
        array: null,

        // 数值是否在增长
        isEnlarge: false,

        // 记录中最近的一次数值
        currentItem: 0,

        // 峰谷变化次数
        index: 0,

        constructor: function Trajectory() {
            this.array = new Array;
        },
        init: function (i) {
            const length = this.array.length;
            this.array.splice(0, length, i, i);
            this.currentItem = i;
            this.index = 1;
        },
        get: function (i) {
            return this.array[i] || null;
        },
        ifAdd: function (i) {
            if (this.isEnlarge) {
                if (i < this.currentItem) {
                    this.index++;
                    this.isEnlarge = false;
                }
            } else {
                if (i > this.currentItem) {
                    this.index++;
                    this.isEnlarge = true;
                }
            }
            this.currentItem = i;
            this.array[this.index] = i;
        }
    });

    PuSet.ImageView = PuSet.createClass({

        target: null,
        content: null,
        header: null,
        footer: null,

        previous: null,
        currentItem: null,
        next: null,

        children: null,

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

        updateLayout: function (children, currentItem) {
            currentItem.style.left = PX.zero;
            this.currentItem = currentItem;
            this.index = +currentItem.dataset.index;

            const childrenV = this.imgsVertical.children;

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

                const children = this.content.children;
                const childrenV = this.imgsVertical.children;
                const length = Math.max(this.length, this.max, childrenV.length);

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
                        item = children.item(i);
                        item.dataset.index = i;
                        item.classList.remove("transition");
                        if (i < this.length) {
                            loadImage(item.firstChild, childrenV, i);
                            item.style.left = "100%";
                            item.classList.remove("hide");
                        } else {
                            item.classList.add("hide");
                        }
                    }
                }
                this.updateLayout(children, children.item(0));
            } else {
                this.information.innerHTML = '<span class="no-image">没有找到图像资源或处理资源出错。</span>';
                this.information.classList.remove("hide");
            }
            return this;
        },

        wait: function () {
            loadImage(this.currentItem.firstChild, null, 0);
        },

        getVerticalItem: function (i) {
            let img;
            if (this.imgsVertical) {
                img = this.imgsVertical.children.item(i);
                if (img === null) {
                    img = new Image;
                    img.alt = "这是一个看图片的网站";
                    this.imgsVertical.appendChild(img);
                }
            }
            img.src = "img/loading.gif";
            return img;
        },

        init: function (target, i) {
            this.data = new Array(0);
            if (PuSet.isFunction((this.target = target).querySelector)) {

                /**
                 * ImageView 实例
                 * @type {ImageView}
                 */
                const self = this;

                const t = target.querySelector(".footer");
                const clone = document.importNode(t.content, true);
                target.innerHTML = '<header></header><section><div class="view horizontalContent"></div><div class="view verticalContent hide"></div><div class="view information hide"></div></section><footer></footer>';
                target.classList.add("image-view");

                const max = Math.max(5, isNaN(i) ? 5 : i);
                this.max = (max % 2 == 0) ? (max + 1) : max;
                this.middle = Math.floor(this.max / 2);

                let n = [
                    `<div style="left: 0px;" data-index="0"><img draggable="false" alt="这是一个看图片的网站" src=${src_loading}></div>`
                ];
                for (let s = 1; s < self.max; s++) {
                    n.push(`<div style="left: 100%;" data-index="${s}"><img draggable="false" alt="这是一个看图片的网站" src=${src_loading}></div>`);
                }

                this.content = target.querySelector("section div.horizontalContent");
                this.content.innerHTML = n.join("");

                this.header = target.querySelector("header");
                this.footer = target.querySelector("footer");
                this.footer.appendChild(clone);

                this.information = target.querySelector(".information");

                this.children = self.content.children;
                this.currentItem = self.children.item(0);

                this.imgsVertical = target.querySelector(".verticalContent");

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
                    const image = self.currentItem.firstChild;
                    image.width = getWidth(image, self.height);
                });

                let trajectory = new Trajectory();

                PuSet(this.content).setManager(function (manager) {
                    manager.get("pan").set({
                        direction: Hammer.DIRECTION_ALL
                    });
                }).action("tap", function (ev) {
                    window.requestAnimationFrame(() => {
                        const i = self.target.clientWidth / 3;
                        if (ev.center.x > 2 * i) {
                            PuSet.each(self.children, (item) => item.classList.remove("transition"));
                            next(self.currentItem, self);
                        } else if (ev.center.x > i) {
                            self.toggleActionBar();
                        } else {
                            PuSet.each(self.children, (item) => item.classList.remove("transition"));
                            previous(self.currentItem, self);
                        }
                    });
                }).action("panstart", "div", ev => {
                    trajectory.init(ev.deltaX);
                    PuSet.each(self.children, (item) => item.classList.remove("transition"));
                    getRectangleSize();
                }).action("pan", "div", function (ev) {
                    const deltaX = ev.deltaX;
                    trajectory.ifAdd(deltaX);
                    window.requestAnimationFrame(() => {
                        if (ev.isFinal) {
                            PuSet.each(self.children, (item) => item.classList.add("transition"));
                            if (Math.abs(deltaX) > 30) { // 偏移量小于30，忽略本次滑动
                                if (trajectory.isEnlarge && deltaX >= 0) { // 右划，查看前一张
                                    previous(this, self);
                                    return;
                                } else if (!trajectory.isEnlarge && deltaX <= 0) { // 左划，查看后一张
                                    next(this, self);
                                    return;
                                }
                            }
                            keep(this, self, false);
                        } else {
                            let left = Math.min((self.previous ? self.width : 50), Math.max((self.next ? -self.width : -50), deltaX));
                            if (self.next) {
                                self.next.style.left = PX.parse(Math.max(0, left + self.width));
                            }
                            if (self.previous) {
                                self.previous.style.left = PX.parse(Math.min(0, left - self.width));
                            }
                            this.style.left = PX.parse(left);
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