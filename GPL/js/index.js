(function () {

    var t = document.getElementById("textarea");
    var b = document.getElementById("start");
    var c = document.getElementById("checkbox");

    var p = new Pic2Str(document.getElementById("canvas"), 100)
        .setOnCompletedEventListener(function (text) {
            t.value = text;
            t.classList.remove("hide");
            b.disabled = false;
        }).setOnImageloadedEventListener(function (_canvas, obj) {
            b.disabled = false;
        });

    var isImage = true;
    var video = document.createElement('video');
    video.isPlaying = function () {
        return !video.paused && !video.ended;
    };

    var canvas = p.canvas;
    var ctx = p.ctx;

    var videoWidth = video.videoWidth, videoHeight = video.videoHeight;

    video.preload = "auto";
    video.onloadedmetadata = function () {
        videoWidth = video.videoWidth, videoHeight = video.videoHeight;
        p.resize(1920, 1080);
    };

    document.getElementById("file").addEventListener("change", function () {
        const file = this.files[0];
        if (!file) {
            return;
        }
        video.isPlaying() && video.pause();
        if (isImage = file.type.startsWith("image")) {
            b.disabled = true;
            t.classList.add("hide");
            p.loadImage(URL.createObjectURL(file));
        } else {
            b.disabled = false;
            t.classList.add("hide");
            video.src = URL.createObjectURL(file);
        }
    });

    b.addEventListener("click", function () {
        if (isImage) {
            b.disabled = true;
            p.toText(c.checked);
        } else {
            if (video.isPlaying()) {
                video.pause();
            } else {
                video.play();

                requestAnimationFrame(function a() {
                    if (videoWidth > videoHeight) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    } else {
                        const h = canvas.height;
                        const w = h * videoWidth / videoHeight;
                        ctx.drawImage(video, (canvas.width - w) / 2, 0, w, h);
                    }
                    p.toText(c.checked);

                    if (video.isPlaying()) {
                        requestAnimationFrame(a);
                    }
                })
            }
        }
    });

}());
