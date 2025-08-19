(function (PuSet) {

    const HIDE_ATTRIBUTE = "v-hide";
    const LENGTH_PROPERTY = "length";

    if (document.querySelector('style.v-hide') === null) {
        const styleElement = document.createElement("style");
        styleElement.className = HIDE_ATTRIBUTE;
        styleElement.innerHTML = `[${HIDE_ATTRIBUTE}] {display: none !important;}`;
        document.head.appendChild(styleElement);
    }

    /**
     * 
     * @param {Rules} options 
     * @param {Element} targetElement 
     * @param {any} value 
     * @param {string} key 
     * @param {number} index 
     */
    const applyLayout = function (options, targetElement, value, key, index = -1) {
        requestAnimationFrame(function () {
            View.show(targetElement, true);
            if (options.hasLayout) {
                options.layout(targetElement, value, key, index);
            }
        });
    };

    /**
     * 将数据展示到元素中
     * @param {{
     *     target: HTMLElement,                       // 指定元素
     *     selector: string,                          // Ⅰ：元素的子元素选择器，第一个符合条件的作为后续模板
     *     children: HTMLCollection,                  // Ⅱ：子元素集，第一个符合条件的作为后续模板
     *     template: string | HTMLElement | ((index, type) => void), // Ⅲ：超文本字段，格式化作为后续模板，每次获取新的新的模板 （模板只有一个有效，数字越大优先级越高）
     *     insert: string | HTMLElement,              // 将新元素插入到该元素之前，未设置则放在最后
     *     data: object | array,                      // 数据源
     *     hidden: boolean,                           // 初始化后是否隐藏元素
     *     layout: (target: HTMLElement, value: any, key: string | number) => void,   // 布局方式
     *     onresize: (target: HTMLElement, value: any, key: string | number) => void  // data 为 Array 类型，并且长度发生变化
     * }} options 参数
     * @returns {View}
     */
    const Rules = function (options) {

        /** @type {Rules} */
        const self = Object.assign(this, options);

        // 初始化子元素集
        self.initializeChildren();

        self.hasLayout = "function" == typeof self.layout;

        // 新元素插入位置，未设置则把新元素放到最后
        if (self.insert && "string" == typeof self.insert) {
            self.insert = self.target.querySelector(self.insert);
        }
        // 判断指定元素（插入位置）是否有效
        self.isInsert = self.insert instanceof Element;

        const isArray = Array.isArray(options.data);
        const hasResize = PuSet.isFunction(self.onresize);
        // 实例化后的模板
        const hasTemplate = self.initializeTemplate();

        const validator = {
            get: function (target, key, receiver) {
                return Reflect.get(target, key, receiver);
            },
            set: function (target, property, value, receiver) {
                // console.log(arguments)
                try {
                    if (hasTemplate) {
                        if (isArray) {
                            if (LENGTH_PROPERTY === property) {
                                // 隐藏溢出的元素
                                self.hide(value);
                                if (hasResize) {
                                    self.onresize(self.target, value, property);
                                }
                            } else {
                                applyLayout(self, self.getChild(property, value.type), value, property, property);
                            }
                        } else {
                            const index = Object.keys(target).indexOf(property);
                            applyLayout(self, self.getChild(index, value.type), value, property, index);
                        }
                    } else {
                        applyLayout(self, self.target, value, property, -1);
                    }
                } catch (error) {
                    // console.warn(prop, ex)
                    console.error(error.message, options);
                } finally {
                    // The default behavior to store the value
                    return Reflect.set(target, property, value, receiver);
                }
            },

            deleteProperty: function (target, property) {
                const index = isArray ? property : Object.keys(target).indexOf(property);
                View.show(self.children[index], false);
                return Reflect.deleteProperty(target, property);
            },
        };

        self.originalData = options.data || {};

        self.data = new Proxy(self.originalData, validator);

        if (!self.hidden) {
            self.update(self.originalData);
        }

        if (isArray && hasResize) {
            self.onresize(self.target, self.data[LENGTH_PROPERTY], LENGTH_PROPERTY);
        }

    };

    const View = PuSet.View = function (options) {
        return new Rules(options);
    };

    View.prototype = Rules.prototype = {

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
         * 初始化子元素
         */
        initializeChildren: function () {
            const childrenArray = [];
            // 子元素选择器，覆盖 options.children
            if (this.selector) {
                this.children = this.target.querySelectorAll(this.selector);
            }

            // 将选中的子元素放到数组中
            PuSet.each(this.children, (value) => childrenArray.push(value));
            this.children = childrenArray;
        },

        /**
         * 初始化模板
         * @returns {boolean} 模板有效
         */
        initializeTemplate: function () {
            if (this.isFunction = PuSet.isFunction(this.template)) {
                return true;
            } else {
                const div = document.createElement("div");
                if ("string" == typeof this.template) {
                    // 实例化HTML模板
                    div.innerHTML = this.template;
                    this.template = div.firstChild;
                } else if (!this.template) {
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
         * @returns {Element | ShadowRoot}
         */
        getTemplateInstance: function (index, type) {
            return this.isFunction ? this.template(index, type) : this.template.cloneNode(true);
        },

        /**
         * 获取子元素，超出则获取新实例
         * @param {number} index 位置
         * @param {string} type 类型
         * @returns {Element}
         */
        getChild: function (index, type) {
            let instance = child = this.children[index];
            if (index >= this.children.length || index < 0) {
                instance = this.children[index] = this.getTemplateInstance(index, type);
                child = instance instanceof ShadowRoot ? instance.host : instance;
                if (this.isInsert) {
                    this.target.insertBefore(child, this.insert);
                } else {
                    this.target.appendChild(child);
                }
            }
            return instance;
        },

        /**
         * 更新数据
         * @param {object | Array} data 
         */
        update: function (data) {
            Object.assign(this.data, data);
        },

        /**
         * 隐藏第i个之后的所有元素
         * @param {number} i 隐藏第i个之后的所有元素
         */
        hide: function (i) {
            const length = this.children.length;
            for (; i < length; i++) {
                View.show(this.children[i], false);
            }
        }

    };
    /**
     * 
     * @param {HTMLElement} targetElement 
     * @param {boolean} value 
     */
    View.show = function (targetElement, value) {
        if (value) {
            targetElement.removeAttribute(HIDE_ATTRIBUTE);
        } else {
            targetElement.setAttribute(HIDE_ATTRIBUTE, true);
        }
    };

}(window.PuSet || {}));