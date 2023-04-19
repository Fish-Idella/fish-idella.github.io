/**
 * Android WebView and Javascript interaction interface
 */

window.Mm = (function (Mm) {

    Mm.global = PuSet.getActionInput(document);

    window.onpusetwebviewkeyclick = function(typeCode) {
        Mm.global.trigger(new PuSet.ActionEvent("global-key", {
            isCustom: true,
            globalKey: typeCode
        }));
    };

    const M = function (a, b) {
        return PuSet(a, b);
    };

    return Object.assign(M, Mm);
}({

    /**
     * 事件代码：菜单键
     */
    KEYCODE_MENU: -1,

    /**
     * 事件代码：返回键
     */
    KEYCODE_BACK: -2,

    /**
     * @type {PuSet.ActionInput}
     */
    global: null,

    /**
     * 接管 WebView 的事件，触发事件时优先传递给 js
     */
    isTakeover: false,

    // 判断WebView接口是否开放
    hasInterface: "object" === typeof window.PuSetWebView,

    addEventListener: function (type, listener) {
        this.takeoverEvent();
        if (type === "global-key") {
            this.global.add(type, null, listener, false, false);
        }
    },

    removeEventListener: function (type, listener) {
        if (type === "global-key") {
            this.global.remove(type, null, listener, false, false);
        }
    },

    /**
     * 接管 WebView 的事件，触发事件时优先传递给 js
     */
    takeoverEvent: function() {
        if (!this.isTakeover) {
            if (this.hasInterface && PuSetWebView.takeoverEvent) {
                PuSetWebView.takeoverEvent(this.isTakeover = true);
            }
        }
    },

    /**
     * 委托事件：将 js 接管的事件重新委托给 WebView
     * @param {number} i 事件代码
     */
    entrustEvent: function (i) {
        if (this.hasInterface && PuSetWebView.entrustEvent) {
            PuSetWebView.entrustEvent(i);
        }
    },

    /**
     * 设置列表
     * @param {String} params Arrays JSON
     */
    setSimpleList: function (params) {
        if (this.hasInterface && PuSetWebView.setSimpleList) {
            PuSetWebView.setSimpleList("" + params);
        }
    },

    /**
     * 下载单个文件
     * @param {string|blob} url 文件数据
     * @param {string} filename 文件名
     */
    download: function (url, filename = true) {
        const save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
        save_link.href = url;
        save_link.download = filename;
        save_link.dispatchEvent(new MouseEvent('click', {
            'view': window,
            'bubbles': true,
            'cancelable': true
        }));
    },

    /**
     * 下载多个文件，并存放到同一个文件夹下
     * @param {string} dir 文件夹名称
     * @param {string[]} arr 文件数据
     */
    downloadGroup: function (dir, arr) {
        if (this.hasInterface && PuSetWebView.downloadGroup) {
            PuSetWebView.downloadGroup(dir.replace(/[\/\?\\\|\<\>\*\"]*/g, ""), JSON.stringify(arr));
        } else {
            let length = arr.length;
            let t = setInterval(() => {
                length--;
                this.download(arr[length]);
                if (length === 0) {
                    clearInterval(t);
                }
            }, 1000);
        }
    },

    URL: window.URL || window.webkitURL || window,

    getImage: function (image, url, error) {
        const img = new Image();

        img.onerror = function(ev) {
            if (error && image.dataset.src == url) {
                error(image, url, ev);
            }
        };
        
        img.onload = function() {
            if (image.dataset.src == url) {
                image.src = image.dataset.src;
            }
        };

        img.src = url;
    }

}));