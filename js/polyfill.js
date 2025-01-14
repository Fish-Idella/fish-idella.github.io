window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL || window.oURL || window;
if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = function (blob) {
        return blob;
    };
}