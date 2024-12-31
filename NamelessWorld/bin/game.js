const PuSetAnimation = (function (mWindow, mDocument) {

    "use strict";

    mDocument = mDocument || mWindow.document;

    /**
     * 为目标元素添加事件
     * @param {Element} target 目标元素
     * @param {string} types 事件类型，多个类型空格隔开
     * @param {function} fn 事件回调
     * @param {object} options 监听参数
     * @returns 
     */
    function addEventListener(target, types, fn, options) {
        if ("object" === typeof types) {
            for (let key in types) {
                addEventListener(target, key, types[key], fn);
            }
        } else if ("function" === typeof fn) {
            ("" + types).split(/\s+/).forEach(type => target.addEventListener(type, fn, options));
        }
        return target;
    }

    // 禁用浏览器默认行为
    addEventListener(mDocument.body, "contextmenu dragstart selectstart wheel", function (ev) {
        ev.preventDefault();
        return false;
    }, { passive: false });

    /**
     * 游戏容器，游戏相关视图都放在这个元素里面
     * @type {HTMLDivElement}
     */
    let container;

    /**
     * 游戏画布
     * @type {HTMLCanvasElement}
     */
    const canvas = document.createElement("canvas");
    
    /**
     * 画布容器，控制画布缩放
     * @type {HTMLDivElement}
     */
    const view = document.createElement("div");

    // 画布尺寸
    const MAIN_WIDTH  = canvas.width  = 1920;
    const MAIN_HEIGHT = canvas.height = 1080;

    /**
     * 给元素设置CSS样式
     * @param {Element} target 目标元素
     * @param  {...any} styleSheet 样式表
     * @returns {object}
     */
    function setStyle(target, ...styleSheet) {
        const sheet = Object.assign({}, ...styleSheet);
        for (let key in sheet) {
            target.style[key] = sheet[key];
        }
        return sheet;
    }

    /**
     * 创建类
     * @param {function} obj 构造器 constructor
     * @param {object} props 公共方法
     * @returns 
     */
    function createClass(obj, props) {
        if ("function" === typeof obj.constructor) {
            Object.assign(obj.constructor.prototype, obj);
            return Object.assign(obj.constructor, props);
        }
    }

    /**
     * 缩放画布
     * @returns 
     */
    const viewScale = () => setStyle(view, {
        "transform": "scale(" + Math.min(container.clientHeight / MAIN_HEIGHT, container.clientWidth / MAIN_WIDTH) + ")"
    });

    let fpsInterval, fps, FPS;
    let readyList = [];

    /**
     * 如果a不是个数字则返回b，否则返回a
     * @param {number} a 
     * @param {number} b 
     * @returns 
     */
    function ifNaN(a, b) {
        return isNaN(a) ? b : a;
    }

    /**
     * 全局动画
     * @type {PuSetAnimation}
     */
    const PuSetAnimation = createClass({

        constructor: function Animation(timestamp) {

            const context = Animation.context;
            context.clearRect(0, 0, MAIN_WIDTH, MAIN_HEIGHT);

            Animation.animationList.forEach(value => {
                // 执行动画
                value.fn(context, timestamp);

                if (!value.keep) {
                    Animation.remove(value);
                }
            });

            if (Animation.fps) {
                context.fillStyle = 'blue';
                context.font = '50px serif';
                context.fillText(FPS, 50, 90);
            }

            if (Animation.running) {
                fps++;
                requestAnimationFrame(Animation);
            }

        }

    }, {

        running: false,
        fps: false,
        speed: 10,
        animationList: new Set,
        context: canvas.getContext("2d"),

        setSpeed: function (speed) {
            speed = Math.floor(speed);
            if (isNaN(speed) || speed < 1) {
                speed = 1;
            } else if (speed > 100) {
                speed = 100;
            }
            return this.speed = speed;
        },

        /**
         * 添加动画
         * @param {object} value 
         */
        add: function (value) {
            if (value && "function" === typeof value.fn) {
                value.priority = ifNaN(+value.priority, 1);
                // 添加新动画并重新排序绘制顺序
                const arr = Array.from(this.animationList.add(value)).sort((a, b) => a.priority - b.priority);
                this.animationList = new Set(arr);
            }
        },

        /**
         * 移除动画
         * @param {object} value 
         */
        remove: function (value) {
            this.animationList.delete(value);
        },

        /**
         * 
         * @param {function} fn 
         */
        ready: function (fn) {
            if ("function" === typeof fn) {
                if (Array.isArray(readyList)) {
                    readyList.push(fn);
                } else {
                    fn(this, MAIN_WIDTH, MAIN_HEIGHT, mDocument, view);
                }
            }
        },

        start: function () {
            this.running = true;
            if (readyList) {
                readyList.forEach(GameStart => GameStart(this, MAIN_WIDTH, MAIN_HEIGHT, mDocument, view));
                readyList = null;
            }
            requestAnimationFrame(this);
        },

        stop: function () {
            this.running = false;
        },

        /**
         * 显示FPS
         * @param {boolean} bool 是否显示FPS
         */
        showFPS: function (bool) {
            clearInterval(fpsInterval);
            if (this.fps = !!bool) {
                let update = function () {
                    FPS = `FPS: ${fps}`, fps = 0;
                };
                update(fps = 0, fpsInterval = setInterval(update, 1000));
            }
        },

        setBackgroundImage: function(style) {
            container.style["background-image"] = `url(${style})`;
        },

        setStyle: setStyle,
        createClass: createClass,
        addEventListener: addEventListener,

    });

    addEventListener(mWindow, {

        "resize": viewScale,

        "load": function () {

            container = mDocument.getElementById("container");

            setStyle(canvas, {
                "background-color": "black"
            });
            setStyle(view, {
                "position": "relative",
                "width": MAIN_WIDTH + "px",
                "height": MAIN_HEIGHT + "px",
                "transform": "scale(1)",
                "transform-origin": "center"
            });
            setStyle(container, {
                "position": "absolute",
                "top": "0",
                "left": "0",
                "display": "grid",
                "width": "100%",
                "height": "100%",
                "background-color": "black",
                "font-size": "16px",
                "overflow": "hidden",
                "place-content": "center",
                "place-items": "center"
            });

            view.className = "view";
            view.appendChild(canvas);

            container.appendChild(view);

            PuSetAnimation.start(viewScale());

        }
    });

    return PuSetAnimation;

}(window && window.top === window ? window : this, document));
