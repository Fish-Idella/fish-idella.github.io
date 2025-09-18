/**
 * 视图解释器模块 - 用于创建和管理视图模板，并将数据动态展示到DOM中
 * 支持模板定义、数据绑定、动态渲染和Shadow DOM
 */
const Interpreter = (function () {
    "use strict";

    // 常量定义
    const HIDE_ATTRIBUTE = "v-hide";              // 用于隐藏元素的属性名
    const LENGTH_PROPERTY = "length";            // 数组长度属性名
    const HOST_CLASS_NAME = "template-layer-host";
    const DEFAULT_TEMPLATE_INSTANCE_NAME = Symbol("defaultTemplateInstanceName"); // 默认模板实例名称
    const DEFAULT_NAMESPACE = "default"; // 默认命名空间

    /**
     * 创建类型映射对象，用于类型检测
     * @example
     * Types = { Boolean: "boolean", Number: "number", ... }
     */
    const Types = Object.freeze("Boolean Number String Function Array Date RegExp Object Error Symbol BigInt Map Promise Set".split(" ").reduce((e, t) => {
        const r = t.toLowerCase();
        Object.defineProperty(e, t, { value: r, enumerable: !0, writable: !1 });
        return Object.defineProperty(e, `[object ${t}]`, { value: r, enumerable: !1, writable: !1 }), e
    }, Object.create({
        type: function (e) {
            if (null == e) return String(e);
            const t = typeof e;
            if (t === this.Object || t === this.Function) {
                const t = this.toString.call(e);
                return this.hasOwnProperty(t) ? this[t] : this.Object
            }
            return t
        }
    })));

    /**
     * 初始化隐藏元素的样式
     * 添加全局样式规则，使带有v-hide属性的元素隐藏
     */
    if (document.querySelector('style.v-hide') === null) {
        const styleElement = document.createElement("style");
        styleElement.className = HIDE_ATTRIBUTE;
        styleElement.innerHTML = `[${HIDE_ATTRIBUTE}] {display: none !important;}`;
        document.head.appendChild(styleElement);
    }

    /**
     * 空函数，用作默认回调
     * @param {Element} target - 目标元素
     * @param {*} settings - 保存的设置
     * @param {*} options - 设置相关的属性
     */
    const empty = function (target, settings, options) { };

    /**
     * 检查对象是否为函数
     * @param {*} obj - 要检查的对象
     * @returns {boolean} - 如果是函数返回true，否则返回false
     */
    const isFunction = function isFunction(obj) {
        return Types.Function === typeof obj && Types.Number !== typeof obj.nodeType;
    };

    /**
     * 创建链式类 - 将对象转换为类并添加额外属性
     * @param {Object} obj - 原型对象
     * @param {Function} [obj.constructor] - 原型对象
     * @param {Object} props - 要添加到类的静态属性
     * @returns {Function} - 返回构造函数
     */
    const blockChainClass = function blockChainClass(obj, props) {
        return Object.assign((obj.constructor.prototype = obj).constructor, props);
    };

    const host = document.createElement("div");
    host.className = HOST_CLASS_NAME;

    /**
     * View类 - 表示一个视图模板
     * 管理模板的DOM结构、样式和初始化逻辑
     */
    const View = blockChainClass({
        name: "",                   // 视图名称
        exec: function () { },      // 视图初始化执行函数
        cachedElements: null,       // 缓存的DOM元素

        /**
         * View构造函数
         * @param {string} name - 视图名称
         * @param {Node} node - 视图节点
         * @param {HTMLStyleElement} style - 视图样式
         * @param {Function} handler - 视图初始化处理函数
         */
        constructor: function View(name, node, style, handler) {
            this.name = name;
            this.exec = isFunction(handler) ? handler : empty;
            this.cachedElements = [style, node].filter(Boolean); // 过滤掉不存在的元素
        },

        /**
         * 初始化视图
         * @param {Boolean} is - 非 Shadow 模式
         * @param {Function} handler - 初始化回调函数，接收root和view参数
         * @returns {ShadowRoot} - 返回Shadow DOM根节点
         */
        init: function init(is = false, handler) {
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
    });

    /**
     * 合并数组 - 将源数组与目标数组合并
     * @param {Array} arr - 目标数组
     * @param {Array|Object} options - 源数组或对象
     * @returns {Array} - 合并后的数组
     */
    const merge = function (arr, options) {
        if (options && Array.isArray(arr)) {
            const values = (Array.isArray(options)) ? options : Object.values(options);
            values.forEach(value => arr.push(value));
        }
        return arr;
    };

    /**
     * ViewManager类 - 管理视图与数据的绑定
     * 处理数据变化时的视图更新逻辑
     */
    const ViewManager = blockChainClass({
        selector: "",               // 子元素选择器
        children: null,             // 子元素集合
        insert: null,               // 新元素插入位置
        isInsert: false,            // 是否设置了插入位置
        isFunction: false,          // 模板是否为函数类型
        hidden: false,              // 初始化后是否隐藏元素
        hasLayout: false,           // 是否有自定义布局函数
        source: null,               // 原始数据源

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
        constructor: function ViewManager(options) {
            const vm = Object.assign(this, options);

            // 初始化子元素集
            this.children = merge([], vm.selector ? vm.target.querySelectorAll(vm.selector) : vm.children);

            // 设置插入位置
            if (vm.insert && Types.String === typeof vm.insert) {
                this.insert = vm.target.querySelector(vm.insert);
            }
            this.isInsert = vm.insert instanceof HTMLElement;
            this.hasLayout = isFunction(vm.layout);

            const isArray = Array.isArray(options.data);
            const hasResize = isFunction(vm.onresize);
            const hasTemplate = vm.initializeTemplate();

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
                    let node = vm.target, index = -1, isLengthProperty = false;
                    if (hasTemplate) {
                        if (isArray) {
                            if (LENGTH_PROPERTY === property) {
                                isLengthProperty = true;
                            } else {
                                index = property;
                                node = vm.getChild(property, value.type);
                                isLengthProperty = false;
                            }
                        } else {
                            index = Object.keys(target).indexOf(property);
                            node = vm.getChild(index, value.type);
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
                                for (let length = vm.children.length, i = value; i < length; i++) {
                                    Interpreter.show(vm.children[i], false); // 隐藏溢出的元素
                                }
                                if (hasResize) {
                                    vm.onresize(vm.target, value, property); // 调用长度变化回调
                                }
                            } else {
                                Interpreter.show(params.node, true); // 显示元素
                                if (vm.hasLayout) {
                                    // 使用自定义布局函数更新视图
                                    vm.layout(params.node, value, property, Number(params.index));
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
                    Interpreter.show(vm.children[index], false); // 隐藏被删除的元素
                    return Reflect.deleteProperty(target, property);
                },
            };

            this.source = options.data ?? {}; // 数据源
            this.data = new Proxy(vm.source, validator); // 创建数据代理

            if (!vm.hidden) {
                vm.update(vm.source); // 初始化视图
            }

            if (isArray && hasResize) {
                // 调用数组长度变化回调
                vm.onresize(vm.target, vm.data[LENGTH_PROPERTY], LENGTH_PROPERTY);
            }
        },

        getChildAt: function (i) {
            return this.children[i];
        },

        /**
         * 初始化模板
         * @returns {boolean} - 模板是否有效
         */
        initializeTemplate: function () {
            if (this.isFunction = isFunction(this.template)) {
                return true; // 模板是函数类型
            } else {
                const div = document.createElement("div");
                if (Types.String === typeof this.template) {
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
        },

        /**
         * 获取模板实例
         * @param {number} index - 位置索引
         * @param {string} type - 类型
         * @returns {Element|ShadowRoot} - 模板实例
         */
        getTemplateInstance: function (index, type) {
            return this.isFunction ? this.template(index, type) : this.template.cloneNode(true);
        },

        /**
         * 获取子元素，超出范围则创建新实例
         * @param {number} index - 位置索引
         * @param {string} type - 类型9
         * @returns {Element} - 子元素
         */
        getChild: function (index, type) {
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
        },

        /**
         * 更新数据
         * @param {Object|Array} data - 新数据
         */
        update: function (data) {
            Object.assign(this.data, data); // 使用代理对象更新数据
        }
    });

    /**
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
    const getNamespaceMap = function (namespace = DEFAULT_NAMESPACE) {
        if (!TEMPLATE_INSTANCES.has(namespace)) {
            TEMPLATE_INSTANCES.set(namespace, new Map());
        }
        return TEMPLATE_INSTANCES.get(namespace);
    };

    /**
     * 主解释器类
     * 提供对外接口，用于创建和管理视图
     */
    const Interpreter = blockChainClass({
        /**
         * 创建ViewManager实例
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
         * @returns {ViewManager} - ViewManager实例
         */
        constructor: function Interpreter(options) {
            return new ViewManager(options);
        }
    }, {
        /**
         * 设置模板
         * @param {string} name - 模板名称
         * @param {Node} node - 模板节点
         * @param {HTMLStyleElement} style - 模板样式
         * @param {Function} handler - 模板初始化处理函数
         * @param {string} [namespace] - 命名空间，可选
         */
        set(name, node, style, handler, namespace = DEFAULT_NAMESPACE) {
            const namespaceMap = getNamespaceMap(namespace);
            namespaceMap.set(name, new View(name, node, style, handler));
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
            return TEMPLATE_INSTANCES.has(namespace) ? Array.from(TEMPLATE_INSTANCES.get(namespace).keys()) : null;
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

                const funcName = Interpreter.name;

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

                    let handler = empty;

                    // 处理脚本
                    if (script && script.innerText) {
                        try {
                            // 执行模板中的脚本，传入Interpreter作为参数
                            handler = (new Function(funcName, script.innerText)).call(view, Interpreter);
                        } catch (err) {
                            console.error(`执行模板 ${node.id || '[未命名]'} 脚本时出错:`, err);
                            // 可以选择跳过当前模板或使用默认处理器
                            handler = empty;
                        }
                    }

                    // 注册模板到指定命名空间
                    Interpreter.set(node.id, view, style, handler, namespace);
                }

                return nodeList;
            } catch (error) {
                console.error("加载模板时发生错误:", error);
                // 这里可以添加额外的错误处理逻辑，如发送错误报告
                throw error; // 将错误继续抛出，由调用者决定如何处理
            }
        },

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
        }
    });

    return Interpreter;
}());