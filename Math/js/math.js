let PuSet = (function (getPuSet) {
    "use strict";

    const PuSet = (globalThis || window).PuSet || {};

    // 修改为数组形式：[常用体, 大写体]
    var figures = {
        '0': ["\u3007", "零"],
        '1': ["一", "壹"],
        '2': ["二", "贰"],
        '3': ["三", "叁"],
        '4': ["四", "肆"],
        '5': ["五", "伍"],
        '6': ["六", "陆"],
        '7': ["七", "柒"],
        '8': ["八", "捌"],
        '9': ["九", "玖"],
        'S': ["十", "拾"],
        'B': ["百", "佰"],
        'Q': ["千", "仟"],
        'W': ["万", "万"],  // 万的大写也是万
        'Y': ["亿", "亿"],  // 亿的大写也是亿
        '.': ["点", "点"],
    };

    const UNITS = ['', 'S', 'B', 'Q', 'W', 'S', 'B', 'Q', 'Y', 'S', 'B', 'Q', 'W', 'S', 'B', 'Q'];

    UNITS.int2Chinese = function int2Chinese(num) {
        const arr = num.toString().split("");
        const len = arr.length - 1;
        return arr.map((item, i) => item + this[len - i]).join('')
            .replace(/0[SBQ]/g, "0")
            .replace(/S0([WY])/g, "S$10")
            .replace(/Y0+W/g, "Y0")
            .replace(/0{2,}/g, "0")
            .replace(/(\d)0+$/g, "$1")
    };

    PuSet.Math = {
        /**
         * 三角形面积公式 - 海伦公式
         * @param {array} a 参数：三角形的三边长（正数）
         * @returns 面积
         */
        heron: function heron(a, b, c) {
            if (arguments.length === 1 && Array.isArray(a)) {
                return this.heron.apply(this, a);  // 修复递归调用
            } else if (this.isTriangle(a, b, c)) {
                const p = (a + b + c) / 2;
                return Math.sqrt(p * (p - a) * (p - b) * (p - c));
            }
            return NaN;
        },

        toChinese(num, mod = 0) {
            const [i = '0', m = ''] = num.toString().split(".");
            return (UNITS.int2Chinese(i) + (m ? '.' : '') + m).replace(/\w/g, a => figures[a][mod])  // 根据mod选择大小写;
        },

        /**
         * 判断三边是否能围成三角形
         * @param {*} a 
         * @param {*} b 
         * @param {*} c 
         * @returns 
         */
        isTriangle() {
            const arr = Array.prototype.slice.call(arguments, 0, 3).map(Number);
            if (!arr.every(n => Number.isFinite(n))) {
                return false;
            }

            const [a, b, c] = arr;
            return a + b > c && b + c > a && a + c > b;
        },

        gcd: function gcd(a, b) {
            return b === 0 ? a : this.gcd(b, a % b);  // 修复递归调用
        },

        fraction(num) {
            const [integer, decimal = ''] = String(num).split('.');
            const numerator = Number(integer + decimal);
            const denominator = 10 ** decimal.length;
            return [numerator, denominator];
        },

        /**
         * 四舍五入成整数
         * @param {number} num 
         * @returns 
         */
        round: function (num) {
            return Math.round(num);  // 修复负数问题
        }
    };

    return PuSet;

}());