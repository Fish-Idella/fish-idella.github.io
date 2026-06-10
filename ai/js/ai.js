/**
 * AI聊天应用初始化入口
 * 功能：初始化本地存储、加载配置、绑定交互事件、处理AI对话流
 * 修复版：修复自动滚动、递归发送、删除逻辑、超时控制等问题
 */
Promise.resolve(StorageHelper.open({
    name: 'ai-chat'
})).then(async function getStorageValue(storage) {
    "use strict";

    /**
     * 简易 HTTP GET 返回文本
     * @param {string} url 
     * @returns {Promise<string>}
     */
    function XMLHttpRequestGetTextPromise(url) {
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = function () {
                resolve(xhr.responseText);
            };
            xhr.onerror = function () {
                reject(xhr.statusText);
            };
            xhr.send();
        });
    }

    const global_prompt = await XMLHttpRequestGetTextPromise('data/global_prompt.md');

    // ============================ 正则表达式 ============================
    const r_np = /\n+/;
    const r_sse_data = /^\s*data:\s*(.*)\s*$/;

    // ============================ DOM元素 ============================
    const loginView = document.getElementById('login-view');
    const title = document.getElementById('info');

    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('models');

    const characterName = document.getElementById("character-name");
    const characterKeys = document.getElementById("character-keys");
    const characterPrompt = document.getElementById("character-prompt");

    const sendMsgBtn = document.getElementById('send');
    const messageList = document.getElementById('message-list');
    const messageInput = document.getElementById('input-message');
    const messageBoxTemplate = messageList.firstElementChild;
    const drawer = document.getElementById('drawer');
    const characterList = drawer.querySelector('details#character-list');

    // ============================ 数据初始化 ============================
    const data = await storage.getItem('chat-data') || {
        "book-index": {},
        "characters": {},
        "apiList": {},
        "agents": {},
        "currentModel": "",
        "branch": []
    };

    function nodeName(elem, name) {
        return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
    }

    function changeImage(l = 0) {
        const image = new Image();
        const positions = [[-30, 100], [0, 100], [-24, 100], [-22, 100], [-20, 120], [-2, 100], [-5, 80]];
        image.onload = () => {
            const img = document.querySelector('#image>img');
            img.src = image.src;
            img.style.setProperty('bottom', positions[i][0] + '%')
            img.style.setProperty('width', positions[i][1] + '%')
        };
        const max = positions.length;
        const n = l % max;
        const i = n < 0 ? n + max : n;
        image.src = `image/${1 + i}.png`;
    }

    const bookIndex = PuSet.ensureObjectProperty(data, "book-index", Object);
    const characters = PuSet.ensureObjectProperty(data, "characters", Object);
    const agents = PuSet.ensureObjectProperty(data, "agents", Object);
    const dabai = agents[0] = {
        id: '0',
        name: "默认智能体（大白）"
    };

    const EscapeSequenceHTML = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        escape(text) {
            return text.replace(/[&<>"']/g, c => this[c]);
        }
    };

    // ============================ MessageBox 类 ============================
    class MessageBox {
        constructor(message, index) {
            this.message = message;
            this.index = index;
            this.reasoningContent = [message.reasoner];
            this.messageContent = [message.content];
        }
        setUsage(usage) {
            this.message.usage = usage;
        }
        setToolCalls(fns) {
            this.message.tool_calls = fns;
            vm_message.render(vm_message.activeItem, this.message, this.index, '思考中…');
        }
        addReasoningChunk(chunk) {
            if (!chunk) return;
            this.reasoningContent.push(chunk);
            this.message.reasoner = this.getReasoningChunk();
            vm_message.render(vm_message.activeItem, this.message, this.index, '思考中…');
        }
        addContentChunk(chunk) {
            if (!chunk) return;
            this.messageContent.push(chunk);
            this.message.content = this.getContentChunk();
            vm_message.render(vm_message.activeItem, this.message, this.index, '回答中…');
        }
        getContentChunk() {
            return this.messageContent.join('');
        }
        getReasoningChunk() {
            return this.reasoningContent.join('');
        }
        done() {
            vm_message.render(vm_message.activeItem, this.message, this.index, '已完成');
            this.message.not_done = false;
        }
    }

    // AI 请求配置
    const aiRequestConfig = {
        "model": 'deepseek-v4-flash',
        "stream": true,
        "temperature": 0.8,
        "thinking": {
            "type": "enabled"
        },
        "tools": null,
        "tool_choice": "auto",
        "messages": []
    };
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        "Authorization": ''
    };

    let autoScroll = true;
    let currentApiConfig = null; // 当前选中的 API 配置对象
    let apiUrl = ''; // 完整的 API endpoint
    let currentAbortController = null; // 当前请求的中止控制器（用于停止生成）

    const system_prompt = {
        "role": "system",
        "content": global_prompt,
        branch: data.branch
    }

    // 视图管理器（消息列表）
    const vm_message = PuSet.mvvm({
        target: messageList,
        selector: ":scope>div.chat-message-output-box",
        activeItem: null,
        data: [system_prompt],
        onresize(s, l) {
            this.activeItem = s.children[l - 1];
        },
        render(box, message, index, s = '就绪') {
            // 切换按钮文本
            if (index > 0) {
                const group = this.data[index - 1].branch;
                const v = 1 + group.indexOf(message);
                const max = group.length;
                box.querySelector('button[name=select]').textContent = `${v}/${max}`;
            }
            if (message.tool_calls) box.classList.add('tool_calls');
            else box.classList.remove('tool_calls');


            if (message.not_done) {
                const elapsed = ((performance.now() - message.thinkStartTime) / 1000).toFixed(2);
                message.state = `${s}（${elapsed}秒）`;
            }
            box.querySelector('.state').textContent = message.state;

            if (message.role === "assistant") {
                if (!message.his) {
                    message.his = "";
                    loop: for (let i = index - 1; i > 0; i--) {
                        const m = vm_message.data[i];
                        sw: switch (m.role) {
                            case "tool": {
                                message.his = "\n\n```json\n" + m.content + "\n```\n\n" + message.his;
                                break sw;
                            }
                            case "assistant": {
                                message.his = m.reasoner + '\n\n' + message.content + message.his;
                                break sw;
                            }
                            default:
                                break loop;
                        }
                    }
                }
            }

            box.querySelector('.think').textContent = (message.his ?? '') + message.reasoner;
            // 安全渲染（转义HTML后再替换括号样式）
            let safeContent = EscapeSequenceHTML.escape(message.content)
                .replace(/\n|\r\n/g, '<br>')
                .replace(/(\uff08[^\uff09]*(\uff09|$))/g, '<span class="dd">$1</span>')
                .replace(/(\([^\)]*(\)|$))/g, '<span class="dd">$1</span>');
            box.querySelector('.message').innerHTML = safeContent;


            if (autoScroll) {
                this.target.scrollTo(0, this.target.scrollHeight);
            }
        },
        layout(box, message, index) {
            this.activeItem = box;
            box.dataset.index = index;
            box.dataset.persona = message.role;

            // box.querySelector('.chat-message-title').open = message.role !== 'user';
            box.querySelector('.state').textContent = message.state;

            this.render(box, message, index);
        }
    });

    const messages = vm_message.data;
    // initMessageList(data.branch);

    OpenAIFunctionCalling.data = data;
    OpenAIFunctionCalling.messages = messages;


    // ============================ 辅助函数 ============================
    function showModalDialog(message, ...bts) {
        const container = document.createElement('dialog');
        container.className = "unselect";
        container.style.border = 'none';
        container.style.borderRadius = '0.6rem';
        const promise = new Promise((resolve) => {
            const content = document.createElement('pre');
            content.className = 'content flex-vertical';
            content.style.maxHeight = '60vh';
            content.style.maxWidth = '80vw';
            content.style.width = 'fit-content';
            content.style.borderRadius = '1rem';
            content.style.margin = '0';
            const messageDiv = document.createElement('code');
            messageDiv.textContent = message;
            messageDiv.style.overflow = 'auto';
            messageDiv.style.textAlign = 'justify';
            const input = document.createElement('input');
            input.className = 'hide';
            input.style.marginTop = '1rem';
            input.placeholder = '在此处输入';
            if ('boolean' === typeof message) {
                input.value = bts.shift();
                input.classList.remove('hide');
                messageDiv.textContent = bts.shift();
            }
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex-horizontal place-center';
            buttonContainer.style.flexDirection = 'row-reverse';
            buttonContainer.style.gap = '10px';
            const buttonStyle = {
                padding: '8px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: '80px',
                margin: '1rem 0 0 0'
            };
            bts.forEach(function (str, idx) {
                const button = document.createElement('button');
                button.textContent = str;
                Object.assign(button.style, buttonStyle, idx === 0 ? {
                    backgroundColor: '#1890ff',
                    color: '#fff'
                } : {
                    backgroundColor: '#d1d1d1',
                    color: '#333'
                });
                button.addEventListener('click', () => {
                    resolve({
                        index: idx,
                        value: input.value
                    });
                    container.remove();
                });
                buttonContainer.appendChild(button);
            });
            content.appendChild(messageDiv);
            content.appendChild(input);
            content.appendChild(buttonContainer);
            container.appendChild(content);
            document.body.appendChild(container);
            container.showModal();
        });
        promise.close = function () {
            container.remove();
        };
        return promise;
    }

    function messagePurifying(messages) {
        aiRequestConfig.messages = messages.map(m => ({
            "role": m.role,
            "content": m.content,
            "reasoning_content": m.reasoner,
            "tool_calls": m.tool_calls,
            "tool_call_id": m.tool_call_id
        }));
        return JSON.stringify(aiRequestConfig);
    }

    function addMessage(role, inputContent) {
        const index = messages.length;
        const last = index - 1;
        // if (last < 0) throw new SyntaxError("未选择资料卡");

        const message = {
            role: role,
            main: true,
            reasoner: '',
            content: inputContent,
            thinkStartTime: performance.now(),
            not_done: role !== 'user',
            branch: []
        };

        message.state = message.not_done ? '就绪' : "已完成";

        const group = messages.at(last).branch;
        group.forEach(item => item.main = false);
        group.push(message);
        messages.push(message);
        return new MessageBox(message, index);
    }

    // 流式读取行迭代器
    class ReadStreamLine {
        constructor(response) {
            this.response = response;
        }
        [Symbol.asyncIterator]() {
            const reader = this.response.body.getReader();
            const decoder = new TextDecoder("UTF-8");
            let buffer = "";
            return {
                next: async function next() {
                    const idx = buffer.indexOf("\n");
                    if (idx >= 0) {
                        const msg = buffer.slice(0, idx);
                        buffer = buffer.slice(idx + 1);
                        return {
                            value: msg,
                            done: false
                        };
                    }
                    const {
                        done,
                        value
                    } = await reader.read();
                    if (done) {
                        if (buffer.length > 0) {
                            const msg = buffer;
                            buffer = '';
                            return {
                                value: msg,
                                done: false
                            };
                        }
                        return {
                            value: buffer,
                            done: true
                        };
                    } else {
                        buffer += decoder.decode(value, {
                            stream: true
                        });
                        return next();
                    }
                }
            };
        }
    }

    /**
     * 核心发送函数
     */
    function callApi() {
        // 如果有进行中的请求，先中止
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }
        const abortController = new AbortController();
        currentAbortController = abortController;

        const body = messagePurifying(messages);
        const assistantBox = addMessage('assistant', '');


        if (!apiUrl) {
            assistantBox.addContentChunk('[提示：]\n\n需要点击页面左上角打开抽屉栏，配置API之后才能正常使用\n\n所有数据存储在浏览器环境，切换浏览器会丢失所有信息');
            return
        }

        autoScroll = true;
        sendMsgBtn.name = 'stop';

        const fns = [];
        const addToolCalls = function (tool_calls) {
            tool_calls.forEach(function (tc) {
                const idx = tc.index;
                let fn = fns[idx];
                if (!fn) {
                    fn = Object.assign({
                        ass: []
                    }, tc);
                    fns[idx] = fn;
                }
                fn.ass.push(tc.function.arguments);
            });
        };

        fetch(apiUrl, {
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
                let data;
                try {
                    data = JSON.parse(trimmed);
                } catch (e) {
                    console.warn("SSE JSON 解析失败:", trimmed, e);
                    continue;
                }
                const choice = data.choices?.[0];
                if (!choice) continue;
                const delta = choice.delta || {};
                // 推理内容
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
                    addToolCalls(tool_calls);
                    continue;
                }
                if (choice.finish_reason === "tool_calls") {
                    fns.forEach(fn => {
                        fn.function.arguments = fn.ass.join("");
                        Reflect.deleteProperty(fn, "ass");
                    });
                    assistantBox.setToolCalls(fns);
                    OpenAIFunctionCalling.handleToolCalls(fns, assistantBox);
                    // 递归发送，但不要新建 assistant 消息
                    callApi();
                    continue;
                }
                if (choice.finish_reason === "stop") {
                    assistantBox.setUsage(data.usage);
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
            if (currentAbortController === abortController) {
                currentAbortController = null;
            }
            assistantBox.done();
            sendMsgBtn.name = 'send';
            storage.setItem('chat-data', data);
        });
    }

    function sendMessage() {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
            return;
        }
        const inputContent = messageInput.value.trim();
        if (!inputContent) return;
        messageInput.value = '';
        try {
            addMessage('user', inputContent);
            callApi();
        } catch (e) {
            console.error(e)
            showModalDialog('sendMessage' + e.message, "确认");
        }
    }

    function initMessageList(branch) {
        let currentBranch = branch;
        while (currentBranch && currentBranch.length > 0) {
            const message = currentBranch.find(msg => msg.main) || currentBranch[currentBranch.length - 1];
            message.main = true;
            messages.push(message);
            currentBranch = message.branch;

            // if (message.role === "assistant" && message.tool_calls) {
            //     let tool;
            //     for (const tool_call of message.tool_calls) {
            //         tool = currentBranch.find(msg => msg.tool_call_id === tool_call.id);
            //         messages.push(tool);
            //     }
            //     currentBranch = tool.branch;
            // }
        }
    }

    function urlConcat(base, path) {
        return String(base).replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
    }

    function settings(name, checked) {
        switch (name) {
            case "thinking":
                aiRequestConfig.thinking.type = checked ? 'enabled' : 'disabled';
                aiRequestConfig.enable_thinking = checked;
                aiRequestConfig.think = checked;
                break;
        }
    }
    PuSet("#switch").on("input", "input", function () {
        settings(this.name, this.checked);
        if (currentApiConfig) {
            currentApiConfig.settings[this.name] = this.checked;
        }
    });

    // 初始化 API 配置
    function initAPI(modelValue) {
        if (!modelValue) return;
        data.currentModel = modelValue;
        const [id, model] = modelValue.split("||");
        currentApiConfig = data.apiList[id];
        if (!currentApiConfig) {
            data.currentModel = '';
            return;
        }
        apiUrl = urlConcat(currentApiConfig.api, "chat/completions");
        aiRequestConfig.model = model;
        headers.Authorization = `Bearer ${currentApiConfig.key}`;
        // 同步开关状态
        Object.entries(currentApiConfig.settings || {}).forEach(([k, v]) => {
            settings(k, v);
            const sw = document.querySelector(`#switch [name="${k}"]`);
            if (sw) sw.checked = v;
        });
    }

    function initAgent(name) {
        if (name && name !== '0') {
            const agent = agents[name];
            aiRequestConfig.tools = null;
            system_prompt.content = agent.content;
            system_prompt.branch = agent.branch;
            title.textContent = `与${agent.name}的对话`;
        } else {
            aiRequestConfig.tools = OpenAIFunctionCalling.tools;
            system_prompt.content = global_prompt;
            system_prompt.branch = data.branch;
            title.textContent = `与${dabai.name}的对话`;
        }
        messages.length = 1;
        initMessageList(system_prompt.branch);
    }

    initAPI(data.currentModel);
    initAgent('0');

    function removeArrayItem(array, item) {
        const index = array.indexOf(item);
        if (index !== -1) {
            array.splice(index, 1);
            return true
        }
        return false
    }

    // 构建 dataList 辅助
    const apiSelect = document.getElementById('api-url-list');
    const keySelect = document.getElementById('api-key-list');
    const vm_apiList = PuSet.mvvm({
        target: document.getElementById("api-list"),
        selector: 'li',
        data: [],
        layout(li, value) {
            li.querySelector('span.name').textContent = value.api;
        }
    }).on('click', function (e, value, key) {
        apiUrlInput.value = value.api;
        apiKeyInput.value = value.key;

        if (nodeName(e.target, 'BUTTON')) {
            Reflect.deleteProperty(data.apiList, value.id);
            removeArrayItem(vm_apiList.data, value);
        }
    });

    function buildDataList() {
        const apis = new Set(['https://api.deepseek.com/', 'https://api.openai.com/v1/']);
        const keys = new Set(['none']);

        const values = Object.values(data.apiList);
        values.forEach(a => {
            apis.add(a.api);
            keys.add(a.key);
        });
        vm_apiList.update(values)
        apiSelect.innerHTML = '';
        keySelect.innerHTML = '';
        apis.forEach(v => apiSelect.appendChild(new Option(v, v)));
        keys.forEach(v => keySelect.appendChild(new Option(v, v)));
    }

    function getSortedCharacters() {
        return Object.values(characters).sort((a, b) => b.summary.localeCompare(a.summary));
    }

    // 资料卡列表视图
    const vm_characters = PuSet.mvvm({
        target: characterList.querySelector('ul'),
        selector: 'li',
        data: getSortedCharacters(),
        layout(li, character) {
            li.querySelector('span.name').textContent = character.summary;
        }
    }).on('click', function (e, character) {
        if (nodeName(e.target, 'BUTTON')) {
            return showModalDialog('确定要删除【' + character.summary + '】吗？', '确认', '取消').then((result) => {
                if (result.index === 0) {
                    if (Reflect.deleteProperty(characters, character.key)) {
                        Reflect.deleteProperty(bookIndex, character.key);
                        vm_characters.update(getSortedCharacters());
                        storage.setItem('chat-data', data);
                    } else {
                        showModalDialog('删除失败！', '确认');
                    }
                }
            });
        }
        loginView.dataset.type = 'character';
        loginView.dataset.id = character.key;
        characterName.value = character.summary;
        characterKeys.value = character.tags?.join('\uff0c') ?? '';
        try {
            characterPrompt.value = JSON.stringify(character.information, null, 2);
        } catch {
            characterPrompt.value = character.information;
        }
        PuSet.show(loginView, true);
    });

    const vm_agent = PuSet.mvvm({
        target: document.getElementById('agent-list').querySelector('ul'),
        selector: 'li',
        data: Object.values(agents),
        layout(li, value) {
            li.querySelector('span.name').textContent = value.name;
        }
    }).on('click', function (e, value) {

        if (value === dabai) return showModalDialog("不可修改大白的提示词", "确认");

        if (nodeName(e.target, 'BUTTON')) {
            return showModalDialog('确定要删除【' + value.name + '】吗？', '确认', '取消').then(result => {
                if (result.index === 0) {
                    Reflect.deleteProperty(agents, value.id);
                    vm_agent.update(Object.values(agents))
                }
            })
        }

        loginView.dataset.type = 'agent';
        loginView.dataset.id = value.id;
        characterName.value = value.name;
        characterPrompt.value = value.content;
        PuSet.show(loginView, true);
    });

    PuSet.mvvm({
        target: document.getElementById('agents'),
        selector: 'option',
        data: vm_agent.data,
        layout(option, value) {
            option.textContent = value.name;
            option.value = value.id;
        }
    }).target.addEventListener('change', function () {
        initAgent(this.value);
    });

    const aaa = {
        add(type) {
            loginView.reset();
            loginView.dataset.type = type;
            loginView.dataset.id = '';
            PuSet.show(loginView, true);
        },

        save(type) {
            try {
                const id = OpenAIFunctionCalling.randomUUID(loginView.dataset.id);
                switch (type) {
                    case 'character': {
                        const config = Object.assign({
                            "key": id
                        }, characters[id] || {}, {
                            "summary": characterName.value,
                            "information": JSON.parse(characterPrompt.value),
                            "tags": characterKeys.value.trim().split(/\s*,\s*|\s*\uff0c\s*/)
                        });
                        characters[config.key] = config;
                        bookIndex[config.key] = config.summary
                        vm_characters.update(getSortedCharacters());
                        break;
                    }
                    case 'agent': {
                        const config = Object.assign({
                            "id": id,
                            'branch': []
                        }, agents[id] || {}, {
                            "name": characterName.value,
                            "content": characterPrompt.value
                        });
                        agents[config.id] = config;
                        vm_agent.update(Object.values(agents));
                        break;
                    }
                }
                PuSet.show(loginView, false);
                storage.setItem('chat-data', data);
            } catch (e) {
                showModalDialog('保存失败：' + e.message, "确认");
            }
        }
    }

    // 保存资料卡配置
    document.getElementById('enter-chat').addEventListener("click", function () {
        aaa.save(loginView.dataset.type);
    });

    PuSet(characterList).add('#agent-list').on('click', '.subtitle button', function () {
        aaa.add(this.className);
    });

    // ============================ 事件绑定 ============================
    document.getElementById('gotomain').addEventListener('click', () => {
        vm_characters.update(getSortedCharacters());
        PuSet.show(drawer, true);
    });
    drawer.addEventListener('click', (ev) => {
        if (ev.target === drawer) PuSet.show(drawer, false);
    });
    sendMsgBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (ev) => {
        if (ev.key === "Enter" || ev.keyCode === 13) {
            ev.preventDefault();
            if (!currentAbortController) sendMessage();
        }
    });

    // 编辑历史消息
    let editData = {};
    const editDialog = document.getElementById('message-edit');
    const editTextarea = editDialog.querySelector('textarea');
    PuSet(editDialog).on('click', 'button', function (ev) {
        const val = editTextarea.value.trim();
        if (!val) return;
        const {
            button,
            parentBox,
            dataIndex,
            message
        } = editData;
        switch (this.name) {
            case 'save':
                message.content = val;
                vm_message.render(parentBox, message, dataIndex);
                break;
            case 'submit':
                messages.length = dataIndex;
                addMessage('user', val);
                callApi();
                break;
        }
        PuSet.show(editDialog, false);
    });

    const messageButtonActions = {
        edit(btn, parentBox, idx) {
            const msg = messages[idx];
            editData = {
                button: btn,
                parentBox,
                dataIndex: idx,
                message: msg
            };
            editDialog.querySelector('.dialog-content').dataset.name = msg.role;
            editTextarea.value = msg.content;
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
            navigator.clipboard.writeText(messages[idx]?.content || '').catch(() => showModalDialog("复制失败", "确认"));
        },
        delete(btn, parentBox, idx) {
            // 删除当前消息及之后所有消息
            showModalDialog("将删除此消息及之后所有最新消息", "确认", "取消").then(function (result) {
                if (result.index != 0) return;
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

                initMessageList(branch); // 重新渲染剩余消息
                storage.setItem('chat-data', data); // 持久化
            });
        },
        remake(btn, parentBox, idx) {
            if (currentAbortController) return;
            messages.length = idx; // 删除当前及之后消息（包括当前 assistant）
            callApi();
        },
        usage(btn, parentBox, idx) {
            showModalDialog(JSON.stringify(messages[idx]?.usage || {}, null, 2), "确认");
        }
    };

    PuSet(messageList).on("click", "button", function (ev) {
        const action = messageButtonActions[this.name];
        if (!action) return;
        const parentBox = this.closest(".chat-message-output-box");
        const dataIndex = Number(parentBox.dataset.index);
        action(this, parentBox, dataIndex);
    }).on('scroll', function () {
        const bottom = messageList.scrollHeight - messageList.clientHeight;
        autoScroll = bottom.scrollTop >= bottom;
    });



    // 管理 API 设置
    const apiModal = document.getElementById('api-m');
    PuSet(apiModal).on("click", "button.login-btn", function () {
        if (this.name === "save") {
            const baseUrl = apiUrlInput.value.trim();
            const baseKey = apiKeyInput.value.trim();
            if (!baseUrl) return showModalDialog("请填写API地址", "确认");
            fetch(urlConcat(baseUrl, "models"), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${baseKey}`
                }
            }).then(response => response.json()).then(modelList => {
                if (!modelList.data || !Array.isArray(modelList.data)) throw new Error("模型列表格式错误");
                const newId = OpenAIFunctionCalling.randomUUID();
                data.apiList[newId] = {
                    "id": newId,
                    "api": baseUrl,
                    "key": baseKey,
                    "settings": {
                        thinking: true
                    }
                };
                modelList.data.forEach(modelObj => {
                    const name = String(modelObj.id);
                    const value = newId + "||" + name;
                    modelSelect.appendChild(new Option(name, value, false, false));
                });
                if (!data.currentModel) {
                    initAPI(modelSelect.children.item(0).value);
                }
                storage.setItem('chat-data', data);
                PuSet.show(apiModal, false);
            }).catch(e => showModalDialog(`测试链接失败：${e.message}`, "确认"));
            return;
        }
        PuSet.show(apiModal, false);
    });
    document.getElementById('current').addEventListener("click", () => { });
    document.getElementById("exit-edit").addEventListener("click", () => PuSet.show(loginView, false));

    // 设置
    PuSet('.settings').on('click', 'button', function () {
        switch (this.name) {
            case 'api': {
                buildDataList();
                PuSet.show(apiModal, true);
                break;
            }
        }
    });


    // 加载已有模型列表
    Object.keys(data.apiList).forEach(id => {
        const cfg = data.apiList[id];
        fetch(urlConcat(cfg.api, "models"), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cfg.key}`
            }
        }).then(response => response.json()).then(modelList => {
            if (!modelList.data || !Array.isArray(modelList.data)) return;
            modelList.data.forEach(modelObj => {
                const name = String(modelObj.id);
                const value = id + "||" + name;
                const selected = (value === data.currentModel);
                modelSelect.appendChild(new Option(name, value, selected, selected));
            });
        }).catch(() => console.warn("无法访问: " + cfg.api));
    });
    modelSelect.addEventListener("change", function () {
        initAPI(this.value);
    });

    title.addEventListener('dblclick', function () {
        const bottom = messageList.scrollHeight - messageList.clientHeight;
        messageList.scrollTo({
            top: (messageList.scrollTop < bottom) ? bottom : 0,
            left: 0,
            // behavior: "smooth"
        });
    });

    // 全局数据导入导出
    const dataDialog = document.getElementById("data-dialog");
    const dataArea = document.getElementById("golbal-data");
    PuSet(dataDialog).on("click", "button", function (ev) {
        if (this.name === "save") {
            try {
                const newData = JSON.parse(dataArea.value);
                storage.setItem('chat-data', newData);
                window.location.reload(true);
            } catch (e) {
                showModalDialog(`数据格式错误：${e.message}`, "确认");
            }
        } else if (this.name === "download") {
            PuSet.download(URL.createObjectURL(new Blob([dataArea.value], {
                type: "text/plain"
            })), "character-data.json");
        }
        dataDialog.close();
    });
});