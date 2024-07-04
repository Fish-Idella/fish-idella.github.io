
const player = document.getElementById("player");
const video = document.getElementById("video");
const time_current = document.querySelector(".bpx-player-ctrl-time-current");
const time_duration = document.querySelector("span.bpx-player-ctrl-time-duration");
const play = player.querySelector(".bt.bt-play>img");

const progressBar = document.getElementById("progress-bar");
progressBar.addEventListener("change", function () {
    video.currentTime = this.value;
});

let longTime = false;

function formatTime(time) {
    const string = "" + time;
    return string.length < 2 ? ("0" + string) : string;
}

function paserDuration(duration) {
    return [
        formatTime(Math.floor(duration / 3600)),
        formatTime(Math.floor(duration / 60 % 60)),
        formatTime(Math.ceil(duration % 60))
    ].join(":");
}

function loadeddata() {
    const duration = video.duration;
    progressBar.max = duration;
    const dateString = paserDuration(duration);
    if (longTime = duration > 3600) {
        time_duration.innerHTML = dateString.substring(0, 8);
    } else {
        time_duration.innerHTML = dateString.substring(3, 8);
    }
}
function timeupdate() {
    const current = video.currentTime;
    progressBar.value = current;
    const dateString = paserDuration(current);
    if (longTime) {
        time_current.innerHTML = dateString.substring(0, 8);
    } else {
        time_current.innerHTML = dateString.substring(3, 8);
    }
}
function filechange(ev) {
    const file = this.files.item(0);
    if (null != file) {
        video.src = URL.createObjectURL(file);
        video.play().then(() => play.src = "svg/pause.svg");
    }
}
function mousemove(ev) {
    player.style.cursor = "default";
    bottom.classList.remove("hide");
    clearTimeout(timer);
    if (Object.is(ev.target, controls)) {
        timer = setTimeout(mouseleave, 5000);
    }
}
function mouseleave() {
    player.style.cursor = "none";
    bottom.classList.add("hide")
}

let frame = 0;
video.addEventListener("loadeddata", loadeddata);
video.addEventListener("timeupdate", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(timeupdate);
});
video.addEventListener("pause", function() {
    play.src = "svg/play.svg";
});
video.addEventListener("ended", function() {
    play.src = "svg/play.svg";
});

document.getElementById("file").addEventListener("change", filechange);
document.getElementById("stop").addEventListener("click", function() {
    video.pause();
});

const controls = document.getElementById("controls");
const bottom = controls.querySelector(".bottom");
let timer = 0;
controls.addEventListener("mousemove", mousemove);
controls.addEventListener("mouseleave", mouseleave);

const buttons = {
    "svg/play.svg": function (target) {
        video.play().then(() => target.src = "svg/pause.svg");
    },
    "svg/pause.svg": function (target) {
        video.pause();
    },
    "svg/volume.svg": function (target) {
        video.muted = true;
        target.src = "svg/muted.svg"
    },
    "svg/muted.svg": function (target) {
        video.muted = false;
        target.src = "svg/volume.svg"
    },
    "svg/separate.svg": function (target) {
        player.requestFullscreen().then(() => target.src = "svg/combined.svg");
    },
    "svg/combined.svg": function (target) {
        document.exitFullscreen().then(() => target.src = "svg/separate.svg");
    },
    "fn": function(target) {
        console.log(target.getAttribute("src"));
    }
};

const fullscreen = document.getElementById("fullscreen");
document.addEventListener('fullscreenchange', function () {
    if (document.fullscreenElement) {
        fullscreen.src = "svg/combined.svg";
    } else {
        fullscreen.src = "svg/separate.svg";
    }
});

document.querySelectorAll(".bt>img").forEach(function (element) {
    element.addEventListener("click", function () {
        ((buttons[this.getAttribute("src")] || buttons.fn)(this));
    });
});