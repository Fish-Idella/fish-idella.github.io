var _hueCircle = document.getElementById("hue-circle");
var _hue = document.getElementById("hue");
var _saturation = document.getElementById("saturation");
var _lightness = document.getElementById("lightness");
var _sl = document.getElementById("sl");

var _preview = document.getElementById("preview");

var colors = [];

var originX, originY;

var startElement = null;

function setSL(x, y) {

    var saturation = x - originX;
    var lightness = 100 - (y - originY);

    _saturation.value = (saturation < 0) ? 0 : (saturation > 100 ? 100 : saturation);
    _lightness.value = lightness < 0 ? 0 : lightness > 100 ? 100 : lightness;

    _preview.value = rgb2hex(hslToRgb(_hue.value / 360, _saturation.value / 100, _lightness.value / 100));

    _preview.nextElementSibling.style.background =
        _preview.style.background = `hsl(${_hue.value}, ${_saturation.value}%, ${_lightness.value}%)`;

    _preview.nextElementSibling.style.color =
        _preview.style.color = `hsl(${(+_hue.value + 180) % 360}, ${Math.floor(_saturation.value / 2) + 50}%, ${Math.abs(100 - _lightness.value)}%)`;
}

function setHue(x, y) {

    var width = x - originX;
    var height = y - originY;

    var angle = 360 * Math.atan(height / width) / (2 * Math.PI);

    angle = _hue.value = Math.floor(angle + (width >= 0 ? 90 : 270));

    _saturation.value = 100;
    _lightness.value = 50;

    _preview.value = rgb2hex(hslToRgb(_hue.value / 360, _saturation.value / 100, _lightness.value / 100));

    _preview.nextElementSibling.style.background =
        _preview.style.background = `hsl(${angle}, 100%, 50%)`;

    _preview.nextElementSibling.style.color =
        _preview.style.color = `hsl(${(180 + angle) % 360}, 100%, 50%)`;

    for (let i = 0; i < 101; i++) {
        colors[i].style.backgroundImage = `linear-gradient(90deg, hsl(${angle}, 0%, ${100 - i}%), hsl(${angle}, 100%, ${100 - i}%))`;
    }

}


for (let i = 0; i < 101; i++) {
    var div = document.createElement("div");
    colors.push(div);
    _sl.appendChild(div);
    div.style.backgroundImage = `linear-gradient(90deg, hsl(0, 0%, ${100 - i}%), hsl(0, 100%, ${100 - i}%))`;
    div.style.height = '2px';
    div.style.top = (i + "px");
}

_hueCircle.addEventListener("mousedown", function (ev) {
    ev.preventDefault();
    // 鼠标左键被按下

    startElement = ev.target;

    if (startElement === _hueCircle && ev.button == 0 && ev.buttons == 1) {
        var _hueCircleRect = _hueCircle.getBoundingClientRect();
        originX = _hueCircleRect.width / 2 + _hueCircleRect.left;
        originY = _hueCircleRect.height / 2 + _hueCircleRect.top;
        setHue(ev.clientX, ev.clientY);
    }
});

_hueCircle.addEventListener("mousemove", function (ev) {
    ev.preventDefault();
    // 鼠标左键被按下

    if (startElement === _hueCircle && ev.button == 0 && ev.buttons == 1) {
        setHue(ev.clientX, ev.clientY);
    }
});

_hueCircle.addEventListener("mouseup", function (ev) {
    ev.preventDefault();
    // 鼠标左键被按下
    startElement = null;
});


_sl.addEventListener("mousedown", function (ev) {

    ev.preventDefault();
    // 鼠标左键被按下

    startElement = ev.target;

    if (startElement && startElement.parentElement === _sl && ev.button == 0 && ev.buttons == 1) {
        var rect = _sl.getBoundingClientRect();
        originX = rect.left;
        originY = rect.top;
        setSL(ev.clientX, ev.clientY);
    }
});

_sl.addEventListener("mousemove", function (ev) {
    ev.preventDefault();

    if (startElement && startElement.parentElement === _sl && ev.button == 0 && ev.buttons == 1) {
        setSL(ev.clientX, ev.clientY);
    }
});


_sl.addEventListener("mouseover", function (ev) {
    ev.preventDefault();

    if (startElement && startElement.parentElement === _sl && ev.button == 0 && ev.buttons == 1) {
        setSL(ev.clientX, ev.clientY);
    }
});


function fillString(str, i) {
    if ((str = "" + str).length < i) {
        return fillString("0" + str, i);
    } else {
        return str;
    }
}

function rgb2hex(r, g, b) {
    if (Array.isArray(r)) {
        g = r[1], b = r[2], r = r[0];
    }

    return ["#", fillString(r.toString(16), 2), fillString(g.toString(16), 2), fillString(b.toString(16), 2)].join("");
}


/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l) {
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   {number}  r       The red color value
 * @param   {number}  g       The green color value
 * @param   {number}  b       The blue color value
 * @return  {Array}           The HSL representation
 */
function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}