/**
 * toolcall.js
 * 工具调用层：接收 LLM 返回的 tool_calls，执行本地工具并回填结果
 *
 * 依赖注入：
 *   runtime.AndroidObject      —— 由 ui.js 初始化后写入
 *   runtime.currentAgentConfig —— 由 ui.js 的 initAgent() 写入
 */

import {
    formatDate,
    Information,
    addBidirectionalAssociation,
    parseUnifiedDiff,
    definitions
} from './data.mjs';

/** 预览待确认任务 */
export const PENDING = {
    tool: null,
    key: '',
    func: null
};

/** 运行时依赖注入容器 */
export const runtime = {
    AndroidObject: null,
    currentAgentConfig: null,
    vm_images:null
};

export const OpenAIFunctionCalling = {
    /**
     * 处理 OpenAI 返回的 tool_calls，依次执行并记录结果
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

            if (name !== "confirm") {
                // 过期的任务
                PENDING.func = PENDING.key = PENDING.tool = null;
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
        const cfg = runtime.currentAgentConfig;
        if (!cfg?.settings?.["use-browser"]) {
            return { "message": "用户已禁用" };
        }
        await runtime.AndroidObject.openWebView(String(args.url));
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { "message": "已打开浏览器窗口" };
    },

    async get_browser_content(data, information_map, messages, args) {
        const cfg = runtime.currentAgentConfig;
        if (!cfg?.settings?.["use-browser"]) {
            return { "message": "用户已禁用" };
        }
        const result = await runtime.AndroidObject.getWebViewContent(args.type ?? 'text', args.selector ?? 'body');
        return { result };
    },

    async get_browser_url() {
        const url = await runtime.AndroidObject.getWebViewURL();
        return { url };
    },

    async close_browser() {
        await runtime.AndroidObject.closeWebView(true);
        return { "message": "已关闭浏览器窗口" };
    },

    push_image(data, information_map, messages, args) {
        runtime.vm_images.data.push(...args.src);
        return { "message": "已插入图片，随下轮用户对话载入" }
    },

    reset_key(data, information_map, messages, args) {
        const { oldKey, newKey } = args;
        if (Object.hasOwn(information_map, oldKey)) {
            information_map[newKey] = information_map[oldKey];
            information_map[newKey].key = newKey;
            if (Reflect.deleteProperty(information_map, oldKey)) {
                return { message: "成功修改，并删除原始键" };
            } else {
                return { message: "成功修改,但不能删除原始键" };
            }
        } else {
            return { message: "不存在的原始键" };
        }
    },

    save_information(data, information_map, messages, args) {
        try {
            const { type, key, summary, information, tags } = args;
            const isUpdate = key && type === "update";
            if (key === "book-index") {
                return { error: 'book-index 为保留键，不可写入' };
            }
            if (!isUpdate && Object.hasOwn(information_map, key)) {
                return { error: "创建失败，键名冲突" };
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
        return { message: `成功建立互相关联` };
    },

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

    view_information(data, information_map, messages, args) {
        const key = args.key;
        const info = information_map?.[key];
        if (!info) return `Error: 词条不存在 /${key}`;
        const text = info.information || "";
        const lines = text.split("\n");
        const total = lines.length;
        const start = args.start == null ? 1 : args.start;
        const end = args.end == null ? total : args.end;
        if (start < 1) return "Error: start<1";
        if (end < start) return "Error: end<start";
        if (start > total) return `Error: start(${start}) 超过总行数(${total})`;
        const clampedEnd = Math.min(end, total);
        const width = Math.max(5, String(clampedEnd).length);
        const out = [`/${key}`, `line:${start}-${clampedEnd}`];
        for (let i = start; i <= clampedEnd; i++) {
            out.push(`${String(i).padStart(width, " ")}|${lines[i - 1]}`);
        }
        return out.join("\n");
    },

    patch_information(data, information_map, messages, args) {
        const key = args.key;
        const info = information_map?.[key];
        if (!info) return { error: `词条不存在 /${key}` };
        const diffText = args.diff || "";
        const dryRun = args.dryRun !== false;
        let hunks;
        try {
            hunks = parseUnifiedDiff(diffText);
        } catch (e) {
            return { error: e.message };
        }
        if (hunks.length === 0) return { error: "diff 中没有解析到任何 hunk（@@ 行）" };
        const lines = (info.information || "").split("\n");
        const totalBefore = lines.length;
        for (let i = 1; i < hunks.length; i++) {
            if (hunks[i].start <= hunks[i - 1].start) {
                return { error: "hunk 必须按起始行号升序排列且不重叠" };
            }
        }
        const changes = [];
        const work = lines.slice();
        for (let i = hunks.length - 1; i >= 0; i--) {
            const hunk = hunks[i];
            if (hunk.start > work.length + 1) {
                return { error: `hunk 起始行 ${hunk.start} 越界（共 ${work.length} 行）` };
            }
            let pos = hunk.start - 1;
            const out = [];
            const removedText = [];
            for (const dl of hunk.lines) {
                const prefix = dl.charAt(0);
                const content = dl.slice(1);
                if (prefix === " ") {
                    if (work[pos] !== content) {
                        return { error: `第 ${pos + 1} 行不匹配：期望上下文 "${content}"，实际 "${work[pos]}"` };
                    }
                    out.push(work[pos]);
                    pos++;
                } else if (prefix === "-") {
                    if (work[pos] !== content) {
                        return { error: `第 ${pos + 1} 行不匹配：期望删除 "${content}"，实际 "${work[pos]}"` };
                    }
                    removedText.push(work[pos]);
                    pos++;
                } else if (prefix === "+") {
                    out.push(content);
                }
            }
            const removedCount = pos - (hunk.start - 1);
            changes.push({ at: `line ${hunk.start}`, remove: removedCount, insert: out.length, removedText });
            work.splice(hunk.start - 1, removedCount, ...out);
        }
        changes.reverse();
        const totalAfter = work.length;

        // 缓存任务
        PENDING.tool = 'patch_information';
        PENDING.key = key;
        PENDING.func = function () {
            info.information = work.join("\n");
            info.updated_at = formatDate();
            return { dryRun: false, hunks: hunks.length, totalBefore, totalAfter };
        };

        if (dryRun) {
            return { dryRun: true, hunks: hunks.length, totalBefore, totalAfter, changes };
        } else {
            return PENDING.func();
        }
    },

    confirm(data, information_map, messages, args) {
        if (PENDING.tool == null) {
            return { error: "没用未完成的任务或任务已过期" };
        }
        if (args.tool !== PENDING.tool) {
            return { error: "不是上次调用的工具" };
        }
        if (args.key !== PENDING.key) {
            return { error: "key 不匹配" };
        }
        try {
            return PENDING.func();
        } catch (e) {
            return { error: e.message };
        }
    },

    tools: definitions
};