// 事件代理 - 实现元素事件委托处理的高阶函数
// 使用立即执行函数(IIFE)封装逻辑，避免全局变量污染
const delegation = (function (getComposedPath) {
    // 检查浏览器是否支持Element.prototype.matches方法
    const hasMatches = "function" === typeof Element.prototype.matches;
    // const hasClosest = "function" === typeof Element.prototype.closest;

    // 创建自定义匹配函数，用于判断元素是否匹配选择器
    const customMatches = function customMatches(target, selector) {
        // 如果支持matches方法，则直接使用它
        // if (hasMatches) return item => item.matches && item.matches(selector);
        // if (hasClosest) return item => item === item.closest(selector);

        // 备选方案：通过查询所有匹配元素创建集合进行判断
        const children = new Set(target.querySelectorAll(selector));
        return item => item && children.has(item);
    };

    // 返回事件代理函数，接收选择器和事件处理函数
    return function delegation(selector, handler) {
        // 返回实际的事件监听器
        return function listener(event) {
            console.log(event)
            // 获取事件传播路径
            const path = getComposedPath(this, event);
            // 从路径中筛选出匹配选择器的元素
            const inner = path.filter(customMatches(this, selector));
            // 对每个匹配元素调用处理函数，并绑定this为当前元素
            inner.forEach(child => handler.call(child, event, listener));
        }
    }
}(function getComposedPath(target, event) {
    let path, node;
    if (event.composedPath) { path = Array.from(event.composedPath()); }
    else if (event.path) { path = Array.from(event.path); }
    else for (node = event.target, path = []; node = node.parentNode;) { path.push(node); if (node === target) break; }
    return path.slice(0, 1 + path.indexOf(target));
}));

