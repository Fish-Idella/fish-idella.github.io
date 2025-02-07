{

    // 播放器
    "use strict";

    const ePlayer = document.querySelector("#pu-video-player");
    const eVideo = ePlayer.querySelector("#video");
    const eUrl = document.querySelector('#url');
    const eFullscreen = ePlayer.querySelector("#fullscreen");
    const eControlBar = eFullscreen.querySelector(".control-bar");
    const eProgressBar = eControlBar.querySelector('.progress-bar');
    const eVolumeBar = eControlBar.querySelector('.volume-bar');
    const eVolumeContext = eVolumeBar.querySelector('.volume-context');
    const eVolume = eVolumeBar.querySelector('.volume');
    const eButtonPlay = eControlBar.querySelector("b.play");
    const eButtonMuted = eControlBar.querySelector("b.muted");
    const eButtonFullscreen = eControlBar.querySelector("b.fullscreen");
    const eElapsed = eControlBar.querySelector('.elapsed');
    const eDuration = eControlBar.querySelector('.duration');
    const eIconPlay = eFullscreen.querySelector(".icon.play");
    const eIconSound = eFullscreen.querySelector(".icon.sound");

    // 更新音量
    let updateVolumeTime = 0;
    const fnUpdateVolume = function (value) {
        const sound = Math.floor(value);
        eVolumeContext.textContent = String(sound);
        // 静音
        if ((eVideo.volume = value / 100) === 0) {
            eVideo.muted = true;
            eButtonMuted.classList.add('muted');
            if (eVolumeBar.classList.contains("hide")) {
                clearTimeout(updateVolumeTime);
                eIconSound.textContent = "Muted";
                eIconSound.classList.add("muted");
                eIconSound.classList.remove("hide");
                updateVolumeTime = setTimeout(function () {
                    eIconSound.classList.add("hide");
                }, 1000);
            }
        } else {
            eVideo.muted = false;
            eButtonMuted.classList.remove('muted');
            if (eVolumeBar.classList.contains("hide")) {
                clearTimeout(updateVolumeTime);
                eIconSound.innerHTML = sound + "%";
                eIconSound.classList.remove("muted");
                eIconSound.classList.remove("hide");
                updateVolumeTime = setTimeout(function () {
                    eIconSound.classList.add("hide");
                }, 1000);
            }
        }
    };


    const formatTime = timestamp => new Date(timestamp * 1000).toUTCString().slice(17, 25);
    const URLObj = window.URL || window.webkitURL || {
        createObjectURL: function (a) {
            return "" + a;
        }
    };

    // 视频加载成功
    eVideo.addEventListener('loadedmetadata', function () {
        eProgressBar.max = Math.ceil(eVideo.duration || 0);
        eProgressBar.value = Math.floor(eVideo.currentTime || 0);
        eDuration.textContent = formatTime(eVideo.duration);
        // eIconPlay.classList.remove("hide");
    });


    // 更新进度条
    const updateProgress = function () {
        const current = Math.floor(eVideo.currentTime || 0);
        eProgressBar.value = current;
        eElapsed.textContent = formatTime(current);
    };
    eVideo.addEventListener('play', function () {
        eDuration.textContent = formatTime(eVideo.duration);
        eButtonPlay.classList.add("pause");
        eFullscreen.classList.add("min");
    });
    eVideo.addEventListener('pause', function () {
        eButtonPlay.classList.remove("pause");
        eFullscreen.classList.remove("min");
    });


    eVolume.addEventListener('input', () => fnUpdateVolume(eVolume.value));

    eProgressBar.addEventListener('pointerup', function (ev) {
        if (ev.button === 0) {
            const current = eVideo.duration > 0 ? Math.floor(eVideo.duration * ev.offsetX / this.clientWidth) : 0;
            this.value = current;
            eVideo.currentTime = current;
        }
    });

    const fnPlayOrPause = function () {
        if (eVideo.duration) {
            if (eVideo.paused) {
                eVideo.play();
            }
            else {
                eVideo.pause();
            }
        }
    };
    eButtonPlay.addEventListener("click", fnPlayOrPause);
    // eIconPlay.addEventListener("click", fnPlayOrPause);
    eVolumeBar.addEventListener('mouseleave', function () {
        eVolumeBar.classList.add("hide");
    });
    eButtonMuted.addEventListener('click', function () {
        eVideo.muted = !eVideo.muted;
        if (eVideo.muted) {
            eButtonMuted.classList.add('muted');
        }
        else {
            eButtonMuted.classList.remove('muted');
        }
    });
    eButtonMuted.addEventListener("pointermove", function () {
        eVolume.value = String(eVideo.volume * 100);
        eVolumeContext.textContent = eVolume.value;
        eVolumeBar.classList.remove("hide");
    });
    eButtonFullscreen.addEventListener("click", function () {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        else {
            eFullscreen.requestFullscreen();
        }
    });

    let infull = false;
    document.addEventListener('keydown', function (ev) {

        // console.log('ev.code === "' + ev.code + '" || ev.keyCode === ' + ev.keyCode);

        // 排除输入框
        if ((ev.target === document.body) && infull) {
            ev.preventDefault();

            // 右方向键，快进
            if (ev.code === "ArrowRight" || ev.keyCode === 39) {
                eVideo.currentTime = Math.min(eVideo.duration, eVideo.currentTime + 5);
            }
            // 上方向键，加音量
            else if (ev.code === "ArrowUp" || ev.keyCode === 38) {
                if (eVideo.muted) {
                    fnUpdateVolume(5);
                }
                else {
                    fnUpdateVolume((100 * Math.min(1, eVideo.volume + 0.05)));
                }
            }
            // 下方向键，减音量
            else if (ev.code === "ArrowDown" || ev.keyCode === 40) {
                fnUpdateVolume((100 * Math.max(0, eVideo.volume - 0.05)));
            }
            // 左方向键，快退
            else if (ev.code === "ArrowLeft" || ev.keyCode === 37) {
                eVideo.currentTime = Math.max(0, eVideo.currentTime - 5);
            }
            // 空格，暂停
            else if (ev.code === "Space" || ev.keyCode === 32) {
                fnPlayOrPause();
            }
            const current = Math.floor(eVideo.currentTime || 0);
            eProgressBar.value = current;
            eElapsed.textContent = formatTime(current);
        }
    });
    document.addEventListener('click', function(ev) {
        const array = ev.composedPath ? ev.composedPath(): ev.path;
        infull = (array && array.includes(eFullscreen));
    });


    // 控制条显示状态
    let fnHideControlBar, timeout = 0, boolHideControlBar = true;
    eFullscreen.addEventListener("mouseleave", fnHideControlBar = function () {
        eVolumeBar.classList.add("hide");
        eFullscreen.classList.add("min");
        boolHideControlBar = true;
    });
    eFullscreen.addEventListener("pointermove", function () {
        clearTimeout(timeout);
        if (boolHideControlBar) {
            eFullscreen.classList.remove("min");
            boolHideControlBar = false;
        }
        // 3秒后隐藏控制条
        timeout = setTimeout(fnHideControlBar, 3000);
    });
    eFullscreen.addEventListener('click', function() {
        infull = true;
    });

    const vm_video_select = PuSet.View({
        target: document.getElementById('video-select'),
        selector: 'div',
        data: [],
        layout: function (target, value, i) {
            target.dataset.index = i;
            target.textContent = (target.title = "" + value.name).split(".")[0];
        }
    });

    const storage = new PuSet.StorageHelper();
    storage.then(function () {

        let files, states = { index: 0, time: 0 };
        storage.getItem('local-video-files').then(function (fs) {
            if (fs) {
                vm_video_select.update(files = fs);
                storage.getItem('local-video-states').then(function (obj) {
                    states = Object.assign({ index: 0, time: 0 }, obj);
                    setVidoe(null, null, states.index, states.time);
                    vm_video_select.target.children.item(states.index).classList.add("current");
                });
            }
        });

        const setVidoe = function (ev, fs, i, time = 0) {
            let hasEvent = false;
            if (ev) {
                hasEvent = true;
                if (ev.preventDefault) ev.preventDefault();
                if (ev.stopPropagation) ev.stopPropagation();
            }
            if (fs) {
                // 初始化剧集
                states.index = 0;
                vm_video_select.update(files = fs);
                storage.setItem('local-video-files', files);
            }
            if (files.length > i) {
                eUrl.value = eVideo.src = URLObj.createObjectURL(files.item(i));
                eVideo.currentTime = time;
                fnUpdateVolume(10);
                if (hasEvent) {
                    eVideo.play().catch(() => console.log('play.'));
                }
            }
        }

        eVideo.addEventListener("timeupdate", function () {
            states.time = eVideo.currentTime;
            updateProgress();
            storage.setItem('local-video-states', states);
        });
        eVideo.addEventListener('ended', function (ev) {
            states.index++;
            states.time = 0;
            setVidoe(ev, null, states.index, 0);
            vm_video_select.target.querySelector(".current").classList.remove("current");
            vm_video_select.target.children.item(states.index).classList.add("current");
        });

        PuSet(vm_video_select.target).on("click", "div", function (ev) {
            if (this.dataset.index) {
                vm_video_select.target.querySelector(".current").classList.remove("current");
                setVidoe(ev, null, (states.index = this.dataset.index), 0);
                this.classList.add("current");
            }
        });

        ePlayer.addEventListener("dragover", ev => ev.preventDefault());
        ePlayer.addEventListener("drop", function (ev) {
            setVidoe(ev, ev.dataTransfer.files, 0);
        });

        document.querySelector('#start').addEventListener('click', function () {
            eVideo.src = eUrl.value;
            eVideo.play();
        });
        document.querySelector("#file").addEventListener("input", function (ev) {
            setVidoe(ev, this.files, 0);
        });

    });
}
;
// {
//     // 弹幕

//     const barrage = new Barrage(document.getElementById("dm"));

//     // barrage.setList(danmu);

//     // console.log(barrage)

//     let currentTime = -1;
//     document.getElementById("video").addEventListener('timeupdate', function () {
//         let time = Math.floor(this.currentTime || 0);
//         if (time !== currentTime) {
//             barrage.show(currentTime = time);
//         }
//     });

// }