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
    const progressBar = progressBarContainer.querySelector(".progress");

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

    const setVolumeHandler = function setVolumeHandler(ev) {
        ev.preventDefault();

        if (setVolumeHandler.running) {
            setVolume(100 - Math.floor(100 * ev.offsetY / volumeBar.offsetHeight));
        }

        switch (ev.type) {
            case "pointerdown": {
                setVolumeHandler.running = true;
                break;
            }
            // case "pointermove": 
            case "pointerup":
            case "pointerleave":
            case "pointercancel": {
                setVolumeHandler.running = false;
            }
        }

    };

    volumeBar.addEventListener("pointerdown", setVolumeHandler);
    volumeBar.addEventListener("pointermove", setVolumeHandler);
    volumeBar.addEventListener("pointerup", setVolumeHandler);
    // volumeBar.addEventListener("pointerleave", setVolumeHandler);
    volumeBar.addEventListener("pointercancel", setVolumeHandler);


    // 事件在盒子上可以让进度条的鼠标事件高度范围更大
    progressBarContainer.addEventListener("pointerdown", function (ev) {
        ev.preventDefault();
        // left click
        if (ev.button == 0 && videoElement.duration) {
            pointerDownElement = progressBarContainer;
            progressBar.style.setProperty('--played', `${100 * ev.offsetX / pointerDownElement.offsetWidth}%`);
        }
    });
    playerContainer.addEventListener("pointermove", function (ev) {
        if (pointerDownElement === progressBarContainer) {
            progressBar.style.setProperty('--played', `${100 * ev.offsetX / pointerDownElement.offsetWidth}%`);
        }
    });
    playerContainer.addEventListener("pointerup", function (ev) {
        if (pointerDownElement === progressBarContainer && videoElement.duration) {
            videoElement.currentTime = videoElement.duration * ev.offsetX / pointerDownElement.offsetWidth;
        }
        pointerDownElement = null;
    });
    playerContainer.addEventListener("pointerleave", ev => {
        pointerDownElement = null;
        setVolumeHandler(ev);
    });
    playerContainer.addEventListener("pointercancel", () => pointerDownElement = null);

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
     * Handles the pointerleave event for the controls container.
     * Hides the controls and sets the cursor to none.
     */
    function pointerLeave() {
        setVolumeHandler.running = false;
        volumeBox.classList.add(HIDE);
        bottomControls.classList.add("min");
        playerContainer.style.cursor = "none";
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
            if (ev.code === "Space" || ev.keyCode === 32 || ev.key === "Space" ||
                ev.code === "MediaPlayPause" || ev.keyCode === 0xE022 || ev.code === "MediaPlayPause") {
                return videoToggle();
            }
            // time
            else if (ev.code === "ArrowLeft" || ev.keyCode === 37 || ev.key === "ArrowLeft") {
                videoElement.currentTime -= 5;
            } else if (ev.code === "ArrowRight" || ev.keyCode === 39 || ev.key === "ArrowRight") {
                videoElement.currentTime += 10;
            }
            // volume
            else if (ev.code === "ArrowUp" || ev.keyCode === 38 || ev.key === "ArrowUp") {
                return setVolume(Number(volumeBar.dataset.value) + 5);
            } else if (ev.code === "ArrowDown" || ev.keyCode === 40 || ev.key === "ArrowDown") {
                return setVolume(Number(volumeBar.dataset.value) - 5);
            }

        }
    }

    function hideVolumeBox(ev) {
        hideVolumeBoxTimer = setTimeout(() => {
            volumeBox.classList.add(HIDE);
            setVolumeHandler.running = false;
        }, 1000);
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
    controlsContainer.addEventListener("pointerleave", pointerLeave);
    controlsContainer.addEventListener("pointercancel", pointerLeave);

    controlsContainer.addEventListener("dblclick", videoToggle);

    // volume box display toggle
    volumeBox.addEventListener("pointerleave", setVolumeHandler);
    volumeBox.addEventListener("pointercancel", hideVolumeBox);

    volumeButton.addEventListener("pointerleave", hideVolumeBox);
    volumeButton.addEventListener("pointercancel", hideVolumeBox);

    volumeBox.addEventListener("pointerenter", () => clearTimeout(hideVolumeBoxTimer));
    volumeButton.addEventListener("pointerenter", () => {
        clearTimeout(hideVolumeBoxTimer);
        volumeBox.classList.remove(HIDE)
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

    dashboard.querySelector("#file").addEventListener("change", function fileChange(ev) {
        const file = ev.target.files.item(0);
        if (file !== null) {
            videoElement.currentTime = 0;
            videoElement.src = url.value = URL.createObjectURL(file);
        }
    });

    dashboard.querySelector("#stop").addEventListener("click", () => videoElement.pause() || (videoElement.src = "#"));
}());