storage.promise.then(() => fetch("./data/configure.json")).then(a => a.json()).then(function (json) {

    const _settings = document.getElementById("settings");
    const _left_ul = _settings.querySelector(".menu-list");
    const _right_scroll_content = _settings.querySelector(".view.content");

    _settings.querySelector("a.close").addEventListener("click", function () {
        _settings.classList.add("hide");
    });

    const _menu_title_title = _settings.querySelector(".menu-title>.title");


    // 获取滚动容器元素
    const _scroll = document.getElementById("scroll");

    // 为容器内的所有a.link-button元素添加拖放相关事件处理

    // 拖动开始事件处理
    _scroll.addEventListener("dragstart", delegation("a.link-button", function dragstart(event) {
        // 阻止事件冒泡
        event.stopPropagation();
        // 设置拖拽数据为当前元素的data-key属性值
        event.dataTransfer.setData('text/plain', this.dataset.key);
        // 设置允许的拖拽操作类型为移动
        event.dataTransfer.effectAllowed = 'move';
    }), false);

    // 拖拽经过事件处理
    _scroll.addEventListener("dragover", delegation("a.link-button", function dragover(event) {
        // 阻止默认行为(允许放置)
        event.preventDefault();
        // 阻止事件冒泡
        event.stopPropagation();
        // 设置允许的拖拽操作类型为移动
        event.dataTransfer.effectAllowed = 'move';
    }), false);

    // 放置事件处理
    _scroll.addEventListener("drop", delegation("a.link-button", function drop(event) {
        // 阻止默认行为
        event.preventDefault();
        // 阻止事件冒泡
        event.stopPropagation();

        // 获取拖拽源元素的key值
        let key = Number(event.dataTransfer.getData('text/plain'));
        // 获取当前放置目标元素的key值
        let index = Number(this.dataset.key);

        // 调整索引值(拖拽排序逻辑)
        if (index > key) index--;
        // 如果位置未变则退出
        if (key === index) return console.log("拖动排序：位置不变");

        // 从数据源中移除拖拽元素
        const [obj] = MainUI.vm_links.data.splice(key, 1);
        // 将元素插入到新位置
        MainUI.vm_links.data.splice(index, 0, obj);

        // 保存配置到本地存储
        saveLocalConfigure()
    }), false);

    const getPsId = (function () {
        // 使用箭头函数简化实现
        const modernImplementation = (target) => {
            return target.closest('[data-psid]')?.dataset.psid || '';
        };

        // 兼容旧浏览器的实现
        const legacyImplementation = (target) => {
            if (!target || target === document.body) {
                return '';
            }

            const psid = target.dataset.psid;
            return psid || legacyImplementation(target.parentElement);
        };

        // 根据浏览器支持情况选择实现方式
        return typeof Element.prototype.closest === 'function' ? modernImplementation : legacyImplementation;
    }());

    function allSame(obj, array, bool) {
        // 无效参数默认为true
        return Array.isArray(array) ? array.every(item => bool === obj[item]) : true;
    }

    function onMenuListOptionsChange(psid) {
        const children = _left_ul.children;
        for (const li of children) {
            if (li.dataset.psid == psid) {
                li.classList.add("light");
                _menu_title_title.textContent = li.dataset.title;
            } else {
                li.classList.remove("light");
            }
        }
    }

    /** @type {Map<String, Set<>>} */
    const map = MainUI.map = new Map();
    MainUI.autoShow = function autoShow(node, obj) {
        Interpreter.show(node, (allSame(this.GS, obj.hide, false) && allSame(this.GS, obj.show, true)));
    };

    function putItem(node, obj) {
        const add = key => {
            if (!map.has(key)) { map.set(key, new Set); }
            map.get(key).add([node, obj]);
        };

        if (Array.isArray(obj.show)) obj.show.forEach(add);
        if (Array.isArray(obj.hide)) obj.hide.forEach(add);
    }


    Interpreter.populateContent = function populateContent(target, settings, options) {
        try {
            // 缓存DOM查询结果
            const templateEl = target.querySelector(".template");
            const textEl = target.querySelector(".text");
            const longTextEl = target.querySelector(".long_text");

            // 只在必要时设置属性
            if (templateEl && options.psid) {
                templateEl.dataset.psid = options.psid;
            }

            // 使用对象解构和条件赋值简化逻辑
            const { text, long_text } = options;
            if (text && textEl) {
                textEl.textContent = text;
            }
            if (long_text && longTextEl) {
                longTextEl.innerHTML = long_text;
            }
        } catch (error) {
            console.error("PopulateContent error:", error.message, options);
        }
    };

    function renderSettings(node, settings, options) {
        const view = Interpreter.get(options.type);
        const root = view.init(false);
        Interpreter.populateContent(root, settings, options);
        view.exec(root, settings, options);
        if (Array.isArray(options.inner)) {
            const content = root.querySelector(".content");
            options.inner.forEach(item => renderSettings(content, settings, item));
        }
        const host = root.host;
        putItem(host, options);
        MainUI.autoShow(host, options);
        host.dataset.psid = options.psid;
        node.appendChild(host);
        return { host, root };
    }

    const vm_menu_list = Interpreter({
        target: _left_ul,
        selector: "li",
        data: [],
        layout: function (target, obj, key, index) {
            target.dataset.psid = obj.psid;
            target.dataset.title = obj.text;
            target.querySelector(".icon").innerHTML = obj.icon;
            target.querySelector(".text").textContent = obj.text;
            if (index === 0) {
                target.classList.add("light");
                _menu_title_title.textContent = obj.text;
            } else {
                target.classList.remove("light");
            }
            renderSettings(_right_scroll_content, MainUI.GS, obj);
        }
    });

    _left_ul.addEventListener("click", delegation("li", function (event) {
        const psid = this.dataset.psid;
        const children = _right_scroll_content.children;
        for (const child of children) {
            if (child.dataset.psid === psid) {
                _right_scroll_content.scrollTo({ top: child.offsetTop, left: 0, behavior: 'smooth' });
                return false;
            }
        }
    }), false);

    _right_scroll_content.addEventListener("scroll", function scroll() {
        cancelAnimationFrame(scroll.frame);
        scroll.frame = requestAnimationFrame(() => {
            const top = this.scrollTop;
            const HalfHeight = this.clientHeight / 2;
            const children = Array.from(_right_scroll_content.children);
            // children.unshift(scroll.child ?? children[0]);
            for (const child of children) {
                if ((child.offsetTop + child.offsetHeight - HalfHeight) >= top) {
                    if (child === scroll.child) return;
                    scroll.child = child;
                    onMenuListOptionsChange(child.dataset.psid);
                    return;
                }
            }
        });
    });

    // Main Menu Button 点击事件
    const _menu = Interpreter.show(document.getElementById("menu"), true);
    _menu.addEventListener("click", function updateUI() {
        // 首次点击更新 UI
        vm_menu_list.update(json), Interpreter.show(_settings, true);
        _menu.removeEventListener("click", updateUI);
        // 后续不再更新 UI
        _menu.addEventListener("click", () => Interpreter.show(_settings, true));
    });

    console.log(map)
});