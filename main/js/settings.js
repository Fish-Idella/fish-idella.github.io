
PuSet.load("data/template.html").then(function () {


    PuSet.get("settings").init(true, function (root, options) {
        document.body.appendChild(root);
        options.exec(root, MainUI, options);

        const _settings = document.getElementById("settings");
        const _left_ul = _settings.querySelector(".menu-list");
        const _menu_title_title = _settings.querySelector(".menu-title>.title");
        const _right_scroll_content = _settings.querySelector(".view.content");

        // 初始化交叉观察器（监听元素是否进入容器中间区域）
        const observer = new IntersectionObserver((entries) => {
            const entry = entries.find(entry => entry.isIntersecting && entry.target.dataset.psid);
            if (!entry) return;
            const oldLi = _left_ul.querySelector(".light");
            const newLi = _left_ul.querySelector(`[data-psid="${entry.target.dataset.psid}"]`);
            if (oldLi === newLi) {
                return
            } else if (newLi) {
                oldLi?.classList.remove("light");
                newLi.classList.add("light");
                _menu_title_title.textContent = newLi.dataset.title;
                return
            }
        }, {
            root: _right_scroll_content
        });

        _settings.querySelector("a.close").addEventListener("click", function () {
            _settings.classList.add("hide");
        });


        const getPsId = (function () {
            // 根据浏览器支持情况选择实现方式
            return typeof Element.prototype.closest === 'function' ?

                function modernImplementation(target) {
                    return target.closest('[data-psid]')?.dataset.psid || '';
                } :

                function legacyImplementation(target) {
                    if (!target || target === document.body) {
                        return '';
                    }

                    const psid = target.dataset.psid;
                    return psid || legacyImplementation(target.parentElement);
                };
        }());

        /**
         * 检查对象中指定键的值是否全部等于给定布尔值
         * 
         * 当满足以下任一条件时返回 true：
         * 1. keys 参数不是数组（无效参数）
         * 2. keys 数组为空
         * 3. obj 中所有指定键的值均等于 bool
         *
         * @param {Object} obj - 要检查的目标对象
         * @param {Array<string>} [keys] - 需要检查的键名数组（可选）
         * @param {boolean} bool - 要匹配的目标布尔值
         * @returns {boolean} 检查结果
         */
        function allSame(obj, keys, bool) {
            // 无效参数默认为true
            return Array.isArray(keys) ? keys.every(key => bool === obj[key]) : true;
        }

        /** @type {Map<String, Set<>>} */
        const map = MainUI.map = new Map();
        MainUI.autoShow = function autoShow(node, obj) {
            PuSet.show(node, (allSame(this.GS, obj.hide, false) && allSame(this.GS, obj.show, true)));
        };

        function putItem(node, obj) {
            const add = key => {
                if (!map.has(key)) {
                    map.set(key, new Set);
                }
                map.get(key).add([node, obj]);
            };

            if (Array.isArray(obj.show)) obj.show.forEach(add);
            if (Array.isArray(obj.hide)) obj.hide.forEach(add);
        }


        PuSet.populateContent = function populateContent(target, settings, options) {
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
            const view = PuSet.get(options.type);
            const root = view.init(false);
            PuSet.populateContent(root, settings, options);
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

        const vm_menu_list = PuSet.ViewManager({
            target: _left_ul,
            selector: "li",
            data: [],
            delegation: {
                click() {
                    const psid = this.dataset.psid;
                    const children = _right_scroll_content.children;
                    for (const child of children) {
                        if (child.dataset.psid === psid) {
                            _right_scroll_content.scrollTo({ top: child.offsetTop, left: 0, behavior: 'smooth' });
                            return false;
                        }
                    }
                }
            },
            layout: function (target, obj, key) {
                target.dataset.psid = obj.psid;
                target.dataset.title = obj.text;
                target.querySelector(".icon").innerHTML = obj.icon;
                target.querySelector(".text").textContent = obj.text;
                if (key === 0) {
                    target.classList.add("light");
                    _menu_title_title.textContent = obj.text;
                } else {
                    target.classList.remove("light");
                }
                observer.observe(renderSettings(_right_scroll_content, MainUI.GS, obj).host);
            }
        });

        fetch("./data/configure.json").then(r => r.json()).then(function (json) {
            // Main Menu Button 点击事件
            const _menu = PuSet.show(document.getElementById("menu"), true);
            _menu.addEventListener("click", function updateUI() {
                // 首次点击更新 UI
                vm_menu_list.update(json), PuSet.show(_settings, true);
                _menu.removeEventListener("click", updateUI);
                // 后续不再更新 UI
                _menu.addEventListener("click", () => PuSet.show(_settings, true));
            });
        });
    });

});