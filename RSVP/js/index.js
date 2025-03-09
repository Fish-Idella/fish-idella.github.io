(function () {
    "use strict";

    let animationFrameId = 0;
    let isLongVideo = false;
    let hideVolumeBoxTimer = 0;
    let pointerDownElement = null;

    const HIDE = "hide";

    const playerContainer = document.getElementById("player-video-layer");
    const videoElement = playerContainer.querySelector("video.video");

    const controlsContainer = playerContainer.querySelector(".controls");
    const bottomControls = controlsContainer.querySelector(".bottom");
    const currentTimeDisplay = bottomControls.querySelector(".bpx-player-ctrl-time-current");
    const durationTimeDisplay = bottomControls.querySelector("span.bpx-player-ctrl-time-duration");
    const playButton = playerContainer.querySelector(".bt.bt-play>img");
    const volumeButton = playerContainer.querySelector(".bt.bt-volume>img");

    const volumeBox = playerContainer.querySelector(".bt.bt-volume>.volume-box");
    const volumeValue = volumeBox.querySelector(".volume-value");
    const volumeBar = volumeBox.querySelector(".volume-bar");
    const volumeThumbDot = volumeBar.querySelector(".thumb-dot");

    const tooltipContainer = controlsContainer.querySelector(".layer-tooltip");
    const tooltipContent = tooltipContainer.querySelector("span.content");

    const progressBarContainer = bottomControls.querySelector(".progress-bar");
    const progressPreview = progressBarContainer.querySelector(".progress-preview");
    const progressPreviewTime = progressPreview.querySelector(".progress-preview-time");
    const progressBar = progressBarContainer.querySelector(".progress");

    const playbackrate = bottomControls.querySelector(".bt.bt-playback-rate");
    const playbackrateResult = playbackrate.querySelector(".bpx-player-ctrl-playbackrate-result");
    const playbackrateMenu = playbackrate.querySelector(".bpx-player-ctrl-playbackrate-menu");


    const controlButtons = {
        "svg/play.svg": function (target) {
            if (videoElement.duration && videoElement.play());
        },
        "svg/pause.svg": function (target) {
            videoElement.pause();
        },
        "svg/volume.svg": function (target) {
            videoElement.muted = true;
            target.src = "svg/muted.svg"
        },
        "svg/muted.svg": function (target) {
            videoElement.muted = false;
            target.src = "svg/volume.svg"
        },
        "svg/separate.svg": function (target) {
            playerContainer.requestFullscreen().then(() => target.src = "svg/combined.svg");
        },
        "svg/combined.svg": function (target) {
            document.exitFullscreen().then(() => target.src = "svg/separate.svg");
        },
        "fn": function (target) {
            console.log(target.getAttribute("src"));
        }
    };

    const fullscreenButton = document.getElementById("fullscreen");
    document.addEventListener('fullscreenchange', function () {
        if (document.fullscreenElement) {
            fullscreenButton.src = "svg/combined.svg";
        } else {
            fullscreenButton.src = "svg/separate.svg";
        }
    });

    document.querySelectorAll(".bt>img").forEach(function (element) {
        element.addEventListener("click", function (ev) {
            ev.preventDefault();
            ((controlButtons[this.getAttribute("src")] || controlButtons.fn)(this));
        });
    });

    /**
     * 
     * @param {Event} ev 
     * @returns {Element[]}
     */
    function composedPath(ev) {
        return ev?.composedPath() || ev.path || [];
    }

    volumeBar.addEventListener("pointerdown", function (ev) {
        ev.preventDefault();
        if (ev.button == 0) {
            pointerDownElement = volumeBar;
            if (composedPath(ev).includes(volumeBar)) {
                setVolume(116 - ev.offsetY);
            }
        }
    });

    // 事件在盒子上可以让进度条的鼠标事件高度范围更大
    progressBarContainer.addEventListener("pointerdown", function (ev) {
        ev.preventDefault();
        // left click
        if (ev.button == 0 && videoElement.duration) {
            pointerDownElement = progressBarContainer;
            progressBar.style.setProperty('--played', `${100 * ev.offsetX / pointerDownElement.offsetWidth}%`);
        }
    });

    // 获取视频帧图像
    const PerviewLoader = (function () {

        function PerviewLoader(fn) {
            const self = this;
            self.video = document.createElement("video");
            self.canvas = document.createElement("canvas");

            self.video.setAttribute('muted', 'muted');
            self.video.setAttribute('preload', 'metadata');
            self.video.muted = true;
            self.video.onloadeddata = function () {
                self.canvas.width = self.video.videoWidth;
                self.canvas.height = self.video.videoHeight;
            };

            return self.setCallback(fn);
        }

        PerviewLoader.prototype = {

            video: null,
            canvas: null,

            p: null,

            timer: 0,

            src: "",

            running: false,

            /**
             * 
             * @param {string} url 
             * @param {number} timestamp 
             * @param {number} x 
             * @param {number} width 
             */
            callback: function (url, timestamp, x, width) { },

            /**
             * 
             * @param {(url:string, timestamp:number, x:number, width:number) => void} fn
             */
            setCallback: function (fn) {
                if ("function" === typeof fn) {
                    this.callback = fn;
                }
                return this;
            },

            setSrc: function (src) {
                if (src !== this.src) {
                    this.p = new Promise((resolve, reject) => {
                        this.video.oncanplay = resolve;
                        this.video.onerror = reject;
                        this.video.src = this.src = src;
                    });
                }
                return this;
            },

            /**
             * 
             * @param {string} url 
             * @param {number} timestamp 
             */
            load: function (src, max, x, width) {
                clearTimeout(this.timer);
                const self = this;
                self.setSrc(src);
                this.timer = setTimeout(function () {
                    self.running = true;
                    self.p?.then(function () {
                        self.video.play().then(function () {
                            self.video.currentTime = Math.ceil(max * x / width);
                            self.video.onplaying = function () {
                                self.canvas.getContext("2d").drawImage(self.video, 0, 0);
                                self.canvas.toBlob(function (blob) {
                                    try {
                                        if (self.running) self.callback(URL.createObjectURL(blob), self.video.currentTime, x, width);
                                    } finally {
                                        self.stop();
                                    }
                                });
                            };
                        });
                    });
                }, 200);
            },

            stop: function () {
                clearTimeout(this.timer);
                this.running = false;
                this.video.onplaying = null; // ！！！重置事件 ！！！
                this.video.pause();
            }
        }

        return PerviewLoader;

    }());

    const loader = new PerviewLoader(function (string, timestamp, x, w) {
        console.log(this);
        progressPreview.style.setProperty("background-image", `url(${string})`);
        const left = Math.max(0, Math.min((x - 80), (w - 160)));
        progressPreview.style.setProperty("left", left + "px");
        progressPreviewTime.textContent = parseDuration(timestamp, false);
        progressPreview.classList.remove(HIDE);
    });

    // 
    function restoreVariables(ev) {
        ev.preventDefault();
        pointerDownElement = null;
        loader.stop();
        progressPreview.classList.add(HIDE);
        volumeBox.classList.add(HIDE);
        playbackrateMenu.classList.add(HIDE);
    }

    progressBarContainer.addEventListener("pointermove", function (ev) {
        progressPreview.classList.add(HIDE);
        if (videoElement.readyState > HTMLMediaElement.HAVE_NOTHING) {
            loader.load(videoElement.src, videoElement.duration, ev.offsetX, progressBarContainer.offsetWidth);
        }
    });
    progressBarContainer.addEventListener("pointerleave", ev => loader.stop(ev));

    playerContainer.addEventListener("pointermove", function (ev) {
        ev.preventDefault();
        if (pointerDownElement === progressBarContainer) {
            // 设置进度条
            progressBar.style.setProperty('--played', `${100 * ev.offsetX / pointerDownElement.offsetWidth}%`);

        } else if (pointerDownElement === volumeBar && composedPath(ev).includes(volumeBar)) {
            setVolume(116 - ev.offsetY);
        }

    });
    playerContainer.addEventListener("pointerup", function (ev) {
        if (pointerDownElement === progressBarContainer && videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            videoElement.currentTime = Math.floor(videoElement.duration * ev.offsetX / pointerDownElement.offsetWidth);
        } else if (pointerDownElement === volumeBar && composedPath(ev).includes(volumeBar)) {
            setVolume(116 - ev.offsetY);
        }
        restoreVariables(ev);
    });
    playerContainer.addEventListener("pointerleave", restoreVariables);
    playerContainer.addEventListener("pointercancel", restoreVariables);

    /**
     * Formats a given time value to a two-digit string.
     * 
     * @param {number|string} time - The time value to format.
     * @param {number} i - The length.
     * @returns {string} The formatted time string.
     */
    function formatTime(time, i = 2) {
        return time.toString().padStart(i, "0");
    }

    /**
     * Parses a duration in seconds to a formatted time string (HH:MM:SS).
     * 
     * @param {number} duration - The duration in seconds.
     * @param {boolean} show - Whether or not to display the hour.
     * @returns {string} The formatted duration string.
     */
    function parseDuration(duration, show) {
        return [
            formatTime(Math.floor(duration / 3600)),
            formatTime(Math.floor((duration / 60) % 60)),
            formatTime(Math.floor(duration % 60))
        ].slice(show ? 0 : 1).join(":");
    }

    /**
     * Handles the loadeddata event for the video element.
     * Updates the duration display and sets the longTime flag.
     */
    function loadedData() {
        const duration = videoElement.duration;
        durationTimeDisplay.innerHTML = parseDuration(duration, (isLongVideo = duration > 3600));
    }

    /**
     * Handles the timeupdate event for the video element.
     * Updates the current time display and the played progress bar.
     */
    function timeUpdate() {
        const current = videoElement.currentTime;
        currentTimeDisplay.innerHTML = parseDuration(current, isLongVideo);
        if (pointerDownElement !== progressBarContainer) {
            progressBar.style.setProperty('--played', `${100 * current / videoElement.duration}%`);
        }
    }

    /**
     * Handles the pointerleave event for the controls container.
     * Hides the controls and sets the cursor to none.
     */
    function pointerLeave() {
        bottomControls.classList.add("min");
        playerContainer.style.cursor = "none";
    }

    /**
     * Handles the pointermove event for the controls container.
     * Shows the controls and resets the hide timer.
     * 
     * @param {PointerEvent} ev - The pointermove event.
     */
    function pointerMove(ev) {
        clearTimeout(pointerMove.hideControlsTimer);
        playerContainer.style.cursor = "default";
        bottomControls.classList.remove("min");
        if (Object.is(ev.target, controlsContainer)) {
            pointerMove.hideControlsTimer = setTimeout(pointerLeave, 5000);
        }
    }

    /**
     * Sets the volume of the video element.
     * 
     * @param {number} i - The volume level to set (0 to 100).
     */
    function setVolume(i) {
        if (videoElement.muted) {
            videoElement.muted = false;
            volumeButton.src = "svg/volume.svg";
        }
        videoElement.volume = Math.min(Math.max(0, i / 100), 1);
    }

    function videoToggle() {
        if (videoElement.duration && videoElement.paused) {
            videoElement.play();
        } else {
            videoElement.pause();
        }
    }

    /**
     * Handles the keydown event for the document.
     * Provides keyboard shortcuts for play/pause, seeking, and volume control.
     * 
     * @param {KeyboardEvent} ev - The keydown event.
     */
    function onKeyboardDownEventListener(ev) {
        const activeElement = document.activeElement || document.fullscreenElement;
        if (activeElement == document.body || activeElement == playerContainer) {

            // play/pause
            if (ev.code === "Space" || ev.keyCode === 32 ||
                ev.code === "MediaPlayPause" || ev.keyCode === 0xE022) {
                return videoToggle();
            }
            // time
            else if (ev.code === "ArrowLeft" || ev.keyCode === 37) {
                videoElement.currentTime -= 5;
            } else if (ev.code === "ArrowRight" || ev.keyCode === 39) {
                videoElement.currentTime += 10;
            }
            // volume
            else if (ev.code === "ArrowUp" || ev.keyCode === 38) {
                return setVolume(Number(volumeBar.dataset.value) + 5);
            } else if (ev.code === "ArrowDown" || ev.keyCode === 40) {
                return setVolume(Number(volumeBar.dataset.value) - 5);
            }

        }
    }

    function hideVolumeBox(ev) {
        ev.preventDefault();
        hideVolumeBoxTimer = setTimeout(() => volumeBox.classList.add(HIDE), 1000);
    }

    // autoplay

    videoElement.addEventListener("canplay", () => videoElement.play());
    videoElement.addEventListener("loadeddata", loadedData);
    videoElement.addEventListener("timeupdate", () => {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(timeUpdate);
    });
    videoElement.addEventListener("playing", function () {
        playButton.src = "svg/pause.svg";
    });
    videoElement.addEventListener("pause", function () {
        playButton.src = "svg/play.svg";
    });
    videoElement.addEventListener("ended", function () {
        playButton.src = "svg/play.svg";
    });
    videoElement.addEventListener("progress", function () {
        const buffered = videoElement.buffered;
        const max = buffered.length;
        if (max) {
            const duration = videoElement.duration;
            const arr = new Array();
            for (let i = 0, next, end; i < max; i++) {
                end = 100 * buffered.end(i) / duration;
                arr.push(`var(--buffered-color) ${100 * buffered.start(i) / duration}% ${end}%`);

                next = 1 + i;
                arr.push(`#00000000 ${end}% ${(next < max) ? (100 * buffered.start(next) / duration) : 100}%`);
            }

            // 清除多余的样式
            for (let i; (i = arr.indexOf("#00000000 100% 100%")) >= 0; arr.splice(i, 1));

            progressBar.style.setProperty("--buffered", `linear-gradient(90deg,${arr.join()})`);
        }
    });
    videoElement.addEventListener("volumechange", function volumechange() {
        const volume = Math.round(videoElement.volume * 100);
        volumeValue.textContent = volume;
        tooltipContent.textContent = volume;
        volumeBar.dataset.value = volume;
        volumeThumbDot.style.setProperty("top", `${100 - volume}px`);
        if (volumeBox.classList.contains(HIDE)) {
            clearTimeout(volumechange.hideTimer);
            tooltipContainer.classList.remove(HIDE);
            volumechange.hideTimer = setTimeout(() => tooltipContainer.classList.add(HIDE), 1000);
        }
    });

    controlsContainer.addEventListener("pointermove", pointerMove);

    playerContainer.addEventListener("pointerleave", pointerLeave);
    playerContainer.addEventListener("pointercancel", pointerLeave);
    playerContainer.addEventListener("dblclick", videoToggle);

    // volume box display toggle
    volumeBox.addEventListener("pointerleave", hideVolumeBox);
    volumeBox.addEventListener("pointercancel", hideVolumeBox);

    volumeButton.addEventListener("pointerleave", hideVolumeBox);
    volumeButton.addEventListener("pointercancel", hideVolumeBox);

    volumeBox.addEventListener("pointerenter", () => clearTimeout(hideVolumeBoxTimer));
    volumeButton.addEventListener("pointerenter", () => {
        clearTimeout(hideVolumeBoxTimer);
        volumeBox.classList.remove(HIDE);
    });

    // 倍速
    videoElement.addEventListener("ratechange", function () {
        playbackrateResult.textContent = videoElement.playbackRate + "x";
    });

    playbackrateResult.addEventListener("click", function () {
        playbackrateMenu.classList.remove(HIDE);
    });
    // playbackrateResult.addEventListener("dblclick", function () {
    //     playbackrateResult.contentEditable = "plaintext-only";
    //     playbackrateResult.textContent = videoElement.playbackRate;
    //     playbackrateResult.focus();
    //     playbackrateResult.select();
    // });
    // playbackrateResult.addEventListener("blur", function () {
    //     let i = Number.parseInt(playbackrateResult.textContent);
    //     playbackrateResult.contentEditable = false;
    //     i = Math.min(((Number.isNaN(i) || i <= 0) ? 1 : i), 5);
    //     videoElement.playbackRate = i;
    //     playbackrateResult.textContent = i + "x";
    // });
    playbackrateMenu.addEventListener("click", function (ev) {
        let child, children = Array.from(playbackrateMenu.children);
        children.forEach(child => child.classList.remove("bpx-state-active"));
        if (children.includes(child = ev.target)) {
            const i = Number(child.dataset.value);
            videoElement.playbackRate = i;
            videoElement.defaultPlaybackRate = i;
            child.classList.add("bpx-state-active");
        }
        playbackrateMenu.classList.add(HIDE);
    });

    document.addEventListener("keydown", onKeyboardDownEventListener);

}());

(function () {
    const dashboard = document.querySelector("div.dashboard");
    const url = dashboard.querySelector(".url-box>input[type=url]");
    const videoElement = document.querySelector("#player-video-layer video.video");

    dashboard.querySelector("#play").addEventListener("click", function () {
        videoElement.currentTime = 0;
        videoElement.src = url.value;
    });

    dashboard.querySelector("#file").addEventListener("input", function fileChange(ev) {
        const file = ev.target.files.item(0);
        if (file !== null) {
            videoElement.currentTime = 0;
            videoElement.src = url.value = URL.createObjectURL(file);
        }
    });

    dashboard.querySelector("#stop").addEventListener("click", function () {
        videoElement.pause();
        videoElement.src = "";
    });
}());
