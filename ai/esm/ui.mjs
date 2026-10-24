/**
 * ui.mjs
 * 应用入口：初始化存储，组装各模块并启动。
 *
 * 模块划分：
 *   core.mjs          —— 常量、日期、URL、HTTP 工具
 *   domain.mjs        —— Memory 模型 + 工具 JSON Schema
 *   runtime.mjs       —— 运行时依赖注入 + 预览待确认
 *   tools/*.mjs       —— 工具执行层（browser / media / memory / editor / index）
 *   chat/*.mjs        —— 对话运行时（store / renderer / messages / controller）
 *   views/*.mjs       —— DOM 绑定（api / memory / chat-view）
 */

import { createDefaultAiRequestConfig, authHeaders, XMLHttpRequestGetTextPromise } from './core.mjs';
import { OpenAIFunctionCalling, registry } from './tools/index.mjs';
import { runtime } from './runtime.mjs';
import { setupStore } from './chat/store.mjs';
import { setupRenderer } from './chat/renderer.mjs';
import { setupMessages } from './chat/messages.mjs';
import { setupController } from './chat/controller.mjs';
import { setupApiViews } from './views/api.mjs';
import { setupMemoryViews } from './views/memory.mjs';
import { setupChatView } from './views/chat-view.mjs';

Promise.resolve(StorageHelper.open({ name: 'ai-chat' })).then(async function bootstrap(storage) {
    "use strict";

    // ---------- 共享上下文 ----------
    const ctx = {};

    // ---------- 全局依赖注入 ----------
    const AndroidObject = promisify(PuSet.ensureObjectProperty(window, 'ChuJiFunctionCalling', Object));
    runtime.AndroidObject = AndroidObject;
    runtime.history = {};
    ctx.runtime = runtime;
    ctx.storage = storage;
    ctx.OpenAIFunctionCalling = OpenAIFunctionCalling;
    ctx.registry = registry;

    // ---------- DOM 引用 ----------
    ctx.dom = {
        loginView: document.getElementById('editor'),
        title: document.getElementById('info'),
        apiUrlInput: document.getElementById('api-url'),
        apiKeyInput: document.getElementById('api-key'),
        modelSelect: document.getElementById('models'),
        agentSelect: document.getElementById('agents'),
        characterName: document.getElementById("entry-name"),
        characterKeys: document.getElementById("entry-keys"),
        characterPrompt: document.getElementById("entry-prompt"),
        sendMsgBtn: document.getElementById('send'),
        messageList: document.getElementById('message-list'),
        messageInput: document.getElementById('input-message'),
        drawer: document.getElementById('drawer')
    };
    const { dom } = ctx;

    // ---------- 应用状态 ----------
    const rawData = await storage.getItem('chat-data');
    setupStore(ctx, rawData);

    // ---------- 请求配置 ----------
    ctx.aiRequestConfig = createDefaultAiRequestConfig();
    ctx.aiRequestConfig.tools = OpenAIFunctionCalling.tools;
    ctx.headers = authHeaders();
    ctx.currentApiConfig = null;
    ctx.currentAgentConfig = null;
    ctx.currentAbortController = null;
    ctx.apiUrl = '';
    runtime.currentAgentConfig = null;

    const global_prompt = await XMLHttpRequestGetTextPromise('data/global_prompt.md');
    ctx.global_prompt = global_prompt;
    ctx.system_prompt = {
        "role": "system",
        "content": global_prompt,
        branch: ctx.data.branch
    };

    // ---------- 渲染层 ----------
    setupRenderer(ctx);

    // ---------- 消息工具 ----------
    setupMessages(ctx);

    // ---------- 图片栈 ----------
    ctx.vm_images = PuSet.mvvm({
        target: document.getElementById("image-list"),
        selector: '.image-item',
        data: [],
        layout(item, value) {
            item.style.setProperty('background-image', `url(${value})`);
        }
    }).on('click', function (event, value, index) {
        ctx.vm_images.data.splice(index, 1);
    });
    runtime.vm_images = ctx.vm_images;

    // ---------- 控制器 ----------
    setupController(ctx);

    // ---------- 视图 ----------
    setupApiViews(ctx);
    setupMemoryViews(ctx);
    setupChatView(ctx);

    // ---------- 启动 ----------
    ctx.initAPI(ctx.data.currentModel);
    ctx.initAgent(ctx.data.currentAgent);

    PeakTimeDisplay.mount('#peaktime');
});