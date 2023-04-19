"use strict";


// 页面顶部
////////////////////////////////////////////////////////////////////////////////////////////////

document.getElementById("close").addEventListener("click", function () {
    ShowDrawer(false);
});

// 页面左侧的功能栏
////////////////////////////////////////////////////////////////////////////////////////////////
const _context = document.querySelector("#context");
const __block = _context.querySelectorAll("ul.block");
const $title = PuSet("#title");
// console.log(__block)
let _current_block = __block.item(0);

/**
 * 滚动到指定元素
 * @param {Element} target 目标页面
 * @param {Element} li 被点击的列表成员
 */
const fn_show_block = function (target, li) {
    // console.log(target)
    if (target && target !== _current_block) {
        _current_block = target;
        _menu_list.querySelectorAll("li").forEach((child) => child.classList.remove("light"));
        li.classList.add("light");
        $title.html(li.querySelector("div.fc").innerHTML);
    }
}

const _menu_list = PuSet("#menu-list").on("click", "li", function () {
    const target = _context.querySelector("ul.block#" + this.id.substring(2));
    fn_show_block(target, this);
    setTimeout(() => target.scrollIntoView(true), 0);
}).get(0);

_context.addEventListener("scroll", function (ev) {
    ev.preventDefault();
    for (let elem of __block) {
        if ((elem.offsetTop + elem.clientHeight - 50) >= this.scrollTop) {
            return fn_show_block(elem, _menu_list.querySelector("#l-" + elem.id));
        }
    }
});


// 天气
////////////////////////////////////////////////////////////////////////////////////////////////

// 主题
////////////////////////////////////////////////////////////////////////////////////////////////

function getNetworkImage(str, callback) {

    const reader = new FileReader();
    const xhr = new XMLHttpRequest();

    reader.onloadend = () => {
        if (reader.readyState === FileReader.DONE) {
            // setLocalCofig('puset-settings', settings);
            callback(reader.result);
        } else {
            console.dir(reader);
        }
    };

    xhr.open("get", str, true);
    // 至关重要
    xhr.responseType = "blob";
    xhr.onload = function () {
        reader.readAsDataURL(this.response);
    };

    xhr.send();
}


function getLocalImage(obj, callback) {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.readyState === FileReader.DONE) {
            callback(reader.result);
        } else {
            console.dir(reader);
        }
    };
    reader.readAsDataURL(obj);
}

document.getElementById("select-image").addEventListener("change", function () {
    getLocalImage(this.files[0], loadBackground);
});


// 页面配置文件
////////////////////////////////////////////////////////////////////////////////////////////////

const urlObject = window.URL || window.webkitURL || window;
urlObject.createObjectURL = urlObject.createObjectURL || function() {
    return "";
};

// var u = new urlObject("/sdad/dsd.js", "http://www.innerHTML = .com/sdsd.innerHTML = ");
// console.dir(u);

/**
 * 模拟下载文本 
 * @param {string} fileName 文件名称
 * @param {string} data 文本内容
 */
function download(fileName, data) {

    const save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
    save_link.href = urlObject.createObjectURL(new Blob([data]));
    save_link.download = fileName;

    const ev = document.createEvent("MouseEvents");
    ev.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    save_link.dispatchEvent(ev);
}

// 导出配置文件
document.getElementById("save-configure").addEventListener("click", function () {
    download(`configure_${Date.now()}.psc.json`, JSON.stringify(localConfigure));
});