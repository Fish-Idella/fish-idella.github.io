aaa = (function () {

    // 初始化小球数量
    const length = 100;

    class Point {
        // 移动倍速
        nx = 1;
        ny = 1;
        constructor(x = 10, y = 10, n = 3) {
            this.x = x, this.y = y, this.n = n;
            this.dx = random(0, 1)
            this.dy = random(0, 1)
        }

        /**
         * @param {CanvasRenderingContext2D} ctx
         */
        draw(ctx, l) {

            if (this.dx == 1) {
                this.x += this.nx + l;
            } else {
                this.x -= this.nx + l;
            }

            if (this.dy == 1) {
                this.y += this.ny + l;
            } else {
                this.y -= this.ny + l;
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.n, 0, 2 * Math.PI); // 绘制圆形
            ctx.fillStyle = "#FFFFFF"; // 设置填充颜色
            ctx.fill(); // 填充颜色

        }
    }

    function random(start = 0, end = 100) {
        return Math.floor((1 + end - start) * Math.random() + start);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    return function (ctx, c3d, options) {
        ctx.canvas.classList.remove("hide");

        /** @type {Point[]} */
        const arr = new Array(length);
        for (let index = 0; index < length; index++) {
            arr[index] = new Point(random(0, options.dw), random(0, options.dh), 4);
        }

        let last = 0;
        requestAnimationFrame(function frame(time) {

            const w = options.dw, h = options.dh;
            const l = (time - last) / 20;

            ctx.clearRect(0, 0, w, h);

            for (let point, i = 0; i < length; i++) {
                point = arr[i];

                point.draw(ctx, l);

                if (point.x < 0) {
                    point.dx = 1;
                } else if (point.x > w) {
                    point.dx = 0;
                }
                if (point.y < 0) {
                    point.dy = 1;
                } else if (point.y > h) {
                    point.dy = 0;
                }

                for (let point2, j = 0; j < length; j++) {
                    if (i !== j) {
                        point2 = arr[j];
                        const x = point.x - point2.x;
                        const y = point.y - point2.y;
                        const juli = Math.sqrt((x ** 2) + (y ** 2));

                        if (juli < 200) {
                            if (x > 0) {
                                point.nx = Math.min(point.nx + 0.01, 2);
                            } else {
                                point.nx = Math.max(point.nx  -0.01, 0);
                            }
                            if (y > 0) {
                                point.ny = Math.min(point.ny + 0.01, 2);
                            } else {
                                point.ny = Math.max(point.ny  -0.01, 0);
                            }

                            ctx.beginPath();
                            ctx.lineWidth = Math.max((2 - (juli / 100)), 0.1);
                            ctx.strokeStyle = "#FFF";
                            ctx.moveTo(point.x, point.y);
                            ctx.lineTo(point2.x, point2.y);
                            ctx.stroke();

                            // 靠近会排斥，避免扎堆
                            if (juli <= 10) {
                                if (point.dx != point2.dx) {
                                    point.dx ^= 1;
                                    point2.dx ^= 1;
                                }
                                if (point.dy != point2.dy) {
                                    point.dy ^= 1;
                                    point2.dy ^= 1;
                                }
                            }
                        }
                    }
                }
            }

            last = time;
            requestAnimationFrame(frame);
        });
    }
}());