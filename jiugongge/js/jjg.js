
{

    /** 
     * {@type HTMLCanvasElement} 
     */
    const canvas = document.getElementById("code");
    const boxWidth = canvas.width = canvas.height = Math.min(canvas.width, canvas.height);

    const aa = (boxWidth - 20) / 3;
    const ba = 10 + aa * 2;

    const ab = aa + 10;
    const bb = ba + 10;

    const boxs = {
        "1.png": { x: 0, y: 0 },
        "2.png": { x: ab, y: 0 },
        "3.png": { x: bb, y: 0 },
        "4.png": { x: 0, y: ab },
        "5.png": { x: ab, y: ab },
        "6.png": { x: bb, y: ab },
        "7.png": { x: 0, y: bb },
        "8.png": { x: ab, y: bb },
        "9.png": { x: bb, y: bb }
    };

    const _debug = document.getElementById("debug");

    const ctx = canvas.getContext("2d");
    const draw = function draw(position) {

        PuSet.dir(position, _debug)

        if (image !== null) {
            ctx.clearRect(0, 0, boxWidth, boxWidth);
            ctx.drawImage(image, position.sx, position.sy, position.sw, position.sw, 0, 0, boxWidth, boxWidth);
        }

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, aa, boxWidth, 10);
        ctx.fillRect(0, ba, boxWidth, 10);
        ctx.fillRect(aa, 0, 10, boxWidth);
        ctx.fillRect(ba, 0, 10, boxWidth);
    };

    const positionDef = {
        ss: 1,
        sx: 0,
        sy: 0,
        sw: boxWidth
    };

    let position = Object.assign({}, positionDef);
    let image = null;

    // requestAnimationFrame
    let handle = requestAnimationFrame(draw);

    let wheelTimeStamp = 0;

    PuSet(canvas).setManager(function (manager) {
        manager.get("pan").set({ direction: Hammer.DIRECTION_ALL });
    }).action("pan", function (ev) {
        ev.preventDefault();
        cancelAnimationFrame(handle);
        handle = requestAnimationFrame(function () {
            draw(Object.assign({}, position, {
                sx: position.sx - ev.deltaX / position.ss,
                sy: position.sy - ev.deltaY / position.ss
            }));
        });
    }).action("panend", function (ev) {
        ev.preventDefault();
        cancelAnimationFrame(handle);
        handle = requestAnimationFrame(function () {
            draw(Object.assign(position, {
                sx: position.sx - ev.deltaX / position.ss,
                sy: position.sy - ev.deltaY / position.ss
            }));
        });
    }).on("wheel", function ({ srcEvent: ev }) {
        ev.preventDefault();
        cancelAnimationFrame(handle);
        handle = requestAnimationFrame(function () {

            let offset = (ev.timeStamp - wheelTimeStamp) < 50 ? 10 : 1;
            wheelTimeStamp = ev.timeStamp;
            if (ev.deltaY < 0) {
                offset = 0 - offset;
            }

            const old = position.sw;

            position.sw = Math.max(10, position.sw + offset);
            position.ss = boxWidth / position.sw;
            const ss = old * 1000000 / position.sw;
            console.log(ss)
            draw(Object.assign(position, {
                // 鼠标滚轮
                sx: position.sx + ev.offsetX * (ss - 1000000) / ss,
                sy: position.sy + ev.offsetY * (ss - 1000000) / ss
            }));
        });
    });

    document.getElementById("file").addEventListener("change", function (ev) {
        image = new Image();
        image.addEventListener("load", () => draw((position = Object.assign({}, positionDef))));
        image.src = Mm.URL.createObjectURL(this.files[0]);
    });

    document.getElementById("run").addEventListener("click", function () {
        const canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
        canvas.width = canvas.height = aa;
        const ctx2 = canvas.getContext("2d");

        PuSet.each(boxs, function (options, filename) {
            ctx2.putImageData(ctx.getImageData(options.x, options.y, aa, aa), 0, 0);
            Mm.download(canvas.toDataURL('image/png', 1), filename)
        });
    });
}