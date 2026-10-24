/**
 * tools/memory.mjs
 * 记忆（词条）相关工具：增删改查、关联、检索。
 * 
 * 特殊标记   `⦓draft⦔`  实际等于  ctx.memory_map.draft.memory
 */

import { formatDate } from '../core.mjs';
import { Memory, addBidirectionalAssociation } from '../domain.mjs';
import { PENDING, runtime } from '../runtime.mjs';

/**
 * 特殊标记：正文中出现此占位符时，将其替换为 draft 词条的正文。
 * 设计为成对 Unicode 符号（⦓ U+2993 / ⦔ U+2994），降低与正文内容意外撞车的概率。
 * 正则全局匹配，支持一段正文内出现多次。
 */
export const DRAFT_MARKER = '⦓draft⦔';
const DRAFT_REGEX = new RegExp(DRAFT_MARKER, "g");

/**
 * 把正文中的 `⦓draft⦔` 占位符替换为 draft 词条的真实 memory 内容。
 *
 * 设计要点：
 * 1. 非字符串直接原样返回，调用方可以无条件包裹，无需重复做 typeof 判断。
 * 2. draft 不存在或 memory 为空时返回错误对象，让调用方明确报错「draft 不可用」，
 *    而不是静默替换成空串——空串会掩盖「忘了先 remember draft」这一流程错误。
 * 3. 不做递归展开：draft 内容里若再含 `⦓draft⦔`，保留原样。递归会引入循环引用
 *    与重复膨胀风险，当前语义不需要嵌套。
 * 4. 纯函数，不修改传入的字符串。
 *
 * @param {object} ctx
 * @param {string} text 待处理的正文
 * @returns {string | {error: string}} 替换后的字符串，或错误对象
 */
function resolveDraft(ctx, text) {
    if (typeof text !== 'string') return text;

    const draft = ctx.memory_map?.draft;
    if (!draft || typeof draft.memory !== 'string' || draft.memory.trim() === '') {
        return { error: '正文中包含 ⦓draft⦔ 标记，但当前不存在可用的 draft 词条（或 draft 正文为空）' };
    }

    return text.replace(DRAFT_REGEX, draft.memory);
}


export const reset_key = {
    schema: {
        "type": "function",
        "function": {
            "name": "reset_key",
            "description": "只改词条的key",
            "parameters": {
                "type": "object",
                "properties": {
                    "oldKey": { "type": "string", "description": "原始键名" },
                    "newKey": { "type": "string", "description": "新键名" }
                },
                "required": ["oldKey", "newKey"]
            }
        }
    },
    handler(ctx, args) {
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
};

export const remember = {
    schema: {
        "type": "function",
        "function": {
            "name": "remember",
            "description": "【创建/更新词条】保存或修改一个词条。",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "description": "指定是创建新词条，或者更新老词条",
                        "enum": ["create", "update"]
                    },
                    "key": { "type": "string", "description": "语义键，作为存储的唯一标识符" },
                    "summary": { "type": "string", "description": "简短精炼概括此记忆" },
                    "memory": { "type": "string", "description": "维护为 Markdown 记忆，记录词条的详细信息，允许使用`⦓draft⦔`标记引用草稿完整文本" },
                    "tags": { "type": "array", "items": { "type": "string" }, "description": "标签数组" }
                },
                "required": ["type", "key"]
            }
        }
    },
    handler(ctx, args) {
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

            // 写入前解析正文中的 ⦓draft⦔ 占位符。只作用于 memory 正文，
            // 与「draft = 一段待落地的内容」的语义一致，不污染 summary/tags。
            let finalMemory = memory;
            if (typeof memory === 'string' && memory.includes(DRAFT_MARKER)) {
                const resolved = resolveDraft(ctx, memory);
                if (typeof resolved === 'object' && resolved !== null && resolved.error) {
                    return resolved;
                }
                finalMemory = resolved;
            }

            const obj = PuSet.ensureObjectProperty(memory_map, key, Memory, key);
            if (summary) obj.summary = summary;
            if (finalMemory) obj.memory = finalMemory;
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
};

const collator = new Intl.Collator('en-US');

