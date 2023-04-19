/*

华北地区：北京市|110000，天津市|120000，河北省|130000，山西省|140000，内蒙古自治区|150000，

东北地区： 辽宁省|210000，吉林省|220000，黑龙江省|230000，

华东地区： 上海市|310000，江苏省|320000，浙江省|330000，安徽省|340000，福建省|350000，江西省|360000，山东省|370000，

华中地区： 河南省|410000，湖北省|420000，湖南省|430000，

华南地区：广东省|440000，广西壮族自治区|450000，海南省|460000，

西南地区：重庆市|500000，四川省|510000，贵州省|520000，云南省|530000，西藏自治区|540000，

西北地区： 陕西省|610000，甘肃省|620000，青海省|630000，宁夏回族自治区|640000，新疆维吾尔自治区|650000，

特别地区：台湾地区(886)|710000，香港特别行政区（852)|810000，澳门特别行政区（853)|820000

*/


/**
 * 获取中国居民身份证校检码
 * 
 * @param {String} str 18位中国身份证号码（至少前17位）
 * @returns 身份证第18位校检码 
 */
function getCheckCodeForIDNumber(str) {
    var arr = ("" + str).trim().split("");
    // 校检规则
    var ini = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

    if (arr.length < ini.length) {
        return -1;
    }

    var jj = [1, 0, 10, 9, 8, 7, 6, 5, 4, 3, 2];

    var z = 0;

    for (var i = 0; i < ini.length; i++) {
        z += arr[i] * ini[i];
    }

    return jj[z % 11];

}

// alert(getCheckCodeForIDNumber("51302619700220228"));

const outer = document.querySelector("#outer");

document.querySelector("#pid").addEventListener("input", function (ev) {
    outer.innerHTML = getCheckCodeForIDNumber(this.value);
});