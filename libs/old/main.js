"use strict";

// 获取本地配置信息
////////////////////////////////////////////////////////////////////////////////////////////////
function getLocalConfig(item, defaultCofig) {
  let result = null;
  if (window.localStorage) {
    result = JSON.parse(window.localStorage.getItem(item) || 'null');
  }
  return result || defaultCofig;
}

function setLocalConfig(item, cofig) {
  if (window.localStorage) {
    window.localStorage.removeItem(item);
    window.localStorage.setItem(item, JSON.stringify(cofig));
  }
}

const localConfigure = getLocalConfig("puset-local-configure", defaultLocalConfig);
const settingsLastUpdate = new Date(localConfigure.lastUpdate);




// PuSet 扩展
////////////////////////////////////////////////////////////////////////////////////////////////

(function (PuSet) {
  /**
   * 
   * @param {object} options 
   * @param {String} html 
   */
  PuSet.fn.bindList = function (options, callback) {

    const self = this;
    const validator = {
      set: function (obj, prop, value) {

        if (value && "object" === typeof value) {
          value = new Proxy(value, validator);
        }

        self.each(function (_i, elem) {
          callback(elem, value, prop, options);
        });

        // The default behavior to store the value
        obj[prop] = value;

        // 表示成功
        return true;
      }
    };

    if (!options) options = {};
    if (!options.data) options.data = {};

    const proxy = new Proxy(options.data, validator);

    options.data = proxy;

    this.each(function (_i, elem) {
      for (let key in proxy) {
        callback(elem, proxy[key], key, options);
      }
    });

    return proxy;
  };

}(window.PuSet));




// 壁纸
////////////////////////////////////////////////////////////////////////////////////////////////

const $wallpaper = PuSet(".wallpaper");
const $background = PuSet("#background");
const $main = PuSet("#main");
const $drawer = PuSet("#drawer");
const $background_video = $background.find("video");
const $input_box = PuSet("#input-box");

/**
 * 网页壁纸，支持图片和视频
 * @param {*} url 视频或图片的地址
 * @param {*} isVideo 
 * @param {*} type 
 */
function loadBackground(url, isVideo = false, type = "video/mp4") {
  if (isVideo) {
    $wallpaper.each((_i, e) => e.removeAttr("style"));
    $background_video.attr({
      'src': url,
      'type': type,
      'loop': "loop",
      'muted': "muted",
      'autoplay': "autoplay"
    });
  } else {
    $background_video.removeAttr("src");
    $wallpaper.css("background-image", "url(" + url + ")");
  }

}

loadBackground("/images/afefac3b9dbdf36a0a4f42a52ac2135a.jpg");
// loadBackground("/videos/doax_vv.mp4", true, "video/mp4");



// 显示抽屉页面
////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 是否显示抽屉页面
 * @param {Boolean} bool 
 */
function ShowDrawer(bool) {

  if (bool) { // 右键
    $main.addClass("hide");
    $drawer.removeClass("hide");
  } else {
    $main.removeClass("hide");
    $drawer.addClass("hide");
    $background.removeClass("scale");
    $input_box.removeClass("focus");
  }
}

document.getElementById("menu").addEventListener("click", function () {
  ShowDrawer(true);
});



// 加载天气
////////////////////////////////////////////////////////////////////////////////////////////////

const $weather = PuSet("#weather");
const $iconfont = $weather.find(".fa-map-marker");
const $city_name = $weather.find("#city-name");
const $daily = $weather.find("#daily");
const $temperature = $weather.find("#temperature");

// settings.city = "--auto";
const today = new Date;

ParseWeather.getWeatherInfo(localConfigure.city, today, function (data) {
  // console.log(data);

  if (localConfigure.city == "--auto") {
    // 显示定位图标
    $iconfont.removeClass("hide");
  } else {
    // 隐藏定位图标
    $iconfont.addClass("hide");
  }
  // 城市名称
  $city_name.text(data.name);
  // 天气
  $daily.text(today.getHours() > 12 ? data.dayText : data.nightText);
  // 气温
  $temperature.text(data.now ? `${data.temperature}℃` : `${data.low}℃/${data.high}℃`);
});



// 显示快速链接
////////////////////////////////////////////////////////////////////////////////////////////////

const $scroll = PuSet("#scroll");

/**
 * 创建快速链接元素
 * @param {Array} arr 链接
 * @param {Number} layout 布局方式
 */
function createLinkLayout(arr, layout) {
  let result = [];
  if (layout.type === localConfigure.STABLE) {
    // TODO
  } else {
    arr.forEach(function (value) {
      result.push(`<a href="${value.href}"  draggable="true"><span class="bg" style="background-image: url(${value.local_icon || value.icon || (new urlObject("/favicon.ico", value.href)).href});"></span><span class="title">${value.title}</span></a>`);
    });
    // 首页添加链接的按钮
    result.push(`<a id="add-link-button" href="#l-add-link" draggable="false" class="${localConfigure.settings.main_show_add_button ? "" : "hide"}"><span class="bg" style="background-image: url(/icons/24d2dcee7c1a84a8a889a3ff87f18971.jpeg);"></span><span class="title">添加</span></a>`);
  }

  $scroll.html(result.join(''));

  // setIconSize(mScroll.clientWidth, 80);
};

