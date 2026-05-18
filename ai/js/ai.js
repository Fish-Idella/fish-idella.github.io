/**
 * AI聊天应用初始化入口
 * 功能：初始化本地存储、加载配置、绑定交互事件、处理AI对话流
 */
Promise.resolve(StorageHelper.open({ name: 'ai-chat' })).then(async function getStorageValue(storage) {
    "use strict";

    // ============================ 正则表达式预定义 ============================
    const r_np = /\n+/;      // 匹配一个或多个换行符
    const r_sp = /\s+/;      // 匹配一个或多个空白字符（暂未使用）
    const r_sse_data = /^\s*data:\s*(.*)\s*$/;

    // ============================ DOM元素获取区 ============================
    // 视图容器
    const loginView = document.getElementById('login-view');      // 登录/配置视图
    const chatView = document.getElementById('chat-view');        // 聊天视图
    // 配置项输入框
    const apiUrlInput = document.getElementById('api-url');       // API地址输入框
    const apiKeyInput = document.getElementById('api-key');       // API密钥输入框
    const modelSelect = document.getElementById('models');        // 模型选择下拉框
    const characterName = document.getElementById("character-name");      // 智能体名称输入框
    const characterPrompt = document.getElementById("character-prompt");  // 系统提示词输入框
    // 按钮元素
    const saveConfigBtn = document.getElementById('enter-chat');   // 保存配置并进入聊天按钮
    const testConnectBtn = document.getElementById('test-connect');// 测试连接按钮
    const backToConfigBtn = document.getElementById('gotomain');   // 返回配置页面按钮（实际打开抽屉菜单）
    const title = document.getElementById('info');                 // 聊天视图标题（显示当前智能体名称）
    const sendMsgBtn = document.getElementById('send');            // 发送消息按钮
    // 聊天相关元素
    const messageList = document.getElementById('message-list');   // 消息列表容器
    const messageInput = document.getElementById('input-message'); // 消息输入框

    // 初始化消息模板（克隆第一个消息框作为模板，用于动态生成新消息）
    const messageBoxTemplate = messageList.firstElementChild;

    const drawer = document.getElementById('drawer');          // 侧边抽屉菜单
    const characterList = drawer.querySelector('ul#character-list');  // 智能体列表容器

    // ============================ 数据初始化区 ============================
    /**
     * 从本地存储加载配置数据，无数据时使用默认值
     * 数据结构包含：最后使用的聊天ID、所有智能体配置（含消息历史）
     */
    const data = await storage.getItem('chat-data') || {
        lastChatId: 1778219422521,
        characters: {
            1778219422521: {
                "id": 1778219422521,
                "name": "默认助手",
                "api": "http://127.0.0.1:11434/v1/",      // 默认Ollama API地址
                "key": "none",
                "model": "DeepSeek-R1-Distill-Qwen-8B-Q4_K_M",
                "prompt": "你是默认助手",
                "branch": []                              // 历史消息记录
            }
        }
    };

    if (!data.characters) {
        data.characters = data.agents;
        delete data.agents;
    }

    let autoScroll = true;

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

    /**
     * 消息框类：管理单条消息的DOM操作、推理内容、回复内容的流式更新
     * @param {Object} message - 消息对象（包含role、content等）
     * @param {number} index - 消息在UI中的索引
     */
    class MessageBox {
        constructor(message, index) {
            // 缓存常用子元素，提高性能
            this.message = message;
            this.index = index;
            // 记录开始推理的时间戳（毫秒）
            this.thinkStartTime = performance.now();
            // 内容缓存数组（流式累加）
            this.reasoningContent = [message.reasoner];
            this.messageContent = [message.content];
        }

        // 设置token用量信息（保存到DOM元素的自定义属性）
        setUsage(usage) {
            this.message.usage = usage;
        }

        // 添加一段推理内容（reasoning），并更新UI
        addReasoningChunk(chunk) {
            if (!chunk) return;
            this.reasoningContent.push(chunk);
            const elapsed = ((performance.now() - this.thinkStartTime) / 1000).toFixed(2);
            this.message.state = `思考中…（${elapsed}秒）`;
            this.message.reasoner = this.getReasoningChunk();

            vm_message.render(vm_message.activeItem, this.message, this.index);
        }

        // 添加一段回复内容（content），格式化后更新UI
        addContentChunk(chunk) {
            if (!chunk) return;
            this.messageContent.push(chunk);
            this.message.content = this.getContentChunk()
            vm_message.render(vm_message.activeItem, this.message, this.index);
        }

        // 获取完整的回复内容（字符串）
        getContentChunk() {
            return this.messageContent.join('');
        }

        // 获取完整的推理内容（字符串）
        getReasoningChunk() {
            return this.reasoningContent.join('');
        }

        // 标记消息完成：更新状态为“已完成（X秒）”
        done() {
            const elapsed = ((performance.now() - this.thinkStartTime) / 1000).toFixed(2);
            this.message.state = `已完成（${elapsed}秒）`;
            vm_message.render(vm_message.activeItem, this.message, this.index);
        }
    }

    // AI请求体配置（默认启用流式响应）
    const aiRequestConfig = {
        "model": 'gpt-3.5-turbo',
        "stream": true,          // 启用流式传输，实现逐字输出效果
        "temperature": 0.8,
        // "extra_body": { "thinking": { "type": "disabled" } },
        "messages": []           // 待填充的消息列表
    };
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        "Authorization": ''
    };

    const vm_message = PuSet.ViewManager({
        target: messageList,
        selector: ":scope>div.chat-message-output-box",
        activeItem: null,
        data: [],
        onresize(s, l) {
            this.activeItem = s.children[l - 1];
        },
        render(box, message, index) {
            // 计算当前消息在分支组中的位置，更新切换按钮文本
            if (index > 0) {
                const group = this.data[index - 1].branch;
                const v = 1 + group.indexOf(message);
                const max = group.length;
                box.querySelector('button[name=select]').textContent = `${v}/${max}`;
            }

            box.querySelector('.state').textContent = message.state || "已完成";
            box.querySelector('.think').textContent = message.reasoner;
            box.querySelector('.message').innerHTML = EscapeSequenceHTML.escape(message.content)
                .replace(/\n|\r\n/g, '<br>')
                .replace(/(\uff08[^\uff09]*\uff09)|(\([^\)]*\))/g, '<span class="dd">$1</span>');
            const target = this.target;
            if (autoScroll) {
                target.scrollTop = target.scrollHeight; // 自动滚动到底部
            }
        },
        layout(box, message, index) {
            this.activeItem = box;
            box.dataset.index = index;
            box.dataset.persona = message.role;

            this.render(box, message, index);
        }
    });

    const messages = vm_message.data;
    // 初始化消息队列（用于组装AI请求体）
    let character, api;       // 当前智能体对象、拼接后的API URL

    // ============================ 核心函数定义区 ============================

    /**
     * 自定义模态对话框（使用 <dialog> 元素）
     * @param {string} message - 提示消息
     * @param {...string} bts - 按钮文本（可多个）
     * @returns {Promise<{index:number, value:string}>} 返回点击按钮的索引及输入框的值
     */
    function showModalDialog(message, ...bts) {
        const container = document.createElement('dialog');
        container.className = "unselect";
        container.style.border = 'none';
        container.style.borderRadius = '0.6rem';

        const promise = new Promise((resolve) => {
            // 创建内容容器
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
            messageDiv.style.setProperty('text-justify', 'inter-character');

            const input = document.createElement('input');
            input.className = 'hide';
            input.style.marginTop = '1rem';
            input.placeholder = '在此处输入';

            // 如果message是布尔类型，说明是带输入框的对话框
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

            bts.forEach(function (str, index) {
                const button = document.createElement('button');
                button.textContent = str;
                Object.assign(button.style, buttonStyle, index === 0 ? {
                    backgroundColor: '#1890ff',
                    color: '#fff'
                } : {
                    backgroundColor: '#d1d1d1',
                    color: '#333'
                });
                button.addEventListener('click', () => {
                    resolve({ index: index, value: input.value });
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

    /**
     * 优化历史记录搜索（根据名称列表筛选匹配的字符串）
     * 当前代码中未使用，可能用于未来功能（如角色昵称替换）
     * @param {Object} history - 键值对对象
     * @param {Array} names - 名称数组
     * @returns {Array} 匹配的结果数组
     */
    function optimizeHistory(history, names) {
        const result = [];
        if (!history || !Array.isArray(names) || names.length === 0) return result;
        const matchReg = new RegExp(names.join('|'));
        for (const d in history) {
            const arr = history[d];
            const len = arr.length;
            for (let i = 0; i < len; i++) {
                const s = arr[i];
                if (matchReg.test(s)) {
                    result.push(d + s);
                }
            }
        }
        return result;
    }

    // 时间格式化相关常量表
    const PERIODS_BY_HOUR = [
        "深夜", "深夜", "深夜", "深夜", "深夜", "深夜",
        "上午", "上午", "上午", "上午", "上午", "上午",
        "下午", "下午", "下午", "下午", "下午", "下午",
        "夜晚", "夜晚", "夜晚", "夜晚", "深夜", "深夜"
    ];
    const SEASON_MAP = ['冬', '春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬', '冬'];
    const WEEK_MAP = ['日', '一', '二', '三', '四', '五', '六'];

    /**
     * 格式化日期为中文描述（如“2024年春 3月15日 下午3时30分 星期五”）
     * 当前未使用，可能用于消息时间戳
     */
    function formatDate(targetDate = new Date()) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const date = targetDate.getDate();
        const hours = targetDate.getHours();
        const minutes = targetDate.getMinutes();
        const day = targetDate.getDay();
        const timeStr = `${hours}时${minutes}分`;
        const season = SEASON_MAP[month];
        const week = WEEK_MAP[day];
        const period = PERIODS_BY_HOUR[hours];
        return `${year}年${season} ${month + 1}月${date}日 ${period}${timeStr} 星期${week}`;
    }

    /**
     * 更新系统提示词（当前直接返回原消息，预留扩展）
     */
    function updateSystemPrompt(message) {

        message.content = message.content + `
---
SYSTEM CONTEXT:
- date：${formatDate()}
`;
    }

    /**
     * 将内部messages数组转换为AI API所需的格式，并序列化为JSON字符串
     * @param {Array} messages - 内部消息数组
     * @returns {string} JSON字符串
     */
    function messagePurifying(messages) {
        aiRequestConfig.messages = messages.map(m => ({ "role": m.role, "content": m.content }));
        updateSystemPrompt(aiRequestConfig.messages.at(-1))
        return JSON.stringify(aiRequestConfig);
    }

    /**
     * 添加一条消息到消息列表（用户或助手）
     * @param {string} role - 'user' 或 'assistant'
     * @param {string} inputContent - 消息内容
     */
    function addMessage(role, inputContent) {
        const index = messages.length;
        const last = index - 1;

        if (last < 0) {
            throw new SyntaxError("未选择智能体");
        }

        // 将之前最后一条消息中的所有分支标记为非主分支
        const group = messages.at(last).branch;
        group.forEach(item => item.main = false);

        const message = {
            role: role,
            main: true,
            reasoner: '',
            content: inputContent,
            branch: []
        };
        group.push(message);
        messages.push(message);
        return new MessageBox(message, index);
    }

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
                    const index = buffer.indexOf("\n");
                    if (index >= 0) {
                        const message = buffer.slice(0, index);
                        buffer = buffer.slice(index + 1);
                        return { value: message, done: false };
                    }
                    const { done, value } = await reader.read();
                    if (done) {
                        if (buffer.length > 0) {
                            const message = buffer;
                            buffer = '';
                            return { value: message, done: false };
                        }
                        return { value: buffer, done: true };
                    } else {
                        buffer += decoder.decode(value, { stream: true });
                        return next();
                    }
                }
            };
        }
    }

    /**
     * 核心发送函数：构造请求，发起fetch流式调用
     */
    function send() {
        const abortController = new AbortController();
        sendMessage.reasoning = abortController;   // 标记推理中，并保存中止控制器

        /** @type {MessageBox} */
        const body = messagePurifying(messages);               // 收集信息
        const assistantBox = addMessage('assistant', '');      // 收集信息后创建助手回复消息框，否则会收集到空助手回复;
        autoScroll = true;
        sendMsgBtn.name = 'stop';

        fetch(api, {
            method: 'POST',
            headers: headers,
            body: body,
            signal: abortController.signal
        }).then(async function readStream(response) {
            for await (const line of new ReadStreamLine(response)) {
                if (!line) { continue }
                const arr = line.match(r_sse_data);
                if (arr === null) continue;
                const trimmedLine = arr[1]
                if (trimmedLine === "[DONE]") break;

                const data = JSON.parse(trimmedLine);
                const choic = data.choices[0];
                const delta = choic.delta;

                // 处理推理内容（reasoning/reasoning_content）
                const reasoning = delta.reasoning || delta.reasoning_content;
                if (reasoning) {
                    assistantBox.addReasoningChunk(reasoning);
                }

                const content = delta.content;
                if (content) {
                    assistantBox.addContentChunk(content);
                }

                if (choic.finish_reason === "stop") {
                    assistantBox.setUsage(data.usage);
                }
            }
        }).catch(function (e) {
            assistantBox.addContentChunk(`[${e.name}]: ${e.message}`);
        }).finally(function endChat() {
            sendMessage.reasoning = false;
            assistantBox.done();
            sendMsgBtn.name = 'send';
            storage.setItem('chat-data', data);
        });
    }



    /**
     * 发送消息的入口函数（处理防重复、获取输入、调用send）
     */
    function sendMessage() {
        // 如果正在推理，则中止当前请求（实现“停止生成”功能）
        if (sendMessage.reasoning) {
            sendMessage.reasoning.abort();
            sendMessage.reasoning = false;
            return;
        }

        const inputContent = messageInput.value.trim();
        messageInput.value = '';

        if (inputContent) {
            try {
                addMessage('user', inputContent);
                send();
            } catch (e) {
                showModalDialog(e.message, "确认")
            }
        }
    }

    /**
     * 递归初始化消息列表：根据消息链表结构渲染所有历史消息
     * @param {Array} m - 消息链表（当前智能体的messages数组）
     */
    function initMessageList(m) {
        let current = m;
        let index = messages.length;
        while (current && current.length > 0) {
            // 优先获取标记为 main 的消息，否则取最后一条
            const message = current.find(msg => msg.main) || current[current.length - 1];
            message.main = true;   // 确保标记为主分支
            messages.push(message);   // 存入全局messages数组

            // 继续处理下一组分支消息
            current = message.branch;
            index++;
        }
    }

    /**
     * 拼接URL：去除base末尾的斜杠和path开头的斜杠，确保不会出现双斜杠
     * @param {string} base - 基础URL
     * @param {string} path - 路径
     * @returns {string} 拼接后的完整URL
     */
    function urlConcat(base, path) {
        return String(base).replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
    }

    /**
     * 初始化或切换智能体：加载其配置、历史消息并渲染聊天界面
     * @param {Object} value - 智能体配置对象
     */
    function initAgent(value) {
        if (value) {
            character = value;
            api = urlConcat(character.api, "chat/completions");     // 拼接完整的API endpoint
            title.textContent = `与${character.name}的对话`;          // 更新页面标题
            aiRequestConfig.model = character.model;
            headers.Authorization = `Bearer ${character.key}`;
            // 构建消息链表：系统指令位于索引0，其branch指向历史消息数组
            messages[0] = { "role": "system", "content": character.prompt, branch: character.branch };
            messages.length = 1;
            initMessageList(character.branch);   // 渲染历史消息
            data.lastChatId = character.id;         // 记录最后使用的智能体
        } else {
            title.textContent = `未选择智能体`;          // 更新页面标题
            messages.length = 0;
        }

        PuSet.show(drawer, false);    // 关闭侧边菜单
    }

    // 3. 获取 DOM 元素（提前缓存，避免重复查询）
    const apiSelect = document.getElementById('api-url-list');
    const keySelect = document.getElementById('api-key-list');

    function buildDataList() {
        const apis = new Set(['https://api.deepseek.com/', 'https://api.openai.com/v1/']);
        const keys = new Set(['none']);

        Object.values(data.characters).forEach(a => {
            a?.api && apis.add(a.api);
            a?.key && keys.add(a.key);
        });

        apiSelect.innerHTML = '';
        keySelect.innerHTML = '';

        apis.forEach(v => apiSelect.appendChild(new Option(v, v)));
        keys.forEach(v => keySelect.appendChild(new Option(v, v)));
    }


    // 初始化默认智能体（根据存储的最后使用ID）
    initAgent(data.characters[data.lastChatId]);

    // 智能体列表视图管理器（基于PuSet库，负责渲染列表及响应点击）
    const vm_characters = PuSet.ViewManager({
        target: characterList,
        selector: 'li',
        data: Object.keys(data.characters),
        bt_edit(character) {
            // 将智能体数据填充到配置表单，并切换到配置视图
            loginView.dataset.character_id = character.id;
            characterName.value = character.name;
            apiUrlInput.value = character.api;
            apiKeyInput.value = character.key;
            // modelSelect.value = value.model;
            characterPrompt.value = character.prompt;
            buildDataList();
            PuSet.show(loginView, true);
        },
        bt_delete(character) {
            showModalDialog('确定要删除智能体【' + character.name + '】吗？\n包括与此智能体的所有对话记录。',
                '确认', '取消').then((result) => {
                    if (result.index === 0) {   // 确认删除
                        if (Reflect.deleteProperty(data.characters, character.id)) {
                            vm_characters.update(Object.keys(data.characters));
                            storage.setItem('chat-data', data); // 持久化
                            if (character.id === data.lastChatId) {
                                initAgent(null);
                            }
                        } else {
                            showModalDialog('删除失败！', '确认');
                        }
                    }
                });
        },
        layout(li, id) {
            li.querySelector('span.name').textContent = data.characters[id].name;
        }
    }).on('click', function (e, id) {
        // 如果点击的是按钮（编辑/删除），执行对应操作
        if (e.target.tagName === 'BUTTON') {
            vm_characters['bt_' + e.target.name]?.(data.characters[id]);
        } else {
            // 非按钮点击：切换智能体
            initAgent(data.characters[id]);
        }
    });

    // ============================ 事件绑定区 ============================

    // 返回配置页面按钮（实际打开抽屉菜单）
    backToConfigBtn.addEventListener('click', function () {
        PuSet.show(drawer, true);
    });
    // 点击抽屉遮罩关闭菜单
    drawer.addEventListener('click', function (ev) {
        if (this === ev.target) {
            PuSet.show(drawer, false);
        }
    });

    // 发送消息按钮点击事件
    sendMsgBtn.addEventListener('click', sendMessage);

    // 输入框按回车发送（阻止默认换行）
    messageInput.addEventListener('keypress', function (ev) {
        if (ev.key === "Enter" || ev.keyCode === 13) {
            ev.preventDefault();
            if (!sendMessage.reasoning) {   // 推理未进行中才发送
                sendMessage();
            }
        }
    });


    let editData = {};
    const content = document.getElementById('message-edit');
    const main = content.querySelector('.dialog-content');
    const content_edit = content.querySelector('textarea');
    PuSet(content).on('click', 'button', function (ev) {
        const inputContent = content_edit.value.trim();
        if (inputContent === '') {
            return;
        }
        const { button, parentBox, dataIndex, message } = editData;
        switch (this.name) {
            case 'save':
                message.content = inputContent;
                vm_message.render(parentBox, message, dataIndex);
                break;
            case 'submit': {
                messages.length = dataIndex;
                addMessage('user', inputContent);
                send();
                break;
            }
        }
        PuSet.show(content, false);
    });

    const messageButtonActions = {
        edit(button, parentBox, dataIndex) {
            const message = messages[dataIndex];
            editData = { button, parentBox, dataIndex, message };
            main.dataset.name = message.role;
            content_edit.value = message.content;
            PuSet.show(content, true);
        },
        _switchBranch(group, dataIndex, delta) {
            const i = group.findIndex(item => item.main);
            const max = group.length - 1;
            let l = i === -1 ? max : i;
            const need = l + delta;
            if (need < 0 || need > max) return; // 边界保护
            group.forEach((item, n) => item.main = n === need);
            messages.length = dataIndex;
            initMessageList(group);
        },
        previous(button, parentBox, dataIndex) {
            messageButtonActions._switchBranch(messages[dataIndex - 1].branch, dataIndex, -1);
        },
        next(button, parentBox, dataIndex) {
            messageButtonActions._switchBranch(messages[dataIndex - 1].branch, dataIndex, 1);
        },
        copy(button, parentBox, dataIndex) {
            navigator.clipboard.writeText(messages[dataIndex]?.content).then(function () {
                // TODO 显示复制成功提示
            }, function () {
                showModalDialog("复制失败，请手动复制", "确认");
            });
            return;
        },
        delete(button, parentBox, dataIndex) {
            // 删除当前消息及之后所有消息
            showModalDialog("将删除此消息及之后所有最新消息", "确认", "取消").then(function (result) {
                if (result.index != 0) return;
                const role = parentBox.dataset.persona;

                messages.length = dataIndex;
                let m = messages.at(dataIndex - 1).branch;

                if (m.length === 1 && role === 'assistant') {
                    // 最后一条助手消息分支，连带删除上一级用户消息
                    messages.length = dataIndex - 1;
                    m = messages.at(dataIndex - 2).branch;
                }

                const start = m.findIndex(item => item.main);
                if (start >= 0) {
                    if (m.length > 1) {
                        m[Math.min(start + 1, m.length - 1)].main = true;
                    }
                    m.splice(start, 1);
                }

                initMessageList(m);                 // 重新渲染剩余消息
                storage.setItem('chat-data', data); // 持久化
            });
            return;
        },
        remake(button, parentBox, dataIndex) {
            // 重新生成：截断消息至此，再次发送用户消息
            if (sendMessage.reasoning) return;
            messages.length = dataIndex;
            send();
            return;
        },
        usage(button, parentBox, dataIndex) {
            // 显示token用量详情
            showModalDialog(JSON.stringify(messages?.[dataIndex]?.usage || {}, null, 2), "确认");
        }
    };

    /**
     * 消息列表中的按钮点击处理（复制、删除、重试、用量）
     * 利用事件委托（PuSet库封装）监听动态生成的消息按钮
     */
    PuSet(messageList).on("click", "button", function (ev) {
        const action = messageButtonActions[this.name];
        if (!action) return;

        const parentBox = this.closest(".chat-message-output-box");
        const dataIndex = Number(parentBox.dataset.index);

        action(this, parentBox, dataIndex);
    }).on('scroll', function (ev) {
        autoScroll = false;
    });

    // 保存配置并进入聊天
    saveConfigBtn.addEventListener("click", function () {
        const config = Object.assign({
            "id": String(Date.now()),
            "branch": []
        }, data.characters[loginView.dataset.character_id], {
            "name": characterName.value,
            "api": apiUrlInput.value,
            "key": apiKeyInput.value,
            "model": modelSelect.value,
            "prompt": characterPrompt.value
        });
        if (config.api === "") {
            return showModalDialog("请填写API地址", "确认");
        }
        if (config.model === "") {
            return showModalDialog("请选择模型", "确认");
        }
        data.characters[config.id] = config;
        initAgent(config);
        PuSet.show(loginView, false);
        storage.setItem('chat-data', data);
        vm_characters.update(Object.keys(data.characters));
    });

    document.getElementById('current').addEventListener("click", function () {
        showModalDialog(JSON.stringify(data.characters[data.lastChatId], null, 2), "确认")
    })

    // 取消编辑，关闭配置视图
    document.getElementById("exit-edit").addEventListener("click", function () {
        PuSet.show(loginView, false);
    });

    // 添加新智能体：重置表单，打开配置视图
    document.getElementById("add-character").addEventListener("click", function () {
        loginView.reset();
        loginView.dataset.character_id = '';
        buildDataList();
        PuSet.show(loginView, true);
    });

    // 测试连接：获取模型列表并填充下拉框
    testConnectBtn.addEventListener("click", async function () {
        try {
            const baseUrl = apiUrlInput.value.trim();
            if (!baseUrl) {
                return showModalDialog("请填写API地址", "确认");
            }

            // 发送请求（纯 await 写法）
            const response = await fetch(urlConcat(baseUrl, "models"), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKeyInput.value.trim()}`
                }
            });

            // 解析返回数据
            const modelList = await response.json();

            // 填充下拉框
            apiUrlInput.value = baseUrl;
            modelSelect.length = 0;
            modelList.data.forEach((modelObj) => {
                const id = String(modelObj.id);
                modelSelect.appendChild(new Option(id, id));
            });

            // 启用按钮
            saveConfigBtn.disabled = false;
            modelSelect.disabled = false;

        } catch (e) {
            // 统一捕获所有异常
            showModalDialog(`测试失败：${e.message}`, "确认");
        }
    });
});