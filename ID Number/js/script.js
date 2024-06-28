const IDCheck = (function () {

    const rules = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2, 1];
    const checkNumber = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    /**
     * 获取中国居民身份证校检码
      * 
      * @param {String} str 18位中国身份证号码(至少前17位)
      * @returns 身份证第18位校检码 
      */
    return function IDCheck(str) {
        let sum = 0, arr = Array.from(("" + str).match(/\d/g) || 0, Number);
        for (let i = 0; i < Math.min(arr.length, 17); i++) {
            sum += arr[i] * rules[i];
        }
        return checkNumber[sum % 11];
    }

}());

const $code = document.querySelector("tr#code");
const codes = Array.from($code.querySelectorAll("td>input"));
let outer = codes[17];

$code.addEventListener("beforeinput", function (event) { event.target.value = ""; });
$code.addEventListener("input", function (event) {
    let index;
    if ((index = 1 + codes.indexOf(event.target)) > 0 && index < codes.length) {
        codes[index].focus()
    }
});
$code.addEventListener("paste", function (event) {
    event.preventDefault();
    let index = codes.indexOf(event.target);
    if (index < 0) return;
    let current, paste = (event.clipboardData || window.clipboardData).getData("text");
    for (let i = 0; i < Math.min(paste.length, codes.length - index); i++) {
        current = codes[index + i];
        current.value = paste.charAt(i);
    }
    current.focus();
});
outer.addEventListener("click", function () {
    let values = codes.map(e => e.value);

    console.log(
        outer.value = IDCheck(values.join()));

    // let info = cityInfo[values[0]];
    // document.querySelector("#region").innerHTML = info.name;

    // info = info.oooo[values[1]];
    // document.querySelector("#province").innerHTML = info.name;
});