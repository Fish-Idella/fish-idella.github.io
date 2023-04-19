let PuSet = (function (PuSet) {

    var figures = "〇一二三四五六七八九十百千万亿";
    var wordFigures = "零壹贰叁肆伍陆柒捌玖拾佰仟萬億";
    var AAA = "GSBQWSBQYSBQW";

    const slice = [].slice;
    function toArray(arr) {
        return slice.call(arr, 0);
    }

    function createFunction() {
        const array = slice.call(arguments, 0);
        const name = array.shift();
        return new Function('return Math.' + name + '.apply(' + array.join(",") + ');');
    }

    /**
     * 判断三边是否能围成三角形
     * @param {*} a 
     * @param {*} b 
     * @param {*} c 
     * @returns 三角形面积
     */
    function isTriangle(a, b, c) {
        let hasNaN = 0;
        let arr = [+a, +b, +c].sort();
        const [A, B, C] = arr;

        if (A + B === C) {
            return 0;
        }

        // 判断三参数是否为数字
        arr.forEach(value => hasNaN |= isNaN(value));

        // 三角形特性，判断三边是否能围成三角形
        // 两边之和大于第三边
        hasNaN |= !((A + B) > C);

        if (hasNaN) {
            console.error("参数错误，不能组成三角形。");
            return NaN;
        } else {
            const P = (A + B + C) / 2;
            return Math.sqrt(P * (P - A) * (P - B) * (P - C));
        }
    }

    PuSet.Math = {
        /**
         * 三角形面积公式 - 海伦公式
         * @param {array} a 参数：三角形的三边长（正数）
         * @returns 面积
         */
        Heron: function (a, b, c) {
            if (arguments.length === 1 && Array.isArray(a)) {
                return this.Heron.apply(this, a);
            } else {
                return isTriangle.apply(this, arguments);
            }
        },

        /**
         * 四舍五入成整数
         * @param {number} num 
         * @returns 
         */
        round: function (num) {
            return (+num + 0.5) | 0;
        }
    };

    return PuSet;

}(window.PuSet || {}));

console.log(PuSet.Math.round(3.9));