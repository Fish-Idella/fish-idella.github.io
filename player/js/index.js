const PuSetPlayer = (function () {
    "use strict";

    const instanceMap = new Map();
    const HIDE = "hide";

    // 获取事件冒泡路径（兼容不同浏览器）
    function composedPath(event, element) {
        let arr = event?.composedPath() || event.path || [];
        return element ? arr.slice(0, arr.indexOf(element)) : arr;
    }

    // 将秒转换为时分秒格式
    function parseDuration(seconds, hideHour) {
        // 分离整数秒和小数毫秒部分
        const totalSeconds = seconds >= 0 ? seconds : 0;
        const integerSec = Math.floor(totalSeconds);

        // 计算时分秒
        const remainingSeconds = integerSec % 3600;

        const date = [integerSec / 3600, remainingSeconds / 60, remainingSeconds % 60]
            .slice(hideHour ? 1 : 0)
            .map(num => String(num | 0).padStart(2, '0'))
            .join(":");

        // 拼接结果
        return `${date}.${String((totalSeconds - integerSec).toFixed(3).slice(2)).padEnd(3, '0')}`;
    }

    // 类创建工具函数（模拟类继承）
    /**
     * 
     * @param {{constructor: Function}} obj 
     * @param {*} props 
     * @returns {obj.constructor & typeof props}
     */
    function createClass(obj, props) {
        const fn = obj.constructor;
        if ("function" === typeof fn) {
            fn.prototype = obj;
            Object.assign(fn, props);
        } else {
            throw new TypeError("The constructor must be a Function.");
        }
        return fn;
    }


    /**
     * 多功能事件绑定工具，支持多种调用形式：
     * 1. 给单个元素绑定多种事件类型
     * 2. 批量给多个元素绑定相同事件
     * 3. 支持对象形式的事件处理器配置
     * 4. 支持多个事件处理器数组
     * 
     * @param {Element|string} target - 目标元素/事件类型/元素选择器
     * @param {string|Object|Array} eventConfig - 事件类型/事件处理器映射/元素处理器对数组
     * @param {Function|Array} handlers - 事件处理器或处理器数组
     * @param {Object} [options] - 事件监听选项
     * @returns {boolean} 是否全部事件绑定成功
     */
    function addUniversalEventListener(target, eventConfig, handlers, options) {
        let allEventsAdded = Boolean(target);
        if (!allEventsAdded) return false;
        
        // 场景2：批量绑定多个元素（[ [elem1,handler1], [elem2,handler2] ]）
        if (typeof target === 'string') {
            const eventType = target;

            if (Array.isArray(eventConfig) && eventConfig.every(pair => Array.isArray(pair))) {
                eventConfig.forEach(([element, handler]) => {
                    allEventsAdded = allEventsAdded &&
                        addUniversalEventListener(element, eventType, handler, handlers);
                });
                return allEventsAdded;
            }

            return false;
        }

        if (Array.isArray(target)) {
            target.forEach(arr => {
                allEventsAdded = allEventsAdded && addUniversalEventListener(...arr);
            });
            return allEventsAdded;
        }
        

        // 场景1：处理单个元素的事件绑定
        if ('function' === typeof target.addEventListener) {
            const element = target;

            // 场景1-1：对象形式的事件类型映射（{ click: handler, mouseover: handler }）
            if (typeof eventConfig === 'object' && !Array.isArray(eventConfig)) {
                Object.entries(eventConfig).forEach(([eventType, eventHandler]) => {
                    allEventsAdded = allEventsAdded &&
                        addUniversalEventListener(element, eventType, eventHandler, handlers);
                });
                return allEventsAdded;
            }

            // 场景1-2：空格分隔的多个事件类型（"click mouseover"）
            if (typeof handlers === 'function') {
                String(eventConfig).trim().split(/\s+/).forEach(eventType => {
                    try {
                        element.addEventListener(eventType, handlers, options);
                    } catch (error) {
                        allEventsAdded = false;
                    }
                });
                return allEventsAdded;
            }

            // 场景1-3：多个事件处理器数组（[handler1, handler2]）
            if (Array.isArray(handlers)) {
                handlers.forEach(handler => {
                    allEventsAdded = allEventsAdded &&
                        addUniversalEventListener(element, eventConfig, handler, options);
                });
                return allEventsAdded;
            }

            return false;
        }

        return false;

    }

    // /**
    //  * 预览加载器类 
    //  * @type {(fn: Function) => PerviewLoader}
    //  * @param {Function} fn 回调函数
    //  * @returns {PerviewLoader} 返回加载器实例
    //  */
    const PerviewLoader = createClass({

        /** 
         * 用于加载视频的video元素
         * @type {HTMLVideoElement} 
        */
        video: null,

        /**
         * 用于截取帧的canvas元素
         * @type {HTMLCanvasElement}
         */
        canvas: null,

        timer: 0,     // 定时器
        src: "",         // 当前视频源
        running: false,  // 加载状态标志

        constructor: function PerviewLoader(fn) {
            // 初始化视频和canvas元素
            const video = this.video = document.createElement("video");
            const canvas = this.canvas = document.createElement("canvas");
            // 配置视频属性
            video.setAttribute('muted', 'muted');
            video.setAttribute('preload', 'metadata');
            video.muted = true;
            video.onloadeddata = function () {
                // 根据视频尺寸设置canvas尺寸
                canvas.width = this.videoWidth;
                canvas.height = this.videoHeight;
            };

            return this.setCallback(fn);
        },

        // 默认回调函数
        callback: function (url, timestamp, x, width) { },

        // 设置回调方法
        setCallback: function (fn) {
            if ("function" === typeof fn) {
                this.callback = fn;
            }
            return this;
        },

        // 设置视频源并创建加载Promise
        setSrc: function (src) {
            return new Promise((resolve, reject) => {
                if (src !== this.src) {
                    this.video.oncanplay = resolve;
                    this.video.onerror = reject;
                    this.video.src = this.src = src;
                } else if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    resolve();
                } else {
                    reject();
                }
            });
        },

        // 加载指定时间点的视频帧
        load: function load(src, max, x, width) {
            clearTimeout(this.timer);

            this.timer = setTimeout((/** @type {PerviewLoader} */ loader) => {
                loader.running = true;
                loader.setSrc(src).then(() => loader.video.play()).then(function () {
                    // 设置目标时间点
                    loader.video.currentTime = max * x / width;
                    loader.video.onplaying = function () {
                        // 绘制帧并生成预览图
                        loader.canvas.getContext("2d").drawImage(loader.video, 0, 0);
                        loader.canvas.toBlob(function toBlob(blob) {
                            try {
                                if (loader.running) {
                                    loader.callback(URL.createObjectURL(blob), loader.video.currentTime, x, width);
                                    // console.log(loader.video.currentTime, max * x / width);
                                }
                                // else abandon resources
                            } finally {
                                loader.stop();
                            }
                        }, "image/png", 0.5);
                    };
                });
            }, 200, this);// 200ms延迟加载
        },

        // 停止加载过程
        stop: function () {
            clearTimeout(this.timer);
            this.running = false;
            this.video.onplaying = null;
            this.video.pause();
        }
    });

    /* 主播放器类 */
    const PuSetPlayer = createClass({

        video: null,
        isShortVideo: false,
        pointerDownElement: null,

        // 处理指针离开事件
        pointerLeave: function pointerLeave(self) {
            self.bottomControls.classList.add("min");
            self.playerContainer.style.cursor = "none";
        },

        // 音量控制方法
        setVolume: function setVolume(i) {
            if (this.video.muted) {
                this.video.muted = false;
                this.volumeButton.src = "svg/volume.svg";
            }
            this.video.volume = Math.min(Math.max(0, i / 100), 1);
        },

        // 恢复初始状态
        restoreVariables: function restoreVariables(ev, self) {
            ev.preventDefault();
            self.pointerDownElement = null;
            // self.pointerLeave(self);
            self.loader.stop();
            // 隐藏相关UI元素
            self.progressPreview.classList.add(HIDE);
            self.volumeBox.classList.add(HIDE);
            self.playbackrateMenu.classList.add(HIDE);
        },

        // 视频播放/暂停切换
        videoToggle: function videoToggle() {
            if (this.video.duration && this.video.paused) {
                this.video.play();
            } else {
                this.video.pause();
            }
        },

        /* 事件初始化方法 */
        initEvent: function initEvent(self) {

            // 音量框隐藏逻辑
            function hideVolumeBox(ev) {
                ev.preventDefault();
                hideVolumeBox.hideVolumeBoxTimer = setTimeout(() => self.volumeBox.classList.add(HIDE), 1000);
            }

            // 集中处理所有元素事件绑定
            addUniversalEventListener([
                // 视频元素事件绑定
                [self.video, {
                    "waiting": function () {
                        // console.log("视频加载中...");
                    },
                    "canplay": function () {
                        // self.video.play();
                    },
                    "loadeddata": function () {
                        const duration = this.duration;
                        self.durationTimeDisplay.innerHTML = parseDuration(duration, (self.isShortVideo = duration < 3600));
                    },
                    "timeupdate": function timeUpdate() {
                        cancelAnimationFrame(timeUpdate.animationFrameId);
                        timeUpdate.animationFrameId = requestAnimationFrame(function () {
                            const current = self.video.currentTime;
                            self.currentTimeDisplay.innerHTML = parseDuration(current, self.isShortVideo);
                            if (self.pointerDownElement !== self.progressBarContainer) {
                                self.progressBar.style.setProperty('--played', `${100 * current / self.video.duration}%`);
                            }
                        });
                    },
                    "playing": function () {
                        self.playButton.src = "svg/pause.svg";
                    },
                    "pause ended": function () {
                        self.playButton.src = "svg/play.svg";
                    },
                    "ratechange": function () {
                        self.playbackrateResult.textContent = self.video.playbackRate + "x";
                    },
                    "progress": function () {
                        const buffered = self.video.buffered;
                        const max = buffered.length;
                        if (max) {
                            const duration = self.video.duration;
                            const arr = new Array();
                            for (let i = 0, next, end; i < max; i++) {
                                end = 100 * buffered.end(i) / duration;
                                arr.push(`var(--buffered-color) ${100 * buffered.start(i) / duration}% ${end}%`);

                                next = 1 + i;
                                arr.push(`#00000000 ${end}% ${(next < max) ? (100 * buffered.start(next) / duration) : 100}%`);
                            }

                            for (let i; (i = arr.indexOf("#00000000 100% 100%")) >= 0; arr.splice(i, 1));

                            self.progressBar.style.setProperty("--buffered", `linear-gradient(90deg,${arr.join()})`);
                        }
                    },
                    "volumechange": function volumeChange() {
                        const volume = Math.round(self.video.volume * 100);
                        self.volumeValue.textContent = volume;
                        self.tooltipContent.textContent = volume;
                        self.volumeBar.dataset.value = volume;
                        self.volumeThumbDot.style.setProperty("top", `${100 - volume}px`);
                        if (self.volumeBox.classList.contains(HIDE)) {
                            clearTimeout(volumeChange.hideTimer);
                            self.tooltipContainer.classList.remove(HIDE);
                            volumeChange.hideTimer = setTimeout(() => self.tooltipContainer.classList.add(HIDE), 1000);
                        }
                    },
                    "error": function (ev) {
                        if (self.video.src !== location.href) {
                            // console.log("视频加载失败", ev);
                        }
                    }
                }],
                // 进度条相关事件
                [self.progressBarContainer, {
                    "pointerdown": function handleProgressPointerDown(ev) {
                        ev.preventDefault();
                        if (ev.button == 0 && self.video.duration) {
                            self.pointerDownElement = self.progressBarContainer;
                            self.progressBar.style.setProperty('--played', `${100 * ev.offsetX / self.pointerDownElement.offsetWidth}%`);
                        }
                    },
                    "pointermove": function handleProgressPointerMove(ev) {
                        self.progressPreview.classList.add(HIDE);
                        if (self.video.readyState > HTMLMediaElement.HAVE_NOTHING) {
                            self.loader.load(self.video.src, self.video.duration, ev.offsetX, self.progressBarContainer.offsetWidth);
                        }
                    },
                    "pointerleave": ev => self.loader.stop(ev)
                }],
                [self.playerContainer, {
                    "pointermove": function handlePlayerPointerMove(ev) {
                        ev.preventDefault();
                        if (self.pointerDownElement === self.progressBarContainer) {
                            self.progressBar.style.setProperty('--played', `${100 * ev.offsetX / self.pointerDownElement.offsetWidth}%`);
                        } else if (self.pointerDownElement === self.volumeBar && composedPath(ev).includes(self.volumeBar)) {
                            self.setVolume(116 - ev.offsetY);
                        }
                    },
                    "pointerup": function handlePlayerPointerUp(ev) {
                        if (self.pointerDownElement === self.progressBarContainer && self.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                            const fixed = self.video.paused || self.video.ended;
                            self.video.currentTime = self.video.duration * ev.offsetX / self.pointerDownElement.offsetWidth;
                            if (fixed) self.video.pause();
                        } else if (self.pointerDownElement === self.volumeBar && composedPath(ev).includes(self.volumeBar)) {
                            self.setVolume(116 - ev.offsetY);
                        }
                        self.restoreVariables(ev, self);
                    },
                    "pointerleave pointercancel": function (ev) {
                        self.pointerLeave(self);
                        self.restoreVariables(ev, self);
                    },
                    "dblclick": ev => self.videoToggle(ev)
                }],
                [self.volumeBox, {
                    "pointerleave pointercancel": hideVolumeBox,
                    "pointerenter": () => clearTimeout(hideVolumeBox.hideVolumeBoxTimer)
                }],
                [self.volumeButton, {
                    "pointerleave pointercancel": hideVolumeBox,
                    "pointerenter": () => {
                        clearTimeout(hideVolumeBox.hideVolumeBoxTimer);
                        self.volumeBox.classList.remove(HIDE);
                    }
                }],
                [self.volumeBar, "pointerdown", function handleVolumePointerDown(ev) {
                    ev.preventDefault();
                    if (ev.button == 0) {
                        self.pointerDownElement = self.volumeBar;
                        if (composedPath(ev).includes(self.volumeBar)) {
                            self.setVolume(116 - ev.offsetY);
                        }
                    }
                }],
                [self.controlsContainer, "pointermove", function pointerMove(ev) {
                    clearTimeout(pointerMove.hideControlsTimer);
                    self.playerContainer.style.cursor = "default";
                    self.bottomControls.classList.remove("min");
                    if (Object.is(ev.target, self.controlsContainer)) {
                        pointerMove.hideControlsTimer = setTimeout(self.pointerLeave, 5000, self);
                    }
                }],
                [self.playbackrateResult, "click", function (ev) {
                    ev.preventDefault();
                    self.playbackrateMenu.classList.remove(HIDE);
                }],
                [self.playbackrateMenu, "click", function handlePlaybackRateMenuClick(ev) {
                    let child, children = Array.from(self.playbackrateMenu.children);
                    children.forEach(child => child.classList.remove("bpx-state-active"));
                    if (children.includes(child = ev.target)) {
                        const i = Number(child.dataset.value);
                        self.video.playbackRate = i;
                        self.video.defaultPlaybackRate = i;
                        child.classList.add("bpx-state-active");
                    }
                    self.playbackrateMenu.classList.add(HIDE);
                }],

                // 快捷键
                [document, "keydown", function onKeyboardDownEventListener(ev) {
                    const activeElement = document.activeElement || document.fullscreenElement;
                    if (activeElement == document.body || activeElement == self.playerContainer) {
                        if (ev.code === "Space" || ev.keyCode === 32 || ev.code === "MediaPlayPause" || ev.keyCode === 179) {
                            return self.videoToggle(ev);
                        } else if (ev.code === "ArrowLeft" || ev.keyCode === 37) {
                            self.video.currentTime -= 5;
                        } else if (ev.code === "ArrowRight" || ev.keyCode === 39) {
                            self.video.currentTime += 10;
                        } else if (ev.code === "ArrowUp" || ev.keyCode === 38) {
                            return self.setVolume(Number(self.volumeBar.dataset.value) + 5);
                        } else if (ev.code === "ArrowDown" || ev.keyCode === 40) {
                            return self.setVolume(Number(self.volumeBar.dataset.value) - 5);
                        }
                    }
                }]
            ]);

            const controlButtons = {
                "svg/play.svg": function (target) {
                    if (self.video.duration && self.video.play());
                },
                "svg/pause.svg": function (target) {
                    self.video.pause();
                },
                "svg/volume.svg": function (target) {
                    // console.log("2");
                    self.video.muted = true;
                    target.src = "svg/muted.svg"
                },
                "svg/muted.svg": function (target) {
                    // console.log("1");
                    self.video.muted = false;
                    target.src = "svg/volume.svg"
                },
                "svg/separate.svg": function (target) {
                    self.playerContainer.requestFullscreen().then(() => target.src = "svg/combined.svg");
                },
                "svg/combined.svg": function (target) {
                    document.exitFullscreen().then(() => target.src = "svg/separate.svg");
                },
                "fn": function (target) {
                    // console.log(target.getAttribute("src"));
                }
            };
            self.playerContainer.querySelectorAll(".bt>img").forEach(function (element) {
                element.addEventListener("click", function (ev) {
                    ev.preventDefault();
                    // console.log(this.getAttribute("src"));
                    ((controlButtons[this.getAttribute("src")] || controlButtons.fn)(this));
                });
            });

            const fullscreenButton = self.playerContainer.querySelector("#fullscreen");
            document.addEventListener('fullscreenchange', function () {
                if (document.fullscreenElement === self.playerContainer) {
                    fullscreenButton.src = "svg/combined.svg";
                } else {
                    fullscreenButton.src = "svg/separate.svg";
                }
            });

            return self;
        },

        constructor: function PuSetPlayer(playerContainer) {
            "use strict";

            // 防止重复初始化
            if (instanceMap.has(playerContainer)) {
                return instanceMap.get(playerContainer);
            } else {
                instanceMap.set(playerContainer, this);
            }

            const self = this;
            self.playerContainer = playerContainer;
            self.video = self.playerContainer.querySelector("video.video");
            self.controlsContainer = self.playerContainer.querySelector(".controls");
            self.bottomControls = self.controlsContainer.querySelector(".bottom");

            // 音量相关组件
            self.playButton = self.playerContainer.querySelector(".bt.bt-play>img");
            self.volumeButton = self.playerContainer.querySelector(".bt.bt-volume>img");
            self.volumeBox = self.playerContainer.querySelector(".bt.bt-volume>.volume-box");
            self.volumeValue = self.volumeBox.querySelector(".volume-value");
            self.volumeBar = self.volumeBox.querySelector(".volume-bar");
            self.volumeThumbDot = self.volumeBar.querySelector(".thumb-dot");
            self.tooltipContainer = self.controlsContainer.querySelector(".layer-tooltip");
            self.tooltipContent = self.tooltipContainer.querySelector("span.content");

            // 视频进度相关组件
            self.currentTimeDisplay = self.bottomControls.querySelector(".bpx-player-ctrl-time-current");
            self.durationTimeDisplay = self.bottomControls.querySelector("span.bpx-player-ctrl-time-duration");
            self.progressBarContainer = self.bottomControls.querySelector(".progress-bar");
            self.progressPreview = self.progressBarContainer.querySelector(".progress-preview");
            self.progressPreviewTime = self.progressPreview.querySelector(".progress-preview-time");
            self.progressBar = self.progressBarContainer.querySelector(".progress");

            // 初始化预览加载器
            self.loader = new PerviewLoader(function (string, timestamp, x, w) {
                self.progressPreview.style.setProperty("background-image", `url(${string})`);
                const left = Math.max(0, Math.min((x - 80), (w - 160)));
                self.progressPreview.style.setProperty("left", left + "px");
                self.progressPreviewTime.textContent = parseDuration(timestamp, self.isShortVideo);
                self.progressPreview.classList.remove(HIDE);
            });

            // 播放速率相关组件
            self.playbackrate = self.bottomControls.querySelector(".bt.bt-playback-rate");
            self.playbackrateResult = self.playbackrate.querySelector(".bpx-player-ctrl-playbackrate-result");
            self.playbackrateMenu = self.playbackrate.querySelector(".bpx-player-ctrl-playbackrate-menu");

            return self.initEvent(self);
        },

        play: function (url) {
            // 播放新视频
            if (url && url !== this.video.src) {
                URL.revokeObjectURL(this.video.src);
                this.video.src = url;
                this.video.currentTime = 0;
            }
            this.video.play();
        },

        stop: function () {
            this.video.src = "";
            this.video.pause();
            this.progressBar.style.setProperty("--buffered", "none");
        }

    }, {
        composedPath: composedPath
    });
    // 暴露到全局环境
    return (globalThis || window || {}).PuSetPlayer = PuSetPlayer;

}());

