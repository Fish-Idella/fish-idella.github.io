(function () {
    "use strict";

    let hideControlsTimer = 0;
    let animationFrameId = 0;
    let isLongVideo = false;
    let hideVolumeBoxTimer = 0;

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

    progressBarContainer.addEventListener("click", function (ev) {
        if (videoElement.duration) {
            videoElement.currentTime = videoElement.duration * ev.offsetX / this.offsetWidth;
        }
    });

    /**
     * Formats a given time value to a two-digit string.
     * 
     * @param {number|string} time - The time value to format.
     * @returns {string} The formatted time string.
     */
    function formatTime(time) {
        const string = "" + time;
        return string.length < 2 ? ("0" + string) : string;
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
            formatTime(Math.floor(duration / 60 % 60)),
            formatTime(Math.floor(duration % 60))
        ].join(":").slice(show ? 0 : -5);
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
        playedBar.style.width = `${100 * current / videoElement.duration}%`;
        currentTimeDisplay.innerHTML = parseDuration(current, isLongVideo);
    }

    /**
     * Handles the mousemove event for the controls container.
     * Shows the controls and resets the hide timer.
     * 
     * @param {MouseEvent} ev - The mousemove event.
     */
    function mouseMove(ev) {
        clearTimeout(hideControlsTimer);
        playerContainer.style.cursor = "default";
        bottomControls.classList.remove("hide");
        if (Object.is(ev.target, controlsContainer)) {
            hideControlsTimer = setTimeout(mouseLeave, 5000);
        }
    }

    /**
     * Handles the mouseleave event for the controls container.
     * Hides the controls and sets the cursor to none.
     */
    function mouseLeave() {
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
        console.log(i);
        if (videoElement.muted) {
            videoElement.muted = false;
            volumeButton.src = "svg/volume.svg";
        }
        videoElement.volume = Math.min(Math.max(0, i / 10), 10);
    }


    /**
     * Handles the keypress event for the document.
     * Provides keyboard shortcuts for play/pause, seeking, and volume control.
     * 
     * @param {KeyboardEvent} ev - The keypress event.
     */
    function onKeyboardPressEventListener(ev) {
        console.log('onKeyboardPressEventListener')
        const activeElement = document.activeElement || document.fullscreenElement;
        if (activeElement == document.body || activeElement == playerContainer) {

            // console.log(ev.keyCode);
            // console.log(ev.code);
            // console.log(ev.key);

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
                setVolume(volumeBar.value++);
            } else if (ev.keyCode === 40 || ev.code === "ArrowDown" || ev.key === "ArrowDown") {
                setVolume(volumeBar.value--);
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
            const arr = [];
            for (let i = 0, next, end; i < max; i++) {
                end = 100 * buffered.end(i) / duration;
                arr.push(`#ffffff44 ${100 * buffered.start(i) / duration}% ${end}%`);

                next = 1 + i;
                arr.push(`#00000000 ${end}% ${(next < max) ? (100 * buffered.start(next) / duration) : 100}%`);
            }

            bufferedBar.style.background = `linear-gradient(90deg,${arr.join(",")})`;
        }
    });
    videoElement.addEventListener("volumechange", function () {
        const volume = Math.round(videoElement.volume * 10);
        volumeBar.value = volume;
        volumeValue.textContent = volume;
    });

    controlsContainer.addEventListener("mousemove", mouseMove);
    controlsContainer.addEventListener("mouseleave", mouseLeave);

    // volume box display toggle
    volumeBox.addEventListener("mouseleave", hideVolumeBox);
    volumeButton.addEventListener("mouseleave", hideVolumeBox);
    volumeBox.addEventListener("mouseenter", () => clearTimeout(hideVolumeBoxTimer));
    volumeButton.addEventListener("mouseenter", () => {
        clearTimeout(hideVolumeBoxTimer);
        volumeBox.classList.remove("hide")
    });

    document.addEventListener("keypress", onKeyboardPressEventListener);

}());

(function () {
    const videoElement = document.querySelector("#player-video-layer>video.video");

    /**
     * Handles the change event for the file input element.
     * Loads the selected video file into the video element.
     * 
     * @param {Event} ev - The change event.
     */
    function fileChange(ev) {
        const file = ev.target.files.item(0);
        if (file !== null) {
            videoElement.currentTime = 0;
            videoElement.src = URL.createObjectURL(file);
        }
    }

    document.getElementById("file").addEventListener("change", fileChange);
    document.getElementById("stop").addEventListener("click", () => videoElement.pause() || (videoElement.src = "#"));
}());
