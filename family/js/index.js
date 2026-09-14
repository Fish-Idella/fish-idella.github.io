/**
 * family-table.js - 家族层级表格（链式重构 v2）
 * 依赖: family-store.js
 */
(function (global) {
    'use strict';

    const FamilyStore = global.FamilyStore;
    if (!FamilyStore) throw new Error('family-table.js 依赖 family-store.js，请先引入');

    // 虚拟成员名唯一化计数器
    let __virtualCount = -1;
    function makeVirtual(gender) {
        // 零宽字符做名字，渲染看不见，但保证 FamilyStore 内部键唯一
        const name = String(__virtualCount--);
        return FamilyStore.virtual(name, gender, false);
    }

    function esc(s) {
        const str = String(s == null ? '' : s);
        if (/^-\d+$/.test(str)) return '';
        return str;
    }

    function joinNames(names) {
        return names.filter(n => n && n.trim()).join(' / ');
    }

    const Table = {

        _config: {
            tableSelector: '#table',
            maxDepth: 5,
            maxRenderDepth: 5,
            autoVirtual: true
        },

        _layout: null,

        configure(opts) {
            Object.assign(this._config, opts || {});
            return this;
        },

        // ============================================================
        // 向下加载
        // ============================================================
        async loadDescendants(startMember, maxDepth) {
            maxDepth = maxDepth || this._config.maxDepth;
            const visited = new Set();
            let cur = new Set([String(startMember.id)]);

            for (let d = 1; d <= maxDepth; d++) {
                for (const id of cur) {
                    if (visited.has(id)) continue;
                    visited.add(id);
                    await FamilyStore.ensureLoaded(id);
                }
                const sps = new Set();
                for (const id of cur) {
                    const m = FamilyStore.getById(id);
                    if (!m) continue;
                    for (const sid of m.spouses) {
                        const s = String(sid);
                        if (/^\d+$/.test(s) && !visited.has(s)) sps.add(s);
                    }
                }
                for (const sid of sps) {
                    visited.add(sid);
                    await FamilyStore.ensureLoaded(sid);
                }
                if (d >= maxDepth) break;
                const all = new Set([...cur, ...sps]);
                const next = new Set();
                for (const id of all) {
                    const m = FamilyStore.getById(id);
                    if (!m) continue;
                    for (const cid of m.children) {
                        const c = String(cid);
                        if (/^\d+$/.test(c) && !visited.has(c)) next.add(c);
                    }
                }
                if (next.size === 0) break;
                cur = next;
            }
        },

        // ============================================================
        // 构建布局
        // ============================================================
        buildLayout(root) {
            const cfg = this._config;
            const maxRow = cfg.maxRenderDepth * 2;   // 5 代 = 10 行

            // ---------- 第 0 行：根 ----------
            const rootNode = this._makeMaster([root], 0);
            const assignedMembers = new Set();   // 每个真实/虚拟成员只归属一对
            const rows = [[rootNode]];

            for (let r = 0; r < maxRow; r += 2) {
                let masterRow = rows[r];
                if (!masterRow || masterRow.length === 0) break;

                // ---------- 合并共妻兄弟（第 0 行不合并） ----------
                if (r > 0) {
                    masterRow = this._mergeSharedSpouse(masterRow, rows[r - 1]);
                    rows[r] = masterRow;
                }

                // ---------- 构建配偶行 ----------
                const spouseMap = new Map();
                for (const mn of masterRow) {
                    for (const m of mn.members) {
                        let spouses = FamilyStore.getSpouses(m);
                        if (spouses.length === 0 && cfg.autoVirtual) {
                            spouses = [makeVirtual(m.gender === 'M' ? 'F' : 'M')];
                        }
                        for (const sp of spouses) {
                            const spId = String(sp.id);
                            if (!spouseMap.has(spId)) {
                                spouseMap.set(spId, { spouse: sp, masters: [] });
                            }
                            const entry = spouseMap.get(spId);
                            if (!entry.masters.includes(mn)) entry.masters.push(mn);
                        }
                    }
                }

                const spouseRow = [];
                for (const [spId, entry] of spouseMap) {
                    spouseRow.push({
                        isSpouse: true,
                        member: entry.spouse,
                        masters: entry.masters,
                        children: [],
                        row: r + 1,
                        chain: null,
                        colspan: 1,
                        col: 0
                    });
                }
                rows[r + 1] = spouseRow;

                // ---------- 最后一代：到此为止，不再生成下一代主人 ----------
                if (r + 2 >= maxRow) break;

                // ---------- 收集孩子 → 构建下一主人行 ----------
                const nextMasterRow = [];
                for (const spNode of spouseRow) {
                    const seen = new Set();
                    const kids = [];

                    // 该配偶当前所有丈夫的 id 集合（用于兜底时的父亲校验）
                    const masterIds = new Set();
                    for (const mn of spNode.masters) {
                        for (const m of mn.members) masterIds.add(String(m.id));
                    }

                    // 1) 正式路径：getChildrenOf 已经做了 inThisPair 校验
                    for (const mn of spNode.masters) {
                        for (const m of mn.members) {
                            const cs = FamilyStore.getChildrenOf(m, spNode.member);
                            for (const c of cs) {
                                if (seen.has(c.id)) continue;
                                if (assignedMembers.has(c.id)) continue;   // 全局去重
                                seen.add(c.id);
                                kids.push(c);
                                assignedMembers.add(c.id);
                            }
                        }
                    }

                    // 2) 兜底：扫 sp.children，但必须校验父亲
                    if (kids.length === 0 && spNode.member.children) {
                        for (const cid of spNode.member.children) {
                            if (seen.has(cid)) continue;
                            if (assignedMembers.has(cid)) continue;
                            const c = FamilyStore.getById(cid);
                            if (!c) continue;

                            // 关键：父亲必须为空（未知），或正好是本对的某个丈夫
                            const fatherId = c.father == null ? '' : String(c.father);
                            if (fatherId !== '' && !masterIds.has(fatherId)) continue;

                            seen.add(cid);
                            kids.push(c);
                            assignedMembers.add(cid);
                        }
                    }

                    // 3) 补虚拟孩子
                    if (kids.length === 0 && cfg.autoVirtual) {
                        const v = makeVirtual(spNode.member.gender === 'M' ? 'F' : 'M');
                        kids.push(v);
                        assignedMembers.add(v.id);
                    }

                    spNode.children = kids.map(c => this._makeMaster([c], r + 2));
                    for (const cNode of spNode.children) nextMasterRow.push(cNode);
                }
                rows[r + 2] = nextMasterRow;
            }

            // ---------- 保险：截断多余行 ----------
            if (rows.length > maxRow) rows.length = maxRow;

            // ---------- 分配链 ----------
            this._assignChains(rows);

            // ---------- 计算宽度 ----------
            // 在 buildLayout 里，把 _computeWidths(rows) 替换成下面这段：

            // ---------- 收集最后一行的所有叶子链 ----------
            const lastRow = rows[rows.length - 1] || [];
            const leafChains = lastRow
                .map(n => n.chain ? n.chain.join('.') : '')
                .filter(p => p !== '');

            // ---------- 精确前缀计数 ----------
            function countLeaves(chainArr) {
                if (!chainArr || chainArr.length === 0) return 1;
                const prefix = chainArr.join('.');
                const dot = prefix + '.';
                let n = 0;
                for (const p of leafChains) {
                    if (p === prefix || p.startsWith(dot)) n++;
                }
                return Math.max(n, 1);
            }

            // ---------- 给每个节点赋 colspan ----------
            for (const row of rows) {
                if (!row) continue;
                for (const node of row) {
                    node.colspan = countLeaves(node.chain);
                }
            }

            // ---------- 分配列 ----------
            for (const row of rows) {
                if (!row) continue;
                let col = 0;
                for (const node of row) {
                    node.col = col;
                    col += node.colspan;
                }
            }

            const totalCols = (rows[0] || []).reduce((s, n) => s + n.colspan, 0);
            this._layout = { rows, totalCols };
            return this._layout;
        },

        // ---------- 创建主人节点 ----------
        _makeMaster(members, row) {
            return {
                isSpouse: false,
                members: members.slice(),
                children: [],
                row: row,
                chain: null,
                colspan: 1,
                col: 0
            };
        },

        // ============================================================
        // 合并共妻兄弟：共享同一个配偶集合的主人合并成一个 td
        // ============================================================
        _mergeSharedSpouse(masterRow, parentRow) {
            // 每个主人的配偶集合
            const spMap = new Map();
            for (const mn of masterRow) {
                const set = new Set();
                for (const m of mn.members) {
                    for (const sp of FamilyStore.getSpouses(m)) set.add(String(sp.id));
                }
                spMap.set(mn, set);
            }

            const seen = new Set();
            const result = [];
            const mapping = new Map(); // 原节点 → 合并节点

            for (const mn of masterRow) {
                if (seen.has(mn)) continue;
                const mySp = spMap.get(mn);
                const group = [mn];
                seen.add(mn);

                if (mySp.size > 0) {
                    for (const other of masterRow) {
                        if (seen.has(other)) continue;
                        const oSp = spMap.get(other);
                        if (oSp.size !== mySp.size) continue;
                        let same = true;
                        for (const s of mySp) {
                            if (!oSp.has(s)) { same = false; break; }
                        }
                        if (same) {
                            group.push(other);
                            seen.add(other);
                        }
                    }
                }

                if (group.length === 1) {
                    result.push(mn);
                } else {
                    const allMembers = group.flatMap(g => g.members);
                    const merged = {
                        isSpouse: false,
                        members: allMembers,
                        children: [],
                        row: mn.row,
                        chain: null,
                        colspan: 1,
                        col: 0,
                        mergedFrom: group
                    };
                    result.push(merged);
                    for (const g of group) mapping.set(g, merged);
                }
            }

            // 更新父配偶行的 children 引用
            if (parentRow) {
                for (const sp of parentRow) {
                    if (!sp.children || sp.children.length === 0) continue;
                    const newChildren = [];
                    const seenC = new Set();
                    for (const c of sp.children) {
                        const cc = mapping.get(c) || c;
                        if (seenC.has(cc)) continue;
                        seenC.add(cc);
                        newChildren.push(cc);
                    }
                    sp.children = newChildren;
                }
            }

            return result;
        },

        // ============================================================
        // 分配位置链
        //   偶数行（主人）：chain = 父配偶链 + 孩子在父 children 中的索引
        //   奇数行（配偶）：chain = 父主人链 + 配偶在父配偶列表中的索引
        // ============================================================
        _assignChains(rows) {
            if (rows[0] && rows[0][0]) rows[0][0].chain = [0];

            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                if (!row) continue;
                const parentRow = rows[r - 1] || [];

                if (r % 2 === 1) {
                    // 配偶行
                    for (const node of row) {
                        if (node.chain) continue;
                        const masters = node.masters || [];
                        let done = false;
                        for (const m of masters) {
                            if (!m.chain || !m.members[0]) continue;
                            const mSpouses = FamilyStore.getSpouses(m.members[0]);
                            let idx = 0;
                            for (let i = 0; i < mSpouses.length; i++) {
                                if (String(mSpouses[i].id) === String(node.member.id)) {
                                    idx = i; break;
                                }
                            }
                            node.chain = [...m.chain, idx];
                            done = true;
                            break;
                        }
                        if (!done) node.chain = [row.indexOf(node)];
                    }
                } else {
                    // 主人行
                    for (const node of row) {
                        if (node.chain) continue;
                        const firstMember = node.members[0];
                        let done = false;
                        for (const sp of parentRow) {
                            if (!sp.chain || !sp.children) continue;
                            const idx = sp.children.findIndex(c =>
                                c.members && c.members.some(m => m.id === firstMember.id)
                            );
                            if (idx >= 0) {
                                node.chain = [...sp.chain, idx];
                                done = true;
                                break;
                            }
                        }
                        if (!done) node.chain = [row.indexOf(node)];
                    }
                }
            }
        },

        // ============================================================
        // 宽度
        //   奇数行（配偶）：colspan = max(1, Σ 孩子 colspan)
        //   偶数行（主人）：colspan = Σ 配偶 colspan
        // ============================================================
        _computeWidths(rows) {
            const lastRowIdx = rows.length - 1;
            for (let r = rows.length - 1; r >= 0; r--) {
                const row = rows[r];
                if (!row) continue;

                if (r % 2 === 1) {
                    // 最后一行的配偶：不再有下一代可参考，固定 1
                    if (r === lastRowIdx) {
                        for (const node of row) node.colspan = 1;
                        continue;
                    }
                    for (const node of row) {
                        let w = 0;
                        for (const c of node.children) w += c.colspan;
                        node.colspan = Math.max(w, 1);
                    }
                } else {
                    const spouseRow = rows[r + 1] || [];
                    for (const node of row) {
                        let w = 0;
                        for (const sp of spouseRow) {
                            if (sp.masters && sp.masters.includes(node)) w += sp.colspan;
                        }
                        node.colspan = Math.max(w, 1);
                    }
                }
            }
        },

        // ============================================================
        // 渲染 HTML
        // ============================================================
        toHtml(root) {
            const layout = this.buildLayout(root);
            const out = [];

            for (let r = 0; r < layout.rows.length; r++) {
                const row = layout.rows[r];
                if (!row || row.length === 0) continue;

                const tds = [];

                // 代际标签（偶数行）
                if (r % 2 === 0) {
                    tds.push(`<td rowspan="2" class="sign">${esc(this._genLabel(layout, r))}</td>`);
                }

                const sorted = [...row].sort((a, b) => a.col - b.col);
                for (const node of sorted) {
                    const chainStr = node.chain ? node.chain.join('.') : '';

                    if (node.isSpouse) {
                        const cls = (node.member.virtual ? 'virtual ' : 'has ') + 'spouse';
                        tds.push(`<td colspan="${node.colspan}" class="${cls}" data-chain="${chainStr}">${esc(node.member.name)}</td>`);
                    } else {
                        const names = node.members.map(m => m.name);
                        const anyReal = node.members.some(m => !m.virtual);
                        const display = node.members.length > 1 ? joinNames(names) : names[0];
                        const cls = (anyReal ? 'has ' : 'virtual ') + 'master';
                        tds.push(`<td colspan="${node.colspan}" class="${cls}" data-chain="${chainStr}">${esc(display)}</td>`);
                    }
                }
                out.push(`<tr>${tds.join('')}</tr>`);
            }
            return out.join('');
        },

        _genLabel(layout, r) {
            const signs = new Set();
            for (const rr of [r, r + 1]) {
                const row = layout.rows[rr];
                if (!row) continue;
                for (const n of row) {
                    if (n.isSpouse) {
                        if (!n.member.virtual && n.member.sign) signs.add(n.member.sign);
                    } else {
                        for (const m of n.members) {
                            if (!m.virtual && m.sign) signs.add(m.sign);
                        }
                    }
                }
            }
            return signs.size === 0 ? `第${r / 2 + 1}代` : [...signs].join('/');
        },

        render(root, options) {
            options = options || {};
            const sel = options.tableSelector || this._config.tableSelector;
            const tbl = document.querySelector(sel);
            if (!tbl) { console.warn('FamilyTable.render: 找不到 ' + sel); return; }
            (tbl.querySelector('tbody') || tbl).innerHTML = this.toHtml(root);
        },

        showLoading(options) {
            options = options || {};
            const tbl = document.querySelector(options.tableSelector || this._config.tableSelector);
            if (!tbl) return;
            (tbl.querySelector('tbody') || tbl).innerHTML = '<tr><td style="padding:20px;color:#888;">加载中…</td></tr>';
        },

        showMessage(text, options) {
            options = options || {};
            const tbl = document.querySelector(options.tableSelector || this._config.tableSelector);
            if (!tbl) return;
            (tbl.querySelector('tbody') || tbl).innerHTML = `<tr><td style="padding:20px;color:#888;">${esc(text)}</td></tr>`;
        },

        getLayout() { return this._layout; }
    };

    global.FamilyTable = Table;

})(typeof window !== 'undefined' ? window : globalThis);