export const list = {
    schema: {
        "type": "function",
        "function": {
            "name": "list",
            "description": "从记忆库中列出所有词条，但每次最多返回30条",
            "parameters": {
                "type": "object",
                "properties": {
                    "namespace": { "type": "string", "description": "key 命名前缀，设置后只返回前缀匹配的项" },
                    "start": { "type": "number", "description": "指定起始位置，默认0" },
                    "count": { "type": "number", "description": "指定返回条目数量，默认5，最大30" }
                },
                "required": []
            }
        }
    },
    handler(ctx, args) {
        const { memory_map } = ctx;
        const { start = 0, count = 5, namespace = '' } = args;
        const entries = Object.values(memory_map)
            .filter(e => !namespace || e.key.startsWith(namespace))
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
};

export const recall_by_key = {
    schema: {
        "type": "function",
        "function": {
            "name": "recall_by_key",
            "description": "【基础查询】按存储键名（key）查询词条的详细信息。支持特殊键：datetime（返回当前时间）",
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": {
                        "type": "array",
                        "description": "需要查询的词条键名数组，可同时查询多个",
                        "items": { "type": "string" }
                    }
                },
                "required": ["keys"]
            }
        }
    },
    handler(ctx, args) {
        const { memory_map } = ctx;
        const results = [];
        const keys = args.keys || [];
        if (!Array.isArray(keys)) {
            return { error: "The `keys` parameter has to be an array" }
        }
        for (const key of keys) {
            const infoObj = memory_map?.[key];
            if (infoObj && infoObj.memory) {
                results.push(`${key} >> \n${infoObj.memory}`);
            } else {
                switch (key) {
                    case "memory-index": {
                        results.push(`[memory-index 弃用，请使用 list]`);
                        break;
                    }
                    case "datetime":
                        results.push(`${key} >> \n${formatDate()}`);
                        break;
                    default:
                        results.push(`${key} >> \nnull`);
                }
            }
        }
        return results.join('\n\n== 词条分割线 ==\n\n');
    }
};

export const recall_by_keyword = {
    schema: {
        "type": "function",
        "function": {
            "name": "recall_by_keyword",
            "description": "【检索】根据关键词搜索记忆中的词条。支持多关键词匹配，会同时检索摘要、详细信息和标签字段。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "array",
                        "description": "搜索关键词数组",
                        "items": { "type": "string" },
                        "minItems": 1
                    }
                },
                "required": ["keyword"]
            }
        }
    },
    handler(ctx, args) {
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
};

export const associate_memory = {
    schema: {
        "type": "function",
        "function": {
            "name": "associate_memory",
            "description": "【建立关联】在多个词条之间建立双向关联。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": {
                        "type": "array",
                        "description": "需要互相关联的词条键名数组，至少需要2个",
                        "items": { "type": "string" },
                        "minItems": 2
                    }
                },
                "required": ["keys"]
            }
        }
    },
    handler(ctx, args) {
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
};

export const query_associated = {
    schema: {
        "type": "function",
        "function": {
            "name": "query_associated",
            "description": "【查询关联】获取指定词条所关联的所有其他词条，返回每个关联词条的 key 和摘要。",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": { "type": "string", "description": "要查询关联关系的词条键名" }
                },
                "required": ["key"]
            }
        }
    },
    handler(ctx, args) {
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
};

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
export const forgotten = {
    schema: {
        "type": "function",
        "function": {
            "name": "forgotten",
            "description": "【高危！删除词条】彻底删除一个或多个词条及相关索引。此操作不可逆！默认只预览（dryRun=true）返回待删词条的摘要，必须调用 confirm 工具（tool='forgotten', key=上一轮的 keys）才会真正删除。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": { "type": "array", "items": { "type": "string" }, "description": "需要删除的词条键名数组" },
                    "dryRun": { "type": "boolean", "description": "是否仅预览，默认 true ，预览和确认中间不能调用其他工具" }
                },
                "required": ["keys"]
            }
        }
    },
    handler(ctx, args) {
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
};

/**
 * 解析 SEARCH/REPLACE 块：
 *   <<<<<<< SEARCH
 *   ...原内容...
 *   =======
 *   ...新内容...
 *   >>>>>>> REPLACE
 * @returns {{list?:Array<{search:string,replace:string}>, error?:string}}
 */
function parseBlocks(text) {
    const lines = text.split('\n');
    const list = [];
    let i = 0;
    while (i < lines.length) {
        if (lines[i].trim() !== '<<<<<<< SEARCH') { i++; continue; }
        i++;
        const search = [];
        while (i < lines.length && lines[i].trim() !== '=======') {
            search.push(lines[i]);
            i++;
        }
        if (i >= lines.length) {
            return { error: `第 ${list.length + 1} 个块缺少 ======= 分隔符` };
        }
        i++; // 跳过 =======
        const rep = [];
        while (i < lines.length && lines[i].trim() !== '>>>>>>> REPLACE') {
            rep.push(lines[i]);
            i++;
        }
        if (i >= lines.length) {
            return { error: `第 ${list.length + 1} 个块缺少 >>>>>>> REPLACE 结束标记` };
        }
        i++; // 跳过 >>>>>>> REPLACE
        list.push({ search: search.join('\n'), replace: rep.join('\n') });
    }
    return { list };
}

