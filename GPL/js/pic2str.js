(function (tools) {


    // c/255 = x/l

    // x = l * (c / 255)

    // x = c * l / 255

    // var colorString = "MWEBHFNARKXYZVGUSPQDOCTLJI!;,.";
    //   colorString = "MQWBNHEKRAGXSDOTPFUZVCYLJI!;.";
    //   colorString = "€MQW#BNHEqKmRp¥gdA8G@XSbD$OTPwFk9y6UhZe0aVx&%5sC4fY2LonJuz3£cjIvt}{rl?¿1i7><][=)(|+*¡!\/;:-,~_·.'";
    // colorString = "MWEBHFNARKXYZVGUSPQDOCTLJI";
    // colorString = 'WM#oahkbdpqwmZO0QLCJUYXzcvunxrjft1ilI';

    var length = tools.an.length / 255;

    /**
     * 
     * @param {HTMLCanvasElement} canvas 绑定的 Canvas 元素
     * @param {Number} rowcount 横向字符数（每一行字符数量）
     * @param {Number} ratio 字符对应图片单元的长宽比
     * @returns 
     */
    this.Pic2Str = class {

        static canvas = null;

        static context = null;

        static rowcount = 25;

        static colcount = 5;

        static dot = 1;

        static ratio = 1;

        static minWidth = 1;

        static minHeight = 1;

        static loaded = false;

        static complete = "";

        constructor(canvas, rowcount = 25, ratio = 15 / 27) {

            this.canvas = canvas;

            this.context = canvas.getContext("2d");

            this.setRowCount(rowcount, ratio);

            return this;
        }

        onImageloaded(a, b) { }

        /**
         * @param {Function} callback 图片加载成功监听回调
         * @returns 返回对象本身
         */
        setOnImageloadedEventListener(callback) {
            if (tools.isFunction(callback)) {
                this.onImageloaded = callback;
                if (this.loaded) {
                    this.onImageloaded(this.canvas, this);
                }
            }
            return this;
        }

        setRowCount(rowcount = 25, ratio = 15 / 27) {
            this.rowcount = rowcount;
            this.ratio = ratio;

            this.minHeight = Math.floor(7 / ratio);  // 单位图片高度
            this.dot = Math.floor(this.minHeight / 5) || 1;     // 小点对应高度
        }

        loadImage(url, callback) {
            var img = new Image;

            img.addEventListener("load", () => {

                // 调整 canvas 和图片的 宽高
                let width = this.canvas.width = 7 * this.rowcount, // 缩放图片
                    height = this.canvas.height = tools.getHeight(width, img.naturalWidth, img.naturalHeight);

                this.colcount = Math.ceil(height / this.minHeight);
                this.context.drawImage(img, 0, 0, width, height);
                this.loaded = true;

                this.onImageloaded(this.canvas, this);

            }, false);

            if (arguments.length > 1) {
                this.setOnImageloadedEventListener(callback);
            }

            this.loaded = false;
            img.src = url;
        }

        toText(checked) {

            var i, j, x, y, p, result = [];
            var n;

            if (this.colcount > 4) {
                for (j = 0; j < this.colcount; j++) {
                    for (i = 0; i < this.rowcount; i++) {
                        if (checked) {
                            for (p = 0, y = 0; y < 5; y++) {
                                for (x = 0; x < 2; x++) {
                                    p += tools.getGreen(this.context.getImageData(7 * i + (x * 3 + 1), j * this.minHeight + y * this.dot, 2, 2).data);
                                }
                            }

                            n = Math.floor((p / 10) * length) - 1;
                            if (n < 0) {
                                n = 0;
                            }
                            result.push(tools.an.charAt(n));
                        } else {
                            for (p = 0, y = 0; y < 5; y++) {
                                for (x = 0; x < 2; x++) {
                                    if (tools.getGreen(this.context.getImageData(7 * i + (x * 3 + 1), j * this.minHeight + y * this.dot, 2, 2).data) > 125) {
                                        p |= (1 << (9 - (y * 2 + x)));
                                    }
                                }
                            }
                            result.push(tools.braille.charAt(p & 255));
                        }
                    }
                    result.push("\n");
                }
            } else {
                result.push("发生一个错误");
            }
            this.onComplete(this.complete = result.join(""));
        }

        onComplete(text) { }

        /**
         * @param {Function} callback 转换字符成功监听回调
         * @returns 返回对象本身
         */
        setOnCompletedEventListener(callback) {
            if (tools.isFunction(callback)) {
                this.onComplete = callback;
                if (this.loaded) {
                    this.onComplete(this.complete);
                }
            }
            return this;
        }
    };

}({

    main: "%u2800",

    an: "⣿⡿⣯⣛⠿⠯⢏⠶⠗⢇⠕⡊⣂⠡⠢⠂",

    braille: "⠂⢀⡀⣀⠠⢠⡠⣠⠄⢄⡄⣄⠤⢤⡤⣤⠐⢐⡐⣐⠰⢰⡰⣰⠔⢔⡔⣔⠴⢴⡴⣴⠂⢂⡂⣂⠢⢢⡢⣢⠆⢆⡆⣆⠦⢦⡦⣦⠒⢒⡒⣒⠲⢲⡲⣲⠖⢖⡖⣖⠶⢶⡶⣶" +
        "⠈⢈⡈⣈⠨⢨⡨⣨⠌⢌⡌⣌⠬⢬⡬⣬⠘⢘⡘⣘⠸⢸⡸⣸⠜⢜⡜⣜⠼⢼⡼⣼⠊⢊⡊⣊⠪⢪⡪⣪⠎⢎⡎⣎⠮⢮⡮⣮⠚⢚⡚⣚⠺⢺⡺⣺⠞⢞⡞⣞⠾⢾⡾⣾" +
        "⠁⢁⡁⣁⠡⢡⡡⣡⠅⢅⡅⣅⠥⢥⡥⣥⠑⢑⡑⣑⠱⢱⡱⣱⠕⢕⡕⣕⠵⢵⡵⣵⠃⢃⡃⣃⠣⢣⡣⣣⠇⢇⡇⣇⠧⢧⡧⣧⠓⢓⡓⣓⠳⢳⡳⣳⠗⢗⡗⣗⠷⢷⡷⣷" +
        "⠉⢉⡉⣉⠩⢩⡩⣩⠍⢍⡍⣍⠭⢭⡭⣭⠙⢙⡙⣙⠹⢹⡹⣹⠝⢝⡝⣝⠽⢽⡽⣽⠋⢋⡋⣋⠫⢫⡫⣫⠏⢏⡏⣏⠯⢯⡯⣯⠛⢛⡛⣛⠻⢻⡻⣻⠟⢟⡟⣟⠿⢿⡿⣿",

    isFunction: function isFunction(obj) {

        // Support: Chrome <=57, Firefox <=52
        // In some browsers, typeof returns "function" for HTML <object> elements
        // (i.e., `typeof document.createElement( "object" ) === "function"`).
        // We don't want to classify *any* DOM node as a function.
        return typeof obj === "function" && typeof obj.nodeType !== "number";
    },

    getGrey: function getGrey(data) {
        // console.log(data.length)
        for (var result = 0, i = 0; i < data.length; i++) i % 4 != 3 && (result += data[i]);
        return Math.floor(result / 12);
    },

    getGreen: function getGreen(data) {
        for (var result = 0, i = 0; i < data.length; i++) i % 4 == 1 && (result += data[i]);
        return Math.floor(result / 4);
    },

    getHeight: function getHeight(currentWidth, naturalWidth, naturalHeight) {
        return Math.ceil(currentWidth / (naturalWidth / naturalHeight));
    }

}));