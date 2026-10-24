/**
 * tools/agents.mjs
 * 智能体协作工具：列出其他智能体、查询指定智能体的角色能力、切换主智能体。
 */

import { runtime } from '../runtime.mjs';
import { DEFAULT_TEMPERATURE } from '../core.mjs';

/**
 * 列出智能体。
 */
export const coworker = {
    schema: {
        "type": "function",
        "function": {
            "name": "coworker",
            "description": "【协作】获取包括自己的智能体列表。所以智能体共享记忆空间和工具库",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    handler(ctx, args) {
        const agents = ctx.data?.agents || {};
        const currentId = String(ctx.data?.currentAgent ?? '');
        const coworkers = Object.values(agents).map(a => {
            const id = String(a.id);
            return {
                id,
                name: a.name,
                self: id === currentId,
                tags: a.tags ?? []
            }
        });
        return { message: `获取${coworkers.length}个成员信息`, coworkers };
    }
};

/**
 * 将任务交给指定智能体，并切换主智能体（自己交出控制权）。
 */
export const cooperate = {
    schema: {
        "type": "function",
        "function": {
            "name": "cooperate",
            "description": "【交接】智能体之间唯一通讯手段。通过用户消息通道附加一个信息传递给新智能体。日常对话或者请求帮助都必须用这个工具，否则对方不会看到你的消息。",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": { "type": "string", "description": "目标智能体的 id" },
                    "message": { "type": "string", "description": "通过用户消息通道，将你想要传递的信息告诉目标智能体" },
                    "beginning": { "type": "boolean", "description": "如果是 true，作为新任务的起点，对面将看不到任何历史对话，默认 false" }
                },
                "required": ["to", "message"]
            }
        }
    },
    handler(ctx, args) {
        const agents = ctx.data?.agents || {};
        const { to, message, beginning } = args || {};
        if (to == null) return { error: '缺少参数 to' };
        const agent = agents[to];
        if (!agent) return { error: `不存在 id=${to} 的智能体` };

        const id = String(agent.id);
        return {
            message: `已发送至【${agent.name}】`,
            to: id,
            cooperate: { id, message, beginning }
        };
    }
};

/**
 * 招募（创建）一个新智能体。
 * @param {{ name: string, content?: string, settings?: object }} args
 */
export const recruit = {
    schema: {
        "type": "function",
        "function": {
            "name": "recruit",
            "description": "【协作】创建一个新的智能体（招募）。创建后不会自动切换，需要用 cooperate 交接。评价：请神容易送神难",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "新智能体的名称" },
                    "content": { "type": "string", "description": "新智能体的系统提示/角色设定" },
                    "tags": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "能力标签数组，用于其他智能体了解其能力"
                    },
                    "settings": { "type": "object", "description": "可选设置，默认 { thinking: true, temperature: 0.8 }" }
                },
                "required": ["name"]
            }
        }
    },
    handler(ctx, args) {
        const agents = ctx.data?.agents || {};
        const { name, content, tags, settings } = args || {};
        if (!name) return { error: '缺少参数 name' };
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'agent-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const agent = {
            id,
            name: String(name),
            content: content ?? '',
            tags: Array.isArray(tags) ? tags.map(t => String(t).toLowerCase()) : [],
            branch: [],
            settings: Object.assign({ thinking: true, temperature: DEFAULT_TEMPERATURE }, settings || {})
        };
        agents[id] = agent;
        if (typeof runtime.saveData === 'function') runtime.saveData();
        if (runtime.vm_agent) runtime.vm_agent.update(Object.values(agents));
        return { message: `已创建智能体【${agent.name}】`, id };
    }
};