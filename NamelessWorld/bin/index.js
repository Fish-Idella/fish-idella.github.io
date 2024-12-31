// 背景
const GameBackgroundImage = PuSetAnimation.createClass({

    list: null,

    promises: null,

    constructor: function GameBackgroundImage(list) {
        this.left = 0;
        this.list = [];
        this.promises = [];
        this.list.forEach.call(Array.isArray(list) ? list : arguments, value => this.add(value));
    },

    defOptions: {
        autoSize: true,
        offset: 1,
        left: 0,
        // 图片显示区域
        sourceX: 0,
        sourceY: 0,
        sourceWidth: 0,
        sourceHeight: 0,
        // 画布填充区域
        destinationX: 0,
        destinationY: 0,
        destinationWidth: 0,
        destinationHeight: 0
    },

    then: function (fn) {
        Promise.all(this.promises).then(fn);
    },

    add: function (value) {
        if ("string" === typeof value) {
            value = { src: value };
        }
        let image = new Image();
        let obj = Object.assign({
            getImage: () => image
        }, this.defOptions, value);

        image.src = obj.src;
        this.list.push(obj);
        this.promises.push(new Promise((resolve, reject) => {
            image.onload = function () {
                if ("auto" == obj.sourceWidth) {
                    obj.sourceWidth = image.naturalWidth;
                }
                if ("auto" == obj.sourceHeight) {
                    obj.sourceHeight = image.naturalHeight;
                }
                resolve();
            };
            image.onerror = reject;
        }));
        return obj;
    },

    animation: function (animation, ctx, timestamp, MAIN_WIDTH, MAIN_HEIGHT) {
        this.list.forEach(obj => {
            let img = obj.getImage();

            obj.left = (obj.left - (animation.speed * obj.offset)) % MAIN_WIDTH;

            let left = obj.left + obj.destinationX;
            ctx.drawImage(img, 0, 0, obj.sourceWidth, obj.sourceHeight, left, obj.destinationY, MAIN_WIDTH, MAIN_HEIGHT);
            left += MAIN_WIDTH;
            ctx.drawImage(img, 0, 0, obj.sourceWidth, obj.sourceHeight, left, obj.destinationY, MAIN_WIDTH, MAIN_HEIGHT);
        });
    }
});


PuSetAnimation.ready(
/**
 * 网页加载完成
 * 
 * @param {PuSetAnimation} animation 全局动画
 * @param {number} MAIN_WIDTH 画布宽度
 * @param {number} MAIN_HEIGHT 画布高度
 * @param {Document} document 
 * @param {HTMLDivElement} view 画布容器
 */
function (animation, MAIN_WIDTH, MAIN_HEIGHT, document, view) {

    document.body.addEventListener("keydown", function(ev) {
        if (ev.key === "Escape" || ev.keyCode === 27) {
            ev.preventDefault();
            alert("ESC");
        }
    });

    console.log(view)
    PuSetAnimation.setBackgroundImage("bin/layout/34f97f5d0fc6a4e0088f7f35e24456d3.jpeg");
    PuSetAnimation.showFPS(true)

    const backgroundImages = new GameBackgroundImage();

    let obj = backgroundImages.add({
        src: "bin/layout/980.jpg",
        offset: 0.2,

        // 图片显示区域
        sourceX: 0,
        sourceY: 0,
        sourceWidth: "auto",
        sourceHeight: "auto",

        // 画布填充区域
        destinationX: 0,
        destinationY: 0,
        destinationWidth: 0,
        destinationHeight: 500
    });
    backgroundImages.add(Object.assign({}, obj, {
        offset: 0.5,
        // 画布填充区域
        destinationX: 0,
        destinationY: 300,
        destinationWidth: 0,
        destinationHeight: 0
    }));
    backgroundImages.add(Object.assign({}, obj, {
        offset: 1,
        // 画布填充区域
        destinationX: 0,
        destinationY: 500,
        destinationWidth: 0,
        destinationHeight: 0
    }));

    console.dir(backgroundImages);

    backgroundImages.then(() => {
        animation.add({
            // 循环动画
            keep: true,
            // 优先级，数字越小越先绘制，默认1
            priority: 0,
            /**
             * 绘制动画
             * @param {CanvasRenderingContext2D} ctx 画布的2d上下文
             * @returns 
             */
            fn: (ctx, timestamp) => backgroundImages.animation(animation, ctx, timestamp, MAIN_WIDTH, MAIN_HEIGHT)
        });
    });

    let ren = new Ren("郎", "念", 0);
    animation.add({
        keep: true,
        fn: (ctx, timestamp) => ren.animation(animation, ctx, timestamp, MAIN_WIDTH, MAIN_HEIGHT)
    });

});