/** 所有非空行行首空白的「最长公共前缀」 */
function commonIndent(lines) {
    let prefix = null;
    for (const l of lines) {
        if (l.trim() === '') continue;
        const ind = (l.match(/^[ \t]*/) || [''])[0];
        if (prefix === null) { prefix = ind; continue; }
        let k = 0;
        while (k < prefix.length && k < ind.length && prefix[k] === ind[k]) k++;
        prefix = prefix.slice(0, k);
        if (!prefix) break;
    }
    return prefix === null ? '' : prefix;
}

/**
 * 忽略缩进匹配：SEARCH 与文件窗口各自去掉「公共缩进」后逐行相等即命中；
 * 命中后 REPLACE 每行补上「文件比 SEARCH 多出的那段缩进」。
 */
function matchIgnoringIndent(fileText, searchText, repText) {
    const fileLines = fileText.split('\n');
    const searchLines = searchText.split('\n');
    const n = searchLines.length;
    if (!n) return { error: 'SEARCH 为空' };

    const P_search = commonIndent(searchLines);
    const S_norm = searchLines.map((l) => (l.trim() === '' ? '' : l.slice(P_search.length)));

    const lineStarts = [0];
    for (let k = 0; k < fileText.length; k++) {
        if (fileText[k] === '\n') lineStarts.push(k + 1);
    }

    const hits = [];
    for (let i = 0; i + n <= fileLines.length; i++) {
        const win = fileLines.slice(i, i + n);
        const P_file = commonIndent(win);
        let same = true;
        for (let j = 0; j < n; j++) {
            const w = win[j].trim() === '' ? '' : win[j].slice(P_file.length);
            if (w !== S_norm[j]) { same = false; break; }
        }
        if (same) hits.push({ i, P_file });
    }

    if (!hits.length) return { error: 'SEARCH 未在文件中找到（严格与忽略缩进均不匹配）' };
    if (hits.length > 1) {
        return { error: `忽略缩进匹配到 ${hits.length} 处，请扩大上下文使其唯一` };
    }

    const { i, P_file } = hits[0];
    const start = lineStarts[i];
    const end = start + fileLines.slice(i, i + n).join('\n').length;

    const delta = P_file.startsWith(P_search) ? P_file.slice(P_search.length) : P_file;
    const text = repText
        .split('\n')
        .map((l) => (l === '' ? '' : delta + l))
        .join('\n');

    return { start, end, text, delta };
}

