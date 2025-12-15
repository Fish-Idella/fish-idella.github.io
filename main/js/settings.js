
PuSet.load("data/template.html").then(function () {

    PuSet.get("link-manager").init(true, function (root, options) {
        document.body.appendChild(root);
        options.exec(root, MainUI, options);

        // 获取滚动容器元素
        const _scroll = document.getElementById("scroll");

        const getTargetIndex = function (event, sourceKey, targetIndex, self, dragging) {
            // 处理拖拽元素拖到自身的情况
            if (self === dragging) {
                // 根据源索引与目标索引的大小关系，调整目标索引为拖拽元素的 order 样式值（±1）
                return (sourceKey > targetIndex ? 0 : 1) + Number(dragging.style.order);
            } else {
                // 非自身拖拽时：若鼠标在目标元素左半部分，且源索引小于目标索引，目标索引减1（调整插入位置）
                if (event.offsetX < self.offsetWidth / 2 && sourceKey < targetIndex) {
                    targetIndex--;
                }
                return targetIndex;
            }
        };

        // 为容器内的所有 a.link-button 元素添加拖放相关事件处理
        PuSet(_scroll).on("contextmenu", "a.link-button", function click(event) {
            event.preventDefault();
            MainUI.openLinkManager(this.dataset.key);
        }).on("dragstart", "a.link-button", function dragstart(event) {
            // 拖动开始事件处理
            // 阻止事件冒泡
            event.stopPropagation();
            // 设置拖拽数据为当前元素的data-key属性值
            _scroll._dragging = this;
            event.dataTransfer.setData('text/plain', this.dataset.key);
            // 设置允许的拖拽操作类型为移动
            event.dataTransfer.effectAllowed = 'move';

            setTimeout(() => this.classList.add('dragging'));
        }).on("dragover", "a.link-button", function dragover(event) {
            // 拖拽经过事件处理
            // 阻止默认行为(允许放置)
            event.preventDefault();
            // 阻止事件冒泡
            event.stopPropagation();

            if (!Object.is(this, _scroll._dragging)) requestAnimationFrame(() => {
                const my_order = Number(this.style.order);
                const isLeftMove = (Number(_scroll._dragging.dataset.key) < Number(this.dataset.key));

                _scroll._dragging.style.order = (event.offsetX < this.offsetWidth / 2) ?
                    (isLeftMove ? my_order : (my_order - 1)) : (isLeftMove ? (my_order + 1) : my_order);
            });
        }).on("dragend", "a.link-button", function dragend() {
            _scroll.querySelectorAll("a.dragging").forEach(a => a.classList.remove("dragging"));
        }).on("drop", "a.link-button", function (event) {
            // 放置事件处理
            // 阻止默认行为（避免浏览器默认处理拖拽数据）和事件冒泡
            event.preventDefault();
            event.stopPropagation();

            // 获取拖拽源元素的 data-key（原始索引）
            const sourceKey = Number(event.dataTransfer.getData("text/plain"));
            const targetIndex = getTargetIndex(event, sourceKey, Number(this.dataset.key), this, _scroll._dragging);

            // 若源索引与调整后的目标索引相同，无需排序
            if (sourceKey === targetIndex) {
                console.log("拖动排序：位置不变");
                return;
            }

            // 从数据源中移除拖拽元素（源位置）
            const [movedItem] = MainUI.vm_links.data.splice(sourceKey, 1);
            // 将元素插入到新位置（调整后的目标索引）
            MainUI.vm_links.data.splice(targetIndex, 0, movedItem);

            // 保存排序后的配置到本地存储
            saveLocalConfigure();
        });

        PuSet(document.getElementById("add-link-button")).on("click", function (event) {
            event.preventDefault();
            MainUI.openLinkManager('-1');
        });

    });

    fetch("./data/configure.json").then(r => r.json()).then(function (json) {
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
                    observer.observe(
                        renderSettings(_right_scroll_content, MainUI.GS, obj).host
                    );
                }
            });

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