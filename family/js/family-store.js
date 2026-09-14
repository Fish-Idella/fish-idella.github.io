/**
 * family-store.js - 家族成员数据管理
 * 无依赖，可在任何页面复用
 *
 * 使用：
 *   <script src="js/family-store.js"></script>
 *   FamilyStore.configure({ apiUrl: '/api/family/query' });
 *   await FamilyStore.fetchById('1');
 *   const ref = await FamilyStore.toRef('李世民');  // "1001"
 *   const ref = await FamilyStore.toRef('张三');    // "张三"
 */
(function (global) {
    'use strict';

    const VIRTUAL_PREFIX = '__v__';

    function normalizeId(v) {
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
    }

    function parseArr(s) {
        if (!s) return [];
        if (Array.isArray(s)) return s;
        try { return JSON.parse(s); } catch (e) { return []; }
    }

    function escapeRegex(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const Store = {

        // ============================================================
        // 内部状态
        // ============================================================
        byId: new Map(),
        byName: new Map(),
        virtualIds: new Set(),
        _config: {
            apiUrl: '/api/family/query',
            fetchEnabled: true
        },

        // ============================================================
        // 配置
        // ============================================================
        configure(opts) {
            if (!opts) return this;
            if (opts.apiUrl) this._config.apiUrl = opts.apiUrl;
            if (typeof opts.fetchEnabled === 'boolean') this._config.fetchEnabled = opts.fetchEnabled;
            return this;
        },

        // ============================================================
        // 基础操作
        // ============================================================
        reset() {
            this.byId.clear();
            this.byName.clear();
            this.virtualIds.clear();
        },

        has(id) {
            return this.byId.has(String(id));
        },

        isVirtual(id) {
            return String(id).startsWith(VIRTUAL_PREFIX);
        },

        isExternal(id) {
            const m = this.getById(id);
            return m ? m.external === true : false;
        },

        getById(id) {
            if (id == null || id === '') return null;
            return this.byId.get(String(id)) || null;
        },

        getByName(name) {
            const set = this.byName.get(String(name));
            if (!set || set.size === 0) return null;
            const realIds = [...set].filter(id => !this.isVirtual(id));
            if (realIds.length > 0) return this.byId.get(realIds[0]);
            return this.byId.get([...set][0]) || null;
        },

        getAllByName(name) {
            const set = this.byName.get(String(name));
            if (!set || set.size === 0) return [];
            return [...set].map(id => this.byId.get(id)).filter(Boolean);
        },

        /**
         * 按 id 或名字查成员，返回单个
         * 命中 id 优先；名字命中优先返回真实成员
         */
        get(ref) {
            if (ref == null || ref === '') return null;
            const s = String(ref);
            if (this.byId.has(s)) return this.byId.get(s);
            return this.getByName(s);
        },

        all() {
            return [...this.byId.values()];
        },

        // ============================================================
        // 数据写入
        // ============================================================
        add(raw) {
            if (!raw || raw.id == null) return null;
            const id = String(raw.id);
            let m = this.byId.get(id);
            if (!m) {
                m = {
                    id, name: '', gender: 'M',
                    sign: '',
                    grampa: null,
                    external: false,
                    birthday: '',
                    residence: '',
                    life: '',
                    father: null, mother: null,
                    spouses: [], siblings: [], children: [],
                    virtual: false, _resolved: false,
                    _raw: null, _filled: false
                };
                this.byId.set(id, m);
            }
            if (raw.name) m.name = String(raw.name);
            if (raw.gender != null) m.gender = String(raw.gender) === '1' ? 'M' : 'F';
            if (raw.sign != null) m.sign = String(raw.sign).trim();
            if (raw.grampa != null) m.grampa = normalizeId(raw.grampa);
            if (raw.birthday != null) m.birthday = String(raw.birthday);
            if (raw.residence != null) m.residence = String(raw.residence);
            if (raw.life != null) m.life = String(raw.life);
            if (raw.grandfather != null && m.grampa == null) {
                m.grampa = normalizeId(raw.grandfather);
            }

            if (!m._raw) {
                m._raw = {
                    father: normalizeId(raw.father) || '',
                    mother: normalizeId(raw.mother) || '',
                    spouses: parseArr(raw.spouses).map(String),
                    siblings: parseArr(raw.siblings).map(String),
                    children: parseArr(raw.children).map(String),
                    grampa: normalizeId(raw.grampa || raw.grandfather)
                };
            }

            if (!m._filled) {
                m._filled = true;
                m.father = m._raw.father || null;
                m.mother = m._raw.mother || null;
                m.spouses = [...m._raw.spouses];
                m.siblings = [...m._raw.siblings];
                m.children = [...m._raw.children];
            }

            if (m.name) {
                if (!this.byName.has(m.name)) this.byName.set(m.name, new Set());
                this.byName.get(m.name).add(id);
            }
            return m;
        },

        /**
         * 批量收入 { result: [], relevant: [] } 结构
         */
        collectAll(data) {
            if (!data) return 0;
            const all = [...(data.result || []), ...(data.relevant || [])];
            all.forEach(raw => this.add(raw));
            return all.length;
        },

        resetDerived() {
            for (const vid of this.virtualIds) {
                const vm = this.byId.get(vid);
                if (vm && vm.name) {
                    const set = this.byName.get(vm.name);
                    if (set) set.delete(vid);
                }
                this.byId.delete(vid);
            }
            this.virtualIds.clear();

            for (const m of this.byId.values()) {
                if (m.virtual || !m._raw) continue;
                m.father = m._raw.father || null;
                m.mother = m._raw.mother || null;
                m.spouses = [...m._raw.spouses];
                m.siblings = [...m._raw.siblings];
                m.children = [...m._raw.children];
                m.grampa = m._raw.grampa;
                m._resolved = false;
            }
        },

        // ============================================================
        // 虚拟节点
        // ============================================================
        virtual(name, gender, external) {
            const n = String(name);
            const realSet = this.byName.get(n);
            if (realSet) {
                const realIds = [...realSet].filter(id => !this.isVirtual(id));
                if (realIds.length > 0) return this.byId.get(realIds[0]);
            }
            const key = VIRTUAL_PREFIX + n;
            if (this.byId.has(key)) {
                const existing = this.byId.get(key);
                if (existing.external && external === false) existing.external = false;
                return existing;
            }
            const m = {
                id: key, name: n, gender: gender || 'M',
                sign: '',
                grampa: null,
                external: external === true,
                father: null, mother: null,
                spouses: [], siblings: [], children: [],
                virtual: true, _resolved: true,
                _raw: null, _filled: true
            };
            this.byId.set(key, m);
            this.virtualIds.add(key);
            if (!this.byName.has(n)) this.byName.set(n, new Set());
            this.byName.get(n).add(key);
            return m;
        },

        /**
         * 字符串引用 → id
         *   - 命中真实成员 → 真实 id
         *   - 纯数字但未加载 → 视为族内（id 保留）
         *   - 名字未命中 → 创建虚拟节点，external 由 forceClan 决定
         */
        resolveRef(ref, preferGender, forceClan) {
            if (ref == null || ref === '') return null;
            const s = String(ref).trim();
            if (!s) return null;
            if (this.byId.has(s)) return s;
            const named = this.getByName(s);
            if (named) return named.id;

            const isNumeric = /^\d+$/.test(s);
            const external = forceClan === true ? false : !isNumeric;
            return this.virtual(s, preferGender, external).id;
        },

        // ============================================================
        // API
        // ============================================================
        async fetch(value, key) {
            if (!this._config.fetchEnabled) {
                throw new Error('FamilyStore: fetch disabled');
            }
            const body = new URLSearchParams({
                key: key,
                value: String(value),
                oneself: 'false'
            }).toString();

            const res = await fetch(this._config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: body
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            this.collectAll(data);
            return data;
        },

        async fetchById(id) {
            return this.fetch(id, 'id');
        },

        async fetchByName(name) {
            return this.fetch(name, 'name');
        },

        async ensureLoaded(id) {
            const sid = String(id);
            if (!/^\d+$/.test(sid)) return null;
            if (this.has(sid)) return this.getById(sid);
            try {
                await this.fetchById(sid);
            } catch (e) {
                console.warn('FamilyStore.fetchById failed id=' + sid, e);
            }
            return this.getById(sid) || null;
        },

        // ============================================================
        // 表单辅助：判断该用 id 还是名字
        // ============================================================

        /**
         * 把用户输入转成"存数据库"的引用
         *   - 输入命中族内真实成员 → 返回其 id（字符串）
         *   - 输入未命中（外姓）→ 返回原始名字
         *   - 输入为空 → 返回 null
         *
         * @param {string} input        用户输入的名字或 id
         * @param {object} options
         *   - fetchIfMissing: 本地找不到时是否调 API 查（默认 true）
         * @returns {Promise<string|null>}
         */
        async toRef(input, options) {
            options = options || {};
            const s = String(input == null ? '' : input).trim();
            if (!s) return null;

            // 1. 命中已有 id（可能是族内真实成员）
            if (this.has(s)) return s;

            // 2. 纯数字 → 视为 id，尝试加载
            if (/^\d+$/.test(s)) {
                if (options.fetchIfMissing !== false) {
                    try { await this.fetchById(s); } catch (e) { /* ignore */ }
                }
                // 加载成功或失败都返回 id 本身，由调用者自行判断
                return s;
            }

            // 3. 按名字查本地
            const local = this.getByName(s);
            if (local) return local.id;

            // 4. 按名字查 API
            if (options.fetchIfMissing !== false) {
                try { await this.fetchByName(s); } catch (e) { /* ignore */ }
            }
            const remote = this.getByName(s);
            if (remote) return remote.id;

            // 5. 都没命中 → 外姓，返回原名字
            return s;
        },

        // 预加载所有 _raw 引用里的纯数字 id，避免解析成虚拟节点
        async preloadAllRefs() {
            const ids = new Set();
            for (const m of this.all()) {
                if (!m._raw) continue;
                for (const f of ['father', 'mother', 'grampa']) {
                    const v = m._raw[f];
                    if (v && /^\d+$/.test(String(v))) ids.add(String(v));
                }
                for (const f of ['spouses', 'siblings', 'children']) {
                    for (const v of (m._raw[f] || [])) {
                        if (v && /^\d+$/.test(String(v))) ids.add(String(v));
                    }
                }
            }
            for (const id of ids) {
                if (this.has(id)) continue;
                try { await this.fetchById(id); } catch (e) { /* ignore */ }
            }
        },

        /**
         * 查询候选：用于表单自动补全
         * 返回 { input, isId, isExternal, matches: [member...] }
         *
         * @param {string} input
         * @param {object} options
         *   - fetchIfMissing: 本地为空时是否调 API 查（默认 true）
         *   - limit: 最多返回多少条候选
         */
        async lookup(input, options) {
            options = options || {};
            const s = String(input == null ? '' : input).trim();
            const limit = options.limit || 20;

            if (!s) {
                return { input: s, isId: false, isExternal: false, matches: [] };
            }

            const seen = new Set();
            const matches = [];

            const collect = (m) => {
                if (!m || seen.has(m.id)) return;
                seen.add(m.id);
                matches.push(m);
            };

            // 本地按 id
            if (this.has(s)) collect(this.getById(s));

            // 本地按名字（可能多个同名）
            this.getAllByName(s).forEach(collect);

            // 本地模糊匹配（前缀）
            if (matches.length === 0) {
                const re = new RegExp('^' + escapeRegex(s));
                for (const m of this.byId.values()) {
                    if (m.virtual) continue;
                    if (re.test(m.name)) collect(m);
                    if (matches.length >= limit) break;
                }
            }

            // 远程查询
            if (matches.length === 0 && options.fetchIfMissing !== false) {
                try {
                    if (/^\d+$/.test(s)) {
                        await this.fetchById(s);
                        if (this.has(s)) collect(this.getById(s));
                    } else {
                        await this.fetchByName(s);
                        this.getAllByName(s).forEach(collect);
                    }
                } catch (e) { /* ignore */ }
            }

            return {
                input: s,
                isId: /^\d+$/.test(s),
                isExternal: matches.length === 0 && !/^\d+$/.test(s),
                matches: matches.slice(0, limit)
            };
        },

        /**
         * 简单存在性判断
         */
        async existsAnywhere(input, options) {
            const r = await this.lookup(input, options);
            return r.matches.length > 0;
        },

        // ============================================================
        // 关系查询（供表格模块使用）
        // ============================================================
        getSpouses(m) {
            if (!m || !m.spouses) return [];
            return m.spouses.map(id => this.getById(id)).filter(Boolean);
        },

        getChildOwner(c, m, sp) {
            if (c.grampa === m.id) return m.id;
            if (c.grampa === sp.id) return sp.id;

            const mInClan = !m.external;
            const spInClan = !sp.external;

            const isFatherOfM = c.father === m.id;
            const isFatherOfSp = c.father === sp.id;
            const isMotherOfM = c.mother === m.id;
            const isMotherOfSp = c.mother === sp.id;

            if (isFatherOfM && mInClan) return m.id;
            if (isFatherOfSp && spInClan) return sp.id;
            if (isMotherOfM && mInClan) return m.id;
            if (isMotherOfSp && spInClan) return sp.id;

            if (isFatherOfM) return m.id;
            if (isFatherOfSp) return sp.id;
            if (isMotherOfM) return m.id;
            if (isMotherOfSp) return sp.id;
            return m.id;
        },

        getChildrenOf(m, sp) {
            const result = [];
            for (const c of this.all()) {
                if (c.virtual && c.father == null && c.mother == null) continue;

                const inThisPair =
                    (c.father === m.id && c.mother === sp.id) ||
                    (c.father === sp.id && c.mother === m.id);
                if (!inThisPair) continue;

                const ownerId = this.getChildOwner(c, m, sp);
                if (ownerId !== m.id) continue;

                result.push(c);
            }
            return result;
        },

        // ============================================================
        // 关系补全
        // ============================================================
        resolveRelations() {

            // 1. 字符串 → id
            for (const m of this.all()) {
                if (m.virtual) continue;
                if (m._resolved) continue;

                if (m.father) m.father = this.resolveRef(m.father, 'M');
                if (m.mother) m.mother = this.resolveRef(m.mother, 'F');

                const preferSpouseGender = m.gender === 'M' ? 'F' : 'M';
                m.spouses = m.spouses
                    .map(s => this.resolveRef(s, preferSpouseGender))
                    .filter(id => id && id !== m.id);

                m.children = m.children
                    .map(c => this.resolveRef(c, null, true))
                    .filter(id => id && id !== m.id);
            }

            // 1.5 grampa 解析
            for (const m of this.all()) {
                if (m.virtual) continue;
                if (!m.grampa) continue;
                const resolved = this.get(m.grampa);
                if (resolved && !resolved.virtual) {
                    m.grampa = resolved.id;
                } else {
                    m.grampa = null;
                }
            }

            // 1.6 孤儿孩子补全父母
            for (const m of this.all()) {
                if (m.virtual) continue;
                for (const cid of [...m.children]) {
                    const child = this.getById(cid);
                    if (!child) continue;
                    if (child.father || child.mother) continue;

                    let targetSpouseId = m.spouses[0] || null;
                    if (child.grampa) {
                        const matched = m.spouses.find(sid => sid === child.grampa);
                        if (matched) targetSpouseId = matched;
                    }

                    if (m.gender === 'M') {
                        child.father = m.id;
                        if (targetSpouseId) child.mother = targetSpouseId;
                    } else {
                        child.mother = m.id;
                        if (targetSpouseId) child.father = targetSpouseId;
                    }

                    if (targetSpouseId) {
                        const sp = this.getById(targetSpouseId);
                        if (sp && !sp.children.includes(child.id)) sp.children.push(child.id);
                    }
                }
            }

            // 2. 反向补全父/母 children
            for (const m of this.all()) {
                if (m.virtual) continue;
                if (m.father) {
                    const f = this.getById(m.father);
                    if (f && !f.children.includes(m.id)) f.children.push(m.id);
                }
                if (m.mother) {
                    const mo = this.getById(m.mother);
                    if (mo && !mo.children.includes(m.id)) mo.children.push(m.id);
                }
            }

            // 2.5 通过孩子关系补全配偶对
            for (const child of this.all()) {
                if (!child.father || !child.mother) continue;
                const f = this.getById(child.father);
                const m = this.getById(child.mother);
                if (!f || !m) continue;
                if (f.id === m.id) continue;
                if (!f.spouses.includes(m.id)) f.spouses.push(m.id);
                if (!m.spouses.includes(f.id)) m.spouses.push(f.id);
            }

            // 3. 配偶双向绑定
            for (const m of this.all()) {
                for (const sid of [...m.spouses]) {
                    const sp = this.getById(sid);
                    if (!sp) continue;
                    if (!sp.spouses.includes(m.id)) sp.spouses.push(m.id);
                }
            }

            // 4. 孩子归属兜底
            for (const parent of this.all()) {
                if (parent.virtual) continue;
                if (parent.spouses.length === 0) continue;
                const primarySpouseId = parent.spouses[0];

                for (const cid of [...parent.children]) {
                    const child = this.getById(cid);
                    if (!child || child.virtual) continue;

                    const isMine = child.father === parent.id || child.mother === parent.id;
                    if (!isMine) continue;

                    let claimed = false;
                    for (const sid of parent.spouses) {
                        const sp = this.getById(sid);
                        if (!sp) continue;
                        if ((child.father === parent.id && child.mother === sp.id) ||
                            (child.father === sp.id && child.mother === parent.id)) {
                            claimed = true;
                            break;
                        }
                    }
                    if (claimed) continue;

                    if (parent.gender === 'M') {
                        if (!child.father) child.father = parent.id;
                        if (!child.mother) child.mother = primarySpouseId;
                    } else {
                        if (!child.mother) child.mother = parent.id;
                        if (!child.father) child.father = primarySpouseId;
                    }
                }
            }

            // 5. 无配偶有子女 → 补虚拟配偶
            for (const m of this.all()) {
                if (m.virtual) continue;
                if (m.spouses.length > 0) continue;
                if (m.children.length === 0) continue;
                const vm = this.virtual('', m.gender === 'M' ? 'F' : 'M', false);
                m.spouses.push(vm.id);
                vm.spouses.push(m.id);
                vm.children = m.children.slice();
            }

            // 6. 有配偶但该对无子女 → 补虚拟后代
            const seenPair = new Set();
            for (const m of this.all()) {
                for (const sid of m.spouses) {
                    const key = [m.id, sid].sort().join('|');
                    if (seenPair.has(key)) continue;
                    seenPair.add(key);
                    const sp = this.getById(sid);
                    if (!sp) continue;
                    const hasChild = this.all().some(c =>
                        (c.father === m.id && c.mother === sp.id) ||
                        (c.father === sp.id && c.mother === m.id)
                    );
                    // if (!hasChild) {
                    //     const vc = this.virtual('', sp.gender === 'M' ? 'F' : 'M', false);
                    //     vc.father = m.gender === 'M' ? m.id : sp.id;
                    //     vc.mother = m.gender === 'F' ? m.id : sp.id;
                    //     if (!sp.children.includes(vc.id)) sp.children.push(vc.id);
                    //     if (!m.children.includes(vc.id)) m.children.push(vc.id);
                    // }
                }
            }

            for (const m of this.all()) m._resolved = true;
        },

        // ============================================================
        // 调试
        // ============================================================
        debug() {
            return this.all().map(m => {
                let tag = '';
                if (m.virtual) tag = m.external ? ' [外姓]' : ' [虚拟]';
                return `[${m.id}] ${m.name}(${m.gender})${tag} ` +
                    `sign=${m.sign || '-'} grampa=${m.grampa || '-'} ` +
                    `F=${m.father || '-'} M=${m.mother || '-'} ` +
                    `SP=[${m.spouses.join(',')}] CH=[${m.children.join(',')}]`;
            }).join('\n');
        },

        stats() {
            const all = this.all();
            const real = all.filter(m => !m.virtual).length;
            const virtual = all.filter(m => m.virtual && !m.external).length;
            const external = all.filter(m => m.virtual && m.external).length;
            return { total: all.length, real, virtual, external };
        }
    };

    global.FamilyStore = Store;

    // 向后兼容旧的调试入口
    global.__Store = Store;

})(typeof window !== 'undefined' ? window : globalThis);