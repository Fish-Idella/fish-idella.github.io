class Barrage {

    /**
     * 当前显示的弹幕
     */
    list = null;

    /**
     * 
     * @type {HTMLCanvasElement} 
     */
    canvas = null;

    /** 
     * @type {CanvasRenderingContext2D} 
     */
    tx = null;

    /**
     * 所有弹幕
     * @type {Array[]}
     */
    all = null;

    animation = 0;

    #parse(match) {
        const keys = ['timestamp', 'userid', 'type', 'color', 'shadow', 'text'];
        const result = { x: 800, y: 0, time: 0 };
        keys.forEach((key, i) => result[key] = match[i]);
        result.width = Math.ceil(this.tx.measureText(result.text).width);
        return result;
    }

    /**
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.tx = canvas.getContext('2d');
        this.tx.font = "16px '微软雅黑'";
        this.list = [];
        this.all = {};
    }

    stop() {
        cancelAnimationFrame(this.animation);
    }

    start() {

        const barrage = this, ctx = barrage.tx, list = barrage.list;
        const line = Math.floor(450 / 20);

        function getY(list, index) {
            for (let i = index; i >= 0; i--) {
                const obj = list[i];
                const p = obj.x + obj.width + 20;
                if (p < 800) {
                    return obj.y;
                }
            }
            return 20 * (index % line + 1);
        }

        function t() {
            ctx.clearRect(0, 0, 800, 450);
            let length = list.length;
            for (let i = 0; i < length; i++) {
                const obj = list[i];
                if (obj) {
                    if (obj.width + obj.x < 0) {
                        list.splice(i, 1);
                        continue;
                    }
                    if (obj.time === 0) {
                        obj.time = Date.now();
                        obj.y = getY(list, i);
                    }
                    obj.x--;
                    ctx.strokeStyle = obj.shadow;
                    ctx.strokeText(obj.text, obj.x, obj.y);
                    ctx.fillStyle = obj.color;
                    ctx.fillText(obj.text, obj.x, obj.y);
                }
            }
            barrage.animation = requestAnimationFrame(t);
        }
        barrage.animation = requestAnimationFrame(t);
    }

    setList(arr) {
        if (Array.isArray(arr)) {
            arr.forEach((match) => {
                const timestamp = Math.floor(match[0]);
                const a = this.all[timestamp] || (this.all[timestamp] = []);
                a.push(this.#parse(match));
            });
            this.start();
        }
    }

    show(timestamp) {
        const arr = this.all[timestamp];
        if (Array.isArray(arr)) {
            arr.sort((a, b) => a.timestamp - b.timestamp)
                .forEach(obj => this.list.push(Object.assign(obj, { x: 800, y: 0, time: 0 })));
        }
    }

}