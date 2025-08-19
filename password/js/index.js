
"use strict";

const json = JSON.parse(window.localStorage.getItem("puset-password") || "[]");

const list = document.querySelector(".mian-list");

const vm_mian_list = Interpreter({
    target: list,
    selector: "li",
    data: json,
    layout: function (target, value, key) {
        target.dataset.id = key;
        const image = new Image();
        image.onload = function () {
            target.textContent = "";
            target.style.setProperty("background-image", `url(${image.src})`);
        };
        image.onerror = function () {
            target.textContent = value.name;
            target.removeAttribute("style");
        };
        if (value.icon) {
            image.src = value.icon;
        } else {
            image.onerror();
        }
    }
});

list.addEventListener("click", function (e) {
    if (e.target.tagName === "LI") {
        var index = e.target.dataset.id;
        var value = json[index];
        console.log(value);
    }
});