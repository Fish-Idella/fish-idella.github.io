/**
 * chat/controller.mjs
 * 对话控制器：SSE 请求、工具调用回填、发送、设置项、API/Agent 初始化。
 */

import { runtime } from '../runtime.mjs';
import { definitions } from '../domain.mjs';
import { concatURL } from '../core.mjs';

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
                        setTimeout(() => {
                            OpenAIFunctionCalling.handleToolCalls(assistantBox, data, memory_map, messages)
                                .then((list) => {
                                    const cc = ctx.currentAgentConfig;
                                    for (const c of list) {
                                        if (!c) break;
                                        const { id, message, beginning } = c;
                                        initAgent(id);
                                        if (beginning) {
                                            messages.length = 1;
                                        }
                                        const mb = addMessage('user', `[[cooperate] ${cc.name}(${cc.id}): [${message}]]`);
                                        vm_message.render(vm_message.activeItem, mb.message, mb.index, '已完成');
                                        ctx.autoScroll = true;
                                    }
                                    saveData();
                                    callApi();
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
                ctx.vm_images.data.forEach(url => content.push({ type: 'image_url', image_url: { url } }));
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
    function settings(name, checked) {
        switch (name) {
            case "thinking":
                aiRequestConfig.thinking.type = checked ? 'enabled' : 'disabled';
                aiRequestConfig.enable_thinking = checked;
                aiRequestConfig.think = checked;
                break;
            case "use-tools": {
                // 判空：settings() 会被 initAgent 按每个 agent 的 settings 触发，
                // 抽屉栏 DOM 尚未渲染或该开关不存在时 querySelector 返回 null，直接 .disabled 会抛错。
                const useBrowserSwitch = document.querySelector('input[name="use-browser"]');
                if (checked) {
                    aiRequestConfig.tools = definitions;
                    aiRequestConfig.tool_choice = "auto";
                    if (useBrowserSwitch) useBrowserSwitch.disabled = false;
                } else {
                    aiRequestConfig.tools = null;
                    aiRequestConfig.tool_choice = "none";
                    if (useBrowserSwitch) useBrowserSwitch.disabled = true;
                }
                break;
            }
        }
    }
    ctx.settings = settings;

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
        Object.entries(ctx.currentAgentConfig.settings || {}).forEach(([k, v]) => {
            settings(k, v);
            const sw = document.querySelector(`#switch [name="${k}"]`);
            if (sw) sw.checked = v;
        });
        messages.length = 1;
        initMessageList(system_prompt.branch);
    }
    ctx.initAgent = initAgent;
    runtime.initAgent = initAgent;
}