class Pic2Str {
    static main = 0x2800;
    static anChars = "MNHQ$OC?7>!;:-";
    // static anChars = ['𝄛', '𝄚', '𝄙', '𝄘', '𝄗', '𝄖']
    static brailleMap = [
        [0, 0],
        [0x01, 0x08],
        [0x02, 0x10],
        [0x04, 0x20],
        [0x40, 0x80]
    ];
    // ===================== 新增：八卦符号映射表 =====================
    static baguaChars = [
        "☰", // 0,0,0   黑
        "☱", // 255,0,0 红
        "☲", // 0,255,0 绿
        "☳", // 255,255,0 黄
        "☴", // 0,0,255 蓝
        "☵", // 255,0,255 紫
        "☶", // 0,255,255 青
        "☷"  // 255,255,255 白
    ];
    rowcount = 25;
    colcount = 5;
    dot = 1;
    ratio = 15 / 27;
    minHeight = 1;
    canvas;
    ctx;

    onImageloaded(a, b) { b.toText(true); }
    onComplete() { };

    constructor(canvas, rowcount = 25, ratio = 364 / 648) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d", {
            willReadFrequently: true
        });
        this.rowcount = rowcount;
        this.ratio = ratio;
        this.minHeight = Math.floor(7 / ratio);
        this.dot = Math.max(1, Math.floor(this.minHeight / 5));
    }

    // ===================== 新增：获取像素RGB（非灰度） =====================
    getPixelRGB(data, x, y) {

        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = 0; dy < this.dot; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const px = x + dx;
                const py = y + dy;

                if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
                    const idx = (py * this.canvas.width + px) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    count++;
                }
            }
        }

        // 平均值 + 二值化：>128=255 否则=0
        r = r / count > 128 ? 255 : 0;
        g = g / count > 128 ? 255 : 0;
        b = b / count > 128 ? 255 : 0;
        return [r, g, b];
    }

    getPixelGrey(data, x, y) {

        let total = 0;
        let count = 0;
        for (let dy = 0; dy < this.dot; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const px = x + dx;
                const py = y + dy;

                if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
                    const idx = (py * this.canvas.width + px) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    count++;
                }
            }
        }
        return total / count;
    }

    resize(naturalWidth, naturalHeight) {
        const width = this.canvas.width = 7 * this.rowcount;
        const height = this.canvas.height = Math.ceil(width * naturalHeight / naturalWidth);
        this.colcount = Math.ceil(height / this.minHeight);
    }

    loadImage(url) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            this.resize(img.naturalWidth, img.naturalHeight);
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.onImageloaded(this.canvas, this)
        };
        img.src = url
    }

    // ===================== 核心新功能：八卦彩色字符画 =====================
    toTextBagua() {
        if (this.colcount < 5) {
            this.onComplete("图片太小");
            return
        }

        const imageDataCache = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;

        const result = [];

        for (let j = 0; j < this.colcount; j++) {
            for (let i = 0; i < this.rowcount; i++) {
                // 采样RGB
                const [r, g, b] = this.getPixelRGB(imageDataCache, 7 * i + 1, j * this.minHeight);

                // 计算索引：0-7 完美对应8卦
                const idx = (r ? 1 : 0) | ((g ? 1 : 0) << 1) | ((b ? 1 : 0) << 2);

                result.push(Pic2Str.baguaChars[idx]);
            }
            result.push("\n");
        }

        this.onComplete(result.join(""));
    }

    toText(useGray) {
        if (this.colcount < 5) {
            this.onComplete("图片太小");
            return
        }

        const imageDataCache = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;

        const result = [];
        if (useGray) {
            const len = Pic2Str.anChars.length;
            for (let j = 0; j < this.colcount; j++) {
                for (let i = 0; i < this.rowcount; i++) {
                    let grey = 0;
                    for (let y = 0; y < 5; y++) {
                        for (let x = 0; x < 2; x++) {
                            grey += this.getPixelGrey(imageDataCache, 7 * i + 1 + x * 3, j * this.minHeight + y * this.dot)
                        }
                    }
                    result.push(Pic2Str.anChars[(grey * len / 2550) >>> 0]);
                }
                result.push("\n")
            }
        } else {
            for (let j = 0; j < this.colcount; j++) {
                for (let i = 0; i < this.rowcount; i++) {
                    let p = Pic2Str.main;
                    for (let y = 1; y < 5; y++) {
                        for (let x = 0; x < 2; x++) {
                            const g1 = this.getPixelGrey(imageDataCache, 7 * i + 1 + x * 3, j * this.minHeight + y * this.dot);
                            if (g1 < 128) p += Pic2Str.brailleMap[y][x]
                        }
                    }
                    result.push(String.fromCharCode(p === Pic2Str.main ? 0x2812 : p))
                }
                result.push("\n")
            }
        }
        this.onComplete(result.join(""))
    }

    setOnImageloadedEventListener(cb) {
        if (typeof cb === "function") this.onImageloaded = cb;
        return this
    }
    setOnCompletedEventListener(cb) {
        if (typeof cb === "function") this.onComplete = cb;
        return this
    }
}