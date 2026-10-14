/**
 * chat/store.mjs
 * 应用数据存储与状态：data 对象、持久化、深合并、条目工具。
 */

import { runtime } from '../runtime.mjs';

/** 新用户默认数据结构 */
const DEFAULT_DATA = {
    "apiList": {},
    "agents": {},
    "currentModel": "",
    "memory_map": {},
    "branch": []
};

/**
 * 深度合并：把 source 递归合并到 target（就地修改 target）
 * - 普通对象：递归合并
 * - 数组：将 source 的元素追加到 target（原始值去重）
 * - 其它（原始值 / null）：source 覆盖 target
 * @returns 合并后的值
 */
function mergeInto(target, source) {
    if (source === null) return null;
    if (typeof source !== 'object') return source;
    if (Array.isArray(source)) {
        const base = Array.isArray(target) ? target : [];
        for (const item of source) {
            if (item !== null && typeof item === 'object') {
                base.push(item);
            } else if (!base.includes(item)) {
                base.push(item);
            }
        }
        return base;
    }
    const base = (target !== null && typeof target === 'object' && !Array.isArray(target)) ? target : {};
    for (const key of Object.keys(source)) {
        base[key] = mergeInto(base[key], source[key]);
    }
    return base;
}

function removeArrayItem(array, item) {
    const index = array.indexOf(item);
    if (index !== -1) {
        array.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * 初始化存储层，将数据/持久化/派生对象挂到 ctx。
 * @param {object} ctx 共享上下文
 * @param {object|null} raw 从 storage 读出的原始数据
 */
export function setupStore(ctx, raw) {
    // 不能只做 raw || DEFAULT：读到的可能是 {} 或部分字段的旧数据，
    // 直接采用会让 apiList / branch 等字段 undefined，后续 PuSet.ensureObjectProperty
    // 与 initMessageList 都会踩空。这里把默认值补齐到 raw 上。
    const data = mergeInto(JSON.parse(JSON.stringify(DEFAULT_DATA)), raw || {});
    ctx.data = data;
    ctx.saveData = function saveData() {
        ctx.storage.setItem('chat-data', data);
    };
    runtime.saveData = ctx.saveData;
    ctx.mergeInto = mergeInto;
    ctx.removeArrayItem = removeArrayItem;

    ctx.memory_map = PuSet.ensureObjectProperty(data, "memory_map", Object);
    ctx.agents = PuSet.ensureObjectProperty(data, "agents", Object);
    ctx.chuji = ctx.agents[0] ?? (ctx.agents[0] = {
        id: '0',
        name: "默认智能体",
        tags: ["默认智能体", "初姬"],
        "settings": { thinking: true }
    });

    // fix
    ctx.chuji.tags = ["默认智能体", "初姬", "特级助理"]
}