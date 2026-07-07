/**
 * AI聊天应用初始化入口
 * 功能：初始化本地存储、加载配置、绑定交互事件、处理AI对话流
 * 修复版：修复自动滚动、递归发送、删除逻辑、超时控制等问题
 */
Promise.resolve(StorageHelper.open({ name: 'ai-chat' })).then(async function getStorageValue(storage) {
    "use strict";

    const mimejson = 'application/json';
    const BUTTON = "button";

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
                        reject(new Error("请求失败"))
                    }
                }
            };
            xhr.send();
        });
    }

    // ============================================================
    // 世界书（大白）核心引擎 —— OpenAI Function Calling
    // 维护者：李乾（主人）
    // 说明：这个世界里一切"被记录的存在"，都由这段代码在背后撑着
    // ============================================================
    // ========================
    // Ⅰ. 时间与日期工具（常量与格式化）
    // ========================

    /** 按小时划分时段 */
    const PERIODS_BY_HOUR = [
        "深夜", "深夜", "深夜", "凌晨", "凌晨", "凌晨",
        "上午", "上午", "上午", "上午", "上午", "中午",
        "中午", "中午", "下午", "下午", "下午", "下午",
        "傍晚", "傍晚", "夜晚", "夜晚", "夜晚", "深夜"
    ];
    /** 月份 → 季节映射 */
    const SEASON_MAP = ['冬', '春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬', '冬'];
    /** 星期几映射 */
    const WEEK_MAP = ['日', '一', '二', '三', '四', '五', '六'];

    const reservedWords = new Set(["book-index", "current-datetime", "user-profile", "user-cosplay", "self-profile"]);


    function promisify(options) {
        const pending = new Map();
        let index = 0;

        options.asyncMessage = function (code, status, data) {
            const entry = pending.get(code);
            if (!entry) return;
            pending.delete(code);
            clearTimeout(entry.timer);
            status === 'error' ? entry.reject(new Error(data)) : entry.resolve(data);
        };

        return new Proxy(options, {
            get(target, property, receiver) {
                return function (...args) {
                    let resolve, reject;
                    const promise = new Promise((a, b) => void (resolve = a, reject = b));
                    const value = Reflect.get(target, property, receiver);
                    if (typeof value === "function") {
                        try {
                            const code = index++;
                            const timer = setTimeout(() => reject(new Error('任务超时')), 10 * 60 * 1000);
                            pending.set(code, { promise, resolve, reject, timer });

                            // 与Java通信，必须参数数量和类型一致，否则找不到方法
                            const nntw = value.call(target, code, ...args); // boolean: no need to wait
                            if (nntw) {
                                clearTimeout(timer);
                                resolve(nntw);
                            }
                        } catch (e) {
                            reject(e)
                        }
                    } else {
                        if (args.length === 0) {
                            resolve(value)
                        } else {
                            // 调用函数但不存在函数
                            reject(new Error(`应用层功能出错`))
                        }
                    }
                    return promise;
                }
            }
        })
    }

    /**
     * 格式化日期时间为中文友好字符串
     * @param {Date} [targetDate=new Date()] - 要格式化的日期对象
     * @returns {string} 例如 "2026年夏 6月14日 中午12时30分 星期日"
     */
    function formatDate(targetDate = new Date()) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const date = targetDate.getDate();
        const hours = targetDate.getHours();
        const minutes = targetDate.getMinutes();
        const day = targetDate.getDay();

        const season = SEASON_MAP[month];
        const period = PERIODS_BY_HOUR[hours];
        const timeStr = `${hours}时${minutes}分`;
        const week = WEEK_MAP[day];

        return `${year}年${season} ${month + 1}月${date}日 ${period}${timeStr} 星期${week}`;
    }

    /**
     * 信息条目类（世界书的基本存储单元）
     */
    class Information {
        constructor(uuid) {
            this.key = uuid;
            this.summary = "";         // 词条简要概括，供目录和快速浏览使用
            this.information = "";     // 正文内容，Markdown 格式
            this.tags = null;          // 标签，用于搜索和分类
            this.associated = [];      // 存储关联的其他词条的 key
            this.created_at = formatDate();
            this.updated_at = this.created_at;   // 最后更新*正文*的时间
        }
    }

    // ========================
    // Ⅱ. 内部辅助函数
    // ========================

    /**
     * 为两个词条建立双向关联（内部使用）
     * @param {Object} infoA - 词条 A 的对象
     * @param {Object} infoB - 词条 B 的对象
     */
    function addBidirectionalAssociation(infoA, infoB) {
        PuSet.ensureObjectProperty(infoA, "associated", Array);
        PuSet.ensureObjectProperty(infoB, "associated", Array);
        if (!infoA.associated.includes(infoB.key)) infoA.associated.push(infoB.key);
        if (!infoB.associated.includes(infoA.key)) infoB.associated.push(infoA.key);
    }

    if (!window.DaBaiFunctionCalling) {
        window.DaBaiFunctionCalling = {};
    }

    const AndroidObject = promisify(window.DaBaiFunctionCalling);



    // ========================
    // Ⅲ. 工具调用分发器（核心调度）
    // ========================


    const OpenAIFunctionCalling = {

        /**
         * 处理 OpenAI 返回的 tool_calls，依次执行并记录结果
         * @param {Object} assistantBox - 辅助对象
         */
        async handleToolCalls(assistantBox) {
            const tool_calls = assistantBox.tool_calls;
            for (const toolCall of tool_calls) {
                if (toolCall.type !== "function") continue;

                const { name, arguments: argsStr } = toolCall.function;
                if (!Object.prototype.hasOwnProperty.call(OpenAIFunctionCalling, name)) {
                    console.warn(`未知函数调用: ${name}`);
                    continue;
                }

                let args;
                try {
                    args = JSON.parse(argsStr);
                } catch (e) {
                    console.error(`解析参数失败: ${argsStr}`, e);
                    continue;
                }

                const fn = OpenAIFunctionCalling[name];
                let result;
                try {
                    result = fn(data, informations, args);
                    if (result instanceof Promise) {
                        result = await result;
                    }
                } catch (err) {
                    result = { error: err.message };
                }

                const toolResponse = {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    branch: [],
                    content: typeof result === "object" ? JSON.stringify(result, null, 4) : String(result)
                };

                const lastAssistantMsg = messages.at(-1);
                if (lastAssistantMsg) {
                    lastAssistantMsg.branch.push(toolResponse);
                }
                messages.push(toolResponse);
            }
        },

        async open_browser(data, informations, args) {
            if (!currentAgentConfig.settings["use-browser"]) {
                return { "message": "用户已禁用" };
            }
            await AndroidObject.openWebView(String(args.url));
            await new Promise(resolve => setTimeout(resolve, 2000));
            return { "message": "已打开浏览器" };
        },

        get_browser_content(data, informations, args) {
            if (!currentAgentConfig.settings["use-browser"]) {
                return { "message": "用户已禁用" }
            }
            if (args.type === "text") {
                return AndroidObject.getWebViewTEXT(args.selector);
            } else {
                return AndroidObject.getWebViewHTML(args.selector);
            }
        },

        close_browser() {
            return AndroidObject.closeWebView(true);
        },

        // ========================
        // Ⅳ. 实际工具函数
        // ========================

        /**
         * 获取真实世界天气（带缓存）
         * @param {Object} data - 全局数据对象
         * @param {Object} informations - 信息库（未使用）
         * @param {Object} args - { province, city, county, type }
         * @returns {Promise<Object>} 天气数据
         */
        async query_weather(data, informations, args) {
            const { province, city, county = '', type } = args;
            if (!province || !city || !type) {
                return Promise.resolve({ error: "缺少省份、城市或天气类型参数" });
            }

            let cached = storage?.getItem?.("weather");

            if (cached &&
                cached.province === province &&
                cached.city === city &&
                cached.county === county &&
                cached.timestamp && (Date.now() - cached.timestamp) < 3 * 60 * 60 * 1000) {
                const value = cached.result?.data?.[type];
                if (value) {
                    return Promise.resolve(value);
                }
            }

            const responseText = await XMLHttpRequestGetTextPromise(`https://i.news.qq.com/weather/common?source=pc&weather_type=observe%7Cforecast_1h%7Cforecast_24h%7Cindex%7Calarm%7Climit%7Ctips%7Crise&province=${encodeURIComponent(province)}&city=${encodeURIComponent(city)}&county=${encodeURIComponent(county)}`);
            const result = JSON.parse(responseText);
            const weatherData = { province, city, county, timestamp: Date.now(), result };
            storage?.setItem?.("weather", weatherData);
            return (result.data?.[type] ?? { error: "未找到指定天气类型数据" });
        },

        /**
         * 创建或更新词条
         * @param {Object} data - 全局数据对象
         * @param {Object} informations - 信息库
         * @param {Object} args - { summary, information, key, tags }
         * @returns {Object}
         */
        save_information(data, informations, args) {
            try {
                const { summary, information, key, tags } = args;
                const isUpdate = key && (reservedWords.has(key) || informations.hasOwnProperty(key));
                const uuid = isUpdate ? key : crypto.randomUUID();

                if (uuid === "book-index") {
                    return { error: 'book-index 为保留键，不可写入' };
                }

                const obj = PuSet.ensureObjectProperty(informations, uuid, Information, uuid);

                if (summary) obj.summary = summary;
                if (information) obj.information = information;
                if (tags && Array.isArray(tags)) {
                    obj.tags = tags.map(t => t.toLowerCase());
                }
                if (isUpdate) {
                    obj.updated_at = formatDate();
                }

                return { message: `已${isUpdate ? "更新" : "创建"}词条到 key='${uuid}'` };
            } catch (err) {
                return { error: err.message };
            }
        },

        /**
         * 按 key 查询词条详细信息（返回格式化字符串）
         * @param {Object} data - 全局数据对象
         * @param {Object} informations - 信息库
         * @param {Object} args - { keys }
         * @returns {string} 多个词条用 '---\n' 分隔
         */
        query_information_by_key(data, informations, args) {
            const results = [];
            const keys = args.keys || [];

            for (const key of keys) {
                const infoObj = informations?.[key];
                if (infoObj && infoObj.information) {
                    results.push(`**${key}**\n${infoObj.information}`);
                } else {
                    switch (key) {
                        case "book-index":
                            results.push(`**${key}**\n${Object.values(informations).map(entry => `${entry.key}：${entry.summary}`).join('\n')}`);
                            break;
                        case "current-datetime":
                            results.push(`**${key}**\n${formatDate()}`);
                            break;
                        default:
                            results.push(`**${key}**\nabsent`);
                    }
                }
            }
            return results.join('\n\n---\n\n');
        },

        /**
         * 建立词条之间的双向关联（可同时关联多个词条）
         * @param {Object} data - 全局数据对象（未使用）
         * @param {Object} informations - 信息库
         * @param {Object} args - { keys }
         * @returns {Object}
         */
        associate_information(data, informations, args) {
            const keys = args.keys || [];
            if (keys.length < 2) {
                return { error: "至少需要两个词条的 key 才能建立关联" };
            }

            // 过滤出实际存在的词条
            const existingKeys = keys.filter(k => informations.hasOwnProperty(k));
            if (existingKeys.length < 2) {
                return { error: "至少需要两个存在的词条才能建立关联" };
            }

            // 获取所有存在的词条对象
            const items = existingKeys.map(k => informations[k]);

            // 为每对词条建立双向关联（去重）
            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    addBidirectionalAssociation(items[i], items[j]);
                }
            }

            return {
                message: `成功建立互相关联`
            };
        },

        /**
         * 查询指定词条的所有关联词条（返回摘要列表）
         * @param {Object} data - 全局数据对象（未使用）
         * @param {Object} informations - 信息库
         * @param {Object} args - { key }
         * @returns {string} 每行格式 "key summary"
         */
        query_associated(data, informations, args) {
            const targetKey = args.key;
            if (!targetKey) return '';
            const info = informations?.[targetKey];
            if (!info || !Array.isArray(info.associated) || info.associated.length === 0) {
                return '';
            }
            const lines = [];
            for (const assocKey of info.associated) {
                const assocInfo = informations[assocKey];
                if (assocInfo) {
                    lines.push(`${assocKey} ${assocInfo.summary || '(无摘要)'}`);
                } else {
                    lines.push(`${assocKey} (词条已删除)`);
                }
            }
            return lines.join('\n');
        },

        /**
         * 全文检索（摘要/内容/标签）
         * @param {Object} data - 全局数据对象（未使用）
         * @param {Object} informations - 信息库
         * @param {Object} args - { keyword }
         * @returns {Object} key → summary 的映射
         */
        query_information_by_keyword(data, informations, args) {
            const keywordsRaw = args.keyword || [];
            if (keywordsRaw.length === 0) return {};

            const keywordsSet = new Set(keywordsRaw.map(k => k.toLowerCase()));
            const keywords = Array.from(keywordsSet);
            // 避免空正则或过长正则（原逻辑保持，性能可接受）
            const regex = new RegExp(keywords.join('|'), "i");
            const result = {};

            for (const [key, obj] of Object.entries(informations)) {
                const summaryMatch = regex.test(obj.summary);
                const infoMatch = regex.test(obj.information);
                const tagMatch = obj.tags?.some(tag => keywordsSet.has(tag)) || false;

                if (summaryMatch || infoMatch || tagMatch) {
                    result[key] = obj.summary;
                }
            }
            return result;
        },

        /**
         * 删除词条（不可逆，需谨慎）
         * @param {Object} data - 全局数据对象
         * @param {Object} informations - 信息库
         * @param {Object} args - { keys }
         * @returns {Object}
         */
        delete_information(data, informations, args) {
            const result = {};
            const keys = args.keys || [];

            const hasOwnProperty = Object.prototype.hasOwnProperty;

            for (const key of keys) {
                if (key === "book-index") {
                    result[key] = 'readonly';
                    continue;
                }

                // 1. 先从其他词条的 associated 数组中移除该 key
                for (const otherKey in informations) {
                    const other = informations[otherKey];
                    if (other.associated && other.associated.includes(key)) {
                        other.associated = other.associated.filter(k => k !== key);
                    }
                }

                // 2. 删除词条本身
                result[key] = `从世界书移除${hasOwnProperty.call(informations, key) ? Reflect.deleteProperty(informations, key) ? "成功" : "失败" : "不存在"}`;
            }
            return result;
        },

        // ========================
        // Ⅴ. OpenAI Function Calling 工具定义
        // ========================

        tools: [
            {
                type: "function",
                function: {
                    name: "query_information_by_key",
                    description: "【基础查询】按存储键名（key）查询词条的详细信息。支持特殊键：book-index（返回全局目录）、current-datetime（返回当前时间）",
                    parameters: {
                        type: "object",
                        properties: {
                            keys: {
                                type: "array",
                                description: "需要查询的词条键名数组，可同时查询多个",
                                items: { type: "string" }
                            }
                        },
                        required: ["keys"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "query_information_by_keyword",
                    description: "【全文检索】根据关键词搜索世界书中的词条。支持多关键词匹配，会同时检索摘要、详细信息和标签字段。适合查找不确定具体key但记得相关内容的词条。",
                    parameters: {
                        type: "object",
                        properties: {
                            keyword: {
                                type: "array",
                                description: "搜索关键词数组，支持同时输入多个相关词汇进行匹配。系统会自动进行不区分大小写的模糊匹配",
                                items: { type: "string" },
                                minItems: 1
                            }
                        },
                        required: ["keyword"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "query_weather",
                    description: "【真实世界天气查询】获取指定省市区的实时天气信息。参数示例：province='广东省', city='深圳市', county='南山区'",
                    parameters: {
                        type: "object",
                        properties: {
                            province: { type: "string", description: "省份名称" },
                            city: { type: "string", description: "城市名称" },
                            county: { type: "string", description: "区县名称，可忽略或传空字符串表示查询市级天气" },
                            type: {
                                type: "string",
                                description: "天气类型，observe=实况天气，forecast_1h=1小时预报，forecast_24h=24小时预报，rise=日出日落",
                                enum: ["observe", "forecast_1h", "forecast_24h", "rise"]
                            }
                        },
                        required: ["province", "city", "type"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "save_information",
                    description: "【创建/更新词条】保存或修改一个词条。更新某一条属性其他属性保持不变时，可只传入key和要更新的属性，不必传入相同的属性。",
                    parameters: {
                        type: "object",
                        properties: {
                            summary: { type: "string", description: "一句话概括此文档，以主体名开头，例如：“张三的基础信息”、“飞机的定义及常见类型”" },
                            information: { type: "string", description: "维护为 Markdown 文档，记录词条的详细信息" },
                            key: { type: "string", description: "创建时不传key，会自动生成UUID；更新时必须传入原key。" },
                            tags: { type: "array", items: { type: "string" }, description: "标签数组，方便分类管理" }
                        },
                        required: []
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "associate_information",
                    description: "【建立关联】在多个词条之间建立双向关联（彼此互相关联）。常用于将相关概念、人物、事件等连接起来，便于知识图谱式查询。",
                    parameters: {
                        type: "object",
                        properties: {
                            keys: {
                                type: "array",
                                description: "需要互相关联的词条键名数组，至少需要2个",
                                items: { type: "string" },
                                minItems: 2
                            }
                        },
                        required: ["keys"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "query_associated",
                    description: "【查询关联】获取指定词条所关联的所有其他词条，返回每个关联词条的 key 和摘要。",
                    parameters: {
                        type: "object",
                        properties: {
                            key: {
                                type: "string",
                                description: "要查询关联关系的词条键名"
                            }
                        },
                        required: ["key"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "delete_information",
                    description: "【高危！删除词条】彻底删除一个或多个词条及相关索引。此操作不可逆！必须在删除前向用户获取最终确定。",
                    parameters: {
                        type: "object",
                        properties: {
                            keys: { type: "array", items: { type: "string" }, description: "需要删除的词条键名数组" }
                        },
                        required: ["keys"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "open_browser",
                    description: "调用浏览器打开网页",
                    parameters: {
                        type: "object",
                        properties: {
                            url: { type: "string", description: "网页链接，可以接受空字符串显示窗口，保持上次的页面" }
                        },
                        required: ["url"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_browser_content",
                    description: "读取已打开的网页的可视文档，常规读取文档使用这个工具",
                    parameters: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                description: "读取类型，可选值：text=innerTEXT、html=innerHTML",
                                enum: ["text", "html"]
                            },
                            selector: { type: "string", description: "CSS选择器，全局传`*`" }
                        },
                        required: ["type", "selector"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "close_browser",
                    description: "关闭浏览器窗口，完成对话前一定要关闭窗口，不然还得用户手动关闭",
                    parameters: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                }
            },
        ]
    };



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
        "apiList": {},
        "agents": {},
        "currentModel": "",
        "informations": {},
        "branch": []
    };

    // fix
    // Reflect.deleteProperty(data, 'book-index');
    // Reflect.deleteProperty(data.agents, '0');

    const saveData = function saveData() {
        storage.setItem('chat-data', data);
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

    const informations = PuSet.ensureObjectProperty(data, "informations", Object);
    const agents = PuSet.ensureObjectProperty(data, "agents", Object);
    const dabai = agents[0] ?? (agents[0] = {
        id: '0',
        name: "默认智能体（大白）",
        "settings": {
            thinking: true
        }
    });

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

            if (message.tool_calls) {
                box.classList.add('tool_calls');
                // box.querySelector('.chat-message-title').open = true;
            } else {
                box.classList.remove('tool_calls');
                // box.querySelector('.chat-message-title').open = false;
            }

            if (message.not_done) {
                const elapsed = ((performance.now() - message.thinkStartTime) / 1000).toFixed(2);
                message.state = `${s}（${elapsed}秒）`;
            }

            box.querySelector('.state').textContent = message.role === 'tool'
                ? '工具返回'
                : message.state;

            box.querySelector('.think').textContent = message.reasoner;
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

            box.querySelector('.chat-message-title').open = message.role !== 'user';
            box.querySelector('.state').textContent = message.state;

            this.render(box, message, index);
        }
    });

    const messages = vm_message.data;

    // ============================ 辅助函数 ============================

    class ModalDialog {
        constructor() {
            const container = document.createElement('dialog');
            container.className = 'unselect';
            container.style.border = 'none';
            container.style.borderRadius = '0.6rem';
            container.style.boxShadow = '0px 0px 5px #4f4b4b';

            const content = document.createElement('div');
            content.className = 'dialog-content-a flex-vertical';
            content.style.maxHeight = '80vh';
            content.style.maxWidth = '80vw';
            content.style.width = 'fit-content';
            content.style.borderRadius = '1rem';
            content.style.margin = '0';

            // 消息区
            const messageDiv = document.createElement('code');
            messageDiv.className = 'dialog-message';
            messageDiv.style.overflow = 'auto';
            messageDiv.style.whiteSpace = 'pre';

            // 输入框
            const input = document.createElement('input');
            input.className = 'dialog-input hide';
            input.style.marginTop = '1rem';
            input.style.padding = '6px 10px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';
            input.style.width = '100%';
            input.style.boxSizing = 'border-box';

            // 自由容器
            const customContainer = document.createElement('div');
            customContainer.className = 'dialog-custom flex-vertical';
            customContainer.style.lineHeight = '2rem';

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'dialog-buttons flex-horizontal place-center';
            buttonContainer.style.flexDirection = 'row-reverse';
            buttonContainer.style.gap = '1rem';
            buttonContainer.style.marginTop = '1rem';

            content.appendChild(messageDiv);
            content.appendChild(input);
            content.appendChild(customContainer);
            content.appendChild(buttonContainer);
            container.appendChild(content);

            this.template = container;
        }

        /**
         * 显示对话框
         * @param {string|object} options - 消息文本或配置对象
         * @param {...string} buttons - 按钮文本（兼容旧用法）
         * @returns {Promise<{which: number, value: any, selected: any[]}> & { close: Function }}
         */
        show(options, ...buttons) {
            // 参数归一化
            if (arguments.length > 1) {
                return this.show({ type: 'message', message: options, buttons });
            }
            // 默认配置
            const {
                type = 'message',
                message = '',
                duration = 2500,
                hit = '',
                list = [],
                progress = 0,   // 正常进度 0 ~ 1
                buttons: customButtons,
                placeholder = '在此输入'
            } = options;

            // 克隆新实例
            const container = this.template.cloneNode(true);
            const content = container.querySelector('.dialog-content-a');
            const messageEl = content.querySelector('.dialog-message');
            const inputEl = content.querySelector('.dialog-input');
            const customContainer = content.querySelector('.dialog-custom');
            const buttonContainer = content.querySelector('.dialog-buttons');

            // 设置消息
            const ss = messageEl.textContent = message || '';
            if (!ss.includes('\n')) {
                // 没有换行符则浏览器控制换行
                messageEl.style.textAlign = 'justify';
                messageEl.style.whiteSpace = 'pre-wrap';
            }

            // 重置状态
            inputEl.classList.add('hide');
            customContainer.innerHTML = '';
            customContainer.style.display = 'none';

            // 根据类型显示控件
            const typeLower = type.toLowerCase();
            switch (typeLower) {
                case 'input':
                case 'prompt':
                    inputEl.classList.remove('hide');
                    inputEl.value = hit;
                    inputEl.placeholder = placeholder;
                    break;
                case 'list':
                case 'check':
                case 'checkbox':
                    customContainer.style.display = 'block';
                    if (Array.isArray(list) && list.length) {
                        list.forEach((item) => {
                            const wrap = document.createElement('label');
                            const cb = document.createElement('input');
                            cb.type = 'checkbox';
                            cb.value = item.value !== undefined ? item.value : item.text || '';
                            cb.checked = !!item.checked;
                            const text = document.createTextNode(item.text || item.value || '');
                            wrap.appendChild(cb);
                            wrap.appendChild(text);
                            customContainer.appendChild(wrap);
                        });
                    } else {
                        // 无选项时显示提示
                        const empty = document.createElement('div');
                        empty.textContent = '（无选项）';
                        empty.style.color = '#999';
                        customContainer.appendChild(empty);
                    }
                    break;
                case 'toast':
                    // 无需额外控件
                    break;
                case "progress":
                    // 进度条类型
                    const progressBar = document.createElement('progress');
                    progressBar.className = 'dialog-progress';
                    progressBar.max = 1;
                    progressBar.value = Math.max(0, Math.min(progress, 1));
                    customContainer.appendChild(progressBar);
                    break;
                default:
                    // message / alert / confirm
                    break;
            }

            // 构建按钮
            buttonContainer.innerHTML = '';
            let btnList = customButtons;
            if (!btnList || !btnList.length) {
                if (['toast', 'progress'].includes(typeLower)) {
                    btnList = [];
                } else if (['input', 'prompt', 'list', 'check', 'checkbox'].includes(typeLower)) {
                    btnList = ['确定', '取消'];
                } else {
                    btnList = ['确定'];
                }
            }

            btnList.forEach((text, idx) => {
                const btn = document.createElement(BUTTON);
                btn.textContent = text;
                btn.dataset.idx = idx;
                const isPrimary = (typeLower !== 'toast' && idx === 0);
                Object.assign(btn.style, {
                    flex: 1,
                    padding: '8px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    minWidth: '80px',
                    backgroundColor: isPrimary ? '#1890ff' : '#d1d1d1',
                    color: isPrimary ? '#fff' : '#333'
                });
                buttonContainer.appendChild(btn);
            });

            // 创建并返回 Promise（附带 close 方法）
            let resolved = false;
            const promise = new Promise((resolve) => {

                if (!container.parentNode) {
                    document.body.appendChild(container);
                }

                // 按钮点击处理
                buttonContainer.addEventListener('click', (ev) => {
                    if (resolved) return;
                    resolved = true;
                    if (nodeName(ev.target, BUTTON)) {
                        const btn = ev.target;
                        const idx = parseInt(btn.dataset.idx, 10);
                        const value = inputEl.value;
                        const cbs = customContainer.querySelectorAll('input[type="checkbox"]');
                        const selected = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.value);
                        resolve({ which: idx, value, selected });
                        container.remove();
                    }
                });

                // Toast 自动关闭
                if (typeLower === 'toast' && btnList.length === 0) {
                    setTimeout(() => {
                        if (resolved) return;
                        resolved = true;
                        resolve({ which: -1, value: undefined, selected: null });
                        container.remove();
                    }, duration);
                }

                // 显示对话框
                if (typeLower === 'toast') {
                    container.show(); // 非模态
                    Object.assign(container.style, {
                        position: 'fixed',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: '9999',
                        background: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        padding: '12px 24px',
                        borderRadius: '8px'
                    });
                } else {
                    container.showModal();
                }

                // 保存 resolve 用于 close
                container._resolve = resolve;
            });

            // 挂载 close 方法
            promise.close = () => {
                if (resolved) return;
                resolved = true;
                if (container._resolve) {
                    container._resolve({ which: -1, value: undefined, selected: null });
                    container._resolve = null;
                }
                container.remove();
            };

            return promise;
        }
    }

    // 导出单例
    const modalDialog = new ModalDialog();

    // modalDialog.show({
    //     type: 'progress',
    //     progress: 0,
    //     message: '正在加载全局提示词…'
    // })


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
                    assistantBox.addToolCalls(tool_calls);
                    continue;
                }

                switch (choice.finish_reason) {
                    case "tool_calls": {
                        assistantBox.setToolCalls();
                        setTimeout(() => {
                            OpenAIFunctionCalling.handleToolCalls(assistantBox).then(callApi);
                        });
                        break;
                    }
                    case "length":
                        assistantBox.addContentChunk('[最大长度限制]');
                    case "stop":
                        assistantBox.setUsage(data.usage);
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
            addMessage('user', inputContent);
            autoScroll = true;
            callApi();
        } catch (e) {
            console.error(e)
            modalDialog.show('sendMessage' + e.message, "确定");
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

        // 同步开关状态
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

        if (nodeName(e.target, BUTTON)) {
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
        return Object.values(informations).sort((a, b) => b.summary.localeCompare(a.summary));
    }

    // 资料卡列表视图
    const vm_informations = PuSet.mvvm({
        target: characterList.querySelector('ul'),
        selector: 'li',
        data: getSortedCharacters(),
        layout(li, character) {
            li.querySelector('span.name').textContent = character.summary;
        }
    }).on('click', function (e, character) {
        if (nodeName(e.target, BUTTON)) {
            return modalDialog.show('确定要删除【' + character.summary + '】吗？', '确定', '取消').then((result) => {
                if (result.which != 0) return;
                OpenAIFunctionCalling.delete_information(data, informations, { keys: [character.key] });
                vm_informations.update(getSortedCharacters());
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

        if (value === dabai) return modalDialog.show("不可修改大白的提示词", "确定");

        if (nodeName(e.target, BUTTON)) {
            return modalDialog.show('确定要删除【' + value.name + '】吗？', '确定', '取消').then(result => {
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
                        }, informations[id] || {}, {
                            "summary": characterName.value,
                            "information": characterPrompt.value,
                            "tags": characterKeys.value.trim().split(/\s*,\s*|\s*\uff0c\s*/)
                        });
                        informations[config.key] = config;
                        vm_informations.update(getSortedCharacters());
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
                modalDialog.show('保存失败：' + e.message, "确定");
            }
        }
    }

    // ============================ 事件绑定 ============================

    // 保存资料卡配置
    document.getElementById('enter-chat').addEventListener("click", function () {
        aaa.save(loginView.dataset.type);
    });

    PuSet(characterList).add('#agent-list').on('click', '.subtitle button', function () {
        aaa.add(this.className);
    });

    document.getElementById('gotomain').addEventListener('click', () => {
        vm_informations.update(getSortedCharacters());
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
            // behavior: "smooth"
        });
    });
    document.getElementById('current').addEventListener("click", () => { });
    document.getElementById("exit-edit").addEventListener("click", () => PuSet.show(loginView, false));

    // 编辑历史消息
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
            }).catch(() => modalDialog.show("复制失败", "确定"));
        },
        delete(btn, parentBox, idx) {
            // 删除当前消息及之后所有消息
            modalDialog.show("将删除此消息及之后所有最新消息", "确定", "取消").then(function (result) {
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
            modalDialog.show(JSON.stringify(usage, null, 2), "确定");
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
        autoScroll = bottom.scrollTop >= bottom;
    });

    // 管理 API 设置
    const apiModal = document.getElementById('api-m');
    PuSet(apiModal).on("click", "button.login-btn", function () {
        if (this.name === "save") {
            const baseUrl = apiUrlInput.value.trim();
            const baseKey = apiKeyInput.value.trim();
            if (!baseUrl) return modalDialog.show("请填写API地址", "确定");
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
            }).catch(e => modalDialog.show(`测试链接失败：${e.message}`, "确定"));
            return;
        }
        PuSet.show(apiModal, false);
    });

    // 设置
    PuSet('.settings').on('click', 'button', function () {
        switch (this.name) {
            case 'api': {
                buildDataList();
                PuSet.show(apiModal, true);
                break;
            }
            case 'export': {
                modalDialog.show({
                    type: "list",
                    list: [
                        { value: "apiList", text: "API 配置" },
                        { value: "agents", text: "所有智能体" },
                        { value: "informations", text: "所有词条" },
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
                            modalDialog.show("文件已读取", "合并", "覆盖", "取消").then(function (res) {
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
                            modalDialog.show("无法解析文件", "确定")
                        }
                    })
                    fr.readAsText(files[0])
                });

                input.click()

                break;
            }
        }
    });


    // 加载已有模型列表
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

});



