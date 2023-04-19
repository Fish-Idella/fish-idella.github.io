(function (PuSet) {

    "use strict";

    const HIDE_ATTR = "v-hide";
    const LENGTH = "length";

    const mStyle = document.createElement("style");
    mStyle.innerHTML = `*[${HIDE_ATTR}] {display: none !important;}`;
    document.head.appendChild(mStyle);

    /**
     * 
     * @param {CreateView} options 
     * @param {Element} target 
     * @param {any} value 
     * @param {string} key 
     * @param {number} index 
     */
    const layout = function (options, target, value, key, index = -1) {
        View.show(target, true);
        if (options.hasLayout) {
            options.layout(target, value, key, index);
        }
    };

    /**
     * 将数据展示到元素中
     * @param {{
     *     target: HTMLElement,                       // 指定元素
     *     selector: string,                          // Ⅰ：元素的子元素选择器，第一个符合条件的作为后续模板
     *     children: HTMLCollection,                  // Ⅱ：子元素集，第一个符合条件的作为后续模板
     *     template: string | HTMLElement | ((index, type) => HTMLElement), // Ⅲ：超文本字段，格式化作为后续模板，每次获取新的新的模板 （模板只有一个有效，数字越大优先级越高）
     *     insert: string | HTMLElement,              // 将新元素插入到该元素之前，未设置则放在最后
     *     data: object | array,                      // 数据源
     *     hidden: boolean,                           // 初始化后是否隐藏元素
     *     layout: (target: HTMLElement, value: any, key: string | number) => void,   // 布局方式
     *     onresize: (target: HTMLElement, value: any, key: string | number) => void  // data 为 Array 类型，并且长度发生变化
     * }} options 参数
     * @returns {View}
     */
    const CreateView = function (options) {
        "use strict";

        /** @type {CreateView} */
        const self = Object.assign(this, options);

        // 初始化子元素集
        self.__IC();

        self.hasLayout = "function" == typeof self.layout;

        // 新元素插入位置，未设置则把新元素放到最后
        if (self.insert && "string" == typeof self.insert) {
            self.insert = PuSet(self.target.children).filter(self.insert).get(0);
        }
        // 判断指定元素（插入位置）是否有效
        self.isInsert = self.insert instanceof Element;

        const isArray = Array.isArray(options.data);

        const isFunction = PuSet.isFunction(self.onresize);

        // 实例化后的模板
        const hasTemplate = self.__IT();

        const validator = {
            set: function (obj, prop, value) {
                // console.log(hasTemplate)
                try {
                    let index = -1;
                    if (hasTemplate) {
                        // console.log("hasTemplate")
                        if (isArray) {
                            // console.log("isArray")
                            if (LENGTH === prop) {
                                if (obj.length > value) {
                                    // 隐藏溢出的元素
                                    self.hide(value);

                                    if (isFunction) {
                                        self.onresize(self.target, value, prop);
                                    }
                                }
                            } else {
                                index = +prop;
                                layout(self, self.__GC(index, value.type), value, prop, index);
                            }
                        } else {
                            index = Object.keys(obj).indexOf(prop);
                            layout(self, self.__GC(index, value.type), value, prop, index);
                        }
                    } else {
                        console.log("notTemplate")
                        layout(self, self.target, value, prop, index);
                    }
                } catch (ex) {
                    console.log(ex)
                    console.error(ex.message, self)
                } finally {
                    // The default behavior to store the value
                    obj[prop] = value;

                    // 表示成功
                    return true;
                }
            }
        };

        self.originalData = options.data || {};
        self.layoutData = {};

        self.data = new Proxy(self.originalData, validator);

        if (!self.hidden) { self.update(); }

        if (isArray && isFunction) {
            self.onresize(self.target, self.data[LENGTH], LENGTH);
        }

    };

    const View = PuSet.View = function (options) {
        return new CreateView(options);
    };

    View.prototype = CreateView.prototype = {

        /** @type {string} */
        selector: "",
        /** @type {Element[]} */
        children: null,
        /** @type {Element} */
        insert: null,
        /** @type {boolean} */
        isInsert: false,
        /** @type {boolean} */
        hidden: false,
        /** @type {boolean} */
        hasLayout: false,
        /**
         * 模板函数
         * @type {boolean} */
        isFunction: false,

        /**
         * 初始化子元素
         */
        __IC: function () {
            const children = [];

            if (this.children === "all") {
                this.children = this.target.children;
            }

            // 子元素选择器，覆盖 options.children
            if (this.selector) {
                this.children = PuSet(this.target.children).filter(this.selector);
            }

            // 将选中的子元素放到数组中
            PuSet.each(this.children, (value) => {
                // if (value instanceof HTMLElement) {
                children.push(value)
                // }
            });

            this.children = children;
        },

        /**
         * 初始化模板
         * @returns {boolean} 模板有效
         */
        __IT: function () {
            if (this.isFunction = PuSet.isFunction(this.template)) {

                return true;
            } else {
                const div = document.createElement("div");
                if ("string" == typeof this.template) {
                    // 实例化HTML模板
                    div.innerHTML = this.template;
                    this.template = div.firstChild;
                } else if (!this.template) {
                    // 从子元素中获取
                    this.template = this.children[0];
                }

                if (this.template instanceof Element) {
                    this.template = this.template.cloneNode(true);

                    return true;
                } else {
                    this.template = div.cloneNode(true);
                }
            }
            return false;
        },

        /**
         * 从模板获取新实例
         * @param {number} index 位置
         * @param {string} type 类型
         * @returns {Element}
         */
        __GT: function (index, type) {
            return this.isFunction ? this.template(index, type) : this.template.cloneNode(true);
        },

        /**
         * 获取子元素，超出则获取新实例
         * @param {number} index 位置
         * @param {string} type 类型
         * @returns {Element}
         */
        __GC: function (index, type) {
            // console.log(index)
            let child = this.children[index];
            if (index >= this.children.length || index < 0) {
                child = this.children[index] = this.__GT(index, type);
                if (this.isInsert) {
                    this.target.insertBefore(child, this.insert);
                } else {
                    this.target.appendChild(child);
                }
            }
            return child;
        },

        /**
         * 隐藏第i个之后的所有元素
         * @param {number} i 隐藏第i个之后的所有元素
         */
        hide: function (i) {
            const l = this.children.length;
            for (; i < l; i++) {
                View.show(this.children[i], false);
            }
        },

        update: function () {
            let key, self = this;
            for (key in self.originalData) {
                self.data[key] = self.originalData[key];
            }
        }

    };
    /**
     * 
     * @param {HTMLElement} target 
     * @param {boolean} value 
     */
    View.show = function (target, value) {
        if (value) {
            target.removeAttribute(HIDE_ATTR);
        } else {
            target.setAttribute(HIDE_ATTR, true);
        }
    };

}(window.PuSet || {}));