/**
 * PuSet 核心模块 - 轻量级DOM操作/视图管理/组件化工具库（模仿jQuery核心设计）
 * 整体采用立即执行函数表达式(IIFE)封装，避免全局变量污染，最终暴露PuSetFactory作为核心对象
 */
const PuSet = (function () {
    "use strict"; // 启用严格模式，避免隐式错误

    // ===================== 基础常量定义 =====================
    const version = "3.0.0"; // 库版本号
    const document = window.document; // 缓存document对象，减少全局查找
    const HIDE_ATTRIBUTE = "v-hide"; // 隐藏元素的自定义属性名
    const LENGTH_PROPERTY = "length"; // 缓存length字符串，减少字面量创建

    // 注入隐藏元素的全局样式（确保只注入一次）
    if (document.querySelector("head>style.v-hide") === null) {
        const styleElement = document.createElement("style");
        styleElement.className = HIDE_ATTRIBUTE;
        // 隐藏规则：.hide类 或 带v-hide属性的元素强制隐藏
        styleElement.innerHTML = `.hide,[${HIDE_ATTRIBUTE}]{display:none!important}`;
        document.head.appendChild(styleElement)
    }

    // ===================== 原生方法缓存（性能优化） =====================
    const indexOf = Array.prototype.indexOf; // 数组indexOf方法
    const slice = Array.prototype.slice; // 数组slice方法
    const push = Array.prototype.push; // 数组push方法
    const toString = Object.prototype.toString; // 对象类型判断核心方法
    const getProto = Object.getPrototypeOf; // 获取对象原型
    const hasOwn = Object.prototype.hasOwnProperty; // 判断自有属性
    const fnToString = hasOwn.toString; // 函数toString方法（用于判断原生构造函数）
    const ObjectFunctionString = fnToString.call(Object); // Object构造函数的字符串特征
    const rhtmlSuffix = /HTML$/i; // 匹配HTML后缀的正则（用于判断XML文档）

    // 通用返回函数（减少函数创建开销）
    const returnTrue = function returnTrue() { return true };
    const returnFalse = function returnFalse() { return false };

    // ===================== 类型判断核心常量 =====================
    /**
     * 类型映射常量 - 统一类型判断的返回值格式
     * 支持的类型：Boolean/Number/String/Function/Array/Date/RegExp/Object/Error/Symbol/BigInt/Map/Promise/Set
     * 两种访问方式：
     * - TYPES.Function → "function"
     * - TYPES["[object Function]"] → "function"
     */
    const TYPES = new function Types() {
        const s = "Boolean Number String Function Array Date RegExp Object Error Symbol BigInt Map Promise Set".split(" ");
        for (const value of s) {
            this[`[object ${value}]`] = this[value] = value.toLowerCase()
        }
    };

    // ===================== 核心类型判断工具函数 =====================
    /**
     * 判断是否为函数（排除DOM节点的特殊"函数"属性）
     * @param {*} obj - 待检测对象
     * @returns {boolean} 是否为有效函数
     */
    const isFunction = function isFunction(obj) {
        return TYPES.Function === typeof obj &&
            TYPES.Number !== typeof obj.nodeType && // 排除DOM节点（如element.nodeType是数字）
            TYPES.Function !== typeof obj.item; // 排除类数组对象的item方法
    };

    /**
     * 判断是否为window对象
     * @param {*} obj - 待检测对象
     * @returns {boolean} 是否为window对象
     */
    const isWindow = function isWindow(obj) {
        return obj != null && obj === obj.window;
    };

    /**
     * 获取对象的精准类型（比typeof更准确）
     * @param {*} test - 待检测对象
     * @returns {string} 小写的类型名（如"array"/"function"/"object"）
     */
    const toType = function toType(test) {
        if (null == test) return String(test); // null/undefined直接返回字符串
        const type = typeof test;
        // 对于对象/函数类型，使用Object.prototype.toString做精准判断
        if (type === TYPES.Object || type === TYPES.Function) {
            const key = toString.call(test);
            return TYPES.hasOwnProperty(key) ? TYPES[key] : TYPES.Object;
        }
        return type; // 基础类型直接返回typeof结果
    };

    /**
     * 判断是否为类数组对象（可遍历的长度属性）
     * @param {*} obj - 待检测对象
     * @returns {boolean} 是否为类数组
     */
    const isArrayLike = function isArrayLike(obj) {
        // 数组直接返回true
        if (PuSetFactory.isArray(obj)) {
            return true;
        }
        // 存在length属性且不为空
        const length = !!obj && LENGTH_PROPERTY in obj && obj.length;
        const type = toType(obj);
        // 排除函数和window对象
        if (isFunction(obj) || isWindow(obj)) {
            return false;
        }
        // 判定规则：
        // 1. 类型是数组 | 2. length为0 | 3. length是正数且length-1存在于对象中
        return type === "array" ||
            length === 0 ||
            (TYPES.Number === typeof length && length > 0 && (length - 1) in obj);
    };

    // ===================== PuSet核心构造类（继承Array） =====================
    /**
     * PuSet核心构造类 - 继承Array，实现DOM元素集合的链式操作
     * 类似jQuery的$对象，封装DOM集合的常用操作
     */
    const PuSetConstructor = class PuSet extends Array {
        prevObject = null; // 链式操作的上一个对象（用于end()方法）

        /**
         * 构造函数
         * @param  {...any} args - 初始化参数（DOM元素/元素数组）
         */
        constructor(...args) {
            super(...args);
        }

        /**
         * 创建新的PuSet实例
         * @returns {PuSetConstructor} 空的PuSet实例
         */
        static newInstance() {
            return new PuSetConstructor();
        }

        /**
         * DOM就绪后执行回调
         * @param {Function} fn - 就绪回调（参数为PuSetFactory）
         * @returns {PuSetConstructor} 自身（链式调用）
         */
        ready(fn) {
            readyPromise.then(() => fn(PuSetFactory)).catch(console.error);
            return this;
        }

        /**
         * 推入新的元素栈，并保留上一个对象引用（核心链式操作基础）
         * @param {Array} elems - 新的DOM元素数组
         * @returns {PuSetConstructor} 新的PuSet实例
         */
        pushStack(elems) {
            const ret = PuSetFactory.merge(PuSetConstructor.newInstance(), elems);
            ret.prevObject = this; // 关联上一个实例
            return ret;
        }

        /**
         * 筛选集合中的奇数项（索引从0开始，i+1为1/3/5...）
         * @returns {PuSetConstructor} 筛选后的新实例
         */
        even() {
            return this.pushStack(PuSetFactory.grep(this, function (_elem, i) {
                return (i + 1) % 2;
            }))
        }

        /**
         * 筛选集合中的偶数项（索引从0开始，i为1/3/5...）
         * @returns {PuSetConstructor} 筛选后的新实例
         */
        odd() {
            return this.pushStack(PuSetFactory.grep(this, function (_elem, i) {
                return i % 2;
            }))
        }

        /**
         * 根据索引获取指定元素（支持负数索引）
         * @param {number} i - 索引（负数表示从末尾倒数）
         * @returns {PuSetConstructor} 包含指定元素的新实例
         */
        eq(i) {
            const len = this.length,
                j = +i + (i < 0 ? len : 0); // 处理负数索引
            return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
        }

        /**
         * 向当前集合添加新的元素（去重排序）
         * @param {string|HTMLElement|Array} selector - 选择器/元素/元素数组
         * @param {HTMLElement|PuSetConstructor} [context] - 查找上下文
         * @returns {PuSetConstructor} 合并后的新实例
         */
        add(selector, context) {
            return this.pushStack(PuSetFactory.uniqueSort(
                PuSetFactory.merge(this.slice(), PuSetFactory(selector, context))
            ));
        }

        /**
         * 查找当前集合中所有元素的后代元素
         * @param {string} selector - CSS选择器
         * @returns {PuSetConstructor} 匹配的后代元素集合
         */
        find(selector) {
            const arr = this.pushStack([]);
            if (selector && TYPES.String === typeof selector) {
                for (const target of this) {
                    arr.push(...target.querySelectorAll(selector))
                }
            }
            // 多个元素时去重，单个元素直接返回
            return this.length > 1 ? PuSetFactory.uniqueSort(arr) : arr;
        }

        /**
         * 回到链式操作的上一个对象
         * @returns {PuSetConstructor} 上一个实例或新空实例
         */
        end() {
            return this.prevObject || PuSetConstructor.newInstance();
        }

        /**
         * 筛选符合条件的元素
         * @param {string|Function|HTMLElement} selector - 筛选条件
         * @returns {PuSetConstructor} 筛选后的新实例
         */
        filter(selector) {
            return this.pushStack(winnow(this, selector || [], false));
        }

        /**
         * 排除符合条件的元素
         * @param {string|Function|HTMLElement} selector - 排除条件
         * @returns {PuSetConstructor} 排除后的新实例
         */
        not(selector) {
            return this.pushStack(winnow(this, selector || [], true));
        }

        /**
         * 判断集合中是否有元素符合条件
         * @param {string|Function|HTMLElement} selector - 判断条件
         * @returns {boolean} 是否存在匹配元素
         */
        is(selector) {
            return !!winnow(this, selector || [], false).length;
        }
    };

    // 根PuSet实例（绑定到document，作为全局查找的基础）
    const rootPuSet = new PuSetConstructor(document);

    // ===================== 核心筛选工具函数 =====================
    /**
     * 核心元素筛选函数（filter/not/is的底层实现）
     * @param {Array} elements - 待筛选的DOM元素数组
     * @param {string|Function|HTMLElement|Array} qualifier - 筛选条件
     * @param {boolean} not - 是否取反（true=排除，false=保留）
     * @returns {Array} 筛选后的元素数组
     */
    const winnow = function winnow(elements, qualifier, not) {
        // 1. 条件为函数：执行函数判断
        if (isFunction(qualifier)) {
            return PuSetFactory.grep(elements, function (elem, i) {
                return !!qualifier.call(elem, i, elem);
            }, not);
        }
        // 2. 条件为DOM节点：判断元素是否全等
        if (qualifier.nodeType) {
            return PuSetFactory.grep(elements, function (elem) {
                return elem === qualifier;
            }, not);
        }
        // 3. 条件为非字符串（如数组）：判断元素是否在数组中
        if (TYPES.String !== typeof qualifier) {
            return PuSetFactory.grep(elements, function (elem) {
                return indexOf.call(qualifier, elem) > -1;
            }, not);
        }
        // 4. 条件为字符串选择器：查找匹配的元素
        const selector = rootPuSet.find(qualifier);
        return PuSetFactory.grep(elements, function (element) {
            return selector.indexOf(element, 0) >= 0;
        }, not);
    };

    /**
     * DOM节点排序函数（按文档中的位置排序）
     * @param {HTMLElement} a - 节点A
     * @param {HTMLElement} b - 节点B
     * @returns {number} 排序值（-1=A在前，1=B在前）
     */
    const compareDocumentPositionSort = function compareDocumentPositionSort(a, b) {
        const compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
        if (compare) {
            return compare;
        }
        // 使用compareDocumentPosition判断节点位置关系
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    };

    // ===================== PuSet核心工厂对象 =====================
    /**
     * PuSet核心工厂对象 - 暴露所有公共方法，也是库的入口函数
     * @param {string|HTMLElement|Function|Array} selector - 选择器/元素/就绪函数/元素数组
     * @param {HTMLElement|PuSetConstructor} [context] - 查找上下文
     * @returns {PuSetConstructor} PuSet实例
     */
    const PuSetFactory = Object.assign(function PuSet(selector, context) {
        // 空参数：返回空实例
        if (!selector) {
            return PuSetConstructor.newInstance();
        }
        // DOM节点：返回包含该节点的实例
        if (selector.nodeType) {
            return new PuSetConstructor(selector);
        }
        // 字符串选择器：根据上下文查找
        if (TYPES.String === typeof selector) {
            if (context) {
                // 上下文是PuSet实例：直接调用find
                if (context.constructor === PuSetConstructor) {
                    return context.find(selector);
                } else {
                    // 上下文是DOM元素：包装后调用find
                    return PuSetFactory(context).find(selector);
                }
            } else {
                // 无上下文：全局查找
                return rootPuSet.find(selector);
            }
        }
        // 函数：DOM就绪后执行
        if (isFunction(selector)) {
            return rootPuSet.ready(selector);
        }
        // 其他类型（数组/类数组）：转为PuSet实例
        return PuSetFactory.makeArray(selector, PuSetConstructor.newInstance());
    }, {
        // 暴露版本号
        version: version,
        // DOM就绪状态（初始为false，就绪后改为true）
        isReady: returnFalse,
        // 暴露类型判断方法
        isFunction: isFunction,
        isWindow: isWindow,
        // 数组判断（优先使用原生Array.isArray，降级使用toType）
        isArray: Array.isArray || function (obj) {
            return TYPES.Array === toType(obj);
        },
        /**
         * 判断是否为XML文档（非HTML）
         * @param {HTMLElement} elem - 元素节点
         * @returns {boolean} 是否为XML文档
         */
        isXMLDoc: function (elem) {
            const namespace = elem && elem.namespaceURI,
                docElem = elem && (elem.ownerDocument || elem).documentElement;
            return !rhtmlSuffix.test(namespace || docElem && docElem.nodeName || "HTML");
        },
        /**
         * 判断是否为数值（支持字符串形式的数值）
         * @param {*} obj - 待检测对象
         * @returns {boolean} 是否为有效数值
         */
        isNumeric: function (obj) {
            const type = toType(obj);
            return (type === TYPES.Number || type === TYPES.String) && !isNaN(obj - parseFloat(obj));
        },
        /**
         * 判断是否为纯对象（字面量对象/Object构造的对象）
         * @param {*} obj - 待检测对象
         * @returns {boolean} 是否为纯对象
         */
        isPlainObject: function (obj) {
            let proto, Ctor;
            // 先通过toString排除非对象类型
            if (!obj || toString.call(obj) !== "[object Object]") {
                return false;
            }
            proto = getProto(obj);
            // 无原型的对象（如Object.create(null)）视为纯对象
            if (!proto) {
                return true;
            }
            // 检查构造函数是否为原生Object
            Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
            return TYPES.Function === typeof Ctor && ObjectFunctionString === fnToString.call(Ctor);
        },
        /**
         * 判断是否为空对象（无自有属性）
         * @param {Object} obj - 待检测对象
         * @returns {boolean} 是否为空对象
         */
        isEmptyObject: function (obj) {
            for (const name in obj) {
                return false;
            }
            return true;
        },
        /**
         * 显示/隐藏元素（通过属性和类名双重控制）
         * @param {HTMLElement} targetElement - 目标元素
         * @param {boolean} value - true=显示，false=隐藏
         * @returns {HTMLElement} 目标元素（链式调用）
         */
        show(targetElement, value) {
            if (value) {
                targetElement.removeAttribute(HIDE_ATTRIBUTE);
                targetElement.classList.remove("hide");
            } else {
                targetElement.setAttribute(HIDE_ATTRIBUTE, HIDE_ATTRIBUTE);
                targetElement.classList.add("hide");
            }
            return targetElement;
        },
        /**
         * 元素数组去重并按文档位置排序
         * @param {Array} results - 待处理的DOM元素数组
         * @returns {Array} 去重排序后的数组
         */
        uniqueSort(results) {
            const duplicates = [];
            let hasDuplicate = false;
            let i = 0, j = 0;
            let elem;
            // 先排序（同时检测重复）
            duplicates.sort.call(results, function (a, b) {
                if (a === b) {
                    hasDuplicate = true;
                    return 0;
                }
                return compareDocumentPositionSort(a, b);
            });
            // 去重
            if (hasDuplicate) {
                while ((elem = results[i++])) {
                    if (elem === results[i]) {
                        j = duplicates.push(i);
                    }
                }
                while (j--) {
                    duplicates.splice.call(results, duplicates[j], 1);
                }
            }
            return results;
        },
        /**
         * 合并两个数组（修改第一个数组）
         * @param {Array} first - 目标数组
         * @param {Array} second - 待合并数组
         * @returns {Array} 合并后的目标数组
         */
        merge: function merge(first, second) {
            const len = +second.length;
            let i = first.length;
            for (let j = 0; j < len; j++) {
                first[i++] = second[j];
            }
            first.length = i;
            return first;
        },
        /**
         * 筛选数组元素（类似Array.filter，但支持取反）
         * @param {Array} elems - 待筛选数组
         * @param {Function} callback - 筛选函数（参数：元素、索引）
         * @param {boolean} [invert=false] - 是否取反
         * @returns {Array} 筛选后的数组
         */
        grep: function grep(elems, callback, invert) {
            const matches = [];
            const callbackExpect = !invert;
            for (let i = 0, length = elems.length; i < length; i++) {
                // 回调结果与预期一致则保留
                if (callbackExpect !== !callback(elems[i], i)) {
                    matches.push(elems[i]);
                }
            }
            return matches;
        },
        /**
         * 遍历数组/对象（类jQuery.each）
         * @param {Array|Object} obj - 待遍历对象
         * @param {Function} callback - 遍历回调（参数：值、键/索引），返回false终止遍历
         * @returns {Array|Object} 原对象（链式调用）
         */
        each: function (obj, callback) {
            let length, i = 0;
            // 类数组对象：按索引遍历
            if (isArrayLike(obj)) {
                length = obj.length;
                for (; i < length; i++) {
                    if (callback(obj[i], i) === false) {
                        break;
                    }
                }
            } else {
                // 普通对象：按属性遍历
                for (i in obj) {
                    if (callback(obj[i], i) === false) {
                        break;
                    }
                }
            }
            return obj;
        },
        /**
         * 转为数组（类jQuery.makeArray）
         * @param {*} arr - 待转换的对象（数组/类数组/单个值）
         * @param {Array} [results] - 目标数组（可选）
         * @returns {Array} 转换后的数组
         */
        makeArray: function makeArray(arr, results) {
            const ret = results || [];
            if (arr != null) {
                if (isArrayLike(Object(arr))) {
                    // 类数组：合并到目标数组（字符串特殊处理为数组）
                    PuSetFactory.merge(ret, TYPES.String === typeof arr ? [arr] : arr);
                } else {
                    // 单个值：push到目标数组
                    push.call(ret, arr);
                }
            }
            return ret;
        },
        /**
         * 触发文件下载（通过创建a标签模拟点击）
         * @param {string} url - 下载地址
         * @param {string} [filename="filename"] - 文件名
         */
        download: function (url, filename = "filename") {
            const save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
            save_link.href = url;
            save_link.download = filename;
            // 触发点击事件
            save_link.dispatchEvent(new MouseEvent("click", {
                "view": window,
                "bubbles": true,
                "cancelable": true
            }));
        },
        /**
         * Base64数据URL转为Blob对象
         * @param {string} base64 - 完整的base64数据URL（如data:image/png;base64,...）
         * @returns {Blob|null} 转换后的Blob对象，失败返回null
         */
        base64ToBlob: function base64ToBlob(base64) {
            // 入参校验
            if (typeof base64 !== 'string' || base64.trim() === '') {
                console.warn('base64ToBlob: 输入必须是非空字符串');
                return null;
            }
            try {
                // 匹配dataURL格式：data:[mimeType];base64,[data]
                const dataUrlPattern = /^data:([\w\/]+?);base64,(.+)$/;
                const matchResult = base64.match(dataUrlPattern);
                if (matchResult === null || matchResult.length < 3) {
                    console.warn('base64ToBlob: 输入不是有效的base64数据URL格式');
                    return null;
                }
                const [, mimeType, base64Data] = matchResult;
                // 解码base64数据
                const decodedStr = atob(base64Data);
                const byteLength = decodedStr.length;
                const uint8Array = new Uint8Array(byteLength);
                // 转换为Uint8Array
                for (let i = 0; i < byteLength; i++) {
                    uint8Array[i] = decodedStr.charCodeAt(i);
                }
                // 创建Blob对象
                return new Blob([uint8Array], { type: mimeType });
            } catch (error) {
                console.error('base64ToBlob 转换失败:', error);
                return null;
            }
        }
    });

    // ===================== DOM就绪Promise =====================
    /**
     * DOM就绪Promise - 统一处理DOMContentLoaded和load事件
     * 就绪后将PuSetFactory.isReady设为true
     */
    const readyPromise = new Promise(function (resolve) {
        function completed() {
            // 移除事件监听，避免重复触发
            document.removeEventListener("DOMContentLoaded", completed);
            window.removeEventListener("load", completed);
            resolve();
        }
        // 已就绪：立即resolve（加setTimeout避免同步执行）
        if (document.readyState === "complete" ||
            (document.readyState !== "loading" && !document.documentElement.doScroll)) {
            window.setTimeout(resolve);
        } else {
            // 未就绪：监听事件
            document.addEventListener("DOMContentLoaded", completed);
            window.addEventListener("load", completed);
        }
    }).then(function () {
        // 标记DOM已就绪
        PuSetFactory.isReady = returnTrue;
    });

    // ===================== 事件处理核心 =====================
    const rnothtmlwhite = (/[^\x20\t\r\n\f]+/g); // 匹配非空白字符
    const rtypenamespace = /^([^.]*)(?:\.(.+)|)/; // 匹配事件类型和命名空间（如click.test → type=click, namespace=test）
    const expando = Symbol("puset_event_data"); // 事件数据的唯一标识（避免属性冲突）

    /**
     * 确保对象拥有指定属性（不存在则创建）
     * @param {Object} target - 目标对象
     * @param {string|Symbol} property - 属性名
     * @param {Function} [Constructor=Object] - 构造函数
     * @returns {*} 属性值（或null，若对象不可扩展）
     */
    const ensureObjectProperty = function ensureObjectProperty(target, property, Constructor = Object) {
        if (Object.hasOwn(target, property)) {
            return target[property];
        }
        // 对象可扩展：创建新实例
        if (Object.isExtensible(target)) {
            return target[property] = new Constructor();
        }
        return null;
    };

    // 检测原生matches/closest方法是否存在（兼容性处理）
    const hasMatches = "function" === typeof Element.prototype.matches;
    const hasClosest = "function" === typeof Element.prototype.closest;

    /**
     * 自定义元素匹配函数（兼容不同浏览器）
     * @param {HTMLElement} target - 根元素
     * @param {string} selector - CSS选择器
     * @returns {Function} 匹配函数（参数：元素，返回是否匹配）
     */
    const customMatches = function customMatches(target, selector) {
        if (!selector) return returnFalse;
        // 原生matches方法
        if (hasMatches) return item => item !== target && item.matches && item.matches(selector);
        // 原生closest方法
        if (hasClosest) return item => item !== target && item.closest && item === item.closest(selector);
        // 降级方案：查找所有后代并缓存
        const children = new Set(target.querySelectorAll(selector));
        return item => item && children.has(item);
    };

    /**
     * 获取事件的传播路径（兼容不同浏览器）
     * @param {HTMLElement} target - 根元素
     * @param {Event} event - 事件对象
     * @returns {Array} 事件传播路径数组
     */
    const getComposedPath = function getComposedPath(target, event) {
        // 原生composedPath/path
        const path = event.composedPath ? event.composedPath() : event.path;
        if (path) {
            return slice.call(path, 0, 1 + indexOf.call(path, target));
        } else {
            // 降级：手动遍历父节点
            let node = event.target, path = [];
            do {
                path.push(node);
                if (node === target) break;
            } while (node = node.parentNode || node.host);
            return path;
        }
    };

    /**
     * 事件替代映射（处理不可冒泡的事件）
     * 如focus→focusin（focus不可冒泡，focusin可冒泡）
     */
    const EventSubstitute = {
        "focus": "focusin",
        "blur": "focusout",
        "mouseenter": "mouseover",
        "mouseleave": "mouseout",
        "pointerenter": "pointerover",
        "pointerleave": "pointerout",
        "dragenter": "dragover",
        "dragexit": "dragleave",
        "drop": "dragover",
        "touchcancel": "touchend",
        "touchenter": "touchstart",
        /**
         * 提示不可冒泡事件的委托问题
         * @param {string} type - 事件类型
         * @param {boolean} not - 是否真的不可冒泡
         */
        notBubbles(type, not) {
            if (not) {
                const text = Array.of("不支持无法冒泡的[" + type + "]事件的委托。");
                if (Object.hasOwn(EventSubstitute, type)) {
                    text.push("可使用[" + EventSubstitute[type] + "]事件替代。");
                } else {
                    text.push("请改用其他可行方案。");
                }
                console.warn(text.join(""));
            }
        }
    };

    // 扩展事件工具方法
    Object.assign(PuSetFactory, {
        /**
         * 防抖函数（连续触发时只执行最后一次）
         * @param {number} wait - 等待时间（ms）
         * @param {Function} handler - 执行函数
         * @returns {Function} 防抖后的函数
         */
        debounce(wait, handler) {
            let timeout;
            return function listener(event) {
                clearTimeout(timeout);
                timeout = setTimeout(() => handler.call(this, event, listener), wait);
            };
        },
        /**
         * 节流函数（指定时间内只执行一次）
         * @param {number} delay - 节流间隔（ms）
         * @param {Function} handler - 执行函数
         * @returns {Function} 节流后的函数
         */
        throttle(delay, handler) {
            let lastTime = 0;
            return function listener(event) {
                const current = Date.now();
                if (current - lastTime >= delay) {
                    handler.call(this, event, listener);
                    lastTime = current;
                }
            };
        },
        /**
         * 事件委托核心函数
         * @param {string} selector - 目标元素选择器
         * @param {Function} handler - 事件处理函数
         * @returns {Function} 委托处理函数
         */
        delegation: function delegation(selector, handler) {
            const stringSelector = String(selector);
            return function listener(event) {
                // 获取匹配的元素
                const match = getComposedPath(this, event).filter(customMatches(this, stringSelector));
                const length = match.length;
                if (length === 0) {
                    // 无匹配元素：提示不可冒泡事件
                    EventSubstitute.notBubbles(event.type, event.bubbles === false);
                    return;
                }
                // 执行处理函数（绑定到匹配元素）
                for (let i = 0; i < length; handler.call(match[i++], event, listener));
            };
        }
    });

    /**
     * 创建事件监听器（管理多个事件处理函数）
     * @param {string} type - 事件类型
     * @param {Array} handles - 处理函数数组
     * @returns {Function} 统一的事件监听函数
     */
    const createListener = function createListener(type, handles) {
        return handles.listener = function listener(event) {
            let path = null;
            const data = { type: type, target: this };
            // 遍历所有处理函数
            for (const handle of handles) {
                // 命名空间不匹配则跳过
                if (handle.rnamespace && handle.namespace && !handle.rnamespace.test(handle.namespace)) {
                    continue;
                }
                // 获取匹配的元素
                const match = (handle.selector === null) ? [this] :
                    (path === null ? (path = getComposedPath(this, event)) : path).filter(customMatches(this, handle.selector));
                const length = match.length;
                if (length === 0) {
                    EventSubstitute.notBubbles(event.type, event.bubbles === false);
                    continue;
                }
                // 执行处理函数
                const handler = handle.handler;
                const options = Object.assign({}, handle, data);
                for (let i = 0; i < length; handler.call(match[i++], event, options));
            }
        };
    };

    /**
     * 添加事件监听（底层）
     * @param {HTMLElement} node - 目标元素
     * @param {string} types - 事件类型（多个用空格分隔）
     * @param {string} selector - 委托选择器
     * @param {Function} handler - 处理函数
     */
    const add = function add(node, types, selector, handler) {
        // 获取/创建事件数据存储对象
        const data = ensureObjectProperty(node, expando, Object);
        if (data === null) return;

        let t, type, tmp, namespaces;
        // 解析事件类型（拆分多个类型）
        types = (types || "").match(rnothtmlwhite) || [""];
        t = types.length;
        while (t--) {
            // 解析事件类型和命名空间
            tmp = rtypenamespace.exec(types[t]) || [];
            type = tmp[1];
            namespaces = (tmp[2] || "").split(".").sort();
            if (!type) continue;

            // 获取/创建该事件类型的处理函数数组
            const handles = ensureObjectProperty(data, type, Array);
            // 首次添加：创建统一监听器并绑定
            if (handles.length === 0) {
                const listener = createListener(type, handles);
                if (node.addEventListener) {
                    node.addEventListener(type, listener);
                }
            }
            // 添加处理函数配置
            handles.push({
                selector: selector ? String(selector) : null,
                handler: handler,
                namespace: namespaces.join(".")
            });
        }
    };

    /**
     * 移除事件监听（底层）
     * @param {HTMLElement} node - 目标元素
     * @param {string} types - 事件类型（多个用空格分隔）
     * @param {string} selector - 委托选择器
     * @param {Function} handler - 处理函数
     */
    const remove = function remove(node, types, selector, handler) {
        // 获取事件数据存储对象
        const data = ensureObjectProperty(node, expando, Object);
        if (data === null) return;

        let t, type, tmp, namespaces;
        // 解析事件类型
        types = (types || "").match(rnothtmlwhite) || [""];
        t = types.length;
        while (t--) {
            tmp = rtypenamespace.exec(types[t]) || [];
            type = tmp[1];
            namespaces = (tmp[2] || "").split(".").sort();

            // 无类型：递归移除所有类型
            if (!type) {
                for (type in data) {
                    remove(node, type + types[t], selector, handler);
                }
                continue;
            }

            // 创建命名空间匹配正则
            tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");
            const handles = ensureObjectProperty(data, type, Array);
            let j = handles.length;

            // 遍历处理函数数组，移除匹配的项
            while (j--) {
                const handle = handles[j];
                if (
                    (!tmp || tmp.test(handle.namespace)) && // 命名空间匹配
                    (!selector || selector === handle.selector || selector === "**" && handle.selector) && // 选择器匹配
                    (!handler || handler === handle.handler) // 处理函数匹配
                ) {
                    handles.splice(j, 1);
                }
            }

            // 无处理函数：移除监听器并删除数据
            if (handles.length == 0) {
                if (node.removeEventListener) {
                    node.removeEventListener(type, handles.listener);
                }
                Reflect.deleteProperty(data, type);
            }
        }
    };

    /**
     * 事件操作统一入口（on/one/off的底层）
     * @param {Array} elements - 目标元素数组
     * @param {string|Object} types - 事件类型（或类型-处理函数映射）
     * @param {string} selector - 委托选择器
     * @param {Function} callback - 处理函数
     * @param {number} method - 操作类型：2=on，1=one，0=off
     * @returns {Array} 原元素数组（链式调用）
     */
    const action = function action(elements, types, selector, callback, method) {
        // 类型为对象：遍历键值对（如{click: fn, mouseover: fn}）
        if ("object" === typeof types) {
            for (const type in types) {
                action(elements, type, selector, types[type], method);
            }
            return elements;
        }

        // 选择器为函数：调整参数（无委托）
        if ("function" === typeof selector) {
            callback = selector;
            selector = null;
        }

        // 处理函数为false：替换为返回false的函数
        if (false === callback) {
            callback = returnFalse;
        } else if (!callback) {
            return elements;
        }

        // one方法：执行后自动移除
        const handler = (method === 1) ? function autoremove(event, options) {
            remove(options.target, options.type, options.selector, options.handler);
            return callback.call(this, event, options);
        } : callback;

        // 选择操作（add/remove）
        const operation = method >= 1 ? add : remove;
        // 遍历元素执行操作
        return PuSetFactory.each(elements, function (target) {
            operation(target, types, selector, handler);
        });
    };

    // 扩展PuSet实例的事件方法
    Object.assign(PuSetConstructor.prototype, {
        /**
         * 绑定事件（支持委托）
         * @param {string|Object} types - 事件类型
         * @param {string|Function} [selector] - 委托选择器（或处理函数）
         * @param {Function} [callback] - 处理函数
         * @returns {PuSetConstructor} 自身（链式调用）
         */
        on: function (types, selector, callback) {
            return action(this, types, selector, callback, 2);
        },
        /**
         * 绑定一次性事件（执行后自动移除）
         * @param {string|Object} types - 事件类型
         * @param {string|Function} [selector] - 委托选择器（或处理函数）
         * @param {Function} [callback] - 处理函数
         * @returns {PuSetConstructor} 自身（链式调用）
         */
        one: function (types, selector, callback) {
            return action(this, types, selector, callback, 1);
        },
        /**
         * 解绑事件
         * @param {string|Object} [types] - 事件类型
         * @param {string|Function} [selector] - 委托选择器（或处理函数）
         * @param {Function} [callback] - 处理函数
         * @returns {PuSetConstructor} 自身（链式调用）
         */
        off: function (types, selector, callback) {
            return action(this, types, selector, callback, 0);
        }
    });

    // ===================== 视图管理类（ViewManager） =====================
    /**
     * 视图管理类 - 实现数据与DOM的双向绑定（简易版）
     * 支持数组/对象数据驱动DOM更新、事件委托、模板渲染
     */
    class ViewManager {
        #children = new Map(); // 子元素映射（key → HTMLElement）
        #childrenReverse = new Map(); // 反向映射（HTMLElement → key）
        #isInsert = false; // 是否指定了插入位置
        #isFunctionTemplate = false; // 模板是否为函数
        #hasLayout = false; // 是否有布局函数
        #hasResize = false; // 是否有尺寸变化回调
        #isArrayData = false; // 数据是否为数组

        selector = ""; // 子元素选择器
        insert = null; // 插入位置元素/选择器
        hidden = false; // 是否初始隐藏
        source = null; // 原始数据
        data = null; // 代理后的数据
        target = null; // 根容器元素
        template = null; // 模板（元素/字符串/函数）
        layout = null; // 布局函数（node, value, property）
        onresize = null; // 数组长度变化回调
        delegation = {}; // 事件委托配置（type → fn）

        /**
         * 构造函数
         * @param {Object} options - 配置项
         */
        constructor(options) {
            this.#initializeOptions(options); // 初始化配置
            this.#initializeChildren(options); // 初始化子元素
            this.#initializeTemplate(); // 初始化模板
            this.#initializeDataProxy(); // 初始化数据代理
            this.#initializeEventDelegation(); // 初始化事件委托

            // 初始更新视图（非隐藏时）
            if (!this.hidden) {
                this.update(this.source);
            }
            // 数组数据且有resize回调：触发初始长度回调
            if (this.#isArrayData && this.#hasResize) {
                this.onresize(this.target, this.data.length, 'length');
            }
        }

        /**
         * 初始化配置项
         * @param {Object} options - 传入的配置
         */
        #initializeOptions(options) {
            Object.assign(this, options);
            this.source = this.data ?? {}; // 原始数据兜底
            this.#isArrayData = PuSetFactory.isArray(this.data); // 判断数据类型
            this.#hasLayout = isFunction(this.layout); // 判断是否有布局函数
            this.#hasResize = isFunction(this.onresize); // 判断是否有resize回调
        }

        /**
         * 初始化子元素映射
         * @param {Object} options - 传入的配置
         */
        #initializeChildren(options) {
            const keys = Object.keys(this.source);
            // 获取子元素（根据selector或children）
            const children = this.selector ? this.target.querySelectorAll(this.selector) : options.children;
            // 映射子元素到数据键
            PuSetFactory.each(children, (element, index) => {
                this.#setChild(keys[index] || String(index), element);
            });
            // 解析插入位置（字符串→元素）
            if (this.insert && typeof this.insert === 'string') {
                this.insert = this.target.querySelector(this.insert);
            }
            this.#isInsert = this.insert instanceof HTMLElement; // 标记是否有效插入位置
        }

        /**
         * 初始化模板
         */
        #initializeTemplate() {
            // 模板为函数：标记类型
            if (isFunction(this.template)) {
                this.#isFunctionTemplate = true;
                return;
            }
            const div = document.createElement('div');
            // 模板为字符串：转为元素
            if (typeof this.template === 'string') {
                div.innerHTML = this.template;
                this.template = div.firstElementChild;
            } else if (!this.template) {
                // 无模板：使用第一个子元素作为模板
                const firstKey = this.#children.keys().next().value;
                this.template = this.#children.get(firstKey);
            }
            // 模板为元素：克隆一份（避免修改原元素）
            if (this.template instanceof HTMLElement) {
                this.template = this.template.cloneNode(true);
            } else {
                // 兜底：空div
                this.template = div.cloneNode(true);
            }
        }

        /**
         * 初始化数据代理（监听数据变更）
         */
        #initializeDataProxy() {
            this.data = new Proxy(this.source, {
                // 监听属性设置
                set: (target, property, value, receiver) => {
                    this.#handleDataChange(target, property, value, receiver);
                    return Reflect.set(target, property, value, receiver);
                },
                // 监听属性删除
                deleteProperty: (target, property) => {
                    this.#handleDataDelete(target, property);
                    return Reflect.deleteProperty(target, property);
                }
            });
        }

        /**
         * 处理数据变更
         * @param {Object|Array} target - 原始数据
         * @param {string|number} property - 变更的属性/索引
         * @param {*} value - 新值
         * @param {Proxy} receiver - 代理对象
         */
        #handleDataChange(target, property, value, receiver) {
            // 使用requestAnimationFrame优化渲染
            requestAnimationFrame(() => {
                const params = this.#getNodeParams(property, value);
                // 数组length变更
                if (params.isLengthProperty) {
                    this.#handleLengthChange(value);
                } else {
                    // 普通属性变更
                    this.#handlePropertyChange(params.node, value, property);
                }
            });
        }

        /**
         * 处理数组长度变更
         * @param {number} newLength - 新长度
         */
        #handleLengthChange(newLength) {
            // 隐藏超出新长度的元素
            for (let i = newLength, oldLength = this.childCount; i < oldLength; i++) {
                PuSetFactory.show(this.#children.get(String(i)), false);
            }
            // 触发resize回调
            if (this.#hasResize) {
                this.onresize(this.target, newLength, 'length');
            }
        }

        /**
         * 处理普通属性变更
         * @param {HTMLElement} node - 目标元素
         * @param {*} value - 新值
         * @param {string|number} property - 属性名/索引
         */
        #handlePropertyChange(node, value, property) {
            PuSetFactory.show(node, true); // 显示元素
            // 执行布局函数
            if (this.#hasLayout) {
                this.layout(node, value, property);
            }
        }

        /**
         * 处理数据属性删除
         * @param {Object|Array} target - 原始数据
         * @param {string|number} property - 被删除的属性/索引
         */
        #handleDataDelete(target, property) {
            // 隐藏对应元素
            PuSetFactory.show(this.#children.get(property), false);
        }

        /**
         * 初始化事件委托
         */
        #initializeEventDelegation() {
            PuSetFactory.each(this.delegation, (fn, types) => {
                // 解析事件类型（多个用空格分隔）
                PuSetFactory.each((types || '').match(rnothtmlwhite) || [''], (type) => {
                    if (!type) return;
                    // 绑定事件监听
                    this.target.addEventListener(type, (event) => {
                        const path = getComposedPath(this.target, event);
                        // 遍历传播路径，找到匹配的子元素
                        for (const item of path) {
                            if (this.#childrenReverse.has(item)) {
                                const key = this.#childrenReverse.get(item);
                                // 执行委托函数（绑定到子元素，传事件、数据、键）
                                fn.call(item, event, this.data[key], key);
                            }
                        }
                    });
                });
            });
        }

        /**
         * 获取节点相关参数
         * @param {string|number} property - 属性名/索引
         * @param {*} value - 新值
         * @returns {Object} 节点参数（node, property, isLengthProperty）
         */
        #getNodeParams(property, value) {
            let node = this.target;
            let isLengthProperty = false;
            // 有模板时处理
            if (this.#hasTemplate()) {
                if (this.#isArrayData) {
                    // 数组：处理length或索引
                    if (property === 'length') {
                        isLengthProperty = true;
                    } else {
                        node = this.#getChild(property, value?.type);
                    }
                } else {
                    // 对象：处理属性
                    node = this.#getChild(property, value?.type);
                }
            }
            return { node, property, isLengthProperty };
        }

        /**
         * 判断是否有有效模板
         * @returns {boolean} 是否有模板
         */
        #hasTemplate() {
            return this.#isFunctionTemplate || this.template instanceof HTMLElement;
        }

        /**
         * 设置子元素映射
         * @param {string|number} key - 数据键/索引
         * @param {HTMLElement} element - 子元素
         */
        #setChild(key, element) {
            this.#children.set(key, element);
            this.#childrenReverse.set(element, key);
        }

        /**
         * 获取模板实例
         * @param {string|number} index - 索引/键
         * @param {*} type - 类型（传给函数模板）
         * @returns {HTMLElement} 模板克隆/函数返回的元素
         */
        #getTemplateInstance(index, type) {
            return this.#isFunctionTemplate ? this.template(index, type) : this.template.cloneNode(true);
        }

        /**
         * 获取/创建子元素（不存在则从模板创建）
         * @param {string|number} index - 索引/键
         * @param {*} type - 类型（传给函数模板）
         * @returns {HTMLElement} 子元素
         */
        #getChild(index, type) {
            let child = this.#children.get(index);
            // 不存在则创建
            if (!child) {
                child = this.#getTemplateInstance(index, type);
                this.#setChild(index, child);
                this.#insertChild(child); // 插入到DOM
            }
            return child;
        }

        /**
         * 插入子元素到DOM
         * @param {HTMLElement} child - 子元素
         */
        #insertChild(child) {
            if (this.#isInsert) {
                // 插入到指定位置前
                this.target.insertBefore(child, this.insert);
            } else {
                // 追加到容器末尾
                this.target.appendChild(child);
            }
        }

        /**
         * 更新数据（合并新数据）
         * @param {Object|Array} newData - 新数据
         */
        update(newData) {
            Object.assign(this.data, newData);
        }

        /**
         * 获取子元素数量（只读）
         * @returns {number} 子元素数量
         */
        get childCount() {
            return this.#children.size;
        }

        /**
         * 销毁视图（清理资源）
         */
        destroy() {
            this.#children.clear();
            this.#childrenReverse.clear();
            this.data = null;
            this.target = null;
        }
    }

    // 暴露ViewManager创建方法
    PuSetFactory.ViewManager = function (options) {
        return new ViewManager(options);
    };

    // ===================== 文档解析工具 =====================
    // 扩展HTML/XHTML/XML/SVG解析方法
    PuSetFactory.each({
        "HTML": "text/html",
        "XHTML": "application/xhtml+xml",
        "XML": "application/xml",
        "SVG": "image/svg+xml"
    }, function (mimetype, name) {
        /**
         * 解析字符串为对应类型的文档
         * @param {string} text - 待解析的字符串
         * @returns {Document} 解析后的文档对象
         */
        PuSetFactory["parse" + name] = text => (new window.DOMParser).parseFromString(text, mimetype);
    });

    // ===================== 组件化模板管理（ViewComponent） =====================
    const HOST_CLASS_NAME = "template-layer-host"; // 组件宿主元素类名
    const DEFAULT_NAME = "default"; // 默认组件名/命名空间
    const HEAD_STYLE = new Set(); // 已注入head的样式ID集合（避免重复）

    /**
     * 组件类 - 管理模板、样式、脚本，支持Shadow DOM
     */
    class ViewComponent {
        namespace = DEFAULT_NAME; // 命名空间
        name = ""; // 组件名
        longName = ""; // 完整名称（puset-命名空间-组件名）
        exec = returnFalse; // 组件初始化函数
        styleNode = null; // 样式节点
        cachedElements = null; // 缓存的视图元素

        /**
         * 构造函数
         * @param {string} namespace - 命名空间
         * @param {string} name - 组件名
         * @param {Array} nodes - 视图元素数组
         * @param {HTMLElement} style - 样式节点
         * @param {Function} handler - 初始化函数
         */
        constructor(namespace, name, nodes, style, handler) {
            this.namespace = namespace;
            this.name = name;
            this.longName = ["puset", namespace, name].join("-"); // 生成唯一名称
            this.styleNode = style;
            this.cachedElements = nodes;
            this.exec = isFunction(handler) ? handler : returnFalse; // 初始化函数兜底

            // 处理样式（注入到head）
            if (style) {
                const className = this.longName;
                // 避免重复注入
                if (HEAD_STYLE.has(className)) {
                    console.warn("重复添加样式：", className);
                    return;
                }
                const style2 = document.createElement("style");
                HEAD_STYLE.add(style2.id = className); // 标记已注入
                style2.textContent = `.${className}{${style.textContent}}`; // 包装样式
                document.head.appendChild(style2);
            }
        }

        /**
         * 初始化组件（创建DOM/Shadow DOM）
         * @param  {...any} args - 入参（支持container/isRootDOM/handler）
         * @returns {HTMLElement|ShadowRoot} 组件根节点
         */
        init(...args) {
            // 解析入参（按类型分类）
            const params = {};
            for (const arg of args) params[typeof arg] = arg;
            const {
                object: container, // 容器元素
                boolean: isRootDOM, // 是否使用根DOM（不创建Shadow DOM）
                function: handler // 组件初始化回调
            } = params;

            // 创建容器（默认div）
            const clone = container ? container : document.createElement("div");
            if (clone.nodeType !== Node.ELEMENT_NODE) {
                throw new TypeError("Invalid container");
            }

            // 创建根节点（Shadow DOM或原始DOM）
            const root = isRootDOM ? clone : clone.attachShadow({ mode: "open" });
            clone.classList.add(HOST_CLASS_NAME, this.longName); // 添加类名

            // 非根DOM且有样式：复制样式到Shadow DOM
            if (!isRootDOM && this.styleNode) {
                root.appendChild(this.styleNode.cloneNode(true));
            }

            // 复制视图元素到根节点
            for (const node of this.cachedElements) {
                root.appendChild(node.cloneNode(true));
            }

            // 执行初始化回调
            if (isFunction(handler)) handler(root, this);

            return root;
        }
    }

    // 组件实例缓存（命名空间 → 组件名 → ViewComponent）
    const TEMPLATE_INSTANCES = new Map();
    // 默认组件（兜底）
    const DEFAULT_ViewComponent = new ViewComponent(DEFAULT_NAME, DEFAULT_NAME, document.createElement("div"));

    /**
     * 获取命名空间对应的组件映射
     * @param {string} [namespace=DEFAULT_NAME] - 命名空间
     * @returns {Map} 组件映射（组件名 → ViewComponent）
     */
    const getNamespaceMap = function getNamespaceMap(namespace = DEFAULT_NAME) {
        if (!TEMPLATE_INSTANCES.has(namespace)) {
            TEMPLATE_INSTANCES.set(namespace, new Map());
        }
        return TEMPLATE_INSTANCES.get(namespace);
    };

    // 初始化默认命名空间的默认组件
    getNamespaceMap(DEFAULT_NAME).set(DEFAULT_NAME, DEFAULT_ViewComponent);

    // 扩展组件管理方法
    Object.assign(PuSetFactory, {
        /**
         * 获取组件实例
         * @param {string} [name=DEFAULT_NAME] - 组件名
         * @param {string} [namespace=DEFAULT_NAME] - 命名空间
         * @returns {ViewComponent} 组件实例（默认组件兜底）
         */
        get(name = DEFAULT_NAME, namespace = DEFAULT_NAME) {
            const namespaceMap = getNamespaceMap(namespace);
            return namespaceMap.has(name) ? namespaceMap.get(name) : DEFAULT_ViewComponent;
        },
        /**
         * 获取所有命名空间
         * @returns {Array} 命名空间数组
         */
        getNamespaces() {
            return Array.from(TEMPLATE_INSTANCES.keys());
        },
        /**
         * 移除命名空间（默认命名空间不可移除）
         * @param {string} [namespace=DEFAULT_NAME] - 命名空间
         * @returns {boolean} 是否移除成功
         */
        removeNamespace(namespace = DEFAULT_NAME) {
            if (namespace === DEFAULT_NAME) return false;
            return TEMPLATE_INSTANCES.delete(namespace);
        },
        /**
         * 获取指定命名空间下的所有组件名
         * @param {string} [namespace=DEFAULT_NAME] - 命名空间
         * @returns {Array|null} 组件名数组（不存在则返回null）
         */
        getTemplates(namespace = DEFAULT_NAME) {
            return TEMPLATE_INSTANCES.has(namespace) ? Array.from(TEMPLATE_INSTANCES.get(namespace).keys()) : null;
        },
        /**
         * 加载远程模板文件（同源）
         * @param {string} url - 模板文件URL（必须同源）
         * @param {string} [namespace=DEFAULT_NAME] - 命名空间
         * @returns {Promise<Array>} 加载的模板节点数组
         */
        async load(url, namespace = DEFAULT_NAME) {
            // 同源校验
            const testURL = new URL(url, window.location.href);
            if (testURL.origin !== window.location.origin) {
                throw new Error("同源策略限制：不允许跨域加载资源");
            }

            // 加载文件
            const response = await fetch(testURL.href);
            if (!response.ok) {
                throw new Error(`HTTP请求失败：${response.status}${response.statusText}`);
            }
            const text = await response.text();

            // 解析模板（查找hr#puset-interpreter-template后的template元素）
            const nodeList = PuSetFactory("hr#puset-interpreter-template~template", PuSetFactory.parseHTML(text));
            if (nodeList.length === 0) {
                throw new Error("未找到有效的模板元素");
            }

            const funcName = PuSetFactory.name; // 工厂函数名（PuSet）
            const namespaceMap = getNamespaceMap(namespace);

            // 处理每个模板
            for (const node of nodeList) {
                const id = node.id;
                if (!id) {
                    console.warn("已跳过未命名模板");
                    continue;
                }

                // 解析模板内的元素（style/script/普通元素）
                const $elements = new PuSetConstructor();
                for (const child of node.content.children) {
                    switch (child.nodeName.toLowerCase()) {
                        case "style":
                            $elements.style = child;
                            break;
                        case "script":
                            $elements.script = child;
                            break;
                        default:
                            $elements.push(child);
                    }
                }

                const { style, script } = $elements;
                // 无视图元素则跳过
                if (!$elements.length) {
                    console.warn(`模板${id}缺少视图元素，已跳过`);
                    continue;
                }

                // 解析脚本（初始化函数）
                let handler = returnFalse;
                if (script && script.innerText) {
                    try {
                        // 执行脚本，传入PuSetFactory
                        handler = (new Function(funcName, script.innerText)).call($elements, PuSetFactory);
                    } catch (err) {
                        console.error(`执行模板${id}脚本时出错:`, err);
                        handler = returnFalse;
                    }
                }

                // 创建组件实例并缓存
                namespaceMap.set(id, new ViewComponent(namespace, id, $elements, style, handler));
            }

            return nodeList;
        }
    });

    // 暴露PuSetFactory作为最终的PuSet对象
    return PuSetFactory;
})();