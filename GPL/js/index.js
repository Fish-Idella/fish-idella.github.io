(function () {

    var t = document.getElementById("textarea");

    var b = document.getElementById("start");

    var c = document.getElementById("checkbox");

    var p = new Pic2Str(document.getElementById("canvas"), 500).setOnCompletedEventListener(function (text) {
        t.value = text;
        t.classList.remove("hide");
        b.disabled = false;
    }).setOnImageloadedEventListener(function (_canvas, obj) {
        b.disabled = false;
    });

    document.getElementById("file").addEventListener("change", function () {
        b.disabled = true;
        t.classList.add("hide");
        p.loadImage(URL.createObjectURL(this.files[0]));
    });

    b.addEventListener("click", function () {
        b.disabled = true;
        p.toText(c.checked);
    });

}());