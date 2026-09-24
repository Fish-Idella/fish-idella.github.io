/**
 * AI聊天应用初始化入口
 * 功能：初始化本地存储、加载配置、绑定交互事件、处理AI对话流
 * 修复版：修复自动滚动、递归发送、删除逻辑、超时控制等问题
 */
Promise.resolve(StorageHelper.open({ name: 'ai-chat' })).then(async function getStorageValue(storage) {
    "use strict";
    const mimejson = 'application/json';
    const AndroidObject = promisify(PuSet.ensureObjectProperty(window, 'DaBaiFunctionCalling', Object));
    /**
     * 简易 HTTP GET 返回文本
     * @param {string} url 
     * @returns {Promise<string>}
     */
    function XMLHttpRequestGetTextPromise(url) {
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error("请求失败，网址：" + xhr.responseURL || url))
                    }
                }
            };
            xhr.send();
        });
    }

    const global_prompt = await XMLHttpRequestGetTextPromise('data/global_prompt.md');
    const r_np = /\n+/;
    const r_sse_data = /^\s*data:\s*(.*)\s*$/;
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
    const data = await storage.getItem('chat-data') || {
        "apiList": {},
        "agents": {},
        "currentModel": "",
        "information_map": {},
        "branch": []
    };
    const saveData = function saveData() {
        storage.setItem('chat-data', data);
    };
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
    const information_map = PuSet.ensureObjectProperty(data, "information_map", Object);
    const agents = PuSet.ensureObjectProperty(data, "agents", Object);
    const dabai = agents[0] ?? (agents[0] = {
        id: '0',
        name: "默认智能体（大白）",
        "settings": {
            thinking: true
        }
    });
    class MessageBox {
        constructor(message, index) {
            this.message = message;
            this.index = index;
            this.reasoningContent = [message.reasoner];
            this.messageContent = [message.content[0].text];
            this.tool_calls = [];
        }
        setUsage(usage) {
            this.message.usage = usage;
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
        addToolCalls(tool_calls) {
            const fns = this.tool_calls;
            tool_calls.forEach(function (tc) {
                const idx = tc.index;
                let fn = fns[idx];
                if (!fn) {
                    fn = Object.assign({ ass: [] }, tc);
                    fns[idx] = fn;
                }
                fn.ass.push(tc.function.arguments);
            });
        }
        setToolCalls() {
            this.tool_calls.forEach(fn => {
                fn.function.arguments = fn.ass.join("");
                Reflect.deleteProperty(fn, "ass");
            });
            this.message.tool_calls = this.tool_calls;
        }
        done() {
            vm_message.render(vm_message.activeItem, this.message, this.index, '已完成');
            this.message.not_done = false;
        }
    }
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
        'Accept': mimejson,
        'Content-Type': mimejson,
        "Authorization": ''
    };
    let autoScroll = true;
    let currentApiConfig = null; // 当前选中的 API 配置对象
    let currentAgentConfig = null;
    let apiUrl = ''; // 完整的 API endpoint
    let currentAbortController = null; // 当前请求的中止控制器（用于停止生成）
    const system_prompt = {
        "role": "system",
        "content": global_prompt,
        branch: data.branch
    }
    const worker = new Worker('./worker/worker.js', { type: 'module' });
    const workerMap = {};
    worker.onmessage = function (e) {
        const { uuid, content, value, isArray } = e.data;
        const el = workerMap[uuid];
        const ib = el.nextElementSibling;
        if (ib) {
            ib.textContent = '';
            if (isArray) {
                for (let i = 1; i < value.length; i++) {
                    const obj = value[i];
                    if (obj.type === 'image_url') {
                        ib.appendChild(document.createElement('img')).src = obj.image_url.url
                    }
                }
            }
        }
        el.innerHTML = content;
        Prism.highlightAllUnder(el)
        Reflect.deleteProperty(workerMap, uuid)
    }
    const vm_message = PuSet.mvvm({
        target: messageList,
        selector: ":scope>div.chat-message-output-box",
        activeItem: null,
        data: [system_prompt],
        onresize(s, l) {
            this.activeItem = s.children[l - 1];
        },
        render(box, message, index, s = '就绪') {
            if (index > 0) {
                const group = this.data[index - 1].branch;
                const v = 1 + group.indexOf(message);
                const max = group.length;
                box.querySelector('button[name=select]').textContent = `${v}/${max}`;
            }
            if (message.tool_calls) {
                box.classList.add('tool_calls');
            } else {
                box.classList.remove('tool_calls');
            }
            if (message.not_done) {
                const elapsed = ((performance.now() - message.thinkStartTime) / 1000).toFixed(2);
                message.state = `${s}（${elapsed}秒）`;
            }
            box.querySelector('.state').textContent = message.role === 'tool'
                ? '工具返回'
                : message.state;
            [
                { selector: '.think', value: message.reasoner },
                { selector: '.message', value: message.content }
            ].forEach(({ selector, value }) => {
                const uuid = crypto.randomUUID();
                workerMap[uuid] = box.querySelector(selector);
                worker.postMessage({ uuid, value });
            });
            if (autoScroll) {
                this.target.scrollTo(0, this.target.scrollHeight);
            }
        },
        layout(box, message, index) {
            this.activeItem = box;
            box.dataset.index = index;
            box.dataset.persona = message.role;
            box.querySelector('.chat-message-title').open = message.role !== 'user';
            box.querySelector('.state').textContent = message.state;
            this.render(box, message, index);
        }
    });
    const messages = vm_message.data;
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
        const message = {
            role: role,
            main: true,
            reasoner: '',
            content: [{ type: 'text', text: inputContent }],
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
    /**
     * 核心发送函数
     */
    function callApi() {
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
        sendMsgBtn.name = 'stop';
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
                            OpenAIFunctionCalling.handleToolCalls(assistantBox, data, information_map, messages).then(callApi);
                        });
                        break;
                    }
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
            if (currentAbortController === abortController) {
                currentAbortController = null;
            }
            assistantBox.done();
            sendMsgBtn.name = 'send';
            saveData();
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
            const mb = addMessage('user', inputContent);
            if (vm_images.data.length) {
                const content = mb.message.content;
                vm_images.data.forEach(url => content.push({ type: 'image_url', image_url: { url } }));
                vm_images.data.length = 0;
            }
            autoScroll = true;
            callApi();
        } catch (e) {
            console.error(e)
            ModalDialog.show('sendMessage' + e.message, "确定");
        }
    }
    function initMessageList(branch) {
        let currentBranch = branch;
        while (currentBranch && currentBranch.length > 0) {
            const message = currentBranch.find(msg => msg.main) || currentBranch[currentBranch.length - 1];
            message.main = true;
            messages.push(message);
            currentBranch = message.branch;
        }
    }
    function concatURL(base, path) {
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
        if (currentAgentConfig) {
            currentAgentConfig.settings[this.name] = this.checked;
        }
    });
    function initAPI(modelValue) {
        if (!modelValue) return;
        data.currentModel = modelValue;
        const [id, model] = modelValue.split("||");
        currentApiConfig = data.apiList[id];
        if (!currentApiConfig) {
            data.currentModel = '';
            return;
        }
        apiUrl = concatURL(currentApiConfig.api, "chat/completions");
        aiRequestConfig.model = model;
        headers.Authorization = `Bearer ${currentApiConfig.key}`;
    }
    function initAgent(name) {
        data.currentAgent = name;
        if (name && name !== '0') {
            currentAgentConfig = agents[name];
            aiRequestConfig.tools = null;
            system_prompt.content = currentAgentConfig.content;
            system_prompt.branch = currentAgentConfig.branch;
            title.textContent = `与${currentAgentConfig.name}的对话`;
        } else {
            currentAgentConfig = dabai;
            aiRequestConfig.tools = OpenAIFunctionCalling.tools;
            system_prompt.content = global_prompt;
            system_prompt.branch = data.branch;
            title.textContent = `与${dabai.name}的对话`;
        }
        Object.entries(currentAgentConfig.settings || {}).forEach(([k, v]) => {
            settings(k, v);
            const sw = document.querySelector(`#switch [name="${k}"]`);
            if (sw) sw.checked = v;
        });
        messages.length = 1;
        initMessageList(system_prompt.branch);
    }
    initAPI(data.currentModel);
    initAgent(data.currentAgent);
    function removeArrayItem(array, item) {
        const index = array.indexOf(item);
        if (index !== -1) {
            array.splice(index, 1);
            return true
        }
        return false
    }
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
        if (nodeName(e.target, "button")) {
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
        return Object.values(information_map).sort((a, b) => b.summary.localeCompare(a.summary));
    }
    const vm_information_map = PuSet.mvvm({
        target: characterList.querySelector('ul'),
        selector: 'li',
        data: getSortedCharacters(),
        layout(li, character) {
            li.querySelector('span.name').textContent = character.summary;
        }
    }).on('click', function (e, character) {
        if (nodeName(e.target, "button")) {
            return ModalDialog.show('确定要删除【' + character.summary + '】吗？', '确定', '取消').then((result) => {
                if (result.which != 0) return;
                OpenAIFunctionCalling.delete_information(data, information_map, { keys: [character.key] });
                vm_information_map.update(getSortedCharacters());
                saveData();
            });
        }
        loginView.dataset.type = 'character';
        loginView.dataset.id = character.key;
        characterName.value = character.summary;
        characterKeys.value = character.tags?.join('\uff0c') ?? '';
        characterPrompt.value = character.information;
        PuSet.show(loginView, true);
    });
    /** @type {HTMLSelectElement} */
    const _agents = document.getElementById('agents');
    _agents.addEventListener('change', function () {
        initAgent(this.value);
    });
    const vm_agent = PuSet.mvvm({
        target: document.getElementById('agent-list').querySelector('ul'),
        selector: 'li',
        data: Object.values(agents),
        onresize(ul, length) {
            _agents.options.length = length;
            initAgent(_agents.options.item(0).value);
        },
        layout(li, value, index) {
            li.querySelector('span.name').textContent = value.name;
            const children = _agents.options;
            const option = children.length > index
                ? children.item(index)
                : _agents.appendChild(document.createElement("option"));
            option.textContent = value.name;
            option.value = value.id;
        }
    }).on('click', function (e, value) {
        if (value === dabai) return ModalDialog.show("不可修改大白的提示词", "确定");
        if (nodeName(e.target, "button")) {
            return ModalDialog.show('确定要删除【' + value.name + '】吗？', '确定', '取消').then(result => {
                if (result.which != 0) return;
                Reflect.deleteProperty(agents, value.id);
                vm_agent.update(Object.values(agents))
                saveData();
            })
        }
        loginView.dataset.type = 'agent';
        loginView.dataset.id = value.id;
        characterName.value = value.name;
        characterPrompt.value = value.content;
        PuSet.show(loginView, true);
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
                const id = loginView.dataset.id || crypto.randomUUID();
                switch (type) {
                    case 'character': {
                        const config = Object.assign({
                            "key": id
                        }, information_map[id] || {}, {
                            "summary": characterName.value,
                            "information": characterPrompt.value,
                            "tags": characterKeys.value.trim().split(/\s*,\s*|\s*\uff0c\s*/)
                        });
                        information_map[config.key] = config;
                        vm_information_map.update(getSortedCharacters());
                        break;
                    }
                    case 'agent': {
                        const config = Object.assign({
                            "id": id,
                            'branch': [],
                            "settings": {
                                thinking: true
                            }
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
                saveData();
            } catch (e) {
                ModalDialog.show('保存失败：' + e.message, "确定");
            }
        }
    }
    document.getElementById('enter-chat').addEventListener("click", function () {
        aaa.save(loginView.dataset.type);
    });
    PuSet(characterList).add('#agent-list').on('click', '.subtitle button', function () {
        aaa.add(this.className);
    });
    document.getElementById('gotomain').addEventListener('click', () => {
        vm_information_map.update(getSortedCharacters());
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
    modelSelect.addEventListener("change", function () {
        initAPI(this.value);
    });
    title.addEventListener('dblclick', function () {
        const bottom = messageList.scrollHeight - messageList.clientHeight;
        messageList.scrollTo({
            top: (messageList.scrollTop < bottom) ? bottom : 0,
            left: 0,
        });
    });
    document.getElementById('current').addEventListener("click", () => {
        AndroidObject.openWebView("");
    });
    document.getElementById("exit-edit").addEventListener("click", () => PuSet.show(loginView, false));
    const vm_images = PuSet.mvvm({
        target: document.getElementById("image-list"),
        selector: '.image-item',
        data: [],
        layout(item, value) {
            item.style.setProperty('background-image', `url(${value})`)
        }
    }).on('click', function (event, value, index) {
        vm_images.data.splice(index, 1)
    });
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
                    url && vm_images.data.push(url)
                };
                fr.readAsDataURL(file);
            });
        }, { once: true })
        fileInput.click()
    })
    let editData = {};
    const editDialog = document.getElementById('message-edit');
    const editTextarea = editDialog.querySelector('textarea');
    PuSet(editDialog).on('click', 'button', function (ev) {
        const val = editTextarea.value.trim();
        if (!val) return;
        const { parentBox, dataIndex, message } = editData;
        switch (this.name) {
            case 'save':
                message.content = val;
                vm_message.render(parentBox, message, dataIndex);
                break;
            case 'submit':
                messages.length = dataIndex;
                addMessage('user', val);
                autoScroll = true;
                callApi();
                break;
        }
        saveData();
        PuSet.show(editDialog, false);
    });
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
            navigator.clipboard.writeText(messages[idx]?.content || '').then(function () {
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
                initMessageList(branch); // 重新渲染剩余消息
                saveData(); // 持久化
            });
        },
        remake(btn, parentBox, idx) {
            if (currentAbortController) return;
            messages.length = idx; // 删除当前及之后消息（包括当前 assistant）
            autoScroll = true;
            callApi();
        },
        usage(btn, parentBox, idx) {
            const usage = messages[idx]?.usage || {};
            usage['命中率'] = usage.prompt_cache_hit_tokens / usage.total_tokens;
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
        autoScroll = messageList.scrollTop >= bottom;
    });
    const apiModal = document.getElementById('api-m');
    PuSet(apiModal).on("click", "button.login-btn", function () {
        if (this.name === "save") {
            const baseUrl = apiUrlInput.value.trim();
            const baseKey = apiKeyInput.value.trim();
            if (!baseUrl) return ModalDialog.show("请填写API地址", "确定");
            fetch(concatURL(baseUrl, "models"), {
                method: 'GET',
                headers: {
                    'Accept': mimejson,
                    'Content-Type': mimejson,
                    'Authorization': `Bearer ${baseKey}`
                }
            }).then(response => response.json()).then(modelList => {
                if (!modelList.data || !Array.isArray(modelList.data)) throw new Error("模型列表格式错误");
                const newId = crypto.randomUUID();
                data.apiList[newId] = {
                    "id": newId,
                    "api": baseUrl,
                    "key": baseKey
                };
                modelList.data.forEach(modelObj => {
                    const name = String(modelObj.id);
                    const value = newId + "||" + name;
                    modelSelect.appendChild(new Option(name, value, false, false));
                });
                if (!data.currentModel) {
                    initAPI(modelSelect.children.item(0).value);
                }
                saveData();
                PuSet.show(apiModal, false);
            }).catch(e => ModalDialog.show(`测试链接失败：${e.message}`, "确定"));
            return;
        }
        PuSet.show(apiModal, false);
    });
    PuSet('.settings').on('click', 'button', function () {
        switch (this.name) {
            case 'api': {
                buildDataList();
                PuSet.show(apiModal, true);
                break;
            }
            case 'export': {
                ModalDialog.show({
                    type: "list",
                    list: [
                        { value: "apiList", text: "API 配置" },
                        { value: "agents", text: "所有智能体" },
                        { value: "information_map", text: "所有词条" },
                        { value: "branch", text: "与大白的聊天记录" }
                    ]
                }).then(function (res) {
                    if (res.which != 0) return;
                    const obj = {};
                    res.selected.forEach(key => {
                        if (key in data) {
                            obj[key] = data[key];
                        }
                    });
                    const fr = new FileReader();
                    fr.addEventListener('load', () => PuSet.download(fr.result, "chat-data.json"));
                    fr.readAsDataURL(new Blob([JSON.stringify(obj)], { type: mimejson }));
                })
                break;
            }
            case 'import': {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = mimejson;
                input.addEventListener('input', () => {
                    const files = input.files;
                    if (files.length < 1) return;
                    const fr = new FileReader();
                    fr.addEventListener('load', function () {
                        try {
                            const json = JSON.parse(fr.result)
                            ModalDialog.show("文件已读取", "合并", "覆盖", "取消").then(function (res) {
                                switch (res.which) {
                                    case 0: {
                                        Object.keys(data).forEach(key => Object.assign(data[key], json[key]));
                                        saveData();
                                        window.location.reload(true);
                                        break
                                    }
                                    case 1: {
                                        Object.assign(data, json);
                                        saveData();
                                        window.location.reload(true);
                                        break
                                    }
                                    default: return;
                                }
                            });
                        } catch {
                            ModalDialog.show("无法解析文件", "确定")
                        }
                    })
                    fr.readAsText(files[0])
                });
                input.click()
                break;
            }
        }
    });
    Object.keys(data.apiList).forEach(id => {
        const cfg = data.apiList[id];
        fetch(concatURL(cfg.api, "models"), {
            method: 'GET',
            headers: {
                'Accept': mimejson,
                'Content-Type': mimejson,
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
    PeakTimeDisplay.mount('#peaktime')
});