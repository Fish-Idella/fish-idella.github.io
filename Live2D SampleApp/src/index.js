const live2dw_model = new URL("./assets/sat8_2601.model.json", document.baseURI).href;

function getAbsolutePath(path) {
    return new URL(path, live2dw_model).href;
}

Live2DFramework.setPlatformManager(new PlatformManager());

const model = new LAppModel();

console.log(model)

model.loadModelData(live2dw_model, function(a) {
    a.init();
    console.log(a)
});


const resizeCanvas = function resizeCanvas() { 
    const canvas = document.getElementById("glcanvas");
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
};

document.addEventListener("DOMContentLoaded", resizeCanvas);
window.addEventListener("resize", resizeCanvas);