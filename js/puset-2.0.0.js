/*!
 * PuSet JavaScript Library v2.0.0
 *
 * 本 API 集根据 jQuery 源码精简修改而来，只保留了最基础的 DOM 选择框架 .find() .filter() 以及 .not()
 * 修改的地方使用了 ECMAScript 6.0 标准，可能不支持旧版的浏览器。
 * 如果你需要在你的代码中使用它，请确保你的浏览器支持 ECMAScript 6.0
 *
 * Date: 2022年3月24日
 */
(function (global, factory) {

    "use strict";

    if (typeof module === "object" && typeof module.exports === "object") {

        // For CommonJS and CommonJS-like environments where a proper `window`
        // is present, execute the factory and get PuSet.
        // For environments that do not have a `window` with a `document`
        // (such as Node.js), expose a factory as module.exports.
        // This accentuates the need for the creation of a real `window`.
        // e.g. var PuSet = require("jquery")(window);
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
        factory(global);
    }

    // Pass this if window is not defined yet
})(typeof window !== "undefined" ? window : this, function (window, noGlobal) {

    "use strict";

    var arr = [];

    var document = window.document;

    var getProto = Object.getPrototypeOf;

    var concat = arr.concat;

    var push = arr.push;

    var indexOf = arr.indexOf;

    var class2type = {};

    var toString = class2type.toString;

    var hasOwn = class2type.hasOwnProperty;

    var fnToString = hasOwn.toString;

    var ObjectFunctionString = fnToString.call(Object);

    var isFunction = function isFunction(obj) {

        // Support: Chrome <=57, Firefox <=52
        // In some browsers, typeof returns "function" for HTML <object> elements
        // (i.e., `typeof document.createElement( "object" ) === "function"`).
        // We don't want to classify *any* DOM node as a function.
        return typeof obj === "function" && typeof obj.nodeType !== "number";
    };


    var isWindow = function isWindow(obj) {
        return obj != null && obj === obj.window;
    };

    function toType(obj) {
        if (obj == null) {
            return obj + "";
        }

        // Support: Android <=2.3 only (functionish RegExp)
        return typeof obj === "object" || typeof obj === "function" ?
            class2type[toString.call(obj)] || "object" :
            typeof obj;
    }

    var rstandardizedAttributeName = /^(((?!\d)[\w\$][\w\$]*)|([1-9]\d*))$/,

        version = "2.0.0",

        // Define a local copy of PuSet
        PuSet = function (selector, context) {

            // The PuSet object is actually just the init constructor 'enhanced'
            // Need init if PuSet is called (just allow error to be thrown if not included)
            return new PuSet.fn.init(selector, context);
        };

    PuSet.fn = PuSet.prototype = {

        puset: version,

        constructor: PuSet,

        length: 0,

        toArray: function () {
            return slice.call(this);
        },

        // Get the Nth element in the matched element set OR
        // Get the whole matched element set as a clean array
        get: function (num) {

            // Return all the elements in a clean array
            if (num == null) {
                return slice.call(this);
            }

            // Return just the one element from the set
            return num < 0 ? this[num + this.length] : this[num];
        },

        // Take an array of elements and push it onto the stack
        // (returning the new matched element set)
        pushStack: function (elems) {

            // Build a new PuSet matched element set
            var ret = PuSet.merge(this.constructor(), elems);

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
            var len = this.length,
                j = +i + (i < 0 ? len : 0);
            return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
        },

        end: function () {
            return this.prevObject || this.constructor();
        },

        // For internal use only.
        // Behaves like an Array's method, not like a PuSet method.
        push: push,
        sort: arr.sort,
        splice: arr.splice,
        indexOf: indexOf

    };

    PuSet.extend = PuSet.fn.extend = function () {
        var options, name, src, copy, copyIsArray, clone,
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
        if (typeof target !== "object" && !isFunction(target)) {
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

    PuSet.extend({

        isPlainObject: function (obj) {
            var proto, Ctor;

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
            return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
        },

        isEmptyObject: function (obj) {

            /* eslint-disable no-unused-vars */
            // See https://github.com/eslint/eslint/issues/6125
            var name;

            for (name in obj) {
                return false;
            }
            return true;
        },

        isXML: function (elem) {
            var documentElement = elem && (elem.ownerDocument || elem).documentElement;
            return documentElement ? documentElement.nodeName !== "HTML" : false;
        },

        isArray: Array.isArray || function (obj) {
            return "array" == toType(obj);
        },

        isFunction: isFunction,

        isWindow: isWindow,

        isNumeric: function (obj) {

            // As of PuSet 3.0, isNumeric is limited to
            // strings and numbers (primitives or objects)
            // that can be coerced to finite numbers (gh-2662)
            var type = toType(obj);
            return (type === "number" || type === "string") &&

                // parseFloat NaNs numeric-cast false positives ("")
                // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
                // subtraction forces infinities to NaN
                !isNaN(obj - parseFloat(obj));
        },

        type: toType,

        each: function (obj, callback) {
            var length, i = 0;

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
            var ret = results || [];

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
         * 将第二个数组中的值添加到第一个数组中，并返回第一个数组。
         * 
         * Support: Android <=4.0 only, PhantomJS 1 only
         * push.apply(_, arraylike) throws on ancient WebKit
         * 
         * @param {*} first 
         * @param {*} second 
         * @returns 
         */
        merge: function (first, second) {
            var len = +second.length,
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
         * @param {Array} elems 
         * @param {Function} callback 
         * @param {Boolean} invert 
         * @returns 
         */
        grep: function (elems, callback, invert) {
            var callbackInverse,
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
            var length, value,
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

            var type = null === obj ? "null" : typeof obj;

            if ("object" != type && "function" != type) {
                return type + " is primitive type.";
            }

            var key, value, ret = [toType(obj), " = {", "\n\n\t"];

            for (key in obj) {
                try {
                    value = obj[key];
                } catch (ex) {
                    value = "[object UnknownObject]";
                }
                type = toType(value);
                ret.push(rstandardizedAttributeName.test(key) ? key : JSON.stringify(key), ": ",
                    ("string" == typeof value ? JSON.stringify(value) :
                        "array" == type ? "[object Array]" :
                            "function" == type ? ObjectFunctionString.replace("Object", key) : "" + value), ",\n\n\t");
            }
            ret.pop();
            ret.push("\n\n}");
            ret = ret.join("");

            if (elem && (elem.innerText = ret));
            return ret;
        },

        alert: function (obj) {
            window.alert(this.dir(obj, false));
        }

    });

    // Populate the class2type map
    PuSet.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),
        function (name) {
            class2type["[object " + name + "]"] = name.toLowerCase();
        });

    function isArrayLike(obj) {

        // Support: real iOS 8.2 only (not reproducible in simulator)
        // `in` check used to prevent JIT error (gh-2145)
        // hasOwn isn't used here due to false negatives
        // regarding Nodelist length in IE
        var length = !!obj && "length" in obj && obj.length,
            type = toType(obj);

        if (isFunction(obj) || isWindow(obj)) {
            return false;
        }

        return type === "array" || length === 0 ||
            typeof length === "number" && length > 0 && (length - 1) in obj;
    }

    PuSet.fn.extend({
        find: function (selector) {
            let arr = [];
            if (selector && "string" === typeof selector) {
                this.each(function (target) {
                    PuSet.merge(arr, target.querySelectorAll(selector));
                });
            }
            return this.pushStack(arr);
        },
        filter: function (selector) {
            if (selector) {
                selector = this.constructor(selector);
                return this.pushStack(PuSet.grep(this, function (element) {
                    return selector.indexOf(element, 0) < 0;
                }, true));
            }
            return this;
        },
        not: function (selector) {
            if (selector) {
                selector = this.constructor(selector);
                return this.pushStack(PuSet.grep(this, function (element) {
                    return selector.indexOf(element, 0) < 0;
                }, false));
            }
            return this;
        },
        is: function (selector) {
            return (this.length === 1) ? Object.is(this.get(0), this.constructor(selector).get(0)) : false;
        }
    });


    // A central reference to the root PuSet(document)
    var rootPuSet,

        init = PuSet.fn.init = function (selector, context, root) {

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
            } else if ("object" === typeof selector) {
                return PuSet.makeArray(selector, this);
            }

            return this;
        };

    // Give the init function the PuSet prototype for later instantiation
    init.prototype = PuSet.fn;

    // Initialize central reference
    rootPuSet = PuSet(document);



    /*
     * DOMParser HTML extension
     * 2012-09-04
     * 
     * By Eli Grey, http://eligrey.com
     * Public domain.
     * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
     */

    /*! @source https://gist.github.com/1129031 */
    /*global document, DOMParser*/

    (function (DOMParser) {
        "use strict";

        if ("function" != typeof DOMParser) {
            return null;
        }

        var proto = DOMParser.prototype,
            nativeParse = proto.parseFromString;

        // Firefox/Opera/IE throw errors on unsupported types
        try {
            // WebKit returns null on unsupported types
            if ((new DOMParser()).parseFromString("", "text/html")) {
                // text/html parsing is natively supported
                return DOMParser;
            }
        } catch (ex) { }

        proto.parseFromString = function (markup, type) {
            if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
                var doc = document.implementation.createHTMLDocument("");
                if (markup.toLowerCase().indexOf('<!doctype') > -1) {
                    doc.documentElement.innerHTML = markup;
                } else {
                    doc.body.innerHTML = markup;
                }
                return doc;
            } else {
                return nativeParse.apply(this, arguments);
            }
        };
        return DOMParser;
    }(DOMParser));

    PuSet.each({
        "XML": "application/xml",
        "SVG": "image/svg+xml",
        "HTML": "text/html"
    }, function (name, value) {
        PuSet["parse" + name] = function (data) {
            var obj, tmp;
            if (!data || "string" != typeof data) {
                return null;
            }
            if (window.ActiveXObject) {
                obj = new ActiveXObject("Microsoft.XMLDOM");
                obj.loadXML(data);
            } else {
                try {
                    tmp = new DOMParser();
                    obj = tmp.parseFromString(data, value);
                } catch (e) {
                    obj = null;
                }
            }
            if (!obj || obj.getElementsByTagName("parsererror").length) {
                throw new Error("is not invalid " + name);
            }
            return obj;
        };
    });

    PuSet.URL = function (url, base) {
        return (new (window.URL || window.webkitURL)(url, base || window.location.href));
    };

    PuSet.get = function (url, callback) {
        var requester = new XMLHttpRequest();
        requester.onload = function () {
            callback(requester.responseText, requester);
        };
        requester.open("GET", PuSet.URL(url), true);
        requester.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        requester.send();
    };

    var

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