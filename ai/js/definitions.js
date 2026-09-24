const definitions = [
    {
        type: "function",
        function: {
            name: "reset_key",
            description: "只改词条的key",
            parameters: {
                type: "object",
                properties: {
                    oldKey: {
                        type: "string",
                        description: "原始键名",
                    },
                    newKey: {
                        type: "string",
                        description: "新键名",
                    }
                }
            },
            required: ["oldKey", "newKey"]
        }
    },
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
            name: "save_information",
            description: "【创建/更新词条】保存或修改一个词条。更新某一条属性其他属性保持不变时，可只传入key和要更新的属性，不必传入相同的属性。",
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        description: "指定是创建新词条，或者更新老词条",
                        enum: ["create", "update"]
                    },
                    key: { type: "string", description: "语义键，作为存储的唯一标识符" },
                    summary: { type: "string", description: "简短精炼概括此文档，以主体名开头，例如：“张三的基础信息”、“飞机的定义及常见类型”" },
                    information: { type: "string", description: "维护为 Markdown 文档，记录词条的详细信息" },
                    tags: { type: "array", items: { type: "string" }, description: "标签数组，方便分类管理" }
                },
                required: ["type", "key"]
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
            description: "读取已打开的网页的可视文档，没有用户明确允许禁止读取网页",
            parameters: {
                type: "object",
                properties: {
                    selector: {
                        type: "string",
                        description: "CSS选择器，全局传`*`"
                    }
                },
                required: ["selector"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_browser_url",
            description: "读取已打开的网页的网址",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "close_browser",
            description: "关闭浏览器窗口，使用结束应该主动关闭",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
];
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

const OpenAIFunctionCalling = {
    /**
     * 处理 OpenAI 返回的 tool_calls，依次执行并记录结果
     * @param {Object} assistantBox - 辅助对象
     */
    async handleToolCalls(assistantBox, data, information_map, messages) {
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
                result = fn(data, information_map, messages, args);
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
                content: typeof result === "object"
                    ? "```json\n" + JSON.stringify(result, null, 2) + "\n```"
                    : String(result)
            };
            const lastAssistantMsg = messages.at(-1);
            if (lastAssistantMsg) {
                lastAssistantMsg.branch.push(toolResponse);
            }
            messages.push(toolResponse);
        }
    },
    async open_browser(data, information_map, messages, args) {
        if (!currentAgentConfig.settings["use-browser"]) {
            return { "message": "用户已禁用" };
        }
        await AndroidObject.openWebView(String(args.url));
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { "message": "已打开浏览器窗口" };
    },
    async get_browser_content(data, information_map, messages, args) {
        if (!currentAgentConfig.settings["use-browser"]) {
            return { "message": "用户已禁用" }
        }
        const result = await AndroidObject.getWebViewContent(args.type, args.selector);
        return { result };
    },
    async get_browser_url() {
        const url = await AndroidObject.getWebViewURL();
        return { url };
    },
    async close_browser() {
        await AndroidObject.closeWebView(true);
        return { "message": "已关闭浏览器窗口" };
    },
    reset_key(data, information_map, messages, args) {
        const { oldKey, newKey } = args;
        if (Object.hasOwn(information_map, oldKey)) {
            information_map[newKey] = information_map[oldKey];
            information_map[newKey].key = newKey;
            if (Reflect.deleteProperty(information_map, oldKey)) {
                return { message: "成功修改，并删除原始键" }
            } else {
                return { message: "成功修改,但不能删除原始键" }
            }
        } else {
            return { message: "不存在的原始键" }
        }
    },
    /**
     * 创建或更新词条
     * @param {Object} data - 全局数据对象
     * @param {Object} information_map - 信息库
     * @param {Object} args - { summary, information, key, tags }
     * @returns {Object}
     */
    save_information(data, information_map, messages, args) {
        try {
            const { type, key, summary, information, tags } = args;
            const isUpdate = key && type === "update";
            if (key === "book-index") {
                return { error: 'book-index 为保留键，不可写入' };
            }
            if (!isUpdate && Object.hasOwn(information_map, key)) {
                return {
                    error: "创建失败，键名冲突"
                }
            }
            const obj = PuSet.ensureObjectProperty(information_map, key, Information, key);
            if (summary) obj.summary = summary;
            if (information) obj.information = information;
            if (tags && Array.isArray(tags)) {
                obj.tags = tags.map(t => t.toLowerCase());
            }
            if (isUpdate) {
                obj.updated_at = formatDate();
            }
            return { message: `已${isUpdate ? "更新" : "创建"}词条到 key='${key}'` };
        } catch (err) {
            return { error: err.message };
        }
    },
    /**
     * 按 key 查询词条详细信息（返回格式化字符串）
     * @param {Object} data - 全局数据对象
     * @param {Object} information_map - 信息库
     * @param {Object} args - { keys }
     * @returns {string} 多个词条用 '---\n' 分隔
     */
    query_information_by_key(data, information_map, messages, args) {
        const results = [];
        const keys = args.keys || [];
        for (const key of keys) {
            const infoObj = information_map?.[key];
            if (infoObj && infoObj.information) {
                results.push(`●${key}●  \n${infoObj.information}`);
            } else {
                switch (key) {
                    case "book-index":
                        results.push(`●${key}●  \n${Object.values(information_map).map(entry => `\`${entry.key}\`：${entry.summary}  `).join('\n')}`);
                        break;
                    case "current-datetime":
                        results.push(`●${key}●  \n${formatDate()}`);
                        break;
                    default:
                        results.push(`●${key}●  \n  `);
                }
            }
        }
        return results.join('\n\n---\n\n');
    },
    /**
     * 建立词条之间的双向关联（可同时关联多个词条）
     * @param {Object} data - 全局数据对象（未使用）
     * @param {Object} information_map - 信息库
     * @param {Object} args - { keys }
     * @returns {Object}
     */
    associate_information(data, information_map, messages, args) {
        const keys = args.keys || [];
        if (keys.length < 2) {
            return { error: "至少需要两个词条的 key 才能建立关联" };
        }
        const existingKeys = keys.filter(k => information_map.hasOwnProperty(k));
        if (existingKeys.length < 2) {
            return { error: "至少需要两个存在的词条才能建立关联" };
        }
        const items = existingKeys.map(k => information_map[k]);
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
     * @param {Object} information_map - 信息库
     * @param {Object} args - { key }
     * @returns {Object}
     */
    query_associated(data, information_map, messages, args) {
        const targetKey = args.key;
        if (!targetKey) return '';
        const info = information_map?.[targetKey];
        if (!info || !Array.isArray(info.associated) || info.associated.length === 0) {
            return '';
        }
        const lines = {};
        for (const assocKey of info.associated) {
            const assocInfo = information_map[assocKey];
            if (assocInfo) {
                lines[assocKey] = (`${assocInfo.summary || '(无摘要)'}  `);
            } else {
                lines[assocKey] = (`(词条已删除)  `);
            }
        }
        return lines;
    },
    /**
     * 全文检索（摘要/内容/标签）
     * @param {Object} data - 全局数据对象（未使用）
     * @param {Object} information_map - 信息库
     * @param {Object} args - { keyword }
     * @returns {Object} key → summary 的映射
     */
    query_information_by_keyword(data, information_map, messages, args) {
        const keywordsRaw = args.keyword || [];
        if (keywordsRaw.length === 0) return {};
        const keywordsSet = new Set(keywordsRaw.map(k => k.toLowerCase()));
        const keywords = Array.from(keywordsSet);
        const regex = new RegExp(keywords.join('|'), "i");
        const result = {};
        for (const [key, obj] of Object.entries(information_map)) {
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
     * @param {Object} information_map - 信息库
     * @param {Object} args - { keys }
     * @returns {Object}
     */
    delete_information(data, information_map, messages, args) {
        const result = {};
        const keys = args.keys || [];
        const hasOwnProperty = Object.prototype.hasOwnProperty;
        for (const key of keys) {
            if (key === "book-index") {
                result[key] = 'readonly';
                continue;
            }
            for (const otherKey in information_map) {
                const other = information_map[otherKey];
                if (other.associated && other.associated.includes(key)) {
                    other.associated = other.associated.filter(k => k !== key);
                }
            }
            result[key] = `从世界书移除${hasOwnProperty.call(information_map, key) ? Reflect.deleteProperty(information_map, key) ? "成功" : "失败" : "不存在"}`;
        }
        return result;
    },
    tools: definitions
};