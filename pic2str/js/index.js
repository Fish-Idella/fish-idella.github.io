var canvas = document.getElementById("canvas");
var t = document.querySelector("#t");


var pic2str = new Pic2Str(canvas, 50);

pic2str.onComplete = function (text) {
	t.value = text;
};

document.getElementById("file").addEventListener("change", function () {
	pic2str.loadImage(URL.createObjectURL(this.files[0]), function () {
		pic2str.toText();
	});

	this.value = null;
}, false);