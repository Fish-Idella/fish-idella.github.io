/**
 * tools/editor.mjs
 * 词条正文精准编辑：SEARCH/REPLACE 块解析、缩进模糊匹配、预览与确认。
 */

import { formatDate } from '../core.mjs';
import { PENDING, runtime } from '../runtime.mjs';

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
 */
export function replace(ctx, args) {
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
    const edits = [];
    const modes = [];
    for (let i = 0; i < parsed.list.length; i++) {
        const { search, replace: rep } = parsed.list[i];
        if (!search) {
            return { error: `第 ${i + 1} 个块的 SEARCH 为空` };
        }

        const at = old.indexOf(search);
        if (at !== -1) {
            if (old.indexOf(search, at + 1) !== -1) {
                return { error: `第 ${i + 1} 个块的 SEARCH 在文件中不唯一，请扩大上下文使其唯一` };
            }
            edits.push({ start: at, end: at + search.length, text: rep });
            modes.push('strict');
            continue;
        }

        const fuzzy = matchIgnoringIndent(old, search, rep);
        if (fuzzy.error) {
            return { error: `第 ${i + 1} 个块：${fuzzy.error}` };
        }
        edits.push({ start: fuzzy.start, end: fuzzy.end, text: fuzzy.text });
        modes.push('indent-insensitive');
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

export function recovery(ctx, args) {
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

export function confirm(ctx, args) {
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