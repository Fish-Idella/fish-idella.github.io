const PuSet = (function () {
    "use strict";

    // 版本信息
    const version = "3.0.0";

    // 缓存常用引用
    const document = window.document;
    const HIDE_ATTRIBUTE = "v-hide";              // 用于隐藏元素的属性名

    /**
     * 初始化隐藏元素的样式
     * 添加全局样式规则，使带有v-hide属性的元素隐藏
     */
    if (document.querySelector('style.v-hide') === null) {
        const styleElement = document.createElement("style");
        styleElement.className = HIDE_ATTRIBUTE;
        styleElement.innerHTML = `.hide, [${HIDE_ATTRIBUTE}] {display: none !important;}`;
        document.head.appendChild(styleElement);
    }

    const indexOf = Array.prototype.indexOf;
    const push = Array.prototype.push;
    const toString = Object.prototype.toString;
    const getProto = Object.getPrototypeOf;
    const hasOwn = Object.prototype.hasOwnProperty;
    const fnToString = hasOwn.toString;
    const ObjectFunctionString = fnToString.call(Object);

    const rhtmlSuffix = /HTML$/i;

    const returnTrue = function returnTrue() {
        return true;
    };

    const returnFalse = function returnFalse() {
        return false;
    };

    // 类型映射表 - 创建类型检测工具
    const TYPES = new function TYPES() {
        "Boolean Number String Function Array Date RegExp Object Error Symbol BigInt Map Promise Set"
            .split(" ")
            .forEach((value) => {
                // 同时设置简写和完整类型名称的映射
                this[`[object ${value}]`] = this[value] = value.toLowerCase();
            });
    };

    // 函数类型检测（排除DOM节点和HTML集合）
    const isFunction = function isFunction(obj) {
        return TYPES.Function === typeof obj &&
            TYPES.Number !== typeof obj.nodeType &&
            TYPES.Function !== typeof obj.item;
    };

    // 窗口对象检测
    const isWindow = function isWindow(obj) {
        return obj != null && obj === obj.window;
    };

    // 精确类型检测函数
    const toType = function toType(test) {
        // 处理 null 和 undefined
        if (null == test) return String(test);

        const type = typeof test;
        // 对象和函数需要进一步检测具体类型
        if (type === TYPES.Object || type === TYPES.Function) {
            const key = toString.call(test);
            return TYPES.hasOwnProperty(key) ? TYPES[key] : TYPES.Object;
        }
        return type;
    };

    // 类数组对象检测
    const isArrayLike = function isArrayLike(obj) {
        // 如果是数组直接返回true
        if (PuSetFactory.isArray(obj)) {
            return true;
        }

        const length = !!obj && "length" in obj && obj.length;
        const type = toType(obj);

        // 排除函数和窗口对象
        if (isFunction(obj) || isWindow(obj)) {
            return false;
        }

        // 检测是否为类数组结构
        return type === "array" ||
            length === 0 ||
            TYPES.Number === typeof length && length > 0 && (length - 1) in obj;
    };

    // 核心节点列表类，继承自Array
    const PuSetConstructor = class PuSet extends Array {
        constructor(...args) {
            super(...args);
        }

        // 创建空实例的静态方法
        static emptyInstance() {
            return new PuSetConstructor();
        }

        // DOM就绪回调方法
        ready(fn) {
            readyPromise.then(() => fn(PuSetFactory)).catch(console.error);
            return this;
        }

        // 堆栈管理：保存当前选择集并返回新选择集
        pushStack(elems) {
            const ret = PuSetFactory.merge(PuSetConstructor.emptyInstance(), elems);
            // 保存前一个对象引用，支持链式操作的回溯
            ret.prevObject = this;
            return ret;
        }

        item(num) {
            // Return just the one element from the set
            return num < 0 ? this[num + this.length] : this[num];
        }

        even() {
            return this.pushStack(PuSetFactory.grep(this, function (_elem, i) {
                return (i + 1) % 2;
            }));
        }

        odd() {
            return this.pushStack(PuSetFactory.grep(this, function (_elem, i) {
                return i % 2;
            }));
        }

        eq(i) {
            const len = this.length,
                j = +i + (i < 0 ? len : 0);
            return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
        }

        // 查找后代元素
        find(selector) {
            let arr = [];
            if (selector && TYPES.String === typeof selector) {
                this.forEach(function (target) {
                    // 合并查询结果
                    PuSetFactory.merge(arr, target.querySelectorAll(selector));
                });
            }
            return this.pushStack(arr);
        }

        // 返回到前一个选择集
        end() {
            return this.prevObject || PuSetConstructor.emptyInstance();
        }

        // 过滤当前选择集
        filter(selector) {
            return this.pushStack(winnow(this, selector || [], false));
        }

        // 排除匹配元素
        not(selector) {
            return this.pushStack(winnow(this, selector || [], true));
        }

        // 检测当前选择集是否匹配选择器
        is(selector) {
            return !!winnow(
                this,
                TYPES.String === typeof selector ? rootPuSet.find(selector) : selector || [],
                false
            ).length;
        }
    }

    // 根选择集（document）
    const rootPuSet = new PuSetConstructor(document);

    // 过滤函数：统一处理filter和not的逻辑
    const winnow = function winnow(elements, qualifier, not) {
        // 函数选择器处理
        if (isFunction(qualifier)) {
            return PuSetFactory.grep(elements, function (elem, i) {
                return !!qualifier.call(elem, i, elem) !== not;
            });
        }

        // 单个DOM元素匹配
        if (qualifier.nodeType) {
            return PuSetFactory.grep(elements, function (elem) {
                return (elem === qualifier) !== not;
            });
        }

        // 元素数组匹配
        if (TYPES.String !== typeof qualifier) {
            return PuSetFactory.grep(elements, function (elem) {
                return (indexOf.call(qualifier, elem) > -1) !== not;
            });
        }

        // 选择器字符串匹配
        const selector = rootPuSet.find(qualifier);
        return PuSetFactory.grep(elements, function (element) {
            return selector.indexOf(element, 0) >= 0;
        }, not);
    };

    // 主函数定义
    const PuSetFactory = Object.assign(function PuSet(selector) {
        // 处理空选择器
        if (!selector) {
            return PuSetConstructor.emptyInstance();
        }

        // 函数选择器：DOM就绪回调
        if (isFunction(selector)) {
            return rootPuSet.ready(selector);
        }

        // 字符串选择器：查询DOM
        if (TYPES.String === typeof selector) {
            return rootPuSet.find(selector);
        }

        // 单个DOM元素：直接包装
        if (selector.nodeType) {
            return new PuSetConstructor(selector);
        }

        // 其他类型：转换为数组形式
        return PuSetFactory.makeArray(selector, PuSetConstructor.emptyInstance());
    }, {
        // 静态属性：版本号
        version: version,

        // 就绪状态标志
        isReady: returnFalse,

        /**
         * 显示/隐藏元素
         * @param {Element} targetElement - 目标元素
         * @param {boolean} value - true显示，false隐藏
         */
        show(targetElement, value) {
            if (value) {
                targetElement.removeAttribute(HIDE_ATTRIBUTE); // 移除隐藏属性
                targetElement.classList.remove("hide");
            } else {
                targetElement.setAttribute(HIDE_ATTRIBUTE, HIDE_ATTRIBUTE); // 添加隐藏属性
                targetElement.classList.add("hide");
            }
            return targetElement;
        },

        isPlainObject: function (obj) {
            let proto, Ctor;

            // Detect obvious negatives
            // Use toString instead of jQuery.type to catch host objects
            if (!obj || toString.call(obj) !== "[object Object]") {
                return false;
            }

            proto = getProto(obj);

            // Objects with no prototype (e.g., `Object.create( null )`) are plain
            if (!proto) {
                return true;
            }

            // Objects with prototype are plain iff they were constructed by a global Object function
            Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
            return TYPES.Function === typeof Ctor && ObjectFunctionString === fnToString.call(Ctor);
        },

        isEmptyObject: function (obj) {
            for (const name in obj) {
                return false;
            }
            return true;
        },

        isFunction: isFunction,

        isWindow: isWindow,

        // 数组检测（兼容老版本浏览器）
        isArray: Array.isArray || function (obj) {
            return TYPES.Array === toType(obj);
        },

        isXMLDoc: function (elem) {
            const namespace = elem && elem.namespaceURI,
                docElem = elem && (elem.ownerDocument || elem).documentElement;

            // Assume HTML when documentElement doesn't yet exist, such as inside
            // document fragments.
            return !rhtmlSuffix.test(namespace || docElem && docElem.nodeName || "HTML");
        },

        isNumeric: function (obj) {

            // As of jQuery 3.0, isNumeric is limited to
            // strings and numbers (primitives or objects)
            // that can be coerced to finite numbers (gh-2662)
            const type = toType(obj);
            return (type === TYPES.Number || type === TYPES.String) &&

                // parseFloat NaNs numeric-cast false positives ("")
                // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
                // subtraction forces infinities to NaN
                !isNaN(obj - parseFloat(obj));
        },

        // 数组合并方法（兼容类数组对象）
        merge: function merge(first, second) {
            const len = +second.length;
            let j = 0;
            let i = first.length;

            for (; j < len; j++) {
                first[i++] = second[j];
            }

            first.length = i;
            return first;
        },

        // 数组过滤方法
        grep: function grep(elems, callback, invert) {
            let callbackInverse;
            const matches = [];
            let i = 0;
            const length = elems.length;
            const callbackExpect = !invert;

            for (; i < length; i++) {
                callbackInverse = !callback(elems[i], i);
                if (callbackInverse !== callbackExpect) {
                    matches.push(elems[i]);
                }
            }

            return matches;
        },

        each: function (obj, callback) {
            let length, i = 0;

            if (isArrayLike(obj)) {
                length = obj.length;
                for (; i < length; i++) {
                    if (callback(obj[i], i) === false) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    if (callback(obj[i], i) === false) {
                        break;
                    }
                }
            }

            return obj;
        },

        // 转换为数组的方法
        makeArray: function makeArray(arr, results) {
            const ret = results || [];

            if (arr != null) {
                if (isArrayLike(Object(arr))) {
                    // 处理类数组对象和字符串
                    PuSetFactory.merge(ret, TYPES.String === typeof arr ? [arr] : arr);
                } else {
                    // 处理单个元素
                    push.call(ret, arr);
                }
            }
            return ret;
        },
        /**
         * 下载单个文件
         * @param {string|blob} url 文件数据
         * @param {string} filename 文件名
         */
        download: function (url, filename = "filename") {
            const save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
            save_link.href = url;
            save_link.download = filename;
            save_link.dispatchEvent(new MouseEvent('click', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            }));
        },
    });

    // DOM就绪状态管理的Promise
    const readyPromise = new Promise(function (resolve) {
        // DOM就绪检测完成回调
        function completed() {
            document.removeEventListener("DOMContentLoaded", completed);
            window.removeEventListener("load", completed);
            resolve();
        }

        // 检查文档是否已经就绪
        if (document.readyState === "complete" ||
            (document.readyState !== "loading" && !document.documentElement.doScroll)) {
            // 异步处理以确保脚本有机会延迟ready
            window.setTimeout(resolve);
        } else {
            // 添加事件监听
            document.addEventListener("DOMContentLoaded", completed);
            window.addEventListener("load", completed);
        }
    }).then(function () {
        // 设置就绪状态标志
        PuSetFactory.isReady = returnTrue;
    });


    const rnothtmlwhite = (/[^\x20\t\r\n\f]+/g);
    const rtypenamespace = /^([^.]*)(?:\.(.+)|)/;
    const expando = Symbol("puset_event_data");

    function ensureObjectProperty(targetObject, propertyKey, cotr = Object) {
        // 更精确地检查属性是否存在，而非仅检查真值
        if (Object.hasOwn(targetObject, propertyKey)) {
            return targetObject[propertyKey];
        }

        // 提前进行可扩展性检查，符合失败优先原则
        if (!Object.isExtensible(targetObject)) {
            return null;
        }

        // 创建新属性并返回
        return targetObject[propertyKey] = new cotr();
    }

    // 检查浏览器是否支持Element.prototype.matches方法
    const hasMatches = "function" === typeof Element.prototype.matches;

    // 检查浏览器是否支持Element.prototype.closest方法
    const hasClosest = "function" === typeof Element.prototype.closest;

    // 创建自定义匹配函数，用于判断元素是否匹配选择器
    const customMatches = function customMatches(target, selector) {

        // 如果支持matches方法，则直接使用它
        if (hasMatches) return item => item !== target && item.matches && item.matches(selector);

        // 如果支持closest方法，则直接使用它
        if (hasClosest) return item => item !== target && item.closest && item === item.closest(selector);

        // 备选方案：通过查询所有匹配元素创建集合进行判断
        const children = new Set(target.querySelectorAll(selector));
        return item => item && children.has(item);
    };
    const getComposedPath = function getComposedPath(target, event) {
        let path, node;
        if (event.composedPath) { path = Array.from(event.composedPath()); }
        else if (event.path) { path = Array.from(event.path); }
        else for (node = event.target, path = []; node = node.parentNode;) { path.push(node); if (node === target) break; }
        return path.slice(0, 1 + path.indexOf(target));
    };

    Object.assign(PuSetFactory, {

        /**
         * 创建防抖函数
         * @param {number} wait - 延迟时间（毫秒）
         * @param {Function} handler - 回调函数
         * @returns {(event: Event) => void} - 事件处理函数
         */
        debounce(wait, handler) {
            let timeout;
            return function listener(event) {
                clearTimeout(timeout);
                timeout = setTimeout(() => handler.call(this, event, listener), wait);
            }
        },

        /**
         * 创建节流函数
         * @param {number} delay 节流的间隔时间（毫秒）
         * @param {Function} handler - 回调函数
         * @returns {(event: Event) => void} - 事件处理函数
         */
        throttle(delay, handler) {
            let lastTime = 0;
            return function listener(event) {
                const now = Date.now();
                // 到达间隔时间
                if (now - lastTime >= delay) {
                    handler.call(this, event, listener);
                    lastTime = now; // 更新上次执行时间
                }
            }
        },

        /**
         * 创建事件委托
         * @param {string} selector - 事件代理的子元素选择器
         * @param {Function} handler - 回调函数
         * @returns {(event: Event) => void} - 事件处理函数
         */
        delegation: function delegation(selector, handler) {
            if ("function" !== typeof handler) {
                throw new TypeError("事件处理函数必须是一个函数");
            }

            const stringSelector = String(selector);

            // 返回实际的事件监听器
            return function listener(event) {
                // 获取事件传播路径
                const path = getComposedPath(this, event);
                // 从路径中筛选出匹配选择器的元素
                const inner = path.filter(customMatches(this, stringSelector));
                // 对每个匹配元素调用处理函数，并绑定this为当前元素
                inner.forEach(child => handler.call(child, event, listener));
            }
        }
    });

    const EventOptions = {
        createListener: function createListener(type, handles) {
            return handles.listener = function listener(event) {
                EventOptions.dispatch(this, event, type, handles);
            };
        },
        // 触发事件
        dispatch: function dispatch(node, event, type, handles) {
            const entrus = function entrus(node, obj, handler) {
                // 验证命名空间
                if (!obj.rnamespace || obj.namespace === false || obj.rnamespace.test(obj.namespace)) {
                    handler.call(node, event, obj);
                }
            };
            PuSetFactory.each(handles, function (handle) {
                const obj = Object.assign({}, handle, { type: type, target: node });
                const handler = handle.handler;
                if ("string" === typeof handle.selector) {
                    // 事件托管处理
                    getComposedPath(node, event)
                        .filter(customMatches(node, handle.selector))
                        .forEach(chlid => entrus(chlid, obj, handler));
                } else {
                    // 默认事件处理
                    entrus(node, obj, handler);
                }
            });
        },
        add: function add(node, types, selector, handler) {
            const data = ensureObjectProperty(node, expando, Object);

            // Only attach events to objects that accept data
            if (data === null) return;

            let t, type, tmp, namespaces;

            // Handle multiple events separated by a space
            types = (types || "").match(rnothtmlwhite) || [""];
            t = types.length;
            while (t--) {
                tmp = rtypenamespace.exec(types[t]) || [];
                type = tmp[1];
                namespaces = (tmp[2] || "").split(".").sort();

                // There *must* be a type, no attaching namespace-only handlers
                if (!type) continue;

                const handles = ensureObjectProperty(data, type, Array);

                // TODO: 如果是新添加的事件，则添加到事件列表中
                if (handles.length === 0) {
                    const listener = EventOptions.createListener(type, handles);
                    if (node.addEventListener) {
                        node.addEventListener(type, listener);
                    }
                }

                handles.push({
                    selector,
                    handler: handler,
                    namespace: namespaces.join(".")
                });

            }

        },
        remove: function remove(node, types, selector, handler) {
            const data = ensureObjectProperty(node, expando, Object);

            // Only attach events to objects that accept data
            if (data === null) return;

            let t, type, tmp, namespaces;

            // Handle multiple events separated by a space
            types = (types || "").match(rnothtmlwhite) || [""];
            t = types.length;
            while (t--) {
                tmp = rtypenamespace.exec(types[t]) || [];
                type = tmp[1];
                namespaces = (tmp[2] || "").split(".").sort();

                // Unbind all events (on this namespace, if provided) for the element
                if (!type) {
                    Object.keys(data).forEach(type => remove(node, type + types[t], selector, handler));
                    continue;
                }

                tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");

                const handles = ensureObjectProperty(data, type, Array);
                let j = handles.length;
                while (j--) {
                    const handle = handles[j];
                    if ((!tmp || tmp.test(handle.namespace)) &&
                        (!selector || selector === handle.selector || selector === "**" && handle.selector) &&
                        (!handler || handler === handle.handler)) {
                        handles.splice(j, 1);
                    }
                }

                if (handles.length == 0) {
                    // 移除事件监听
                    if (node.removeEventListener) {
                        node.removeEventListener(type, handles.listener);
                    }
                    Reflect.deleteProperty(data, type);
                }
            }
        },
        action: function action(elements, types, selector, callback, method) {
            if ("object" === typeof types) {
                for (const type in types) {
                    action(elements, type, selector, types[type], method);
                }
                return elements;
            }

            if ("function" === typeof selector) {
                callback = selector;
                selector = null;
            }

            if (false === callback) {
                callback = returnFalse;
            } else if (!callback) {
                return elements;
            }

            const handler = (method === 1) ? function autoremove(event, options) {
                EventOptions.remove(options.target, options.type, options.selector, options.handler);
                return callback.call(this, event, options);
            } : callback;

            const operation = method >= 1 ? EventOptions.add : EventOptions.remove;
            return PuSetFactory.each(elements, function (target) {
                operation(target, types, selector, handler);
            });
        }
    };

    Object.assign(PuSetConstructor.prototype, {
        on: function (types, selector, callback) {
            return EventOptions.action(this, types, selector, callback, 2);
        },
        one: function (types, selector, callback) {
            return EventOptions.action(this, types, selector, callback, 1);
        },
        off: function (types, selector, callback) {
            return EventOptions.action(this, types, selector, callback, 0);
        }
    });


    const LENGTH_PROPERTY = "length";            // 数组长度属性名
    const HOST_CLASS_NAME = "template-layer-host";
    const DEFAULT_TEMPLATE_INSTANCE_NAME = Symbol("defaultTemplateInstanceName"); // 默认模板实例名称
    const DEFAULT_NAMESPACE = "default"; // 默认命名空间
    const host = document.createElement("div");
    host.className = HOST_CLASS_NAME;

    /**
     * View类 - 表示一个视图模板
     * 管理模板的DOM结构、样式和初始化逻辑
     */
    class View {
        name = "";                   // 视图名称
        exec = null;                 // 视图初始化执行函数
        cachedElements = null;       // 缓存的DOM元素

        /**
         * View构造函数
         * @param {string} name - 视图名称
         * @param {Node} node - 视图节点
         * @param {HTMLStyleElement} style - 视图样式
         * @param {Function} handler - 视图初始化处理函数
         */
        constructor(name, node, style, handler) {
            this.name = name;
            this.exec = isFunction(handler) ? handler : returnFalse;
            this.cachedElements = [style, node].filter(Boolean); // 过滤掉不存在的元素
        }

        /**
         * 初始化视图
         * @param {Boolean} is - 非 Shadow 模式
         * @param {Function} handler - 初始化回调函数，接收root和view参数
         * @returns {ShadowRoot} - 返回Shadow DOM根节点
         */
        init(is = false, handler) {
            const clone = host.cloneNode();
            const root = is ? clone : clone.attachShadow({ mode: 'open' });
            // 克隆缓存的元素并添加到Shadow DOM
            this.cachedElements.forEach(element => root.appendChild(element.cloneNode(true)));
            try {
                // 执行初始化回调
                if (isFunction(handler)) handler(root, this);
            } finally {
                return root;
            }
        }
    }

    /**
     * ViewManager类 - 管理视图与数据的绑定
     * 处理数据变化时的视图更新逻辑
     */
    class ViewManager {
        selector = "";               // 子元素选择器
        children = null;             // 子元素集合
        insert = null;               // 新元素插入位置
        isInsert = false;            // 是否设置了插入位置
        isFunction = false;          // 模板是否为函数类型
        hidden = false;              // 初始化后是否隐藏元素
        hasLayout = false;           // 是否有自定义布局函数
        source = null;               // 原始数据源

        /**
         * ViewManager构造函数
         * @param {Object} options - 配置选项
         * @param {HTMLElement} options.target - 指定元素
         * @param {string} [options.selector] - 子元素选择器
         * @param {HTMLCollection} [options.children] - 子元素集
         * @param {string|HTMLElement|Function} [options.template] - 模板
         * @param {string|HTMLElement} [options.insert] - 插入位置
         * @param {Object|Array} [options.data] - 数据源
         * @param {boolean} [options.hidden] - 是否隐藏
         * @param {Function} [options.layout] - 布局函数
         * @param {Function} [options.onresize] - 数组长度变化回调
         */
        constructor(options) {
            const instance = Object.assign(this, options);

            // 初始化子元素集
            instance.children = PuSetFactory.makeArray(instance.selector
                ? instance.target.querySelectorAll(instance.selector)
                : instance.children);

            // 设置插入位置
            if (instance.insert && TYPES.String === typeof instance.insert) {
                instance.insert = instance.target.querySelector(instance.insert);
            }
            instance.isInsert = instance.insert instanceof HTMLElement;
            instance.hasLayout = isFunction(instance.layout);

            const isArray = PuSetFactory.isArray(options.data);
            const hasResize = isFunction(instance.onresize);
            const hasTemplate = instance.initializeTemplate();

            /**
             * 数据验证器 - 用于Proxy代理对象
             * 监听数据变化并更新视图
             */
            const validator = {
                /**
                 * 获取节点参数
                 * @param {Object} target - 目标对象
                 * @param {string|number} property - 属性名或索引
                 * @param {*} value - 属性值
                 * @returns {Object} - 包含node、index和isLengthProperty的对象
                 */
                getNodeParams: function getNodeParams(target, property, value) {
                    let node = instance.target, index = -1, isLengthProperty = false;
                    if (hasTemplate) {
                        if (isArray) {
                            if (LENGTH_PROPERTY === property) {
                                isLengthProperty = true;
                            } else {
                                index = property;
                                node = instance.getChild(property, value.type);
                                isLengthProperty = false;
                            }
                        } else {
                            index = Object.keys(target).indexOf(property);
                            node = instance.getChild(index, value.type);
                        }
                    }
                    return { node, index, isLengthProperty }
                },

                /**
                 * 设置属性拦截器
                 * @param {Object} target - 目标对象
                 * @param {string|number} property - 属性名或索引
                 * @param {*} value - 属性值
                 * @param {Object} receiver - 接收者
                 * @returns {boolean} - 操作结果
                 */
                set: function (target, property, value, receiver) {
                    try {
                        const params = this.getNodeParams(target, property, value);
                        // 使用requestAnimationFrame优化UI更新性能
                        requestAnimationFrame(function layoutChange() {
                            if (params.isLengthProperty) {
                                // 处理数组长度变化
                                for (let length = instance.children.length, i = value; i < length; i++) {
                                    PuSetFactory.show(instance.children[i], false); // 隐藏溢出的元素
                                }
                                if (hasResize) {
                                    instance.onresize(instance.target, value, property); // 调用长度变化回调
                                }
                            } else {
                                PuSetFactory.show(params.node, true); // 显示元素
                                if (instance.hasLayout) {
                                    // 使用自定义布局函数更新视图
                                    instance.layout(params.node, value, property, Number(params.index));
                                }
                            }
                        });
                    } catch (error) {
                        console.error(error.message, options);
                    } finally {
                        return Reflect.set(target, property, value, receiver);
                    }
                },

                /**
                 * 删除属性拦截器
                 * @param {Object} target - 目标对象
                 * @param {string|number} property - 属性名或索引
                 * @returns {boolean} - 操作结果
                 */
                deleteProperty: function (target, property) {
                    const index = isArray ? property : Object.keys(target).indexOf(property);
                    PuSetFactory.show(instance.children[index], false); // 隐藏被删除的元素
                    return Reflect.deleteProperty(target, property);
                },
            };

            instance.source = options.data ?? {}; // 数据源
            instance.data = new Proxy(instance.source, validator); // 创建数据代理

            if (!instance.hidden) {
                instance.update(instance.source); // 初始化视图
            }

            if (isArray && hasResize) {
                // 调用数组长度变化回调
                instance.onresize(instance.target, instance.data[LENGTH_PROPERTY], LENGTH_PROPERTY);
            }

            return instance;
        }

        getChildAt(i) {
            return this.children[i];
        }

        /**
         * 初始化模板
         * @returns {boolean} - 模板是否有效
         */
        initializeTemplate() {
            if (this.isFunction = isFunction(this.template)) {
                return true; // 模板是函数类型
            } else {
                const div = document.createElement("div");
                if (TYPES.String === typeof this.template) {
                    // 从HTML字符串创建模板
                    div.innerHTML = this.template;
                    this.template = div.firstChild;
                } else if (!this.template) {
                    // 使用第一个子元素作为模板
                    this.template = this.children[0];
                }
                if (this.template instanceof HTMLElement) {
                    this.template = this.template.cloneNode(true); // 克隆模板
                    return true;
                } else {
                    this.template = div.cloneNode(true); // 使用空div作为模板
                }
            }
            return false;
        }

        /**
         * 获取模板实例
         * @param {number} index - 位置索引
         * @param {string} type - 类型
         * @returns {Element|ShadowRoot} - 模板实例
         */
        getTemplateInstance(index, type) {
            return this.isFunction ? this.template(index, type) : this.template.cloneNode(true);
        }

        /**
         * 获取子元素，超出范围则创建新实例
         * @param {number} index - 位置索引
         * @param {string} type - 类型9
         * @returns {Element} - 子元素
         */
        getChild(index, type) {
            let child = this.getChildAt(index);
            if (index >= this.children.length || index < 0) {
                // 创建新的子元素实例
                child = this.children[index] = this.getTemplateInstance(index, type);
                if (this.isInsert) {
                    this.target.insertBefore(child, this.insert); // 插入到指定位置
                } else {
                    this.target.appendChild(child); // 添加到末尾
                }
            }
            return child;
        }

        /**
         * 更新数据
         * @param {Object|Array} data - 新数据
         */
        update(data) {
            Object.assign(this.data, data); // 使用代理对象更新数据
        }
    };

    /**
     * Components
     * 模板实例管理器
     * 使用双层Map存储所有模板实例，外层为命名空间，内层为该命名空间下的模板
     */
    const TEMPLATE_INSTANCES = new Map([
        // 默认命名空间及其默认模板实例
        [DEFAULT_NAMESPACE, new Map([
            [DEFAULT_TEMPLATE_INSTANCE_NAME, new View(DEFAULT_TEMPLATE_INSTANCE_NAME, document.createElement('div'))]
        ])]
    ]);

    /**
     * 获取指定命名空间的模板Map，如果不存在则创建
     * @param {string} namespace - 命名空间
     * @returns {Map} - 模板Map
     */
    const getNamespaceMap = function getNamespaceMap(namespace = DEFAULT_NAMESPACE) {
        if (!TEMPLATE_INSTANCES.has(namespace)) {
            TEMPLATE_INSTANCES.set(namespace, new Map());
        }
        return TEMPLATE_INSTANCES.get(namespace);
    };

    Object.assign(PuSetFactory, {

        ViewManager(options) {
            return new ViewManager(options);
        },

        /**
         * 获取模板
         * @param {string} name - 模板名称
         * @param {string} [namespace] - 命名空间，可选
         * @returns {View} - 模板实例
         */
        get(name, namespace = DEFAULT_NAMESPACE) {
            const namespaceMap = getNamespaceMap(namespace);
            if (namespaceMap.has(name)) {
                return namespaceMap.get(name);
            }
            return TEMPLATE_INSTANCES.get(DEFAULT_NAMESPACE).get(DEFAULT_TEMPLATE_INSTANCE_NAME);
        },

        /**
         * 获取所有已存在的命名空间
         * @returns {string[]} - 命名空间数组
         */
        getNamespaces() {
            return Array.from(TEMPLATE_INSTANCES.keys());
        },

        /**
         * 删除指定命名空间
         * @param {string} [namespace=DEFAULT_NAMESPACE] - 要删除的命名空间
         * @returns {boolean} - 是否删除成功
         */
        removeNamespace(namespace = DEFAULT_NAMESPACE) {
            // 保护默认命名空间不被删除
            if (namespace === DEFAULT_NAMESPACE) return false;
            return TEMPLATE_INSTANCES.delete(namespace);
        },

        /**
         * 获取指定命名空间下的所有模板
         * @param {string} [namespace=DEFAULT_NAMESPACE] - 命名空间
         * @returns {string[]} - 模板数组
         */
        getTemplates(namespace = DEFAULT_NAMESPACE) {
            return TEMPLATE_INSTANCES.has(namespace)
                ? Array.from(TEMPLATE_INSTANCES.get(namespace).keys())
                : null;
        },

        /**
         * 从URL加载模板到指定命名空间
         * 模板文件应包含id为"puset-interpreter-template"的元素，其后的template元素将被加载
         * @param {string} url - 模板文件URL（必须同源）
         * @param {string} [namespace=DEFAULT_NAMESPACE] - 命名空间
         * @returns {Promise<NodeList>} - 包含模板节点的Promise
         * @warning 会执行模板中的脚本，建议仅加载可信来源的模板
         */
        async load(url, namespace = DEFAULT_NAMESPACE) {
            try {
                // 验证URL
                const testURL = new URL(url, window.location.href);
                if (testURL.origin !== window.location.origin) {
                    throw new Error("同源策略限制：不允许跨域加载资源");
                }

                // 发起请求
                const response = await fetch(testURL.href);

                // 检查HTTP状态码
                if (!response.ok) {
                    throw new Error(`HTTP请求失败：${response.status} ${response.statusText}`);
                }

                // 读取响应内容
                const text = await response.text();

                // 解析HTML文本
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const nodeList = doc.querySelectorAll('hr#puset-interpreter-template~template');

                // 检查是否找到模板
                if (nodeList.length === 0) {
                    throw new Error("未找到有效的模板元素");
                }

                const funcName = PuSetFactory.name;
                const namespaceMap = getNamespaceMap(namespace);

                // 处理每个模板
                for (const node of nodeList) {
                    const elements = { style: null, view: null, script: null };

                    // 分类处理模板中的子元素
                    for (const child of node.content.children) {
                        const name = child.nodeName.toLowerCase();
                        // 单一原则，重复新覆盖旧
                        elements[name in elements ? name : "view"] = child;
                    }

                    const { style, view, script } = elements;

                    // 验证视图元素
                    if (!view) {
                        console.warn(`模板 ${node.id || '[未命名]'} 缺少视图元素，已跳过`);
                        continue;
                    }

                    let handler = returnFalse;

                    // 处理脚本
                    if (script && script.innerText) {
                        try {
                            // 执行模板中的脚本，传入PuSetFactory作为参数
                            handler = (new Function(funcName, script.innerText)).call(view, PuSetFactory);
                        } catch (err) {
                            console.error(`执行模板 ${node.id || '[未命名]'} 脚本时出错:`, err);
                            // 可以选择跳过当前模板或使用默认处理器
                            handler = returnFalse;
                        }
                    }

                    // 注册模板到指定命名空间
                    namespaceMap.set(node.id, new View(node.id, view, style, handler));
                }

                return nodeList;
            } catch (error) {
                console.error("加载模板时发生错误:", error);
                // 这里可以添加额外的错误处理逻辑，如发送错误报告
                throw error; // 将错误继续抛出，由调用者决定如何处理
            }
        }
    });

    return PuSetFactory;
})();