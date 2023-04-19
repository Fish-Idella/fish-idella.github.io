class Game {


/*

&  同 1 取 1
|  有 1 取 1
^  不同 取 1，相同 取 0





1000000111111001111

0000000111111000000

1000000000000001111





*/








    // Table 元素
    target = null;
    // 游戏方块元素合集
    tdBox = null;
    // 成绩输出框
    score = null;
    // 操作输入框
    buttons = null;
    // 预览框元素合集
    peview = null;
    // 游戏数据合集
    box = null;

    // 方块初始形状
    xingzhuang = [
        // I 型
        [0b0000000000001111, 0b1000100010001000],

        // L 
        [0b0000000000101110, 0b0000100010001100, 0b0000000011101000, 0b0000110001000100],

        // T 型
        [0b0000000001001110, 0b0000100011001000, 0b0000000011100100, 0b0000010011000100],

        // J
        [0b0000000010001110, 0b0000110010001000, 0b0000000011100010, 0b0000010001001100],

        // O 型
        [0b0000000011001100],

        // S
        [0b0000000001101100, 0b0000100011000100],

        // Z
        [0b0000000011000110, 0b0000010011001000]
    ];

    /**
     * 
     * @param {HTMLTableElement} target Table Element
     */
    constructor(target) {

        this.target = target;
        this.tdBox = [];
        this.peviewBox = [[], []];
        this.next = this.getRandomInt(7);

        target.innerHTML = '<tbody id="game-outer"></tbody>';
        const element = target.querySelector("tbody");

        let li, italic, row, col;

        if ((innerWidth / innerHeight) > 0.7) {
            row = 21, col = 16;
        } else {
            row = 26, col = 11;
        }

        let maxWidth = Math.min(Math.floor(innerHeight / row), Math.floor(innerWidth / col));

        element.style.width = maxWidth * col + "px";
        element.style.height = maxWidth * row + "px";

        for (let i = 0; i < 20; i++) {
            li = document.createElement("tr");
            let lineBox = [];
            for (let l = 0; l < 10; l++) {
                italic = document.createElement("td");
                lineBox.push(italic);
                li.appendChild(italic);
            }
            this.tdBox.push(lineBox);
            element.appendChild(li);
        }

        if (row > 21) {
            // buttons
            li = document.createElement("tr");
            this.buttons = document.createElement("td");
            this.buttons.setAttribute("colspan", 10);
            this.buttons.style.height = `${maxWidth * 3}px`;
            li.appendChild(this.buttons);
            element.insertBefore(li, element.firstElementChild);

            li = document.createElement("tr");
            for (let i = 0; i < 4; i++) {
                italic = document.createElement("td");
                this.peviewBox[1].push(italic);
                li.appendChild(italic);
            }
            element.insertBefore(li, element.firstElementChild);

            // score
            li = document.createElement("tr");
            this.score = document.createElement("td");
            this.score.setAttribute("rowspan", 2);
            this.score.setAttribute("colspan", 5);
            li.appendChild(this.score);

            // peview
            this.peview = document.createElement("td");
            this.peview.setAttribute("rowspan", 2);
            li.appendChild(this.peview);

            for (let i = 0; i < 4; i++) {
                italic = document.createElement("td");
                this.peviewBox[0].push(italic);
                li.appendChild(italic);
            }
            element.insertBefore(li, element.firstElementChild);
        } else {
            li = element.firstElementChild;
            // peview
            this.peview = document.createElement("td");
            this.peview.setAttribute("rowspan", 2);
            li.appendChild(this.peview);

            for (let i = 0; i < 4; i++) {
                italic = document.createElement("td");
                this.peviewBox[0].push(italic);
                li.appendChild(italic);
            }
            li = element.children.item(1);
            for (let i = 0; i < 4; i++) {
                italic = document.createElement("td");
                this.peviewBox[1].push(italic);
                li.appendChild(italic);
            }

            // score
            li = element.children.item(2);
            this.score = document.createElement("td");
            this.score.setAttribute("rowspan", 2);
            this.score.setAttribute("colspan", 5);
            li.appendChild(this.score);

            // buttons
            li = element.children.item(4);
            this.buttons = document.createElement("td");
            this.buttons.setAttribute("rowspan", 16);
            this.buttons.setAttribute("colspan", 5);
            li.appendChild(this.buttons);
        }

    }

    next = 0;

    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    getNextBlock() {
        this.currentArray = this.xingzhuang[this.current = this.next];
        this.changeIndex = 0;
        this.next = this.getRandomInt(7);
    }

    showNextBlock() {
        let block = this.xingzhuang[this.next][0];
        for (let i = 0; i < 2; i++) {
            this.updateView(this.peviewBox[1 - i], block & 0b1111, this.next);
            block = block >> 4;
        }
    }

    // 当前图形代码
    current = 0;

    // 当前图形序号
    currentIndex = 0;

    // 当前图形列表
    currentArray = this.xingzhuang[this.current];

    // 修改当前图形序号
    // 旋转图形
    changeIndex() {
        let length = this.currentArray.length;
        this.changeIndex = (this.currentIndex + 1) % length;
    }

    /**
     * 更新图形显示
     * 
     * @param {Element[]} arr 元素集
     * @param {number} value 值
     * @param {number} xing 图形代码
     */
    updateView(arr, value, xing) {
        var i = arr.length;
        while (i--) {
            // console.log("     a: " + a.toString(2));
            // console.log("1022|a: " + (1022 | a).toString(2));
            // console.log("   0|a: " + (1022 | a).toString(2));
            arr[i].className = ((1022 | value) === 1022) ? "" : ("background-" + xing);
            value = value >> 1;
        }
    }

    remove(line, value) {
        if (line >= 0) {
        // 相同取0
            let old = this.box[line] || 0;
            this.box[line] = old === 0 ? 0 : (old ^ value);
        }
    }

    insert(line, xing, index) {

        let c_xingzhuang = this.xingzhuang[xing][index];
        let a, currentLine, b;
        for (let i = 0; i < 4; i++) {
            a = (c_xingzhuang & 0b1111) << 3;
            c_xingzhuang = c_xingzhuang >> 4;

            currentLine = line - i;
            if (currentLine >= 0) {
                b = this.box[currentLine] || 0;
                
                this.remove(currentLine - 1, a);
                this.updateView(
                    this.tdBox[currentLine],
                    this.box[currentLine] = b | a, 
                    xing
                );

                if ((a & b) > 0) {
                    return currentLine;
                }
            }
        }

        return -1;
    }


    start() {
        this.box = new Array(20);


        this.getNextBlock();
        this.showNextBlock();

        var i = 0;

        var t = setInterval(() => {

            let insert = this.insert(i, this.current, this.changeIndex);

            console.log(insert);

            if (insert >= 0) {
                i = 0;
                this.getNextBlock();
                this.showNextBlock();
            }

            if (insert === 1) {
                clearInterval(t)
            }

            i = (i + 1) % 20;

        }, 100);
    }
}

const game = new Game(document.getElementById("game-box"));

// game.start();

var a = 0b1001111000;
var b = 0b0001111000;

// a|b  0b1000000000
console.log(
    Math.abs(~b + 1).toString(2)
)