createLinkLayout(localConfigure.links, localConfigure.layout);



// 添加快速链接
////////////////////////////////////////////////////////////////////////////////////////////////

const $l_add_link = PuSet("li#l-add-link");

$scroll.on("click", "a#add-link-button", function (ev) {
  ev.preventDefault();
  ShowDrawer(true);
  $l_add_link.click();
});


// 删除快速链接
////////////////////////////////////////////////////////////////////////////////////////////////

const $word = PuSet("#word");
let drag_element = null;

$scroll.on("dragstart", "a[draggable]", function () {
  drag_element = this;
  // drag_element.style.visibility = "hidden";
  // (ev.dataTransfer || ev.originalEvent.dataTransfer).setData("text/plain", this.getAttribute("href"));
});

$word.on("drop", function (ev) {
  ev.preventDefault();

  if (drag_element !== null && drag_element.id !== "add-link-button") {

    const a = drag_element.getAttribute("href");

    for (const i in localConfigure.links) {
      // console.log(i);

      if (localConfigure.links[i].href == a) {
        localConfigure.links.splice(i, 1);
        if (localConfigure.links.length === 0) {
          $scroll.hide();
          $head.addClass("only");
        }
        console.dir(localConfigure.links);
        break;
      }
    }


    drag_element.remove();
  }

  drag_element = null;
});

$scroll.on("dragover", ev => ev.preventDefault());



// 搜索高频词条预览
////////////////////////////////////////////////////////////////////////////////////////////////

let __ajax = 0;

const $head = PuSet("#head");
const $list = PuSet("#list");
const mQuickDelete = document.getElementById("quickdelete");

mQuickDelete.addEventListener("click", function (ev) {
  ev.preventDefault();
  $word.val("").focus();
});

$list.on("click", "li", function (ev) {
  // console.log(this)
  ev.preventDefault();
  $word.val(this.innerText).focus();
  mQuickDelete.style.display = "inline-block";
});


const vm_list = $list.bindList({
  data: {
    value: []
  }
}, function (elem, value, key) {

  if ("value" == key && Array.isArray(value)) {

    let children = elem.children;
    let length = children.length;
    // console.log(children);

    value.forEach(function (v, i) {

      let child;
      if (i < length) {
        children.item(i);
      } else {
        elem.appendChild(child = document.createElement("li"));
      }
      child.innerHTML = v;
      child.style.display = "";

    });

    for (let i = value.length; i < length; i++) {
      let li = children.item(i);
      li.style.display = "none";
    }
  }
});

$word.on({

  // 鼠标移动到元素上
  // "mouseenter": function(ev) {
  //   ev.preventDefault();
  //   $head.addClass("hover");
  // },

  // // 鼠标移动到元素外
  // "mouseleave": function(ev) {
  //   ev.preventDefault();
  //   $head.removeClass("hover");
  // },

  // 元素获得焦点
  "focus": function () {
    $background.addClass("scale");
    $head.addClass("focus");
    mQuickDelete.style.display = this.value.length ? "inline-block" : "none";
  },

  // 元素值发生改变
  "input": function () {

    const text = this.value.trim();

    if (text.length < 1) {
      vm_list.value = [];
      mQuickDelete.style.display = "none";
      return;
    }

    const i = (__ajax += 1);
    const success = function (data) {
      if (i === __ajax && Array.isArray(data.s)) {
        vm_list.value = data.s;
      }
    };

    PuSet.ajax({
      'url': "http://suggestion.baidu.com/su",
      'data': `wd=${text}`,
      'dataType': "jsonp",
      'jsonp': "cb",
      'success': success
    });

    mQuickDelete.style.display = "inline-block";
  }

});

// 搜索框点击动效
////////////////////////////////////////////////////////////////////////////////////////////////

const mIntputBox = $input_box.get(0);

PuSet("#main").on("mousedown.clickstart touchstart.clickstart", function (ev) {
  if (PuSet.inArray(mIntputBox, (ev.path || ev.originalEvent.path)) < 0) {
    mQuickDelete.style.display = "none";
    $background.removeClass("scale");
    $head.removeClass("focus");
  }
});


// 搜索跳转
////////////////////////////////////////////////////////////////////////////////////////////////

const $form = PuSet('form.search');

$form.get(0).addEventListener("submit", function (ev) {
  ev.preventDefault();

  let id = localConfigure.search_engine.show[0];
  if (ev.submitter) {
    id = ev.submitter.id.substring(7);
  }

  window.location = (localConfigure.search_engine.list[id].href.replace("{keyword}", $word.get(0).value));

  return false;
});