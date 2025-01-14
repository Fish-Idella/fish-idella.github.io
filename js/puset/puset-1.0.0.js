/**
 * PuSet.js
 * 
 * 本 API 集根据 jQuery 源码精简修改而来，只保留了最基础的 DOM 选择框架 .find() .filter() 以及 .not()
 * 修改的地方使用了 ECMAScript 6.0 标准，可能不支持旧版的浏览器。
 * 如果你需要在你的代码中使用它，请确保你的浏览器支持 ECMAScript 6.0
 * 
 * @authors Pu Kun (pu_kun@sina.com)
 * @date    2021年12月27日 00点33分
 * @version 1.0.0
 */

(function (global, factory) {

    if (typeof module === "object" && typeof module.exports === "object") {
        // For CommonJS and CommonJS-like environments where a proper `window`
        // is present, execute the factory and get PuSet.
        // For environments that do not have a `window` with a `document`
        // (such as Node.js), expose a factory as module.exports.
        // This accentuates the need for the creation of a real `window`.
        // e.g. var PuSet = require("PuSet")(window);
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
}(typeof window !== "undefined" ? window : this, function (window, noGlobal) {

    // Support: Firefox 18+
    // Can't be in strict mode, several libs including ASP.NET trace
    // the stack via arguments.caller.callee and Firefox dies if
    // you try to trace through "use strict" call chains. (#13335)
    //"use strict";
    var arr = [];

    var document = window.document;

    var slice = arr.slice;

    var flat = arr.flat ? function (array) {
        return arr.flat.call(array);
    } : function (array) {
        return arr.concat.apply([], array);
    };

    var push = arr.push;

    var filter = arr.filter;

    var indexOf = arr.indexOf;

    var class2type = {};

    var toString = class2type.toString;

    var hasOwn = class2type.hasOwnProperty;

    var version = "1.0.0",

        // Support: Android<4.1
        // Make sure we trim BOM and NBSP
        rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

        // Define a local copy of PuSet
        PuSet = function (selector, context) {

            // The PuSet object is actually just the init constructor 'enhanced'
            // Need init if PuSet is called (just allow error to be thrown if not included)
            return new PuSet.fn.init(selector, context);
        };

    PuSet.fn = PuSet.prototype = {

        // The current version of PuSet being used
        puset: version,

        constructor: PuSet,

        // The default length of a PuSet object is 0
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
        splice: arr.splice
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
        if (typeof target !== "object" && !PuSet.isFunction(target)) {
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
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (PuSet.isPlainObject(copy) ||
                        (copyIsArray = PuSet.isArray(copy)))) {

                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && PuSet.isArray(src) ? src : [];

                        } else {
                            clone = src && PuSet.isPlainObject(src) ? src : {};
                        }

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

        error: function (msg) {
            throw new Error(msg);
        },

        isFunction: function (obj) {
            return PuSet.type(obj) === "function";
        },

        isArray: Array.isArray || function (obj) {
            return PuSet.type(obj) == "array";
        },

        isWindow: function (obj) {
            return obj != null && obj === obj.window;
        },

        isNumeric: function (obj) {

            // parseFloat NaNs numeric-cast false positives (null|true|false|"")
            // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
            // subtraction forces infinities to NaN
            // adding 1 corrects loss of precision from parseFloat (#15100)
            var realStringObj = obj && obj.toString();
            return !PuSet.isArray(obj) && (realStringObj - parseFloat(realStringObj) + 1) >= 0;
        },

        isPlainObject: function (obj) {
            var key;

            // Not plain objects:
            // - Any object or value whose internal [[Class]] property is not "[object Object]"
            // - DOM nodes
            // - window
            if (PuSet.type(obj) !== "object" || obj.nodeType || PuSet.isWindow(obj)) {
                return false;
            }

            // Not own constructor property must be Object
            if (obj.constructor &&
                !hasOwn.call(obj, "constructor") &&
                !hasOwn.call(obj.constructor.prototype || {}, "isPrototypeOf")) {
                return false;
            }

            // Own properties are enumerated firstly, so to speed up,
            // if last one is own, then all properties are own
            for (key in obj) { }

            return key === undefined || hasOwn.call(obj, key);
        },

        isEmptyObject: function (obj) {
            var name;
            for (name in obj) {
                return false;
            }
            return true;
        },

        type: function (obj) {
            if (obj == null) {
                return obj + "";
            }

            // Support: Android<4.0, iOS<6 (functionish RegExp)
            return typeof obj === "object" || typeof obj === "function" ?
                class2type[toString.call(obj)] || "object" :
                typeof obj;
        },

        dir: function (obj) {
            var type = PuSet.type(obj),
                result = type + " = {\n \n\t";

            var key, value;

            for (key in obj) {
                value = obj[key];
                result += JSON.stringify(key) + ": " + (("string" == typeof value) ? JSON.stringify(value) : value) + ",\n\n\t";
            }

            return result.replace(/\t/g, "    ");
        },

        alert: function (obj) {
            window.alert(PuSet.dir(obj));
        },

        each: function (obj, callback) {
            var length, i = 0;

            if (isArrayLike(obj)) {
                length = obj.length;
                for (; i < length; i++) {
                    if (callback.call(obj[i], i, obj[i]) === false) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    if (callback.call(obj[i], i, obj[i]) === false) {
                        break;
                    }
                }
            }

            return obj;
        },

        // Support: Android<4.1
        trim: function (text) {
            return text == null ?
                "" :
                (text + "").replace(rtrim, "");
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

        // Support: Android <=4.0 only, PhantomJS 1 only
        // push.apply(_, arraylike) throws on ancient WebKit
        merge: function (first, second) {
            // console.log(second);
            var len = +second.length,
                j = 0,
                i = first.length;

            for (; j < len; j++) {
                first[i++] = second[j];
            }

            first.length = i;

            return first;
        },

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

        // arg is for internal usage only
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

            // Flatten any nested arrays
            return flat(ret);
        },

        // A global GUID counter for objects
        guid: 1

    });

    // Populate the class2type map
    PuSet.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),
        function (i, name) {
            class2type["[object " + name + "]"] = name.toLowerCase();
        });


    var zeptoMatches = function (element, selector) {
        if (!selector || !element || element.nodeType !== 1) return false;
        var matchesSelector = element.matches || element.webkitMatchesSelector ||
            element.mozMatchesSelector || element.oMatchesSelector ||
            element.matchesSelector;
        if (matchesSelector) return matchesSelector.call(element, selector);
    };

    PuSet.fn.extend({
        find: function (selector) {
            let arr = [];
            if (selector && "string" === typeof selector) {
                this.each(function () {
                    PuSet.merge(arr, this.querySelectorAll(selector));
                });
            }
            return this.pushStack(arr);
        },
        filter: function (selector) {
            if (selector && "string" === typeof selector) {
                return this.constructor(filter.call(this, function (element) {
                    return zeptoMatches(element, selector);
                }));
            }
            return this.pushStack();
        },
        not: function (selector) {
            if (!selector) {
                return this;
            }

            selector = this.constructor(selector);

            return this.pushStack(PuSet.grep(this, function (element, _i) {
                return PuSet.inArray(element, selector, 0) < 0;
            }));

        },
        is: function (selector) {
            return (this.length === 1) ?
                Object.is(this.get(0), this.constructor(selector).get(0)) :
                false;
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
            } else if (PuSet.isFunction(selector)) {
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

    function isArrayLike(obj) {

        // Support: iOS 8.2 (not reproducible in simulator)
        // `in` check used to prevent JIT error (gh-2145)
        // hasOwn isn't used here due to false negatives
        // regarding Nodelist length in IE
        var length = !!obj && "length" in obj && obj.length,
            type = PuSet.type(obj);

        if (type === "function" || PuSet.isWindow(obj)) {
            return false;
        }

        return type === "array" || length === 0 ||
            typeof length === "number" && length > 0 && (length - 1) in obj;
    }








    PuSet.isArrayLike = isArrayLike;

    // [原始回调函数集合, ]
    const delegateEventLists = [[], {}];

    function bindEvent(elements, types, callback) {
        if (!isArrayLike(elements)) {
            elements = [elements];
        }
        types = ('' + types).replace(/$\s+|\s+^/g, '').replace(/\s+/g, ' ').split(' ');
        elements.forEach(element => types.forEach(type => {
            if (element && ("function" === typeof element.addEventListener) && element.addEventListener(type, callback, false));
        }));
    }

    function unbindEvent(elements, types, callback) {
        if (!isArrayLike(elements)) {
            elements = [elements];
        }
        types = ('' + types).replace(/$\s+|\s+^/g, '').replace(/\s+/g, ' ').split(' ');
        elements.forEach(element => types.forEach(type => {
            if (element && ("function" === typeof element.removeEventListener) && element.removeEventListener(type, callback, false));
        }));
    }

    function delegateEvent(elements, types, childrenSelector, callback) {
        const i = delegateEventLists[0].push(callback) - 1;
        let arr = delegateEventLists[1][childrenSelector];
        if (!Array.isArray(arr)) arr = (delegateEventLists[1][childrenSelector] = []);
        bindEvent(elements, types, (arr[i] = function (ev) {
            const target = ev.target || ev.srcElement;
            const children = this.querySelectorAll(childrenSelector);
            if (inArray(target, children) >= 0) callback.call(target, ev);
        }));
    }

    function undelegateEvent(elements, types, childrenSelector, callback) {
        let arr = delegateEventLists[1][childrenSelector];
        if (Array.isArray(arr)) {
            const i = inArray(callback, delegateEventLists[0]);
            if (i >= 0) unbindEvent(elements, types, arr[i]);
        }
    }

    PuSet.fn.extend({
        on: function( types, selector, fn ) {
        },
        one: function( types, selector, fn ) {},
        off: function( types, selector, fn ) {}
    });










    function s(ss) {
        "http://suggestion.baidu.com/su?wd=%E5%95%86%E5%BA%97&cb=PuSet1124015850773101397242_1616170775575&_=1616170775581"

        "http://m.baidu.com/su?ie=utf-8&from=wise_web&json=1&net=1&os=1&callback=bdwpcheck&wd=%E9%AC%BC%E8%B0%B7%E5%85%AB%E8%8D%92&cb=PuSet1124013929303793124248_1616171037647&_=1616171037651"
    }

    var

        // Map over PuSet in case of overwrite
        _PuSet = window.PuSet,

        // Map over the $ in case of overwrite
        _Pu = window.Pu;

    PuSet.noConflict = function (deep) {
        if (window.Pu === PuSet) {
            window.Pu = _Pu;
        }

        if (deep && window.PuSet === PuSet) {
            window.PuSet = _PuSet;
        }

        return PuSet;
    };

    // Expose PuSet and $ identifiers, even in AMD
    // (#7102#comment:10, https://github.com/PuSet/PuSet/pull/557)
    // and CommonJS for browser emulators (#13566)
    if (!noGlobal) {
        window.PuSet = window.Pu = PuSet;
    }

    return PuSet;

}));