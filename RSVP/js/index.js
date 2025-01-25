(function () {
    "use strict";

    let hideControlsTimer = 0;
    let animationFrameId = 0;
    let isLongVideo = false;
    let hideVolumeBoxTimer = 0;
    let pointerDownElement = null;

    const playerContainer = document.getElementById("player-video-layer");
    const videoElement = playerContainer.querySelector("video.video");

    const controlsContainer = playerContainer.querySelector(".controls");
    const bottomControls = controlsContainer.querySelector(".bottom");
    const currentTimeDisplay = bottomControls.querySelector(".bpx-player-ctrl-time-current");
    const durationTimeDisplay = bottomControls.querySelector("span.bpx-player-ctrl-time-duration");
    const playButton = playerContainer.querySelector(".bt.bt-play>img");
    const volumeButton = playerContainer.querySelector(".bt.bt-volume>img");

    const volumeBox = playerContainer.querySelector(".bt.bt-volume>.volume-box");
    const volumeBar = volumeBox.querySelector(".volume-bar");
    const volumeValue = volumeBox.querySelector(".volume-value");

    const progressBarContainer = bottomControls.querySelector(".progress-bar");
    const bufferedBar = progressBarContainer.querySelector(".buffered");
    const playedBar = progressBarContainer.querySelector(".played");

    const controlButtons = {
        "svg/play.svg": function (target) {
            videoElement.play();
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

    volumeBar.addEventListener("change", () => setVolume(volumeBar.value));

    progressBarContainer.addEventListener("pointerdown", function (ev) {
        ev.preventDefault();
        // left click
        if (ev.button == 0) {
            pointerDownElement = progressBarContainer;
            playedBar.style.width = `${100 * ev.offsetX / this.offsetWidth}%`;
        }
    });
    playerContainer.addEventListener("pointermove", function (ev) {
        if (pointerDownElement === progressBarContainer) {
            playedBar.style.width = `${100 * ev.offsetX / pointerDownElement.offsetWidth}%`;
        }
    });
    playerContainer.addEventListener("pointerup", function (ev) {
        if (pointerDownElement === progressBarContainer && videoElement.duration) {
            videoElement.currentTime = videoElement.duration * ev.offsetX / pointerDownElement.offsetWidth;
            pointerDownElement = null;
        }
    });
    playerContainer.addEventListener("pointerleave", () => pointerDownElement = null);

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
            playedBar.style.width = `${100 * current / videoElement.duration}%`;
        }
    }

    /**
     * Handles the pointermove event for the controls container.
     * Shows the controls and resets the hide timer.
     * 
     * @param {PointerEvent} ev - The pointermove event.
     */
    function pointerMove(ev) {
        clearTimeout(hideControlsTimer);
        playerContainer.style.cursor = "default";
        bottomControls.classList.remove("hide");
        if (Object.is(ev.target, controlsContainer)) {
            hideControlsTimer = setTimeout(pointerLeave, 5000);
        }
    }

    /**
     * Handles the pointerleave event for the controls container.
     * Hides the controls and sets the cursor to none.
     */
    function pointerLeave() {
        volumeBox.classList.add("hide");
        bottomControls.classList.add("hide");
        playerContainer.style.cursor = "none";
    }

    /**
     * Sets the volume of the video element.
     * 
     * @param {number} i - The volume level to set (0 to 10).
     */
    function setVolume(i) {
        if (videoElement.muted) {
            videoElement.muted = false;
            volumeButton.src = "svg/volume.svg";
        }
        videoElement.volume = Math.min(Math.max(0, i / 10), 1);
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
            if (ev.keyCode === 32 || ev.code === "Space" || ev.key === "Space") {
                if (videoElement.paused) {
                    videoElement.play();
                } else {
                    videoElement.pause();
                }
            }
            // time
            else if (ev.keyCode === 37 || ev.code === "ArrowLeft" || ev.key === "ArrowLeft") {
                videoElement.currentTime -= 5;
            } else if (ev.keyCode === 39 || ev.code === "ArrowRight" || ev.key === "ArrowRight") {
                videoElement.currentTime += 10;
            }
            // volume
            else if (ev.keyCode === 38 || ev.code === "ArrowUp" || ev.key === "ArrowUp") {
                setVolume(Number(volumeBar.value) + 1);
            } else if (ev.keyCode === 40 || ev.code === "ArrowDown" || ev.key === "ArrowDown") {
                setVolume(Number(volumeBar.value) - 1);
            }

        }
    }

    function hideVolumeBox() {
        hideVolumeBoxTimer = setTimeout(() => volumeBox.classList.add("hide"), 1000);
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
                arr.push(`#ffffff44 ${100 * buffered.start(i) / duration}% ${end}%`);

                next = 1 + i;
                arr.push(`#00000000 ${end}% ${(next < max) ? (100 * buffered.start(next) / duration) : 100}%`);
            }

            for (let i; (i = arr.indexOf("#00000000 100% 100%")) >= 0; arr.splice(i, 1));

            bufferedBar.style.background = `linear-gradient(90deg,${arr.join()})`;
        }
    });
    videoElement.addEventListener("volumechange", function () {
        const volume = Math.round(videoElement.volume * 10);
        volumeBar.value = volume;
        volumeValue.textContent = volume;
    });

    controlsContainer.addEventListener("pointermove", pointerMove);
    controlsContainer.addEventListener("pointerleave", pointerLeave);

    // volume box display toggle
    volumeBox.addEventListener("pointerleave", hideVolumeBox);
    volumeButton.addEventListener("pointerleave", hideVolumeBox);
    volumeBox.addEventListener("pointerenter", () => clearTimeout(hideVolumeBoxTimer));
    volumeButton.addEventListener("pointerenter", () => {
        clearTimeout(hideVolumeBoxTimer);
        volumeBox.classList.remove("hide")
    });

    document.addEventListener("keydown", onKeyboardDownEventListener);

}());

(function () {
    const dashboard = document.querySelector("div.dashboard.flex.v");
    const url = dashboard.querySelector(".url-box>input[type=url]");
    const videoElement = document.querySelector("#player-video-layer>video.video");

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
