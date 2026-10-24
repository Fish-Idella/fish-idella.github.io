/**
 * tools/index.mjs
 * 工具调用层：接收 LLM 返回的 tool_calls，分发到具体工具并回填结果。
 *
 * 工具函数统一签名 (ctx, args)，ctx = { data, memory_map, messages }。
 * 本层不依赖 chat 层，保持单向依赖。
 */

import * as interact from './interact.mjs';
import * as browser from './browser.mjs';
import * as memory from './memory.mjs';
import * as agents from './agents.mjs';

/** 各包名 → 模块，供 install_tools 按需挂载 */
const packages = { interact, browser, memory, agents };

/** 全部可被 LLM 调用的工具，按名字索引（名字 → handler 函数） */
export const registry = {};

/**
 * 把「{ name: { schema, handler } }」模块解包成「{ name: handler }」函数表。
 * 这样工具的实现（handler）与定义（schema）同处一个对象，文件可随意迁移，
 * 而 registry 对外契约保持「名字→可调用函数」不变。
 */
function collectHandlers(mod, i) {
    for (const [name, item] of Object.entries(mod)) {
        if (item && typeof item.handler === 'function') {
            registry[name] = item.handler;
        }
    }
}

// 刷新后安装的包不记得了，只能全部加载
Object.values(packages).forEach(collectHandlers);

export const OpenAIFunctionCalling = {
    /** 当前 LLM 可见的工具 schema 列表 */
    tools: Object.entries({ ...interact, ...memory })
        .filter(([, item]) => item && typeof item.handler === 'function' && item.schema)
        .map(([, item]) => item.schema),

    /**
     * 按需挂载其它工具包：返回指定包的 schema，使 LLM 可见。
     * @param {string[]} pkgNames 包名数组，如 ["memory", "browser"]
     */
    install(pkgNames) {
        const added = [];
        for (const name of pkgNames || []) {
            const mod = packages[name];
            if (!mod) continue;
            const schemas = Object.entries(mod)
                .filter(([, item]) => item && typeof item.handler === 'function' && item.schema)
                .map(([, item]) => item.schema)
            // 不能直接改 tools 集合，避免现代LLM缓存丢失
            added.push(...schemas);
        }
        return added;
    },


    /**
     * 处理 OpenAI 返回的 tool_calls，依次执行并记录结果
     */
    async handleToolCalls(assistantBox, data, memory_map, messages) {
        const ctx = { data, memory_map, messages };
        const tool_calls = assistantBox.tool_calls;
        const list = [];
        // 在循环外锚定本轮的 assistant 消息：循环内每次 messages.push(toolResponse)
        // 都会让 messages.at(-1) 变成上一条回执。
        let assistantMsg = messages.at(-1);
        for (const toolCall of tool_calls) {
            if (toolCall.type !== "function") continue;
            const { name, arguments: argsStr } = toolCall.function;
            const fn = registry[name] ?? function () {
                return { error: `未知函数调用: ${name}` }
            };

            let result;
            try {
                result = fn(ctx, JSON.parse(argsStr));
                if (result instanceof Promise) {
                    result = await result;
                }
            } catch (err) {
                result = { error: err.message };
            }

            // 目前就 cooperate 需要改变会话流
            if (name == 'cooperate') {
                list.push(['cooperate', result.cooperate]);
                delete result.cooperate;
            } if (name == 'push_image') {
                list.push(['push_image', result]);
            }

            const toolResponse = {
                role: "tool",
                tool_call_id: toolCall.id,
                branch: [],
                content: typeof result === "object"
                    ? "```json\n" + JSON.stringify(result, null, 2) + "\n```"
                    : "```text\n" + String(result) + "\n```"
            };

            assistantMsg.branch.push(toolResponse);
            messages.push(assistantMsg = toolResponse);
        }

        return list;
    }
};