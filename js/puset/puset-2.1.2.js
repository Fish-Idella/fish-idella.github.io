/**
 * 𝙿𝚞𝚂𝚎𝚝 JavaScript Library v2.1.0
 * 一款侧重移动端Touch事件的Javascript库
 *
 * 本 API 集根据 jQuery 源码精简修改而来，只保留了最基础的 DOM 选择框架 .find() .filter() 以及 .not()
 * 修改的地方使用了 ECMAScript 6.0 标准，可能不支持旧版的浏览器。
 * 如果你需要在你的代码中使用它，请确保你的浏览器支持 ECMAScript 6.0
 * 
 * ！！！ 选择器语法遵循 element.querySelectorAll() 规则，与 jQuery 的选择器语法规则不同，不可完全平替
 *
 * Date: 2022年10月20日
 */
(function (global, factory) {

    "use strict";

    if (typeof module === 'object' && typeof module.exports === 'object') {

        // For CommonJS and CommonJS-like environments where a proper `window`
        // is present, execute the factory and get PuSet.
        // For environments that do not have a `window` with a `document`
        // (such as Node.js), expose a factory as module.exports.
        // This accentuates the need for the creation of a real `window`.
        // e.g. let PuSet = require("puset")(window);
        // See ticket #14549 for more info.
        module.exports = global.document ?
            factory(global, true) :
            function (w) {
                if (!w.document) {
                    throw new Error("PuSet requires a window with a document");
                }
                return factory(w);
            };
    } else {
        return factory(global);
    }

    // Pass this if window is not defined yet
})(typeof window !== "undefined" ? window : this, function (/** @type {Window & typeof globalThis} */ window, noGlobal) {

    "use strict";

    const TYPE_FUNCTION = 'function';
    const TYPE_OBJECT = 'object';

    const arr = [];

    /** @type {Document} */
    const document = window.document;

    const getProto = Object.getPrototypeOf;

    const slice = arr.slice;

    const concat = arr.concat;

    const push = arr.push;

    const indexOf = arr.indexOf;

    const class2type = {};

    const toString = class2type.toString;

    const hasOwn = class2type.hasOwnProperty;

    const fnToString = hasOwn.toString;

    const ObjectFunctionString = fnToString.call(Object);

    const isFunction = function isFunction(obj) {

        // Support: Chrome <=57, Firefox <=52
        // In some browsers, typeof returns TYPE_FUNCTION for HTML <object> elements
        // (i.e., `typeof document.createElement( "object" ) === TYPE_FUNCTION`).
        // We don't want to classify *any* DOM node as a function.
        return typeof obj === TYPE_FUNCTION && typeof obj.nodeType !== "number";
    };

    const isWindow = function isWindow(obj) {
        return obj != null && obj === obj.window;
    };

    function toType(obj) {
        if (obj == null) {
            return obj + "";
        }

        // Support: Android <=2.3 only (functionish RegExp)
        return typeof obj === TYPE_OBJECT || typeof obj === TYPE_FUNCTION ?
            class2type[toString.call(obj)] || TYPE_OBJECT :
            typeof obj;
    }

    /**
     * 创建类
     * @param {{constructor:Function}} obj 包含构造器 constructor 的对象原型
     * @param {object} props 公共方法
     * 
     * @returns {obj.constructor}
     */
    function createClass(obj, props) {
        const fn = obj.constructor;
        if ("function" === typeof fn) {
            fn.prototype = obj;
            Object.assign(fn, props);
        }
        return fn;
    }

    /**
     * convert array-like objects to real arrays
     * @param {Object} obj
     * @returns {Array}
     */
    function toArray(obj) {
        return slice.call(obj, 0);
    }

    const

        rstandardizedAttributeName = /^(?:0|[1-9]\d*|(?![0-9])[$\w]+)$/,

        version = "2.1.1",

        PuSet = createClass({

            puset: version,

            // Define a local copy of PuSet
            constructor: function PuSet(selector, context) {

                // The PuSet object is actually just the init constructor 'enhanced'
                // Need init if PuSet is called (just allow error to be thrown if not included)
                return new PuSet.fn.init(selector, context);
            },

            length: 0,

            toArray: function () {
                return toArray(this);
            },

            // Get the Nth element in the matched element set OR
            // Get the whole matched element set as a clean array
            get: function (num) {

                // Return all the elements in a clean array
                if (num == null) {
                    return toArray(this);
                }

                // Return just the one element from the set
                return num < 0 ? this[num + this.length] : this[num];
            },

            // Take an array of elements and push it onto the stack
            // (returning the new matched element set)
            pushStack: function (elems) {

                // Build a new PuSet matched element set
                const ret = PuSet.merge(this.constructor(), elems);

                // Add the old object onto the stack (as a reference)
                ret.prevObject = this;

                // Return the newly-formed element set
                return ret;
            },

            // Execute a callback for every element in the matched set.
            each: function (callback) {
                return PuSet.each(this, callback);
            },

            map: function (callback) {
                return this.pushStack(PuSet.map(this, function (elem, i) {
                    return callback.call(elem, i, elem);
                }));
            },

            slice: function () {
                return this.pushStack(slice.apply(this, arguments));
            },

            first: function () {
                return this.eq(0);
            },

            last: function () {
                return this.eq(-1);
            },

            even: function () {
                return this.pushStack(PuSet.grep(this, function (_elem, i) {
                    return (i + 1) % 2;
                }));
            },

            odd: function () {
                return this.pushStack(PuSet.grep(this, function (_elem, i) {
                    return i % 2;
                }));
            },

            eq: function (i) {
                const len = this.length, j = +i + (i < 0 ? len : 0);
                return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
            },

            end: function () {
                return this.prevObject || this.constructor();
            },

            addClass: function (className) {
                const arr = ("" + className).trim().split(" ");
                return this.each(elem => PuSet.addClass(elem, arr));
            },

            removeClass: function (className) {
                const arr = ("" + className).trim().split(" ");
                return this.each(elem => PuSet.removeClass(elem, arr));
            },

            // For internal use only.
            // Behaves like an Array's method, not like a PuSet method.
            push: push,
            sort: arr.sort,
            splice: arr.splice,
            indexOf: indexOf

        }, {

            // Unique for each copy of PuSet on the page
            expando: "PuSet" + (version + Math.random()).replace(/\D/g, ""),

            // Assume PuSet is ready without the ready module
            isReady: true,

            createClass: createClass,

            addClass: function (elem, className) {
                PuSet.each((PuSet.isArray(className) ? className : ("" + className).trim().split(" ")), name => elem.classList.add(name));
                return elem;
            },

            removeClass: function (elem, className) {
                PuSet.each((PuSet.isArray(className) ? className : ("" + className).trim().split(" ")), name => elem.classList.remove(name));
                return elem;
            },

            error: function (msg) {
                throw new Error(msg);
            },

            noop: function () { },

            isPlainObject: function (obj) {
                let proto, Ctor;

                // Detect obvious negatives
                // Use toString instead of toType to catch host objects
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
                return typeof Ctor === TYPE_FUNCTION && fnToString.call(Ctor) === ObjectFunctionString;
            },

            isEmptyObject: function (obj) {

                /* eslint-disable no-unused-vars */
                // See https://github.com/eslint/eslint/issues/6125

                for (let key in obj) {
                    return false;
                }
                return true;
            },

            isXML: function (elem) {
                const documentElement = elem && (elem.ownerDocument || elem).documentElement;
                return documentElement ? documentElement.nodeName !== "HTML" : false;
            },

            isArray: Array.isArray || function (arg) {
                return "array" == toType(arg);
            },

            isFunction: isFunction,

            isWindow: isWindow,

            isNumeric: function (obj) {

                // As of PuSet 3.0, isNumeric is limited to
                // strings and numbers (primitives or objects)
                // that can be coerced to finite numbers (gh-2662)
                const type = toType(obj);
                return (type === "number" || type === "string") &&

                    // parseFloat NaNs numeric-cast false positives ("")
                    // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
                    // subtraction forces infinities to NaN
                    !isNaN(obj - parseFloat(obj));
            },

            type: toType,

            each: function (obj, callback) {
                let length, i = 0;

                if (isArrayLike(obj)) {
                    for (length = obj.length; i < length; i++) {
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

            // results is for internal usage only
            makeArray: function (arr, results) {
                let ret = results || [];

                if (arr != null) {
                    if (isArrayLike(Object(arr))) {
                        PuSet.merge(ret,
                            typeof arr === "string" ?
                                [arr] : arr
                        );
                    } else {
                        push.call(ret, arr);
                    }
                }

                return ret;
            },

            inArray: function (elem, arr, i) {
                return arr == null ? -1 : indexOf.call(arr, elem, i);
            },

            /**
             * 追加属性：将 src 中的属性添加到 dest，如果 dest 存在同名属性则跳过
             * @param {object} dest 
             * @param {object} src 
             */
            append: function (dest, src) {
                // for (let key in src)
                PuSet.each(Object.keys(src), function (key) {
                    if (dest[key] === undefined) {
                        dest[key] = src[key];
                    }
                });
                return dest;
            },

            /**
             * 将第二个数组中的值添加到第一个数组中，并返回第一个数组。
             * 
             * ES6: first.push(...second);
             * 
             * Support: Android <=4.0 only, PhantomJS 1 only
             * push.apply(_, arraylike) throws on ancient WebKit
             * 
             * @param {*} first 
             * @param {*} second 
             * @returns 
             */
            merge: function (first, second) {
                let len = +second.length,
                    j = 0,
                    i = first.length;

                for (; j < len; j++) {
                    first[i++] = second[j];
                }

                first.length = i;

                return first;
            },

            /**
             * 使用指定的函数过滤数组中的元素，并返回过滤后的数组。
             * 
             * Array.filter
             * 
             * @param {Array} elems 
             * @param {Function} callback 
             * @param {Boolean} invert 
             * @returns 
             */
            grep: function (elems, callback, invert) {
                let callbackInverse,
                    matches = [],
                    i = 0,
                    length = elems.length,
                    callbackExpect = !invert;

                // Go through the array, only saving the items
                // that pass the validator function
                for (; i < length; i++) {
                    callbackInverse = !callback(elems[i], i);
                    if (callbackInverse !== callbackExpect) {
                        matches.push(elems[i]);
                    }
                }

                return matches;
            },

            /**
             * 使用指定函数处理数组中的每个元素(或对象的每个属性)，并将处理结果封装为新的数组返回。
             * 
             * @param {Any} elems 需要处理的元素
             * @param {Function} callback 
             * @param {Any} arg 给 callback 传入的额外参数
             * @returns {Any[]} 数组
             */
            map: function (elems, callback, arg) {
                let length, value,
                    i = 0,
                    ret = [];

                // Go through the array, translating each of the items to their new values
                if (isArrayLike(elems)) {
                    length = elems.length;
                    for (; i < length; i++) {
                        value = callback(elems[i], i, arg);

                        if (value != null) {
                            ret.push(value);
                        }
                    }

                    // Go through every key on the object,
                } else {
                    for (i in elems) {
                        value = callback(elems[i], i, arg);

                        if (value != null) {
                            ret.push(value);
                        }
                    }
                }

                // 展平任何嵌套数组 
                return concat.apply([], ret);
            },

            dir: function (obj, elem) {

                let type = null === obj ? "null" : typeof obj;

                if (TYPE_OBJECT != type && TYPE_FUNCTION != type) {
                    return type + " is primitive type.";
                }

                let key, value, ret = [toType(obj), " = {", "\n\n\t"];

                for (key in obj) {
                    try {
                        value = obj[key];
                    } catch (ex) {
                        value = "[object UnknownObject]";
                    } finally {
                        type = toType(value);
                        ret.push(rstandardizedAttributeName.test(key) ? key : JSON.stringify(key), ": ",
                            ("string" == typeof value ? JSON.stringify(value)
                                : "array" == type ? "[object Array]"
                                    : TYPE_FUNCTION == type ? ObjectFunctionString.replace("Object", key)
                                        : "" + value)
                            , ",\n\n\t");
                    }
                }
                ret.splice(-1, 1, "\n\n}");

                return (elem || {}).innerText = ret.join("");
            },

            alert: function (obj) {
                window.alert(this.dir(obj, false));
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

            /**
             * ES2017+
             * @param {String} base64 data URL
             */
            base64ToBlob: function base64ToBlob(base64) {
                // 1. 严格参数校验：确保输入是有效非空字符串
                if (typeof base64 !== 'string' || base64.trim() === '') {
                    console.warn('base64ToBlob: 输入必须是非空字符串');
                    return null;
                }

                try {
                    // 2. 提取正则表达式为常量，提升可维护性
                    // 输出示例：data:text/plain;base64,aGVsbG8gd29ybGQ=
                    const dataUrlPattern = /^data:([\w\/]+?);base64,(.+)$/;
                    // 匹配base64数据URL格式（MIME类型 + 编码内容）
                    const matchResult = base64.match(dataUrlPattern);

                    // 3. 严谨校验匹配结果，确保格式完整
                    if (matchResult === null || matchResult.length < 3) {
                        console.warn('base64ToBlob: 输入不是有效的base64数据URL格式');
                        return null;
                    }

                    // 4. 解构赋值，提升代码可读性
                    const [, mimeType, base64Data] = matchResult;

                    // 5. 性能优化：简化Uint8Array转换逻辑（减少冗余数组操作）
                    const decodedStr = atob(base64Data); // 解码base64字符串
                    const byteLength = decodedStr.length;
                    const uint8Array = new Uint8Array(byteLength);

                    // 直接遍历字符串赋值，替代 Array.from + map 的冗余转换
                    for (let i = 0; i < byteLength; i++) {
                        uint8Array[i] = decodedStr.charCodeAt(i);
                    }

                    // 6. 创建并返回Blob对象
                    return new Blob([uint8Array], { type: mimeType });
                } catch (error) {
                    // 7. 全局异常捕获，避免程序崩溃
                    console.error('base64ToBlob 转换失败:', error);
                    return null;
                }
            }

        });

    /**
     *  $.extend( [deep ], target, object1 [, objectN ] )
     * @param {boolean} [deep] 深度复制
     */
    PuSet.extend = (PuSet.fn = PuSet.prototype).extend = function () {
        let options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        // Handle a deep copy situation
        if (typeof target === "boolean") {
            deep = target;

            // Skip the boolean and the target
            target = arguments[i] || {};
            i++;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (typeof target !== TYPE_OBJECT && !isFunction(target)) {
            target = {};
        }

        // Extend PuSet itself if only one argument is passed
        if (i === length) {
            target = this;
            i--;
        }

        for (; i < length; i++) {

            // Only deal with non-null/undefined values
            if ((options = arguments[i]) != null) {

                // Extend the base object
                for (name in options) {
                    copy = options[name];

                    // Prevent Object.prototype pollution
                    // Prevent never-ending loop
                    if (name === "__proto__" || target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (PuSet.isPlainObject(copy) ||
                        (copyIsArray = Array.isArray(copy)))) {
                        src = target[name];

                        // Ensure proper type for the source value
                        if (copyIsArray && !Array.isArray(src)) {
                            clone = [];
                        } else if (!copyIsArray && !PuSet.isPlainObject(src)) {
                            clone = {};
                        } else {
                            clone = src;
                        }
                        copyIsArray = false;

                        // Never move original objects, clone them
                        target[name] = PuSet.extend(deep, clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };

    // PuSet.extend();

    // Populate the class2type map
    PuSet.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "), function (name) {
        class2type["[object " + name + "]"] = name.toLowerCase();
    });

    function isArrayLike(obj) {

        // Support: real iOS 8.2 only (not reproducible in simulator)
        // `in` check used to prevent JIT error (gh-2145)
        // hasOwn isn't used here due to false negatives
        // regarding Nodelist length in IE
        let length = !!obj && "length" in obj && obj.length,
            type = toType(obj);

        if (isFunction(obj) || isWindow(obj)) {
            return false;
        }

        return type === "array" || length === 0 ||
            typeof length === "number" && length > 0 && (length - 1) in obj;
    }

    /**
     * Implement the identical functionality for filter and not
     * 
     * 过滤掉符合 qualifier 规则的元素，not 取反
     * 
     * @param {Element[]} elements 
     * @param {any} qualifier 
     * @param {Boolean} not 
     * @returns {Element[]}
     */
    function winnow(elements, qualifier, not) {
        if (isFunction(qualifier)) {
            return PuSet.grep(elements, function (elem, i) {
                return !!qualifier.call(elem, i, elem) !== not;
            });
        }

        // Single element
        if (qualifier.nodeType) {
            return PuSet.grep(elements, function (elem) {
                return (elem === qualifier) !== not;
            });
        }

        // Arraylike of elements (PuSet, arguments, Array)
        if (typeof qualifier !== "string") {
            return PuSet.grep(elements, function (elem) {
                return (indexOf.call(qualifier, elem) > -1) !== not;
            });
        }

        let selector = rootPuSet.find(qualifier);
        return PuSet.grep(elements, function (element) {
            return selector.indexOf(element, 0) >= 0;
        }, not);

    }

    PuSet.fn.extend({
        find: function (selector) {
            let arr = [];
            if (selector && "string" === typeof selector) {
                this.each(function (target) {
                    try {
                        PuSet.merge(arr, target.querySelectorAll(selector));
                    } catch (ex) {
                        PuSet.error(`'${selector}' is not a valid selector.`);
                    }
                });
            }
            return this.pushStack(arr);
        },
        filter: function (selector) {
            return this.pushStack(winnow(this, selector, false));
        },
        not: function (selector) {
            return this.pushStack(winnow(this, selector, true));
        },
        is: function (selector) {
            return !!winnow(this, typeof selector === "string" ? rootPuSet.find(selector) : selector || [], false).length;
        }
    });

    // A central reference to the root PuSet(document)
    let rootPuSet, init = PuSet.fn.init = function (selector, context, root) {

        // HANDLE: $(""), $(null), $(undefined), $(false)
        if (!selector) {
            return this;
        }

        // Method init() accepts an alternate rootPuSet
        // so migrate can support PuSet.sub (gh-2101)
        root = root || rootPuSet;

        // Handle HTML strings
        if (typeof selector === "string") {

            if (!context || context.puset) {
                return (context || root).find(selector);

                // HANDLE: $(expr, context)
                // (which is just equivalent to: $(context).find(expr)
            } else {
                return this.constructor(context).find(selector);
            }

            // HANDLE: $(DOMElement)
        } else if (selector.nodeType) {
            this[0] = selector;
            this.length = 1;
            return this;

            // HANDLE: $(function)
            // Shortcut for document ready
        } else if (isFunction(selector)) {
            return root.ready !== undefined ?
                root.ready(selector) :

                // Execute immediately if ready is not present
                selector(PuSet);


            // HANDLE: $(Array), $(Object)
        } else if (TYPE_OBJECT === typeof selector) {
            return PuSet.makeArray(selector, this);
        }

        return this;
    };

    // Give the init function the PuSet prototype for later instantiation
    init.prototype = PuSet.fn;

    // Initialize central reference
    rootPuSet = PuSet(document);

    PuSet.each({
        "XML": "application/xml",
        "SVG": "image/svg+xml",
        "HTML": "text/html"
    }, function (value, name) {
        PuSet["parse" + name] = function (data) {
            let obj = null;

            if (data || "string" == typeof data) {
                try {
                    obj = (new DOMParser()).parseFromString(data, value);
                } catch (e) {
                    if (window.ActiveXObject) {
                        obj = new ActiveXObject("Microsoft.XMLDOM");
                        obj.loadXML(data);
                    } else {
                        obj = null;
                    }
                }
                if (!obj || obj.getElementsByTagName("parsererror").length) {
                    throw new Error("is not invalid " + name);
                }
            }
            return obj;
        };
    });

    PuSet.isReady = false;

    const readyPromise = new Promise(function (reslove) {

        // The ready event handler and self cleanup method
        function completed() {
            document.removeEventListener("DOMContentLoaded", completed);
            window.removeEventListener("load", completed);
            PuSet.isReady = true;
            reslove();
        }

        // Catch cases where $(document).ready() is called
        // after the browser event has already occurred.
        // Support: IE <=9 - 10 only
        // Older IE sometimes signals "interactive" too soon
        if (document.readyState === "complete" ||
            (document.readyState !== "loading" && !document.documentElement.doScroll)) {

            PuSet.isReady = true;

            // Handle it asynchronously to allow scripts the opportunity to delay ready
            window.setTimeout(reslove);

        } else {

            // Use the handy event callback
            document.addEventListener("DOMContentLoaded", completed);

            // A fallback to window.onload, that will always work
            window.addEventListener("load", completed);
        }

    });

    PuSet.readyException = function (error) {
        window.setTimeout(function () {
            throw error;
        });
    };

    PuSet.fn.ready = function (fn) {

        readyPromise
            .then(() => fn(PuSet))

            // Wrap PuSet.readyException in a function so that the lookup
            // happens at the time of error handling instead of callback
            // registration.
            .catch(function (error) {
                PuSet.readyException(error);
            });

        return this;
    };


    // ||||||||||  |||     ||| ||||||||||  |||     ||| |||||||||||
    // |||         |||     ||| |||         |||||   |||     |||    
    // ||||||||||  |||     ||| ||||||||||  ||| ||| |||     |||    
    // |||           ||| |||   |||         |||   |||||     |||    
    // ||||||||||      |||     ||||||||||  |||     |||     |||    

    const rnothtmlwhite = (/[^\x20\t\r\n\f]+/g);
    const rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

    function returnFalse() {
        return false;
    }

    // ActionEvent is based on DOM3 Events as specified by the ECMAScript Language Binding
    // https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
    const ActionEvent = createClass({
        "target": null,
        "type": "",
        "srcEvent": null,
        "isFirst": true,
        "isFinal": true,
        "isCustom": false,
        "namespace": "",
        "rnamespace": null,

        /**
         * 
         * @param {string|ActionEvent|Event} src 
         * @param {object} props 
         * @returns 
         */
        constructor: function ActionEvent(src, props) {

            if (src instanceof ActionEvent) {
                return props ? PuSet.extend(src, props) : src;
            }

            this.center = { "x": 0, "y": 0 };

            // Event object
            if (src && src.type) {
                this.srcEvent = src;
                this.type = src.type;

                // Event type
            } else {
                this.type = src;
            }

            // Put explicitly provided properties onto the event object
            if (props) {
                PuSet.extend(this, props);
            }

            // Create a timestamp if incoming event doesn't have one
            this.timeStamp = src && src.timeStamp || Date.now();
        },

        preventDefault: function () {
            if (this.srcEvent) {
                this.srcEvent.preventDefault();
            }
        },

        stopPropagation: function () {
            if (this.srcEvent) {
                this.srcEvent.stopPropagation();
            }
        },

        stopImmediatePropagation: function () {
            if (this.srcEvent) {
                this.srcEvent.stopImmediatePropagation();
            }
        },

        getComposedPath: function (target) {
            let path, obj;
            if (obj = this.srcEvent) {
                if (obj.composedPath) {
                    path = obj.composedPath();
                } else if (obj.path) {
                    path = obj.path;
                } else {
                    for (path = [obj = obj.target]; obj = obj.parentNode; path.push(obj));
                    path.push(window);
                }
            }
            path = toArray(path || []);
            return path.slice(0, 1 + path.indexOf(target || this.target));
        }

    });

    /**
     * 从 arr 中找出与 obj 部分属性（attrs）相同的对象
     * @param {any[]} arr 数组
     * @param {object} obj 查找对象
     * @param {string[]} attrs 对比属性列表
     * @param {(item:object, index:number) => boolean} func 如果从arr中找到了，则执行func，如果func() 返回 false，中止查找后续，否则继续查找
     */
    function similar(arr, obj, attrs, func) {
        let elem, all, length;
        if (isArrayLike(arr) && (length = arr.length) > 0) {
            if (isFunction(attrs)) {
                func = attrs, attrs = obj == null ? null : Object.keys(obj);
            }
            f: while (length--) {
                elem = arr[length], all = true;
                PuSet.each(attrs, attr => all = all && elem[attr] === obj[attr]);
                if (all && (func(elem, length) === false)) {
                    break f;
                }
            }
        }
    }

    function removeEventListener(elem, type, handle) {

        // This "if" is needed for plain objects
        if (elem.removeEventListener) {
            elem.removeEventListener(type, handle);
        }
    }

    const HANDLER_ATTRS = ["isCustom", "handler", "selector", "namespace"];

    const ActionInput = createClass({

        /**
         * 抑制器：触发 dblclick 时，不触发 click
         */
        restrictive: false,

        /**
         * 自定义事件的管理器，依赖于 Hammer
         */
        manager: null,

        /**
         * 事件监听器
         */
        listener: returnFalse,

        /**
         * 是否已注册了自定义事件的管理器
         */
        registered: false,


        inputClass: null,

        target: null,

        handlers: null,

        /**
         * 某个元素的交互行为监听集合
         * @param {HTMLElement} target 
         * @returns 
         */
        constructor: function ActionInput(target) {
            const actionInput = this;
            // 目标元素
            this.target = target;
            // 用户事件集合
            this.handlers = {};
            // 绑定到DOM元素上的事件
            this.listener = function (ev) {
                actionInput.trigger(new ActionEvent(ev));
            };

            return this;
        },

        init: function () {

            if (!this.registered) {

                if (window.Hammer && Hammer.Manager) {

                    const actionInput = this;
                    actionInput.manager = new Hammer.Manager(actionInput.target, {
                        recognizers: Hammer.defaults.preset,
                        inputClass: actionInput.inputClass,
                        domEvents: false
                    });

                    /**
                     * emit event to the listeners
                     * @param {String} event
                     * @param {Object} data
                     */
                    actionInput.manager.emit = function (event, data) {
                        data.isCustom = true;
                        actionInput.trigger(new ActionEvent(event, data));
                    };

                    actionInput.registered = true;
                } else {
                    console.warn("`PuSet().action()` need library `Hammer`.\nsee http://hammerjs.github.io/")
                }
            }

            return this;

        },

        /**
         * 添加事件监听
         * @param {string|string[]} types 事件类型
         * @param {string} selector 选择器
         * @param {Function} fn 监听成功时执行的函数
         * @param {boolean} one 只执行一次
         * @param {boolean} isSystem 系统级事件
         * @returns 
         */
        add: function (types, selector, fn, one, isSystem) {

            const actionInput = this;

            // Types can be a map of types/handlers
            if (typeof types === TYPE_OBJECT) {
                for (let type in types) {
                    this.add(type, selector, types[type], one, isSystem);
                }
                return actionInput;
            }

            if (fn == null) {
                if (typeof selector === "string") {
                    fn = undefined;
                } else {
                    fn = selector;
                    selector = undefined;
                }
            }

            if (fn === false) {
                fn = returnFalse;
            } else if (!fn) {
                return actionInput;
            }

            const isCustom = !isSystem;

            let t, type, tmp, namespaces;

            // Handle multiple events separated by a space
            types = (types || "").match(rnothtmlwhite) || [""];
            t = types.length;
            while (t--) {
                tmp = rtypenamespace.exec(types[t]) || [];
                type = tmp[1];
                namespaces = (tmp[2] || "").split(".").sort();

                // There *must* be a type, no attaching namespace-only handlers
                if (!type) {
                    continue;
                }

                let handlerObj = {
                    selector: selector,
                    isCustom: isCustom,
                    handler: fn,
                    one: !!one,
                    namespace: namespaces.join(".")
                };

                let arr, isNewHandler = true;
                if (!Array.isArray(arr = actionInput.handlers[type])) {
                    actionInput.handlers[type] = arr = new Array(0);
                }

                // 判断是否存在
                similar(arr, handlerObj, HANDLER_ATTRS, () => isNewHandler = false);

                if (isNewHandler) {
                    arr.push(handlerObj);
                    // TODO 
                    // 添加事件监听
                    if (isSystem && actionInput.target.addEventListener) {
                        actionInput.target.addEventListener(type, actionInput.listener);
                    }
                }
            }

            return actionInput;

        },


        /**
         * 移除事件监听
         * @param {string|string[]} types 事件类型
         * @param {string} selector 选择器
         * @param {Function} fn 监听成功时执行的函数
         * @returns 
         */
        remove: function (types, selector, fn) {
            let actionInput = this;

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
                    for (type in actionInput.handlers) {
                        this.remove(type + types[t], selector, fn);
                    }
                    continue;
                }

                tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");

                let arr = actionInput.handlers[type];

                similar(arr, null, (obj, i) => {

                    if ((!tmp || tmp.test(obj.namespace)) &&
                        (!selector || selector === obj.selector || selector === "**" && obj.selector) &&
                        (!fn || fn === obj.handler)) {

                        arr.splice(i, 1);

                    }

                });

                if (!arr || arr.length == 0) {
                    // 移除事件监听
                    removeEventListener(actionInput.target, type, actionInput.listener);
                }
            }
            return actionInput;
        },

        /**
         * 触发事件
         * @param {string|Event|ActionEvent} event 事件
         * @returns 
         */
        trigger: function (event) {

            const actionInput = this, removedItems = [];

            let type = hasOwn.call(event, "type") ? event.type : event,
                namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];

            if (!event.isCustom && type.indexOf(".") > -1) {

                // Namespaced trigger; create a regexp to match event type in handle()
                namespaces = type.split(".");
                type = namespaces.shift();
                namespaces.sort();
            }

            const handlers = this.handlers[type];
            const actionEvent = new ActionEvent(event);
            actionEvent.type = type;
            actionEvent.namespace = namespaces.join(".");
            actionEvent.rnamespace = actionEvent.namespace ?
                new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") :
                null;

            if (!actionEvent.target) {
                actionEvent.target = actionInput.target;
            }

            const path = actionEvent.getComposedPath(actionInput.target);

            PuSet.each(handlers, function (handleObj, i) {

                if (actionEvent.isCustom === handleObj.isCustom) {

                    const entrus = function (elem) {

                        // If the event is namespaced, then each handler is only invoked if it is
                        // specially universal or its namespaces are a superset of the event's.
                        if (!actionEvent.rnamespace || handleObj.namespace === false ||
                            actionEvent.rnamespace.test(handleObj.namespace)) {

                            handleObj.handler.call(elem, actionEvent);
                        }
                    };

                    if (handleObj.selector) {
                        const selector = toArray(PuSet(handleObj.selector, actionInput.target));
                        if (selector.length) {
                            PuSet.each(path.filter(item => selector.includes(item)), entrus);
                        }
                    } else {
                        entrus(actionInput.target);
                    }

                    // 删除只需要触发一次的事件监听
                    if (handleObj.one) {
                        removedItems.push(i);
                    }

                }
            });

            let length = removedItems.length;
            while (length--) {
                handlers.splice(removedItems[length], 1);
            }

            // 移除事件监听
            if (!handlers || handlers.length === 0) {
                removeEventListener(actionInput.target, type, actionInput.listener);
            }

        }

    });

    const ActionInputMap = {
        /** @type {Map<Element, ActionInput>} */
        data: new Map(),
        /**
         * 
         * @param {Element} elem 
         * @returns {ActionInput}
         */
        get: function (elem) {
            if (!this.data.has(elem)) {
                this.data.set(elem, new ActionInput(elem));
            }
            return this.data.get(elem);
        },

        remove: function (elem) {
            this.data.delete(elem);
        }

    };

    PuSet.extend({

        ActionEvent: ActionEvent,

        /**
         * 获取元素的行为交互监听集合
         * @param {HTMLElement} target 目标元素
         * @param {boolean} init 是否初始化触摸事件环境
         * @returns {ActionInput}
         */
        getActionInput: function getActionInput(target, init) {
            return init === true ? ActionInputMap.get(target).init() : ActionInputMap.get(target);
        }

    });

    PuSet.fn.extend({
        on: function (types, selector, fn) {
            return this.each(function (target) {
                PuSet.getActionInput(target, false).add(types, selector, fn, false, true);
            });
        },
        one: function (types, selector, fn) {
            return this.each(function (target) {
                PuSet.getActionInput(target, false).add(types, selector, fn, true, true);
            });
        },
        setInputClass: function (inputClass) {
            return this.each(function (target) {
                PuSet.getActionInput(target, false).inputClass = inputClass;
            });
        },
        setManager: function (fn) {
            return this.each(function (target) {
                fn(PuSet.getActionInput(target, true).manager);
            });
        },
        action: function (types, selector, fn) {
            return this.each(function (target) {
                PuSet.getActionInput(target, true).add(types, selector, fn, false, false);
            });
        },
        off: function (types, selector, fn) {

            if (typeof types === TYPE_OBJECT) {

                // ( types-object [, selector] )
                for (let type in types) {
                    this.off(type, selector, types[type]);
                }
                return this;
            }

            if (selector === false || typeof selector === TYPE_FUNCTION) {

                // ( types [, fn] )
                fn = selector;
                selector = undefined;
            }
            if (fn === false) {
                fn = returnFalse;
            }

            return this.each(function (target) {
                PuSet.getActionInput(target, false).remove(types, selector, fn, false);
            });
        },
        trigger: function (type) {
            return this.each(function (target) {
                PuSet.getActionInput(target, false).trigger(type);
            });
        }
    });

    let

        // Map over PuSet in case of overwrite
        _PuSet = window.PuSet,

        // Map over the $ in case of overwrite
        _$ = window.$;

    PuSet.noConflict = function (deep) {
        if (window.$ === PuSet) {
            window.$ = _$;
        }

        if (deep && window.PuSet === PuSet) {
            window.PuSet = _PuSet;
        }

        return PuSet;
    };

    // Expose PuSet and $ identifiers, even in AMD
    // (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
    // and CommonJS for browser emulators (#13566)
    if (typeof noGlobal === "undefined") {
        window.PuSet = window.$ = PuSet;
    }

    return PuSet;

});