function diff(now, old) {
    // now = 新文档，old = 旧文档
    const a = String(old ?? '').split('\n');
    const b = String(now ?? '').split('\n');
    const n = a.length, m = b.length;

    // 1. 剥掉公共前缀 / 后缀，缩小 DP 规模
    let head = 0;
    while (head < n && head < m && a[head] === b[head]) head++;

    let tailA = n, tailB = m;
    while (tailA > head && tailB > head && a[tailA - 1] === b[tailB - 1]) {
        tailA--; tailB--;
    }

    const A = a.slice(head, tailA);
    const B = b.slice(head, tailB);
    const p = A.length, q = B.length;

    // 2. LCS 长度表（从后往前填）
    const dp = Array.from({ length: p + 1 }, () => new Int32Array(q + 1));
    for (let i = p - 1; i >= 0; i--) {
        for (let j = q - 1; j >= 0; j--) {
            dp[i][j] = A[i] === B[j]
                ? dp[i + 1][j + 1] + 1
                : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    // 3. 回溯，生成操作序列
    const ops = [];
    let i = 0, j = 0;
    while (i < p && j < q) {
        if (A[i] === B[j]) {
            ops.push({ type: 'eq' });
            i++; j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            ops.push({ type: 'del', text: A[i++] });
        } else {
            ops.push({ type: 'add', text: B[j++] });
        }
    }
    while (i < p) ops.push({ type: 'del', text: A[i++] });
    while (j < q) ops.push({ type: 'add', text: B[j++] });

    // 4. 把连续的差异合并成 hunk
    const out = [];
    let oldLine = head + 1, newLine = head + 1;
    let k = 0;

    while (k < ops.length) {
        if (ops[k].type === 'eq') {
            oldLine++; newLine++; k++;
            continue;
        }

        const oldStart = oldLine;
        const newStart = newLine;
        let oldCount = 0, newCount = 0;
        const body = [];

        while (k < ops.length && ops[k].type !== 'eq') {
            const op = ops[k++];
            if (op.type === 'del') {
                body.push('-' + op.text);
                oldLine++; oldCount++;
            } else {
                body.push('+' + op.text);
                newLine++; newCount++;
            }
        }

        out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, ...body);
    }

    return out.join('\n');
}

/**
 * 【精准编辑正文】用 SEARCH/REPLACE 块替换词条正文的多个位置。
 * 先严格匹配；失败则忽略缩进匹配（公共缩进归一，相对层级保留）。
 * 默认只预览（dryRun=true），返回 confirm 令牌；dryRun=false 才落盘。
 *
 * ⦓draft⦔ 处理策略：替换发生在「最终写入的 replace 文本」上。SEARCH 块保持原样，
 * 不参与替换——SEARCH 只是定位锚点，混入 draft 内容会让锚点膨胀且难以调试；
 * REPLACE 块中的占位符则在落盘前解析，draft 内容最终固化进词条正文。
 */
export const replace = {
    schema: {
        "type": "function",
        "function": {
            "name": "replace",
            "description": "【编辑】用 SEARCH/REPLACE 块修改单一词条正文的多个位置。SEARCH 须在正文中唯一；严格匹配失败时回退到忽略缩进匹配（公共缩进归一，相对层级保留）。默认只预览（dryRun=true）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": { "type": "string", "description": "词条键名" },
                    "body": { "type": "string", "description": "SEARCH/REPLACE 块正文，每块三段：<<<<<<< SEARCH / ======= / >>>>>>> REPLACE。允许使用`⦓draft⦔`标记引用草稿完整文本" },
                    "dryRun": { "type": "boolean", "description": "是否仅预览，默认 true ，预览和确认中间不能调用其他工具" }
                },
                "required": ["key", "body"]
            }
        }
    },
    handler(ctx, args) {
        const { memory_map } = ctx;
        const key = args.key;
        const content = args.body;
        const dryRun = args.dryRun !== false;

        if (typeof key !== 'string' || !key) {
            return { error: '缺少 key' };
        }
        if (typeof content !== 'string' || !content.trim()) {
            return { error: '缺少 SEARCH/REPLACE 内容块' };
        }

        const info = memory_map?.[key];
        if (!info) {
            return { error: `词条不存在 /${key}` };
        }
        const raw = info.memory || "";

        const parsed = parseBlocks(content);
        if (parsed.error) return { error: parsed.error };
        if (parsed.list.length === 0) {
            return { error: '未找到 SEARCH/REPLACE 块' };
        }

        const crlf = raw.includes('\r\n');
        const old = crlf ? raw.replace(/\r\n/g, '\n') : raw;

        // 逐块定位：优先严格匹配，失败则回退忽略缩进匹配；均要求唯一且不重叠。
        // 注意：定位阶段只看 SEARCH 块，此时 REPLACE 块尚未解析 ⦓draft⦔——
        // 必须先把 replace 文本中的占位符解析出来，否则替换到正文的是字面标记。
        const edits = [];
        const modes = [];
        let draftError = null;
        for (let i = 0; i < parsed.list.length; i++) {
            const { search, replace: rep } = parsed.list[i];
            if (!search) {
                return { error: `第 ${i + 1} 个块的 SEARCH 为空` };
            }

            // REPLACE 块解析 ⦓draft⦔。若 draft 不可用，记录错误但不立即返回——
            // 循环内 return 会破坏 PENDING 之外的作用域一致性；统一在循环结束后抛出。
            let finalRep = rep;
            if (rep.includes(DRAFT_MARKER)) {
                const resolved = resolveDraft(ctx, rep);
                if (typeof resolved === 'object' && resolved !== null && resolved.error) {
                    draftError = `第 ${i + 1} 个块的 REPLACE 中含 ⦓draft⦔，但 ${resolved.error.replace(/^正文中包含 ⦓draft⦔ 标记，但/, '')}`;
                    break;
                }
                finalRep = resolved;
            }

            const at = old.indexOf(search);
            if (at !== -1) {
                if (old.indexOf(search, at + 1) !== -1) {
                    return { error: `第 ${i + 1} 个块的 SEARCH 在文件中不唯一，请扩大上下文使其唯一` };
                }
                edits.push({ start: at, end: at + search.length, text: finalRep });
                modes.push('strict');
                continue;
            }

            const fuzzy = matchIgnoringIndent(old, search, finalRep);
            if (fuzzy.error) {
                return { error: `第 ${i + 1} 个块：${fuzzy.error}` };
            }
            edits.push({ start: fuzzy.start, end: fuzzy.end, text: fuzzy.text });
            modes.push('indent-insensitive');
        }
        if (draftError) {
            return { error: draftError };
        }

        edits.sort((a, b) => a.start - b.start);
        for (let i = 1; i < edits.length; i++) {
            if (edits[i].start < edits[i - 1].end) {
                return { error: '多个块匹配到重叠区域，无法同时替换' };
            }
        }

        // 行号辅助：lineStarts[i] 表示第 i+1 行起始字符索引
        const lineStarts = [0];
        for (let i = 0; i < old.length; i++) {
            if (old[i] === '\n') lineStarts.push(i + 1);
        }
        const lineAt = (idx) => {
            let lo = 0, hi = lineStarts.length - 1;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (lineStarts[mid] <= idx) lo = mid;
                else hi = mid - 1;
            }
            return lo + 1;
        };
        const posOf = (e) => `${lineAt(e.start)}-${lineAt(e.end - 1)}`;

        // 从后往前替换，避免索引偏移
        let next = old;
        for (let i = edits.length - 1; i >= 0; i--) {
            const e = edits[i];
            next = next.slice(0, e.start) + e.text + next.slice(e.end);
        }
        const out = crlf ? next.replace(/\n/g, '\r\n') : next;
        const positions = edits.map(posOf);
        const fuzzyCount = modes.filter((m) => m !== 'strict').length;
        const modeNote = fuzzyCount ? `，其中 ${fuzzyCount} 处忽略缩进匹配` : '';

        // 缓存任务
        PENDING.tool = 'replace';
        PENDING.key = key;
        PENDING.func = function () {
            runtime.history[key] = JSON.parse(JSON.stringify(info));
            info.memory = out;
            info.updated_at = formatDate();
            // 过期任务，避免重复执行
            PENDING.func = PENDING.key = PENDING.tool = null;
            return { dryRun: false, message: `replace ok（替换 ${edits.length} 处${modeNote}）`, replaced: edits.length, positions, modes };
        };

        if (dryRun) {
            return {
                dryRun: true,
                message: `replace 预览：将替换 ${edits.length} 处${modeNote}，未写入；确认请调用 confirm(tool="replace", key="${key}")`,
                replaced: edits.length,
                positions,
                modes
            };
        }
        return PENDING.func();
    }
};