document.addEventListener('DOMContentLoaded', function () {
    FamilyStore.configure({ apiUrl: '/api/family/query' });

    function getNameById(id) {
        const m = FamilyStore.get(String(id));
        const name = String(m?.name ?? id);
        return name === "null" ? '---' : name;
    }

    const vm_list = PuSet.mvvm({
        target: document.getElementById("find-list"),
        selector: "&>li",
        data: [],
        layout(li, value) {
            const m = FamilyStore.get(String(value.id));
            if (!m) return;
            li.querySelector('.name').textContent = `${m.name} (${m.gender === 'M' ? '男' : '女'})`;
            li.querySelector('.sign').textContent = m.sign;
            li.querySelector('.grampa').textContent = getNameById(m.grampa);
            li.querySelector('.father').textContent = getNameById(m.father);
            li.querySelector('.mother').textContent = getNameById(m.mother);
            li.querySelector('.birthday').textContent = value.birthday;
            li.querySelector('.residence').textContent = value.residence;
        }
    }).on('click', async function (event, value, key) {
        await onSelectMember(FamilyStore.get(String(value.id)))
    });

    document.getElementById('bt-find').addEventListener('click', async function () {
        const value = document.getElementById('find-in').value.trim();
        const key = /^\d+$/.test(value) ? 'id' : 'name';
        const data = await FamilyStore.fetch(value, key);
        vm_list.update(data.result);
    });

    async function onSelectMember(m) {
        FamilyStore.resetDerived();
        await FamilyTable.loadDescendants(m, 5);
        if (FamilyStore.preloadAllRefs) await FamilyStore.preloadAllRefs();
        FamilyStore.resolveRelations();
        FamilyTable.render(m);
    }
});