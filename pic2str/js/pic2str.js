new function () {

    "%u2800";

    const

        braille = "⠂⢀⡀⣀⠠⢠⡠⣠⠄⢄⡄⣄⠤⢤⡤⣤⠐⢐⡐⣐⠰⢰⡰⣰⠔⢔⡔⣔⠴⢴⡴⣴⠂⢂⡂⣂⠢⢢⡢⣢⠆⢆⡆⣆⠦⢦⡦⣦⠒⢒⡒⣒⠲⢲⡲⣲⠖⢖⡖⣖⠶⢶⡶⣶" +
            "⠈⢈⡈⣈⠨⢨⡨⣨⠌⢌⡌⣌⠬⢬⡬⣬⠘⢘⡘⣘⠸⢸⡸⣸⠜⢜⡜⣜⠼⢼⡼⣼⠊⢊⡊⣊⠪⢪⡪⣪⠎⢎⡎⣎⠮⢮⡮⣮⠚⢚⡚⣚⠺⢺⡺⣺⠞⢞⡞⣞⠾⢾⡾⣾" +
            "⠁⢁⡁⣁⠡⢡⡡⣡⠅⢅⡅⣅⠥⢥⡥⣥⠑⢑⡑⣑⠱⢱⡱⣱⠕⢕⡕⣕⠵⢵⡵⣵⠃⢃⡃⣃⠣⢣⡣⣣⠇⢇⡇⣇⠧⢧⡧⣧⠓⢓⡓⣓⠳⢳⡳⣳⠗⢗⡗⣗⠷⢷⡷⣷" +
            "⠉⢉⡉⣉⠩⢩⡩⣩⠍⢍⡍⣍⠭⢭⡭⣭⠙⢙⡙⣙⠹⢹⡹⣹⠝⢝⡝⣝⠽⢽⡽⣽⠋⢋⡋⣋⠫⢫⡫⣫⠏⢏⡏⣏⠯⢯⡯⣯⠛⢛⡛⣛⠻⢻⡻⣻⠟⢟⡟⣟⠿⢿⡿⣿",

        getGlobal = function getGlobal() {
            return this;
        },

        isFunction = function isFunction(obj) {

            // Support: Chrome <=57, Firefox <=52
            // In some browsers, typeof returns "function" for HTML <object> elements
            // (i.e., `typeof document.createElement( "object" ) === "function"`).
            // We don't want to classify *any* DOM node as a function.
            return typeof obj === "function" && typeof obj.nodeType !== "number";
        },

        getGrey = function getGrey(data) {
            // console.log(data.length)
            for (var result = 0, i = 0; i < data.length; i++) i % 4 != 3 && (result += data[i]);
            return Math.floor(result / 12);
        },

        getHeight = function getHeight(currentWidth, naturalWidth, naturalHeight) {
            return Math.ceil(currentWidth / (naturalWidth / naturalHeight));
        },

        defaultImageLoaded = function (a, b) {
            b.toText();
        };

    getGlobal().Pic2Str = function (canvas, rowcount = 25, ratio = 15 / 27) {

        var mOnImageloaded = defaultImageLoaded,
            colcount = 0,                // 单位图片行数
            minHeight = Math.floor(7 / ratio),   // 单位图片高度
            dot = Math.floor(minHeight / 5) || 1,     // 小点对应高度
            img = new Image(),
            ctx = canvas.getContext("2d");

        img.addEventListener("load", () => {
            let width = canvas.width = 7 * rowcount, // 缩放图片
                height = canvas.height = getHeight(width, img.naturalWidth, img.naturalHeight);

            colcount = Math.ceil(height / minHeight);

            ctx.drawImage(img, 0, 0, width, height);
            mOnImageloaded(canvas, this);

        }, false);

        this.loadImage = function (url, callback) {
            mOnImageloaded = isFunction(callback) ? callback : defaultImageLoaded;
            img.src = url;
        };

        this.toText = function () {

            var i, j, x, y, p, result = [];

            if (colcount > 4) {
                for (j = 0; j < colcount; j++) {
                    for (i = 0; i < rowcount; i++) {
                        for (p = 0, y = 0; y < 5; y++) {
                            for (x = 0; x < 2; x++) {
                                if (getGrey(ctx.getImageData(7 * i + (x * 3 + 1), j * minHeight + y * dot, 2, 2).data) > 125) {
                                    p |= (1 << (9 - ( y * 2 + x)));
                                }
                            }
                        }
                        result.push(braille.charAt(p & 255));
                    }
                    result.push("\n");
                }
            } else {
                result.push("发生一个错误");
            }
            this.onComplete(result.join(""));
        };

        this.onComplete = function (text) { };

        return this;
    };
};