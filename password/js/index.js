const vm_password = function () {
    "use strict";

    const json = JSON.parse(window.localStorage.getItem("puset-password") || "{}");

    const $password = $("#password");
    const password = $password.get(0);

    const fillEmail = function (li, obj) {

        return $.View({
            target: li.querySelector(".list"),
            selector: "li[v-hide]",
            insert: "li.add",
            data: obj.more,

            layout: function (list, data, i) {
                list.dataset.path = i;
                list.querySelectorAll("input[name]").forEach(element => {
                    element.value = data[element.name];
                });
                this.layoutData[i] = list;
            }
        });

    };

    const fillSub = function (target, obj) {

        return $.View({
            target: target.querySelector(".info"),
            selector: "li[v-hide]",
            insert: "li.add",
            data: obj,

            layout: function (li, data, index) {
                li.dataset.path = index;
                li.querySelectorAll("input[name]").forEach(element => {
                    element.value = data[element.name];
                });

                // console.log(data)
                this.layoutData[index] = fillEmail(li, data);
            }
        });

    };

    const vm_password = $.View({
        target: password,
        selector: "div.box",
        insert: "div.add",
        data: json,
        /**
         * 
         * @param {Element} target 
         * @param {*} value 
         * @param {string} key 
         * @param {number} index 
         */
        layout: function (target, value, key) {
            target.dataset.path = key;
            const title = target.querySelector(".title");
            title.innerHTML = value.name;
            const img = target.querySelector(".icon");
            img.onload = function () {
                $.View.show(title, false);
                $.View.show(img, true);
            };
            img.src = value.icon;
            target.querySelector(".icon_box").href = value.href;

            if (!this.layoutData[key]) {
                this.layoutData[key] = fillSub(target, value.userInfo);
            } else {
                // this.layoutData[key].update();
            }
        }
    });

    const getNewInfo = function () {
        return {
            "username": "",
            "password": "",
            "telephone": "",
            "email": "",
            "more": []
        }
    };

    var arr = [];
    let editKey = "";
    const edit = document.querySelector("#edit");
    const input = edit.querySelectorAll("input");


    PuSet("#onEditSave").on("click.save", function () {
        const data = vm_password.originalData[editKey];
        input.forEach(function (elem) {
            data[elem.name] = elem.value;
        });
        vm_password.data[editKey] = data;
        edit.classList.add("hide");
        
        window.localStorage.setItem("puset-password", JSON.stringify(json));
    });

    $password.on("input.save", "input[type=text]", function (ev) {
        const target = ev.srcEvent.target;
        const prop = target.name;
        const path = $(ev.getComposedPath()).filter("[data-path]");
        const index = arr.shift.call(path).dataset.path;

        let data = vm_password;
        arr.reverse.call(path).each(function (elem) {
            data = data.layoutData[elem.dataset.path]
        });

        if (prop) {
            data.data[index][prop] = target.value;
        } else {
            data.data[index][target.className] = target.value;
        }

        window.localStorage.setItem("puset-password", JSON.stringify(json));

    })
    
    
    .on("click.onedit", "button.onedit", function (ev) {
        const path = $(ev.getComposedPath()).filter("[data-path]");
        const data = json[editKey = path.get(0).dataset.path];
        input.forEach(function (elem) {
            elem.value = data[elem.name]
        });
        edit.classList.remove("hide");
    })
    
    
    .on("click.onmin", ".title_bar>.onmin", function (ev) {
        $(ev.getComposedPath()).filter(".box").each(function (target) {
            target.classList.toggle("min");
        });
    }).on("click.onmin", "ul.item .onmin", function (ev) {
        $(ev.getComposedPath()).filter("ul.item").each(function (target) {
            target.classList.toggle("min");
        });
    })
    
    
    
    .on("click.add", "ol.info>li.add", function (ev) {
        const path = $(ev.getComposedPath()).filter("[data-path]");

        let data = vm_password;
        arr.reverse.call(path).each(function (elem) {
            data = data.layoutData[elem.dataset.path]
        });

        data.data.push(getNewInfo());

    }).on("click.add", "ol.list>li.add", function (ev) {
        const path = $(ev.getComposedPath()).filter("[data-path]");
        let data = vm_password;
        arr.reverse.call(path).each(function (elem) {
            data = data.layoutData[elem.dataset.path]
        });
        data.data.push({ "key": "key", "value": "value" });
    })
    
    .find("#comAdd").on("click.add", function () {
        vm_password.data.push({
            name: "Name",
            icon: "",
            href: "",
            userInfo: [getNewInfo()]
        });
    });

    return vm_password;
}();


console.log(vm_password)