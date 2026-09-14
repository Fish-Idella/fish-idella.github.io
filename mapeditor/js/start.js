/** @type {HTMLCanvasElement} */
const mapCanvas = document.getElementById("map");
const mapContext = mapCanvas.getContext("2d");

function d(w, h) {
    const p = Math.floor(1920 / w);
    const img = new Image();
    img.onload = function () {
        mapContext.drawImage(img, 0, 0, 1920, 1080)
        mapContext.fillStyle = "#eeeeee80"
        for (let i = 0; i < w; i++) {
            mapContext.fillRect(p * i, 0, 1, 1080)
        }
        for (let j = 0; j < h; j++) {
            mapContext.fillRect(0, p * j, 1920, 1)
        }
    }
    img.src = "/mediae/images/45a98b0e3a259f6a6ea2cb9b7f6922e5.png"
}

d(160, 90)