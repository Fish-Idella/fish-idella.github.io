/**
 * tools/memory.mjs
 * 记忆（词条）相关工具：增删改查、关联、检索。
 */

import { formatDate } from '../core.mjs';
import { Memory, addBidirectionalAssociation } from '../domain.mjs';
import { PENDING, runtime } from '../runtime.mjs';

export function reset_key(ctx, args) {
    const { memory_map } = ctx;
    const { oldKey, newKey } = args;
    if (Object.hasOwn(memory_map, oldKey)) {
        memory_map[newKey] = memory_map[oldKey];
        memory_map[newKey].key = newKey;

        // 重建词条羁绊
        for (const otherKey in memory_map) {
            const other = memory_map[otherKey];
            if (other.associated && other.associated.includes(oldKey)) {
                other.associated = other.associated.filter(k => k !== oldKey);
                other.associated.push(newKey);
            }
        }

        if (Reflect.deleteProperty(memory_map, oldKey)) {
            return { message: "成功修改，并删除原始键" };
        } else {
            return { message: "成功修改,但不能删除原始键" };
        }
    } else {
        return { message: "不存在的原始键" };
    }
}

export function remember(ctx, args) {
    const { memory_map } = ctx;
    try {
        const { type, key, summary, memory, tags } = args;
        const isUpdate = key && type === "update";
        if (key === "memory-index") {
            return { error: 'memory-index 为保留键，不可写入' };
        }
        if (!isUpdate && Object.hasOwn(memory_map, key)) {
            return { error: "创建失败，键名冲突" };
        }
        const obj = PuSet.ensureObjectProperty(memory_map, key, Memory, key);
        if (summary) obj.summary = summary;
        if (memory) obj.memory = memory;
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
}

const collator = new Intl.Collator('en-US');

export function list(ctx, args) {
    const { memory_map } = ctx;
    const { start = 0, count = 5, namespace = '' } = args;
    const entries = Object.values(memory_map)
        .filter(e => namespace && e.key.startsWith(namespace))
        .sort((a, b) => collator.compare(a.key, b.key));

    const length = entries.length;
    const max = Math.min(length, start + Math.min(count, 30));

    const results = [`effective length: ${length}`, '\n'];

    for (let i = start; i < max; i++) {
        const entry = entries[i];
        results.push(`${i}|\`${entry.key}\`：${entry.summary}`);
    }
    return results.join('\n').trim()
}

export function recall_by_key(ctx, args) {
    const { memory_map } = ctx;
    const results = [];
    const keys = args.keys || [];
    for (const key of keys) {
        const infoObj = memory_map?.[key];
        if (infoObj && infoObj.memory) {
            results.push(`●${key}●  \n${infoObj.memory}`);
        } else {
            switch (key) {
                case "memory-index": {
                    results.push(`[弃用，请使用 list]`);
                    break;
                }
                case "datetime":
                    results.push(`●${key}●  \n${formatDate()}`);
                    break;
                default:
                    results.push(`【${key}不存在】`);
            }
        }
    }
    return results.join('\n\n== 词条分割线 ==\n\n');
}

export function recall_by_keyword(ctx, args) {
    const { memory_map } = ctx;
    const keywordsRaw = args.keyword || [];
    if (keywordsRaw.length === 0) return {};
    const keywordsSet = new Set(keywordsRaw.map(k => k.toLowerCase()));
    const keywords = Array.from(keywordsSet);
    const regex = new RegExp(keywords.join('|'), "i");
    const result = {};
    for (const [key, obj] of Object.entries(memory_map)) {
        const summaryMatch = regex.test(obj.summary);
        const infoMatch = regex.test(obj.memory);
        const tagMatch = obj.tags?.some(tag => keywordsSet.has(tag)) || false;
        if (summaryMatch || infoMatch || tagMatch) {
            result[key] = obj.summary;
        }
    }
    return result;
}

export function associate_memory(ctx, args) {
    const { memory_map } = ctx;
    const keys = args.keys || [];
    if (keys.length < 2) {
        return { error: "至少需要两个词条的 key 才能建立关联" };
    }
    const existingKeys = keys.filter(k => Object.hasOwn(memory_map, k));
    if (existingKeys.length < 2) {
        return { error: "至少需要两个存在的词条才能建立关联" };
    }
    const items = existingKeys.map(k => memory_map[k]);
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            addBidirectionalAssociation(items[i], items[j]);
        }
    }
    return { message: `成功建立互相关联` };
}