export const recovery = {
    schema: {
        "type": "function",
        "function": {
            "name": "recovery",
            "description": "【编辑】退回到最近的一次更改。默认只预览（dryRun=true）。预览模式返回内容差异，每个文档只保留单层历史。",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": { "type": "string", "description": "词条键名" },
                    "dryRun": { "type": "boolean", "description": "是否仅预览，默认 true ，预览和确认中间不能调用其他工具" }
                },
                "required": ["key"]
            }
        }
    },
    handler(ctx, args) {
        const key = args.key;
        const dryRun = args.dryRun;
        const now = runtime.history[key];
        if (!now) return { error: "没有对应历史更改" };
        const old = ctx.memory_map[key];
        if (!old) return { error: "找不到对应词条key:" + key };

        // 缓存任务
        PENDING.tool = 'recovery';
        PENDING.key = key;
        PENDING.func = function () {
            runtime.history[key] = JSON.parse(JSON.stringify(old));
            old.memory = now.memory;
            old.updated_at = formatDate();
            // 过期任务，避免重复执行
            PENDING.func = PENDING.key = PENDING.tool = null;
            return { dryRun: false, message: `recovery ok` };
        };

        if (dryRun) {
            return diff(now.memory, old.memory);
        }

        return PENDING.func();
    }
};

export const confirm = {
    schema: {
        "type": "function",
        "function": {
            "name": "confirm",
            "description": "【预览确认】应用上一步工具返回预览结果，避免写大量重复文本。",
            "parameters": {
                "type": "object",
                "properties": {
                    "tool": { "type": "string", "description": "上一轮调用的工具名" },
                    "key": { "type": "string", "description": "上一轮操作对应的词条键名（forgotten 传 keys 拼成的字符串）" }
                },
                "required": ["tool", "key"]
            }
        }
    },
    handler(ctx, args) {
        if (PENDING.tool == null) {
            return { error: "没有未完成的任务/任务已过期" };
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
    }
};