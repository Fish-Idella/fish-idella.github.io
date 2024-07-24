new Promise(function(resolve, reject) {
    storage.then(function () {
        resolve(fetch("/libs/configure.json", {
            method: 'GET',
            headers: {
                'Content-Type': 'text/plain',
            },
            mode: 'cors',
            cache: 'default'
        }))
    }).catch(reject);
}).then(a => a.json()).then(function (SettingUI) {

    const mDrawer = document.getElementById("drawer");
    const mAlert = document.getElementById("alert");

    const mContext = mDrawer.querySelector("#context");
    const mTitle = mDrawer.querySelector("span#title");
    const mMenuList = mDrawer.querySelector("#menu-list");

    const mAlert_title = mAlert.querySelector("input.input-title");
    const mAlert_icon = mAlert.querySelector("input.input-icon");
    const mAlert_url = mAlert.querySelector("input.input-url");

    function getPsId(target) {
        const psid = target.dataset.psid;
        if (target === mContext) {
            return "";
        } else if (psid) {
            return psid;
        } else {
            return getPsId(target.parentElement);
        }
    }

    function getLocalFile(type, fn) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type;
        input.addEventListener("change", fn);
        input.click();
    }

    function allSame(array, bool) {
        if (Array.isArray(array)) {
            const length = array.length;
            for (let i = 0; i < length; i++) {
                if (bool !== MainUI.GS[array[i]]) {
                    return false;
                }
            }
        }
        return true;
    }

    function fillContent(subTarget, subValue, key, i) {
        // 子标签正文
        PuSet.View({
            target: subTarget.querySelector(".block.content"),
            data: subValue.inner,
            template: function (index, type) {
                return Interpreter.get(type).cloneNode();
            },
            layout: function (target, value, key, i) {
                target.dataset.psid = value.psid;
                if (value.show || value.hide) {
                    const onchange = () => PuSet.View.show(target, (allSame(value.hide, false) && allSame(value.show, true)));
                    mContext.addEventListener("change", () => setTimeout(onchange, 50));
                    onchange();
                }
                let __child;
                if (__child = target.querySelector(".text")) {
                    __child.innerHTML = value.text || "";
                }
                if (__child = target.querySelector(".long_text")) {
                    __child.innerHTML = value.long_text || "";
                }
                if (__child = target.querySelector(".value")) {
                    __child.dataset.psid = value.psid;
                }

                Interpreter.get(value.type).fn(0, target, value, key, i);
            }
        });
    }

    function fillSubView(mainTarget, value, key, i) {
        // 子标签
        PuSet.View({
            target: mainTarget,
            data: value.inner,
            template: '<div class="block"><div class="sub-title text"></div><span class="long_text"></span><div class="block content"></div></div>',
            layout: function (subTarget, value, key, i) {
                subTarget.dataset.psid = value.psid;
                subTarget.querySelector(".text").innerHTML = value.text;
                subTarget.querySelector(".long_text").innerHTML = value.long_text || "";

                fillContent(subTarget, value, key, i);
            }
        });
    }

    function createView() {
        PuSet.View({
            target: document.getElementById("menu-list"),
            selector: "li",
            data: SettingUI,
            layout: function (target, value, key, index) {

                // 左侧列表 -----------------------------------------------------------------------------
                target.dataset.psid = value.psid;
                if (index == 0) {
                    target.classList.add("light");
                }
                target.querySelector(".icon").innerHTML = value.icon;
                target.querySelector(".text").innerHTML = value.text;

                // 右侧列表 -----------------------------------------------------------------------------
                let mainTarget = Interpreter.get("main-title").cloneNode();
                mainTarget.dataset.psid = value.psid;
                mainTarget.querySelector(".text").innerHTML = value.text;
                mainTarget.querySelector(".long_text").innerHTML = value.long_text || "";

                fillSubView(mainTarget, value, key, index);

                mContext.appendChild(mainTarget);
            }
        });
    }

    

    Interpreter.set("main-title", function () {

        let child, target = document.createElement("div");
        target.className = "block";

        child = document.createElement("span");
        child.className = "main-title text";
        target.appendChild(child);

        child = document.createElement("span");
        child.className = "long_text";
        target.appendChild(child);

        return target;
    })


    Interpreter.set("switch", function () {
        let child, label = document.createElement("label");
        label.className = "switch";

        let div = Interpreter.cloneNode();
        div.className = "subtitle-bar";
        label.appendChild(div);

        child = document.createElement("span");
        child.className = "text";
        div.appendChild(child);

        child = document.createElement("input");
        child.type = "checkbox";
        child.className = "value check-switch check-switch-anim";
        div.appendChild(child);

        child = document.createElement("span");
        child.className = "long_text";
        label.appendChild(child);

        return label;
    }, function (target, value) {
        target.querySelector(".value").checked = MainUI.GS[value.psid];
    })


    Interpreter.set("input", function () {
        let child, label = Interpreter.get("switch").cloneNode();
        label.className = "input";

        child = label.querySelector("input.check-switch");
        child.type = "text";
        child.className = "view value";

        const div = document.createElement("label");
        div.className = "input-box"
        div.appendChild(child);

        const select = document.createElement("ul");
        select.className = "view select"
        div.appendChild(select);

        label.firstChild.appendChild(div);

        return label;
    }, function (target, value) {
        const input = target.querySelector(".value");
        input.value = MainUI.GS[value.psid];

        if (value.psid == "string_local_city") {

            const vm_select = PuSet.View({
                'target': target.querySelector("ul.select"),
                'data': [],
                'template': '<li></li>',
                'layout': function (target, value, key) {
                    const arr = value.split("|");
                    target.innerHTML = target.title = arr[1]
                }
            });

            PuSet(vm_select.target).on("mousedown", ev => ev.preventDefault()).on("click", "li", function (ev) {
                ev.preventDefault();
                // ev.stopPropagation();
                input.value = this.title;
                return false;
            });
            var string, t_city = 0;
            input.addEventListener("input", function () {
                clearTimeout(t_city);
                if (string = this.value.trim()) {
                    t_city = setTimeout(() => ParseWeather.autoComplete(string, function (json) {
                        if (json && json.msg == "success") {
                            Object.assign(vm_select.data, json.data);
                        }
                    }), 500)
                }
            })
        }
    })


    Interpreter.set("list-item", function () {
        let li = '<li><span class=showIn></span><span class="fc name"></span><button class=bt-edit title=Edit><i class="fa-solid fa-pen-to-square"></i></button><button class=bt-remove title=Remove><i class="fa-solid fa-delete-left"></i></button>';
        return Interpreter.parseHtml(li);
    })

    Interpreter.set("button", function () {
        let child, label = document.createElement("div");
        label.className = "button";

        let div = Interpreter.cloneNode();
        div.className = "subtitle-bar";
        label.appendChild(div);

        child = document.createElement("span");
        child.className = "text";
        div.appendChild(child);

        child = document.createElement("input");
        child.type = "button";
        child.value = "确定";
        child.className = "value";
        div.appendChild(child);

        child = document.createElement("span");
        child.className = "long_text";
        label.appendChild(child);

        return label;
    })

    Interpreter.set("file", function () {
        let child, label = document.createElement("div");
        label.className = "file";

        let div = Interpreter.cloneNode();
        div.className = "subtitle-bar";
        label.appendChild(div);

        child = document.createElement("span");
        child.className = "text";
        div.appendChild(child);

        let file = document.createElement("input");
        file.type = "file";
        file.accept = ".json";
        file.className = "value";

        child = document.createElement("label");
        child.className = "custom-button";
        child.appendChild(file);
        div.appendChild(child);

        child = document.createElement("span");
        child.className = "long_text";
        label.appendChild(child);

        return label;
    }, function (target, value) {
        target.querySelector(".value").accept = value.accept;
    })


    Interpreter.set("object-list", function () {
        let div = Interpreter.parseHtml('<div class=object-list><div class=subtitle-bar><span class=text></span> <input class=add type=button value=添加></div><span class=long_text></span><ul class=list></ul></div>');
        return div;
    }, {
        length: 1,

        0: function (target, value, key, i) {
            let obj = MainUI.GS[value.psid];
            let arr = MainUI.GS[value.value];
            let ul = target.querySelector("ul.list");
            let $li = PuSet();
            let self = this;
            for (let id in obj) {
                let li = Interpreter.get("list-item").cloneNode();
                li.title = id;
                li.querySelector(".name").innerHTML = obj[id].title;
                $li.push(li);
                ul.appendChild(li);

                li.addEventListener("click", function (ev) {
                    ev.preventDefault();
                    let index;
                    if ((index = arr.indexOf(this.title)) > -1) {
                        arr.splice(index, 1);
                    } else if (arr.length < 3) {
                        arr.push(this.title);
                    } else {
                        return alert("最多只能选择3个");
                    }

                    setLocalConfig("puset-local-configure", MainUI.GS);
                    self.fn("order", $li, arr);
                    MainUI.onchange(value.psid, value.value);
                });

                this.fn("button-click", value.psid, obj, arr, $li, li);
            }
            this.fn("order", $li, arr);
            target.querySelector(".add").addEventListener("click", function () {
                self.fn("show-alert", value.psid, obj);
            });
        },
        "order": function ($li, arr) {
            $li.each(function (li) {
                let index = arr.indexOf(li.title);
                if (index < 0) {
                    li.style.order = 4;
                    li.querySelector(".showIn").removeAttribute("data-index");
                } else {
                    li.style.order = index;
                    li.querySelector(".showIn").dataset.index = 1 + index;
                }
            });
        },
        "button-click": function (psid, obj, arr, $li, li) {
            const self = this;
            li.querySelector("button").addEventListener("click", function (ev) {
                ev.preventDefault();
                ev.stopPropagation();

                switch (this.title) {
                    case "Edit": {
                        self.fn("show-alert", psid, obj, li.title);
                        break;
                    }
                    case "Remove": {
                        let index;
                        if ((index = arr.indexOf(li.title)) > -1) {
                            arr.splice(index, 1);
                            self.fn("order", $li, arr);
                        }
                        li.remove();
                        break;
                    }
                }

            });
        },
        "show-alert": function (psid, obj, a) {
            mAlert.classList.remove("hide");
            mAlert.dataset.psid = psid;
            let data;
            if (a && (data = obj[a])) {
                mAlert.dataset.key = a;

                (mAlert_title.value = data.title) &&
                    mAlert_title.nextElementSibling.classList.add("foucs");
                (mAlert_icon.value = data.local_icon || data.icon) &&
                    mAlert_icon.nextElementSibling.classList.add("foucs");
                (mAlert_url.value = data.href) &&
                    mAlert_url.nextElementSibling.classList.add("foucs");
                mIcon.src = data.local_icon || data.icon;
            }
        }
    })

    Interpreter.set("array-list", function () {
        const div = Interpreter.get("object-list").cloneNode();
        div.className = "array-list";
        return div;
    }, function (target, value, key, index) {

        const vm_a = PuSet.View({
            target: target.querySelector("ul.list"),
            template: Interpreter.get("list-item").cloneNode(),
            data: MainUI.GS[value.psid],
            layout: function (li, value, key, index) {
                li.title = key;
                li.querySelector(".name").innerHTML = value.title;
                const img = new Image;
                li.querySelector(".showIn").appendChild(img);
                img.src = value.local_icon || value.icon || (new URLObject("/favicon.ico", value.href)).href;
            }
        });

        const view = Interpreter.get("object-list");

        target.querySelector(".add").addEventListener("click", function () {
            view.fn("show-alert", value.psid, vm_a.originalData);
        });

        PuSet(vm_a.target).on("click", "button,input[type=button]", function (ev) {
            ev.preventDefault();
            if (this.classList.contains("bt-edit")) {
                view.fn("show-alert", value.psid, vm_a.originalData, this.parentElement.title)
            } else if (this.classList.contains("bt-remove")) {
                if (value.psid == "map_all_links") {
                    MainUI.GS.map_all_links.splice(this.parentElement.title, 1);
                    setLocalConfig("puset-local-configure", MainUI.GS);
                }
            }
        })

    })

    Interpreter.set("radio", function () {
        const radio = '<label><input type="radio"><span></span></label>';
        return Interpreter.parseHtml(radio);
    })

    Interpreter.set("radio-list", function () {
        let div = document.createElement("form");
        div.className = "radio-list";
        return div;
    }, function (target, value) {
        let psid;
        let arr = MainUI.GS[psid = value.psid];
        PuSet.each(arr, function (value1, i) {
            let label = Interpreter.get("radio").cloneNode();
            label.className = "radio fc " + value1;
            let radio = label.querySelector("input");
            radio.name = value.value;
            radio.type = "radio";
            radio.checked = value1 == MainUI.GS[value.value]
            radio.value = value1;
            target.appendChild(label);
        });
    })

    Interpreter.set("image-select", function () {

        let div = Interpreter.parseHtml(`<div class="image-select" data-psid="boolean_file_wallpaper">
<label class="subtitle-bar">
    <span class="text">本地文件</span>
    <input type="checkbox" class="value check-switch check-switch-anim" data-psid="boolean_file_wallpaper">
</label>
<div class="flex-horizontal image-select-box">
    <div class="bgPreviewBox">
        <div class="bgPreBoxInner unset" id="bgPreBoxInnerCustom"></div>
    </div>
    <div class="fc">
        <div class="title-bold">将您喜爱的任意图像 / 视频设为壁纸。</div>
        <div class="pTitleS">建议分辨率：1920×1080 或更高</div>
        <label class="btnRectangle" type="button">
            <input type="file" placeholder="浏览...">
        </label>
    </div>
</div>
</div>`);

        return div;
    }, function (target, value) {
        target.querySelector(".value").checked = MainUI.GS[value.psid];
    });













    function onMenuListOptionsChange(psid) {
        PuSet.each(mMenuList.children, function (li) {
            if (li.dataset.psid == psid) {
                li.classList.add("light");
            } else {
                li.classList.remove("light");
            }
        });
    }

    PuSet(mContext).on("change", "input", function (ev) {
        const target = this;
        const psid = getPsId(target);
        if (psid) {
            let value;
            switch (target.type) {
                case "checkbox": {
                    MainUI.GS[psid] = value = target.checked;
                    break;
                }
                case "file": {
                    value = target.files[0];
                    if (psid == "import_configuration") {
                        return PuSetting.import_configuration(URLObject.createObjectURL(value));
                    }
                    MainUI.GS[psid] = value;
                    break;
                }
                case "radio": {
                    MainUI.GS[target.name] = value = target.value;
                    break;
                }
                default: {
                    MainUI.GS[psid] = value = target.value;
                    console.log(target.type)
                }
            }

            MainUI.onchange(psid, target.type, value);
            setLocalConfig("puset-local-configure", MainUI.GS);
        }
    }).on("click", function (ev) {
        const target = ev.srcEvent ? ev.srcEvent.target : ev.target;
        
        if (target.type == "button") {
            const fn = PuSetting[getPsId(target)];
            if (fn) { fn() }
        }
    }).on("scroll", function () {
        const top = this.scrollTop;
        const HalfHeight = this.clientHeight / 2;
        PuSet.each(mContext.children, function (target) {
            if ((target.offsetTop + target.offsetHeight - HalfHeight) >= top) {
                mTitle.innerHTML = target.querySelector(".main-title").innerHTML;
                onMenuListOptionsChange(target.dataset.psid);
                return false;
            }
        });
    });

    // 左侧菜单点击事件
    PuSet(mMenuList).on("click", "li", function () {
        const psid = this.dataset.psid;
        // onMenuListOptionsChange(psid);
        PuSet.each(mContext.children, function (target) {
            if (target.dataset.psid == psid) {
                mContext.scrollTo({
                    top: target.offsetTop,
                    left: 0,
                    behavior: 'smooth'
                });
            }
        });
    });

    document.getElementById("add-link-button").addEventListener("click", function () {
        Interpreter.get("object-list").fn("show-alert", "map_all_links");
    });

    document.getElementById("menu").addEventListener("click", function () {
        if (MainUI.isFirst && "object" === typeof SettingUI) {
            MainUI.isFirst = false;
            createView();
        }
        mDrawer.classList.remove("hide");
    });

    document.getElementById("close").addEventListener("click", function () {
        mDrawer.classList.add("hide");
    });

    /**
     * 
     */
    const mIcon = mAlert.querySelector(".icon-box img");

    PuSet(mAlert).find(".button-bar").on("click", "input[type=button]", function () {
        if (this.id == "alert-add") {

            let data, result, key = mAlert.dataset.key;
            if ((data = MainUI.GS[mAlert.dataset.psid]) && (result = data[key])) {
                Object.assign(result, {
                    "title": mAlert_title.value,
                    "href": mAlert_url.value,
                    "icon": mAlert_icon.value,
                    "local_icon": mIcon.src
                });
            } else {
                result = {
                    "title": (key = mAlert_title.value),
                    "href": mAlert_url.value,
                    "icon": mAlert_icon.value,
                    "local_icon": mIcon.src
                };

                if (Array.isArray(data)) {
                    data.push(result)
                } else {
                    data[key] = result;
                }
            }

            if (result.icon == result.local_icon) {
                result.icon = "";
            }

            setLocalConfig("puset-local-configure", MainUI.GS);

        }

        mAlert.classList.add("hide");

    }).end().find("input").on("input", function () {
        if (this.type == "file") {
            if (this.classList.contains("input-icon-file")) {
                MainUI.loadImage(this.files[0]).then(function (img) {
                    const canvas = document.createElement("canvas");
                    canvas.width = 64;
                    canvas.height = 64;
                    canvas.getContext("2d").drawImage(img, 0, 0, 64, 64);

                    mIcon.src = mAlert_icon.value = canvas.toDataURL();
                    mAlert_icon.nextElementSibling.classList.add("foucs")
                });
            }
        } else {
            if (this.value) {
                this.nextElementSibling.classList.add("foucs")
            } else {
                this.nextElementSibling.classList.remove("foucs")
            }
        }
    });

    const _trash = PuSet("#trash").on("dragover", function({ srcEvent: ev }) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";
    }).on("dragover", function ({ srcEvent: ev }) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";

        _trash.classList.add("dragover")
    }).on("dragleave", function ({ srcEvent: ev }) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";

        _trash.classList.remove("dragover")
    }).on("drop", function ({ srcEvent: ev }) {
        ev.preventDefault();
        var data = ev.dataTransfer.getData("text/plain");
            // MainUI.GS.map_all_links.splice(data, 1);
            MainUI.vm_scroll.data.splice(data, 1);
            setLocalConfig("puset-local-configure", MainUI.GS);
    }).get(0);

    PuSet("#scroll").on("dragstart", function ({ srcEvent: ev }) {
        ev.dataTransfer.dropEffect = "move";
        ev.dataTransfer.setData("text/plain", ev.target.dataset.key);
        _trash.classList.remove("hide");
    }).on("dragover", "a.link-button", function ({ srcEvent: ev }) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";
    }).on("dragend", "a.link-button", function ({ srcEvent: ev }) {
        ev.preventDefault();
        
        _trash.classList.add("hide");
    }).on("drop", "a.link-button", function ({ srcEvent: ev }) {
        ev.preventDefault();
        var data = ev.dataTransfer.getData("text/plain");
        const obj1 = MainUI.GS.map_all_links[data];
        const obj2 = MainUI.GS.map_all_links[this.dataset.key];
        if (obj1 && obj2 && obj1 !== obj2) {
            MainUI.GS.map_all_links.splice(data, 1);
            MainUI.GS.map_all_links.splice(MainUI.GS.map_all_links.indexOf(obj2), 0, obj1);

            Object.assign(MainUI.vm_scroll.data, MainUI.GS.map_all_links);

            setLocalConfig("puset-local-configure", MainUI.GS);
        }
    });

});