export function query_associated(ctx, args) {
    const { memory_map } = ctx;
    const targetKey = args.key;
    if (!targetKey) return '';
    const info = memory_map?.[targetKey];
    if (!info || !Array.isArray(info.associated) || info.associated.length === 0) {
        return '';
    }
    const lines = {};
    for (const assocKey of info.associated) {
        const assocInfo = memory_map[assocKey];
        if (assocInfo) {
            lines[assocKey] = (`${assocInfo.summary || '(无摘要)'}  `);
        } else {
            lines[assocKey] = (`(词条已删除)  `);
        }
    }
    return lines;
}

/**
 * 执行真正的删除（由 confirm 触发，或 dryRun:false 直接执行）。
 * 抽出来是为了让「预览」与「确认」跑同一段逻辑，避免两处行为漂移。
 */
function applyForgotten(memory_map, keys) {
    const result = {};
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    for (const key of keys) {
        if (key === "memory-index") {
            result[key] = 'readonly';
            continue;
        }
        for (const otherKey in memory_map) {
            const other = memory_map[otherKey];
            if (other.associated && other.associated.includes(key)) {
                other.associated = other.associated.filter(k => k !== key);
            }
        }
        result[key] = `从记忆移除${hasOwnProperty.call(memory_map, key) ? Reflect.deleteProperty(memory_map, key) ? "成功" : "失败" : "不存在"}`;
    }
    return result;
}

/**
 * 【高危】删除词条。作为 LLM 工具，本函数自身不会弹窗——
 * 确认动作发生在 LLM 侧：先返回预览，由 LLM 决定是否再调 confirm 工具。
 * 原先描述里写着「必须向用户获取最终确定」但代码无任何强制，
 * LLM 一次调用就能删掉数据且不可逆。这里复用 editor.mjs 的 PENDING 两段式：
 * 首次调用只返回预览并挂起任务，必须经 confirm 才真正写盘。
 *
 * 注意：UI 手动删除（views/memory.mjs）不走这条流程，它有自己的 ModalDialog 确认，
 * 因此会显式传 dryRun:false 直接执行。
 */
export function forgotten(ctx, args) {
    const { memory_map } = ctx;
    const keys = (args.keys || []).filter(k => typeof k === 'string');
    if (keys.length === 0) return { error: '缺少 keys' };

    // dryRun 默认 true：与 replace/recovery 保持一致，未显式传 false 就是预览。
    if (args.dryRun !== false) {
        const preview = {};
        for (const key of keys) {
            if (key === "memory-index") { preview[key] = 'readonly'; continue; }
            const info = memory_map?.[key];
            preview[key] = info
                ? { summary: info.summary ?? '', tags: info.tags ?? [], associated: info.associated ?? [] }
                : '不存在';
        }
        // 挂起任务，等待 confirm 工具确认
        PENDING.tool = 'forgotten';
        // 多个 key 用换行拼接作为确认凭据，confirm 时需原样回传 keys
        PENDING.key = keys.join('\n');
        PENDING.func = function () {
            const res = applyForgotten(memory_map, keys);
            // 过期任务，避免重复执行
            PENDING.func = PENDING.key = PENDING.tool = null;
            if (typeof runtime.saveData === 'function') runtime.saveData();
            return { dryRun: false, result: res };
        };
        return { dryRun: true, preview, hint: '删除不可逆，确认请调用 confirm 工具' };
    }

    return applyForgotten(memory_map, keys);
}