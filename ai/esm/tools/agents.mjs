/**
 * tools/agents.mjs
 * 智能体协作工具：列出其他智能体、查询指定智能体的角色能力、切换主智能体。
 */

import { runtime } from '../runtime.mjs';

/**
 * 列出智能体。
 */
export function coworker(ctx, args) {
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

/**
 * 将任务交给指定智能体，并切换主智能体（自己交出控制权）。
 */
export function cooperate(ctx, args) {
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

/**
 * 招募（创建）一个新智能体。
 * @param {{ name: string, content?: string, settings?: object }} args
 */
export function recruit(ctx, args) {
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
        settings: Object.assign({ thinking: true }, settings || {})
    };
    agents[id] = agent;
    if (typeof runtime.saveData === 'function') runtime.saveData();
    if (runtime.vm_agent) runtime.vm_agent.update(Object.values(agents));
    return { message: `已创建智能体【${agent.name}】`, id };
}