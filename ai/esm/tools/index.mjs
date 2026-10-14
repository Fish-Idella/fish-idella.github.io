/**
 * tools/index.mjs
 * 工具调用层：接收 LLM 返回的 tool_calls，分发到具体工具并回填结果。
 *
 * 工具函数统一签名 (ctx, args)，ctx = { data, memory_map, messages }。
 * 本层不依赖 chat 层，保持单向依赖。
 */

import { definitions } from '../domain.mjs';
import * as browser from './browser.mjs';
import * as media from './media.mjs';
import * as memory from './memory.mjs';
import * as editor from './editor.mjs';
import * as agents from './agents.mjs';
import { runtime } from '../runtime.mjs';

/** 全部可被 LLM 调用的工具，按名字索引 */
export const registry = { ...browser, ...media, ...memory, ...editor, ...agents };

export const OpenAIFunctionCalling = {
    tools: definitions,

    /**
     * 处理 OpenAI 返回的 tool_calls，依次执行并记录结果
     */
    async handleToolCalls(assistantBox, data, memory_map, messages) {
        const ctx = { data, memory_map, messages };
        const tool_calls = assistantBox.tool_calls;
        const list = [];
        // 在循环外锚定本轮的 assistant 消息：循环内每次 messages.push(toolResponse)
        // 都会让 messages.at(-1) 变成上一条回执，若在循环内取，第 2 条及之后的回执
        // 就会被挂进第 1 条回执的 branch 里，分支树错乱。
        let assistantMsg = messages.at(-1);
        for (const toolCall of tool_calls) {
            if (toolCall.type !== "function") continue;
            const { name, arguments: argsStr } = toolCall.function;
            const fn = registry[name];
            if (typeof fn !== "function") {
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

            let result;
            try {
                result = fn(ctx, args);
                if (result instanceof Promise) {
                    result = await result;
                }
            } catch (err) {
                result = { error: err.message };
            }

            // 目前就 cooperate 需要改变会话流
            if (name == 'cooperate') {
                list.push(result.cooperate);
                delete result.cooperate;
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