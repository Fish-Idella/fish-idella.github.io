class FangDou {

    delay = 500
    #timer = 0
    #running = false
    #done = function () { }

    /**
     * 
     * @param {FangDou} self 
     */
    #run(self) {
        self.#running = false;
        self.#done();
    }

    /**
     * 指定时间内的重复操作只执行最后一次
     * @param {number} d 
     */
    constructor(d) {
        this.delay = +d || 500;
    }

    /**
     * 
     * @param {function} before 
     * @param {function} after 
     */
    start(before, after) {
        if (this.#running) {
            clearTimeout(this.#timer);
        } else {
            typeof before === "function" && before();
        }
        this.#running = true;
        this.#timer = setTimeout(this.#run, this.delay, this);

        if (typeof after === "function") {
            this.#done = after;
        }

    }

}

const _modifiers = document.getElementById("modifiers");
const _text = document.getElementById("text");
const tc = document.getElementById("text-code");

const flagsArray = new Set("g");

const MainObj = {

    pattern: "",

    flags: "g",

    zy: function (str, className, odd) {
        return str ? `<span class="${typeof className === "string" ? className : "text"} ${odd ? "odd": ""
            }">${str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/\u00a0/g, " ")
            }</span>` : "";
    },

    pp: function () {
        const text = _text.value;
        if (text && MainObj.pattern) try {
            const result = [];
            let index = 0;
            let odd = 0;
            const mRegExpCode = new RegExp(MainObj.pattern, MainObj.flags);

            const splitStr = function (arr) {
                // console.log(arr)

                odd++;
                result.push(MainObj.zy(text.substring(index, arr.index)));
                result.push(MainObj.zy(text.substring(arr.index, (index = arr.index + arr[0].length)), "selected", odd % 2 === 0));

            };

            // console.log(mRegExpCode)
            if (flagsArray.has("g")) {
                const iterator = text.matchAll(mRegExpCode)
                for (let arr of iterator) {
                    splitStr(arr);
                }
            } else {
                splitStr(text.match(mRegExpCode));
            }
            result.push(MainObj.zy(text.substring(index)), "<br><br><br>");
            // console.log(result)

            tc.innerHTML = result.join("");
        } catch (ex) {

        }
    }

};

const afd = new FangDou(500);

document.getElementById("code").addEventListener("input", function () {
    MainObj.pattern = this.value.trim()
    afd.start(null, MainObj.pp);
});

document.getElementById("flags").addEventListener("change", function (ev) {
    const value = ev.target.value;
    if (flagsArray.has(value)) {
        flagsArray.delete(value)
    } else {
        flagsArray.add(value);
    }
    _modifiers.innerHTML = MainObj.flags = Array.from(flagsArray).join("");
    afd.start(null, MainObj.pp);
});

const fd = new FangDou(100);

function splitStr(text) {
    if (text) {
        return text.split("\n").map(function(value) {
            return '<code>' + value + '</code>';
        }).join("\n") + "\n";
    }

    return "\n"
}