(function 控制器() {
    const player = new PuSetPlayer(document.getElementById("player-video-layer"));

    const dashboard = document.querySelector("div.dashboard");
    const urlInput = dashboard.querySelector(".url-box>input[type=url]");

    dashboard.querySelector("#play").addEventListener("click", function () {
        player.play(urlInput.value);
    });

    dashboard.querySelector("#file").addEventListener("input", function fileChange(ev) {
        const file = ev.target.files.item(0);
        if (file !== null) {
            player.play(urlInput.value = URL.createObjectURL(file));
        }
    });

    dashboard.querySelector("#stop").addEventListener("click", function () {
        player.stop();
    });
}());


(function 加载列表() {
    let promise = 0, resources = [];
    const player = new PuSetPlayer(document.getElementById("player-video-layer"));

    fetch("/api/directory_content_fetcher.php", {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `path=${encodeURIComponent("Videos")}`
    }).then(a => a.json()).then(json => {
        if (!json.success) return resources;
        return resources = json.data.sort((a, b) => {
            // 文件夹排在文件前
            if (a.type === 'directory' && b.type !== 'directory') {
                return -1;
            }
            if (a.type !== 'directory' && b.type === 'directory') {
                return 1;
            }
            // 同类项目按名称排序（使用localeCompare进行本地化排序）
            return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' });
        });
    }).then(arr => {
        console.log(arr)
    })
}());