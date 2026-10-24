/**
 * views/chat-view.mjs
 * 对话框视图：发送、消息编辑弹窗、消息按钮动作、图片上传、滚动与标题事件。
 */

import { TEMPERATURE_MIN, TEMPERATURE_MAX, DEFAULT_TEMPERATURE } from '../core.mjs';

export function setupChatView(ctx) {
    const {
        dom, saveData, vm_message, messages,
        addMessage, initMessageList, vm_images
    } = ctx;
    const {
        messageList, messageInput, sendMsgBtn, modelSelect, title
    } = dom;

    // ---------- 发送相关 ----------
    sendMsgBtn.addEventListener('click', ctx.sendMessage);
    messageInput.addEventListener('keypress', (ev) => {
        if (ev.key === "Enter" || ev.keyCode === 13) {
            ev.preventDefault();
            if (!ctx.currentAbortController) ctx.sendMessage();
        }
    });
    modelSelect.addEventListener("change", function () {
        ctx.initAPI(this.value);
    });

    title.addEventListener('dblclick', function () {
        const bottom = messageList.scrollHeight - messageList.clientHeight;
        // 移动端 WebView 的 scrollHeight-clientHeight 常为小数、scrollTop 可能被取整，
        // 直接比较会导致「已在底部」被判成未到底，从而反复滚到底部。这里加容差。
        const atBottom = bottom - messageList.scrollTop <= 2;
        messageList.scrollTo({
            top: atBottom ? 0 : bottom,
            left: 0,
        });
    });

    // ---------- 图片上传 ----------
    document.getElementById('file-selector').addEventListener('click', function () {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.setAttribute('accept', this.getAttribute('accept'));
        fileInput.addEventListener('input', function () {
            Array.from(fileInput.files, file => {
                const fr = new FileReader();
                fr.onloadend = () => {
                    const url = fr.result;
                    url && vm_images.data.push(url);
                };
                fr.readAsDataURL(file);
            });
        }, { once: true });
        fileInput.click();
    });

    // ---------- 消息编辑 ----------
    let editData = {};
    const editDialog = document.getElementById('message-edit');
    const editTextarea = editDialog.querySelector('textarea');
    PuSet(editDialog).on('click', 'button', function (ev) {
        const val = editTextarea.value.trim();
        if (!val) return;
        const { parentBox, dataIndex, message } = editData;
        switch (this.name) {
            case 'save':
                message.content[0].text = val;
                vm_message.render(parentBox, message, dataIndex);
                break;
            case 'submit':
                messages.length = dataIndex;
                const mb = addMessage('user', val);
                vm_message.render(vm_message.activeItem, mb.message, mb.index, '已完成');
                ctx.autoScroll = true;
                ctx.callApi();
                break;
        }
        saveData();
        PuSet.show(editDialog, false);
    });

    // ---------- 消息按钮动作 ----------
    const messageButtonActions = {
        edit(btn, parentBox, idx) {
            const msg = messages[idx];
            editData = {
                button: btn,
                parentBox: parentBox,
                dataIndex: idx,
                message: msg
            };
            editDialog.querySelector('.dialog-content').dataset.name = msg.role;
            editTextarea.value = msg.content[0].text;
            PuSet.show(editDialog, true);
        },
        _switchBranch(group, dataIndex, delta) {
            const i = group.findIndex(item => item.main);
            const max = group.length - 1;
            let cur = i === -1 ? max : i;
            const need = cur + delta;
            if (need < 0 || need > max) return;
            group.forEach((item, n) => item.main = n === need);
            messages.length = dataIndex;
            initMessageList(group);
        },
        previous(btn, parentBox, idx) {
            messageButtonActions._switchBranch(messages[idx - 1].branch, idx, -1);
        },
        next(btn, parentBox, idx) {
            messageButtonActions._switchBranch(messages[idx - 1].branch, idx, 1);
        },
        copy(btn, parentBox, idx) {
            // content 是内容块数组（[{type:'text',text:...}]），不能直接喂给 clipboard，
            // 否则复制出来是 "[object Object]"。取首个文本块的 text。
            const raw = messages[idx]?.content;
            const text = Array.isArray(raw) ? (raw[0]?.text ?? '') : String(raw ?? '');
            navigator.clipboard.writeText(text).then(function () {
                const div = document.createElement('div');
                div.textContent = '复制成功';
                div.className = 'toast';
                document.body.appendChild(div);
                setTimeout(() => div.remove(), 1000);
            }).catch(() => ModalDialog.show("复制失败", "确定"));
        },
        delete(btn, parentBox, idx) {
            ModalDialog.show("将删除此消息及之后所有最新消息", "确定", "取消").then(function (result) {
                if (result.which != 0) return;
                const role = parentBox.dataset.persona;
                messages.length = idx;
                let branch = messages.at(idx - 1).branch;
                if (branch.length === 1 && role === 'assistant') {
                    for (let i = idx - 1; i > 0; i--) {
                        if (messages[i].role === 'user') {
                            branch = messages[i].branch;
                            messages.length = i + 1;
                            if (branch.length === 1) {
                                branch = messages[i - 1].branch;
                                messages.length = i;
                            }
                            break;
                        }
                    }
                }
                const start = branch.findIndex(item => item.main);
                if (start >= 0) {
                    if (branch.length > 1) {
                        branch[Math.min(start + 1, branch.length - 1)].main = true;
                    }
                    branch.splice(start, 1);
                }
                initMessageList(branch);
                saveData();
            });
        },
        remake(btn, parentBox, idx) {
            if (ctx.currentAbortController) return;
            messages.length = idx;
            ctx.autoScroll = true;
            ctx.callApi();
        },
        usage(btn, parentBox, idx) {
            const usage = messages[idx]?.usage || {};
            // 除数是 undefined 时会算出 NaN，JSON.stringify 把 NaN 序列化成 null，
            // 弹窗里显示「命中率: null」；除数为 0 则是 Infinity（同样变 null）。
            // 只有两个字段都拿到时才计算命中率。
            if (typeof usage.total_tokens === 'number' && usage.total_tokens > 0
                && typeof usage.prompt_cache_hit_tokens === 'number') {
                usage['命中率'] = usage.prompt_cache_hit_tokens / usage.total_tokens;
            }
            ModalDialog.show(JSON.stringify(usage, null, 2), "确定");
        }
    };

    PuSet(messageList).on("click", "button", function (ev) {
        const action = messageButtonActions[this.name];
        if (!action) return;
        const parentBox = this.closest(".chat-message-output-box");
        const dataIndex = Number(parentBox.dataset.index);
        action(this, parentBox, dataIndex);
    }).on('scroll', function () {
        const bottom = messageList.scrollHeight - messageList.clientHeight - 50;
        ctx.autoScroll = messageList.scrollTop >= bottom;
    });

    document.getElementById('current').addEventListener("click", () => {
        ctx.runtime.AndroidObject.openWebView("",0.4);
    });
    document.getElementById("exit-edit").addEventListener("click", () => PuSet.show(dom.loginView, false));

    // ---------- 工具开关 ----------
    // 「深度思考」留在底部栏，工具/浏览器等已收纳进设置弹窗。
    // 只委托到这两个容器：若挂在 document 上，ModalDialog 动态生成的 checkbox
    // 也会被捕获，其 name 为空，会把空键写进 agent.settings 并触发无谓的持久化。
    PuSet("#switch").add("#switch-more").on("input", "input", function () {
        ctx.settings(this.name, this.checked);
        if (ctx.currentAgentConfig) {
            ctx.currentAgentConfig.settings[this.name] = this.checked;
        }
        // 「工具」总开关会连带启用/禁用「浏览器」，灰化状态要跟着刷新
        if (this.name === 'use-tools') syncSettingsUI();
        saveData();
    });

    // ---------- 模型温度 ----------
    // 与开关同一套存储：agent.settings.temperature，走 saveData() 持久化。
    // 拖动过程中 input 会高频触发，但读值+写标签+持久化都很轻，直接同步处理即可。
    // 注意：range 的 value 赋值会被浏览器自动夹到 [min,max]，但程序化写入或导入的配置
    // 可能是越界值，所以这里统一走 normalizeTemperature() 夹取后再落库。
    const temperatureInputs = document.querySelectorAll('input[type="range"][name="temperature"]');
    temperatureInputs.forEach(function (input) {
        input.addEventListener('input', function () {
            const value = normalizeTemperature(input.value);
            input.value = value;
            ctx.settings('temperature', value);
            if (ctx.currentAgentConfig) {
                ctx.currentAgentConfig.settings.temperature = value;
            }
            ctx.updateTemperatureLabel();
            saveData();
        });
    });

    /** 把任意输入夹成合法温度（非数字回退默认值） */
    function normalizeTemperature(raw) {
        const n = Number(raw);
        if (!Number.isFinite(n)) return DEFAULT_TEMPERATURE;
        return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, n));
    }

    // ---------- 设置弹窗 ----------
    // 兜底：HTML 与 JS 版本不一致时（例如只更新了其中一份、或 WebView 缓存了旧资源），
    // 下面任一节点可能为 null。直接 .addEventListener 会抛 TypeError，
    // 把 setupChatView 后面的图片上传等绑定全部打断，因此这里先判空再绑。
    const settingsDialog = document.getElementById('settings-m');
    const openSettingsBtn = document.getElementById('open-settings');
    openSettingsBtn.addEventListener('click', function () {
        syncSettingsUI();
        PuSet.show(settingsDialog, true);
    });
    settingsDialog.addEventListener('click', function (ev) {
        if (ev.target === settingsDialog) PuSet.show(settingsDialog, false);
    });
    PuSet(settingsDialog).on('click', 'button[name="close"]', function () {
        PuSet.show(settingsDialog, false);
    });

    /**
     * 把当前 agent 的 settings 回写到所有控件上，并同步「工具关→浏览器禁用」联动。
     * initAgent 里会调用它，保证切换智能体后弹窗里的状态是当前 agent 的。
     * 注意：checkbox 与 range 都要处理，且缺失的键要回到默认值，
     * 否则切换智能体会把上一个 agent 的值留在界面上。
     */
    function syncSettingsUI() {
        const config = ctx.currentAgentConfig;
        if (!config) return;
        const values = config.settings || {};
        document.querySelectorAll('#switch input[name], #switch-more input[name]')
            .forEach(function (input) {
                if (input.name in values) {
                    input.checked = !!values[input.name];
                }
            });
        // 温度是数值项，不能走上面的 checked 逻辑
        const tempInput = document.querySelector('input[type="range"][name="temperature"]');
        if (tempInput) {
            const raw = values.temperature;
            const temp = (raw === undefined || raw === null || !Number.isFinite(Number(raw)))
                ? DEFAULT_TEMPERATURE
                : normalizeTemperature(raw);
            tempInput.value = temp;
            ctx.updateTemperatureLabel();
        }
        const useBrowser = document.querySelector('input[name="use-browser"]');
        if (useBrowser) {
            useBrowser.disabled = !values['use-tools'];
            // 视觉上的灰化用类名而非 :has()，旧版 Android WebView 对 :has() 支持不稳
            findSettingRow(useBrowser)?.classList.toggle('is-disabled', useBrowser.disabled);
        }
    }

    /** 从开关 input 回溯到它所在的设置行（label.settings-row） */
    function findSettingRow(input) {
        return input && input.closest ? input.closest('label.settings-row') : null;
    }
    ctx.syncSettingsUI = syncSettingsUI;
    syncSettingsUI();
}