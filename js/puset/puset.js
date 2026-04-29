const PuSet = (function () {

	"use strict"; // 启用严格模式，避免隐式错误

	const OBJECT_PROTO = Object.prototype;
	const hasOwnProperty = OBJECT_PROTO.hasOwnProperty;
	const toString = OBJECT_PROTO.toString;

	const assign = Object.assign || function assign(target) {
		// 参数验证
		if (target == null) {
			throw new TypeError('Cannot convert undefined or null to object');
		}

		var to = Object(target);

		// 处理所有源对象
		for (var i = 1; i < arguments.length; i++) {
			var nextSource = arguments[i];
			if (nextSource != null) { // 跳过null和undefined
				// 遍历源对象的所有可枚举自有属性
				for (var nextKey in nextSource) {
					// 检查是否为自有属性
					if (hasOwnProperty.call(nextSource, nextKey)) {
						to[nextKey] = nextSource[nextKey];
					}
				}
			}
		}

		return to;
	};

	const setPrototypeOf = Object.setPrototypeOf || function setPrototypeOf(o, proto) {
		try {
			o && (o.__proto__ = proto);
		} finally {
			return o;
		}
	};

	// 统一数组判断函数：兼容旧环境 + 可靠原生判断
	const isArray = Array.isArray || function (obj) {
		// 原生Array.isArray不存在时，
		// 利用Object.prototype.toString获取对象原生类型标识，精准判断数组
		return toString.call(obj) === "[object Array]";
	};

	/**
	 * 判断是否为【类数组对象】
	 * 包含：纯数组、原型链为数组的对象、合法length的类数组(arguments/DOM集合等)
	 * @param {*} obj 待判断对象
	 * @returns {boolean}
	 */
	const isArrayLike = function isArrayLike(obj) {
		// 1. 双重判断：
		// isArray(obj)：识别【原生真数组】（跨iframe、原生类型校验，篡改原型不影响）
		// obj instanceof Array：识别【篡改原型的伪数组】
		// - Object.setPrototypeOf({}, [])
		// - function A(){} A.prototype=[]; new A()
		// 二者结合，覆盖所有原型继承数组的对象
		if (isArray(obj) || obj instanceof Array) {
			return true;
		}

		// 获取对象基础类型
		const type = typeof obj;

		// 2. 排除绝对不可能为类数组的类型：
		// null / undefined / 函数 / window全局对象（特殊对象，排除）
		if (obj === null || type === "undefined" || type === "function" || obj.window === obj) {
			return false;
		}

		// 3. 校验类数组核心条件：必须拥有合法length属性
		const length = obj.length;
		// typeof length === "number"：length必须是数字类型
		// length === length >>> 0：无符号右移0位，校验length为【非负整数】
		// 过滤：负数、小数、NaN、非法length
		return typeof length === "number" && length === length >>> 0;
	};

	const createClass = function createClass(prototype, superClass) {
		// 参数验证
		if (!prototype || typeof prototype !== 'object') {
			throw new Error('prototype must be a valid object');
		}

		const constructor = prototype.constructor;
		if (typeof constructor !== 'function') {
			throw new Error('prototype must have a constructor method');
		}

		const Class = typeof superClass === 'function' ? superClass : Object;
		constructor.prototype = Class === Object ? prototype : setPrototypeOf(prototype, Class.prototype);
		Object.defineProperty(constructor.prototype, 'base', {
			value: function base() {
				Class.apply(this, arguments);
			},
			writable: false,
			configurable: false,
			enumerable: false
		});
		return constructor;
	};

	const PuSet = createClass({
		constructor: function PuSet(selector, context) {
			if (selector == null) {
				return this;
			}
		},

		query(selector) {

		}
	}, Array);

	return PuSet;

}());