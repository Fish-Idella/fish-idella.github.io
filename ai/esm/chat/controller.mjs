/**
 * chat/controller.mjs
 * 对话控制器：SSE 请求、工具调用回填、发送、设置项、API/Agent 初始化。
 */

import { runtime } from '../runtime.mjs';
import {
    concatURL, TEMPERATURE_MIN, TEMPERATURE_MAX, DEFAULT_TEMPERATURE
} from '../core.mjs';

export function setupController(ctx) {
    const {
        dom, data, memory_map, agents, chuji, aiRequestConfig, headers,
        system_prompt, global_prompt, OpenAIFunctionCalling,
        vm_message, messages, addMessage, messagePurifying, initMessageList,
        saveData
    } = ctx;

    const r_sse_data = /^\s*data:\s*(.*)\s*$/;

    // ---------- 核心 API 调用 ----------
    function callApi() {
        if (ctx.currentAbortController) {
            ctx.currentAbortController.abort();
            ctx.currentAbortController = null;
        }
        // 未配置 API 时提示
        if (!ctx.apiUrl) {
            addMessage('assistant', '[提示] 需要点击页面左上角打开抽屉栏，配置API之后才能正常使用\n\n所有数据存储在浏览器环境，切换浏览器会丢失所有信息');
            return;
        }
        const abortController = new AbortController();
        ctx.currentAbortController = abortController;
        const body = messagePurifying(messages);
        const assistantBox = addMessage('assistant', '');
        dom.sendMsgBtn.name = 'stop';
        fetch(ctx.apiUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            signal: abortController.signal
        }).then(async function (response) {
            if (!response.ok) {
                const d = await response.json().catch(() => ({}));
                throw new Error(d?.error?.message || response.statusText);
            }
            for await (const line of new ReadStreamLine(response)) {
                if (!line) continue;
                const match = line.match(r_sse_data);
                if (!match) continue;
                const trimmed = match[1];
                if (trimmed === "[DONE]") break;
                let data2;
                try {
                    data2 = JSON.parse(trimmed);
                } catch (e) {
                    console.warn("SSE JSON 解析失败:", trimmed, e);
                    continue;
                }
                const choice = data2.choices?.[0];
                if (!choice) continue;
                const delta = choice.delta || {};
                const reasoning = delta.reasoning || delta.reasoning_content;
                if (reasoning) {
                    assistantBox.addReasoningChunk(reasoning);
                    continue;
                }
                const content = delta.content;
                if (content) {
                    assistantBox.addContentChunk(content);
                    continue;
                }
                const tool_calls = delta.tool_calls;
                if (tool_calls) {
                    assistantBox.addToolCalls(tool_calls);
                    continue;
                }
                switch (choice.finish_reason) {
                    case "tool_calls": {
                        assistantBox.setToolCalls();
                        // 放到队列末尾
                        setTimeout(() => { 
                            OpenAIFunctionCalling.handleToolCalls(assistantBox, data, memory_map, messages)
                                .then((list) => {
                                    const cc = ctx.currentAgentConfig;
                                    let reinject = false;
                                    for (const task of list) {
                                        if (!task) continue;
                                        const [name, opt] = task;
                                        if (!opt) continue;
                                        if (name == 'push_image') {
                                            // 有一个回传则全部回传
                                            reinject = reinject || opt.reinject;
                                            continue;
                                        }
                                        if (name == 'cooperate') {
                                            const { id, message, beginning } = opt;
                                            initAgent(id);
                                            if (beginning) {
                                                messages.length = 1;
                                            }
                                            const mb = addMessage('user', `[[cooperate] ${cc.name}(${cc.id}): [${message}]]`);
                                            vm_message.render(vm_message.activeItem, mb.message, mb.index, '已完成');
                                            ctx.autoScroll = true;
                                        }
                                    }
                                    if (reinject) {
                                        // sendMessage 带 abort 守卫（给用户手动发送用），
                                        // 流未收尾时调用会 abort 本流并 return，图片发不出去。
                                        // 标记待发，流已收尾则立即发，否则交给 finally 补发。
                                        abortController.pendingPushImage = true;
                                        if (ctx.currentAbortController !== abortController) {
                                            dom.messageInput.value = 'push image reinject';
                                            sendMessage();
                                        }
                                    } else {
                                        saveData();
                                        callApi();
                                    }
                                })
                                .catch(e => {
                                    // handleToolCalls 是 async，这里不 catch 就是 unhandled rejection：
                                    // 此时 finally 已跑完、按钮已回到 send，用户只会看到「什么都没发生」。
                                    console.error(e);
                                    assistantBox.addContentChunk(`[工具执行错误: ${e.message}]`);
                                    saveData();
                                });
                        });
                        break;
                    }
                    // 有意穿透：length（被 max_tokens 截断）也算一轮正常结束，
                    // 同样要写入 usage，因此不 break，直接落到 case "stop"。
                    case "length":
                        assistantBox.addContentChunk('[最大长度限制]');
                    case "stop":
                        assistantBox.setUsage(data2.usage);
                        break;
                }
            }
        }).catch(function (e) {
            if (e.name === 'AbortError') {
                assistantBox.addContentChunk('[已停止生成]');
            } else {
                console.error(e);
                assistantBox.addContentChunk(`[错误: ${e.message}]`);
            }
        }).finally(function () {
            if (ctx.currentAbortController === abortController) {
                ctx.currentAbortController = null;
            }
            assistantBox.done();
            dom.sendMsgBtn.name = 'send';
            saveData();
            if (abortController.pendingPushImage && !ctx.currentAbortController) {
                dom.messageInput.value = 'push image';
                sendMessage();
            }
        });
    }
    ctx.callApi = callApi;

    function sendMessage() {
        if (ctx.currentAbortController) {
            ctx.currentAbortController.abort();
            ctx.currentAbortController = null;
            return;
        }
        const inputContent = dom.messageInput.value.trim();
        if (!inputContent) return;
        dom.messageInput.value = '';
        try {
            const mb = addMessage('user', inputContent);
            if (ctx.vm_images.data.length) {
                const content = mb.message.content;
                ctx.vm_images.data.forEach(url => {
                    content.push({ type: 'image_url', image_url: { url } })
                });
                ctx.vm_images.data.length = 0;
            }
            vm_message.render(vm_message.activeItem, mb.message, mb.index, '已完成');
            dom.messageList.scrollTo({
                top: dom.messageList.scrollHeight - dom.messageList.clientHeight,
                left: 0
            });
            ctx.autoScroll = true;
            callApi();
        } catch (e) {
            console.error(e);
            ModalDialog.show('sendMessage' + e.message, "确定");
        }
    }
    ctx.sendMessage = sendMessage;

    // ---------- 设置项 ----------
    /**
     * 把一个设置项应用到请求配置。
     * @param {string} name 设置名（与 agent.settings 的键一致）
     * @param {boolean|number} value 开关传布尔，温度传数值
     */
    function settings(name, value) {
        switch (name) {
            case "thinking":
                aiRequestConfig.thinking.type = value ? 'enabled' : 'disabled';
                aiRequestConfig.enable_thinking = value;
                aiRequestConfig.think = value;
                break;
            case "use-tools": {
                // 判空：settings() 会被 initAgent 按每个 agent 的 settings 触发，
                // 抽屉栏 DOM 尚未渲染或该开关不存在时 querySelector 返回 null，直接 .disabled 会抛错。
                // 开关现在位于设置弹窗里，选择器按 name 全局查，不依赖容器 #switch。
                const useBrowserSwitch = document.querySelector('input[name="use-browser"]');
                if (value) {
                    aiRequestConfig.tool_choice = "auto";
                    if (useBrowserSwitch) useBrowserSwitch.disabled = false;
                } else {
                    aiRequestConfig.tool_choice = "none";
                    if (useBrowserSwitch) useBrowserSwitch.disabled = true;
                }
                break;
            }
            case "temperature": {
                // 数值型：夹到合法区间，非法值（NaN / 字符串）回退默认，避免把请求发成 temperature:null
                const n = Number(value);
                if (Number.isFinite(n)) {
                    aiRequestConfig.temperature = Math.min(TEMPERATURE_MAX,
                        Math.max(TEMPERATURE_MIN, n));
                } else {
                    aiRequestConfig.temperature = DEFAULT_TEMPERATURE;
                }
                break;
            }
        }
    }
    ctx.settings = settings;

    /**
     * 把一个设置项回写到对应的 DOM 控件上。
     * 开关用 checked，温度用 range.value + 旁边的数值显示。
     * @param {string} name 设置名
     * @param {boolean|number} value 设置值
     */
    function applySettingToDom(name, value) {
        const input = document.querySelector(`[name="${name}"]`);
        if (!input) return;
        if (input.type === 'checkbox') {
            input.checked = !!value;
        } else if (input.type === 'range') {
            const n = Number(value);
            input.value = Number.isFinite(n)
                ? Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, n))
                : DEFAULT_TEMPERATURE;
            updateTemperatureLabel();
        }
    }
    ctx.applySettingToDom = applySettingToDom;

    /** 把温度控件的当前值写到旁边的数字显示上 */
    function updateTemperatureLabel() {
        const range = document.querySelector('input[name="temperature"]');
        const label = document.querySelector('[name="temperature-value"]');
        if (range && label) label.textContent = Number(range.value).toFixed(1);
    }
    ctx.updateTemperatureLabel = updateTemperatureLabel;

    // ---------- API / Agent 初始化 ----------
    function initAPI(modelValue) {
        if (!modelValue) return;
        data.currentModel = modelValue;
        const [id, model] = modelValue.split("||");
        ctx.currentApiConfig = data.apiList[id];
        if (!ctx.currentApiConfig) {
            data.currentModel = '';
            return;
        }
        ctx.apiUrl = concatURL(ctx.currentApiConfig.api, "chat/completions");
        aiRequestConfig.model = model;
        headers.Authorization = `Bearer ${ctx.currentApiConfig.key}`;
    }
    ctx.initAPI = initAPI;

    function initAgent(name) {
        data.currentAgent = name;
        // 同步 UI 下拉框，否则工具层切主（cooperate）后 <select id="agents"> 仍显示旧选项
        if (dom.agentSelect && name != null) dom.agentSelect.value = name;
        if (name && name !== '0') {
            ctx.currentAgentConfig = agents[name];
            system_prompt.content = ctx.currentAgentConfig.content;
            system_prompt.branch = ctx.currentAgentConfig.branch;
        } else {
            ctx.currentAgentConfig = chuji;
            system_prompt.content = global_prompt;
            system_prompt.branch = data.branch;
        }
        runtime.currentAgentConfig = ctx.currentAgentConfig;
        // 温度不是开关：没配置 temperature 的 agent 必须显式回到默认值，
        // 否则会把上一个 agent 的温度带过来（原逻辑只 switch/checked，漏掉这类数值项）。
        const agentSettings = ctx.currentAgentConfig.settings || {};
        settings("temperature", agentSettings.temperature ?? DEFAULT_TEMPERATURE);
        Object.entries(agentSettings).forEach(([k, v]) => {
            settings(k, v);
            applySettingToDom(k, v);
        });
        // 上面只写了配置里有的键，没写的要按默认值刷新到 UI
        applySettingToDom("temperature", agentSettings.temperature ?? DEFAULT_TEMPERATURE);
        // 弹窗里的开关行有无「禁用」态（工具关→浏览器禁）由该函数统一收口
        if (typeof ctx.syncSettingsUI === 'function') ctx.syncSettingsUI();
        messages.length = 1;
        initMessageList(system_prompt.branch);
    }
    ctx.initAgent = initAgent;
    runtime.initAgent = initAgent;
}