/**
 * add.js - 添加/修改族内成员（全异步版，接口分离）
 */
document.addEventListener('DOMContentLoaded', function () {

	FamilyStore.configure({ apiUrl: '/api/family/query' });

	const API_INSERT = '/api/family/insert';
	const API_UPDATE = '/api/family/update';

	// ============================================================
	// DOM 引用
	// ============================================================
	const _inputNameView = document.getElementById('input-name-view');
	const _findInput = document.getElementById('find-input');
	const _findSend = document.getElementById('find-send');
	const _findResult = document.getElementById('find-result');
	const _forceAdd = document.getElementById('force-add');

	const _name = document.getElementById('name');
	const _father = document.getElementById('father');
	const _mother = document.getElementById('mother');
	const _grampa = document.getElementById('grampa');
	const _gender = document.getElementById('gender');
	const _sign = document.getElementById('sign');
	const _birthday = document.getElementById('birthday');
	const _residence = document.getElementById('residence');
	const _life = document.getElementById('life');

	const _siblings = document.getElementById('siblings');
	const _siblingsAdd = _siblings.querySelector('.add');
	const _spouses = document.getElementById('spouses');
	const _spousesAdd = _spouses.querySelector('.add');
	const _children = document.getElementById('children');
	const _childrenAdd = _children.querySelector('.add');

	const _photoImage = document.getElementById('photo-image');
	const _photos = document.getElementById('photos');

	const _submit = document.getElementById('submit');
	const _reset = document.getElementById('reset');

	const _callbackView = document.getElementById('callback-view');
	const _callbackStatus = document.getElementById('callback-status');
	const _callbackMessage = document.getElementById('callback-message');

	let currentInput = null;

	// ============================================================
	// 通用工具
	// ============================================================
	function displayRef(ref) {
		if (!ref) return '';
		const m = FamilyStore.get(ref);
		return m ? m.name : String(ref);
	}

	/**
	 * 解析单个 ref 为成员对象。
	 * 支持：成员对象 / 纯数字 id / 人名（外姓、未入库）。
	 * 人名不再被丢弃，统一返回 {id:'', name}。
	 */
	async function resolveMember(ref) {
		if (ref == null) return null;

		// 1) 已经是成员对象
		if (typeof ref === 'object') {
			if (ref.id) return FamilyStore.get(String(ref.id)) || ref;
			if (ref.name) return { id: '', name: ref.name };
			return null;
		}

		const s = String(ref).trim();
		if (!s) return null;

		// 2) 纯数字 → 按 id 加载
		if (/^\d+$/.test(s)) {
			return FamilyStore.get(s) || await FamilyStore.ensureLoaded(s);
		}

		// 3) 人名 → store 里能命中就用它，否则原样返回（外姓 / 未入库）
		const byName = FamilyStore.get(s);
		if (byName && byName.name) return byName;

		return { id: '', name: s };
	}

	/** 容器里是否已存在对应按钮（按 id 或名字判定） */
	function hasRelationButton(parent, id, name) {
		const key = id ? String(id) : '';
		const btns = parent.querySelectorAll('a.button:not(.add)');
		for (const el of btns) {
			if (key && el.dataset.id && String(el.dataset.id) === key) return true;
			const elName = el.dataset.name || el.textContent.trim();
			if (name && elName === name) return true;
		}
		return false;
	}

	/** 收集容器内的引用（保持顺序，跳过占位/pending） */
	function collectRelations(parent) {
		const refs = [];
		parent.querySelectorAll('a.button:not(.add)').forEach(function (el) {
			if (el.dataset.pending === '1') return;
			const ref = el.dataset.id || el.dataset.name || el.textContent.trim();
			if (!ref || ref === '…') return;
			refs.push(ref);
		});
		return JSON.stringify(refs);
	}

	function clearRelations(parent) {
		parent.querySelectorAll('a.button:not(.add)').forEach(el => el.remove());
	}

	// ============================================================
	// 打开成员选择器
	// ============================================================
	PuSet("#name, #grampa, #father, #mother, #add-table input.add").on("click", function () {
		currentInput = this;
		_inputNameView.classList.remove('hide');
		_findInput.value = '';
		_findInput.focus();
	});

	PuSet("#input-name-view .button-back").on("click", function () {
		_inputNameView.classList.add('hide');
	});

	// ============================================================
	// 搜索结果列表渲染
	// ============================================================
	const vmFindList = PuSet.mvvm({
		target: document.getElementById('find-list'),
		selector: 'li',
		data: [],
		layout: function (target, value) {
			target.dataset.id = value.id;
			target.querySelector('img').src = '/mediae/icons/timg.jfif';
			target.querySelector('span.name').textContent = value.name || '';
			target.querySelector('span.sign').textContent = value.sign || '';
			target.querySelector('span.father').textContent = displayRef(value.father);
			target.querySelector('span.mother').textContent = displayRef(value.mother);
			target.querySelector('span.residence').textContent = value.residence || '';
		}
	});

	// ============================================================
	// 搜索
	// ============================================================
	PuSet("#find-send").on("click", async function () {
		const value = _findInput.value.trim();
		if (value.length < 2) {
			_findInput.focus();
			return;
		}

		const btn = this;
		btn.disabled = true;
		const originalValue = btn.value;
		btn.value = '查询中…';

		try {
			const data = await FamilyStore.fetch(value, 'name');
			const list = (data.result || [])
				.map(raw => FamilyStore.getById(String(raw.id)))
				.filter(Boolean);

			vmFindList.update(list);
			_findResult.classList.remove('hide');
		} catch (e) {
			console.error('搜索失败', e);
			alert('搜索失败：' + (e && e.message ? e.message : '未知错误'));
		} finally {
			btn.disabled = false;
			btn.value = originalValue || '查询';
		}
	});

	PuSet("#find-input").on("keydown", function (e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			_findSend.click();
		}
	});

	// ============================================================
	// 点击搜索结果
	// ============================================================
	PuSet(vmFindList.target).on("click", "li", async function () {
		const member = FamilyStore.getById(this.dataset.id);
		if (!member) return;

		if (currentInput && currentInput.classList.contains('add')) {
			await insertBefore(member, currentInput, currentInput.parentElement);
		} else if (currentInput === _name) {
			await applyMember(member);
		} else if (currentInput === _father) {
			await applyFather(member);
		} else if (currentInput === _mother) {
			_mother.value = member.name;
			_mother.dataset.id = member.id;
		} else if (currentInput === _grampa) {
			_grampa.value = member.name;
			_grampa.dataset.id = member.id;
		}

		_inputNameView.classList.add('hide');
	});

	// ============================================================
	// makeButton（异步，本地优先，缺则拉取；人名原样显示）
	// ============================================================
	// makeButton（异步，本地优先，缺则拉取）
	//   · 有真实 id 的成员 → 加 .has
	//   · 仅名字的虚拟成员（外姓 / 未入库）→ 不加 .has
	// ============================================================
	async function makeButton(refOrMember) {
		const a = document.createElement('a');
		a.className = 'button';
		a.dataset.id = '';
		a.dataset.name = '';

		// 1. 直接是成员对象
		if (refOrMember && typeof refOrMember === 'object') {
			if (refOrMember.id) {
				a.classList.add('has');
				a.dataset.id = refOrMember.id;
			}
			a.dataset.name = refOrMember.name || '';
			a.textContent = refOrMember.name || '';
			return a;
		}

		const ref = String(refOrMember == null ? '' : refOrMember);
		if (!ref) return a;

		// 2. 本地命中（store 里存的都是真实成员）
		const local = FamilyStore.get(ref);
		if (local && local.id) {
			a.classList.add('has');
			a.dataset.id = local.id;
			a.dataset.name = local.name || '';
			a.textContent = local.name || ref;
			return a;
		}

		// 3. 纯数字未命中 → 异步拉取
		if (/^\d+$/.test(ref)) {
			a.dataset.id = ref;
			a.dataset.pending = '1';
			a.textContent = '…';

			const loaded = await FamilyStore.ensureLoaded(ref);
			if (loaded && loaded.id) {
				// 真正存在 → 升级为 has
				a.classList.add('has');
				a.dataset.name = loaded.name || '';
				a.textContent = loaded.name || ref;
			} else {
				// 拉取失败 → 保留 id 但不算 has，仅显示 id
				a.textContent = ref;
			}
			delete a.dataset.pending;
			return a;
		}

		// 4. 人名（外姓 / 未入库）—— 虚拟成员，绝不加 has
		a.dataset.name = ref;
		a.textContent = ref;
		return a;
	}

	// ============================================================
	// 插入单个关系按钮 + 联动
	// ============================================================
	async function insertBefore(refOrMember, elem, parent, options) {
		options = options || {};
		const btn = await makeButton(refOrMember);
		if (!btn) return null;

		const refId = btn.dataset.id || '';
		const refName = (btn.dataset.name || btn.textContent).trim();

		// 兄弟姐妹不能是自己
		if (parent.id === 'siblings') {
			const selfId = _name.dataset.id;
			if (selfId && refId && String(selfId) === String(refId)) return null;
			if (!refId && refName && refName === _name.value.trim()) return null;
		}

		// 去重
		if (hasRelationButton(parent, refId, refName)) return null;

		parent.insertBefore(btn, elem);

		// 联动补全
		if (!options.silent) {
			if (parent.id === 'siblings') {
				await onSiblingAdded(btn);
			} else if (parent.id === 'spouses') {
				await onSpouseAdded(btn);
			}
		}

		return btn;
	}

	// ============================================================
	// 批量合并关系（并发加载、去重、可跳过自己）
	// 返回：加载到的所有字辈数组
	// ============================================================
	async function mergeRelation(parent, addBtn, refs, opts) {
		opts = opts || {};
		const list = refs || [];
		if (list.length === 0) return [];

		const selfId = _name.dataset.id;
		const selfName = _name.value.trim();

		const members = (await Promise.all(list.map(resolveMember))).filter(Boolean);

		const toAdd = [];
		const signs = [];

		members.forEach(m => {
			if (opts.skipSelf) {
				if (selfId && m.id && String(selfId) === String(m.id)) return;
				if (!selfId && selfName && m.name === selfName) return;
			}
			if (hasRelationButton(parent, m.id, m.name)) return;
			toAdd.push(m);
			if (m.sign && !signs.includes(m.sign)) signs.push(m.sign);
		});

		if (toAdd.length === 0) return signs;

		const buttons = await Promise.all(toAdd.map(m => makeButton(m)));
		buttons.forEach(btn => { if (btn) parent.insertBefore(btn, addBtn); });

		return signs;
	}

	// ============================================================
	// 用引用数组填充关系容器（先清空后填）
	// ============================================================
	async function fillRelation(parent, addBtn, refs) {
		clearRelations(parent);
		if (!refs || refs.length === 0) return [];
		return await mergeRelation(parent, addBtn, refs, { skipSelf: parent.id === 'siblings' });
	}

	/** 同步填单个输入框（本地命中才写 id） */
	function fillRefField(inputEl, ref) {
		inputEl.value = '';
		inputEl.dataset.id = '';
		if (ref == null) return;

		const m = FamilyStore.get(ref);
		if (m) {
			inputEl.value = m.name;
			inputEl.dataset.id = m.id;
		} else {
			inputEl.value = String(ref);
			inputEl.dataset.id = '';
		}
	}

	/** 异步填单个输入框（支持 id 和人名） */
	async function fillRefFieldAsync(inputEl, ref) {
		inputEl.value = '';
		inputEl.dataset.id = '';
		if (ref == null) return;

		const m = await resolveMember(ref);
		if (m) {
			inputEl.value = m.name || '';
			inputEl.dataset.id = m.id || '';
		} else {
			inputEl.value = String(ref);
			inputEl.dataset.id = '';
		}
	}

	// ============================================================
	// 全量回填成员信息（修改模式）
	// ============================================================
	async function applyMember(member) {
		// 基础字段
		_name.value = member.name || '';
		_name.dataset.id = member.id;

		_sign.value = member.sign || '';
		_gender.value = member.gender === 'M' ? '1' : '0';
		_birthday.value = member.birthday || '';
		_residence.value = member.residence || '';
		_life.value = member.life || '';

		// 父母 / 祖父
		fillRefField(_father, member.father);
		fillRefField(_mother, member.mother);
		fillRefField(_grampa, member.grampa);

		// 先清空关系容器
		clearRelations(_spouses);
		clearRelations(_children);
		clearRelations(_siblings);

		// 后台并发预加载（只预加载纯数字 id，人名无需拉取）
		const allRefs = [
			...(member.spouses || []),
			...(member.children || []),
			...(member.siblings || [])
		].filter(r => r != null && /^\d+$/.test(String(r)));

		await Promise.all(allRefs.map(r => FamilyStore.ensureLoaded(r)));

		// 填充关系（fillRelation 不会触发联动）
		await Promise.all([
			fillRelation(_spouses, _spousesAdd, member.spouses),
			fillRelation(_children, _childrenAdd, member.children),
			fillRelation(_siblings, _siblingsAdd, member.siblings)
		]);

		// 记录编辑目标
		_submit.dataset.editingId = member.id;
	}

	// ============================================================
	// 选父亲 → 自动补兄弟姐妹 + 推断字辈
	// ============================================================
	async function applyFather(father) {
		_father.value = father.name;
		_father.dataset.id = father.id || '';

		if (father.residence) _residence.value = father.residence;

		// 祖父 = 父亲的父亲（可能只有名字）
		if (father.father) {
			await fillRefFieldAsync(_grampa, father.father);
		}

		// 母亲：父亲唯一配偶且当前为空（配偶可能只有名字）
		if (!_mother.value && (father.spouses || []).length === 1) {
			await fillRefFieldAsync(_mother, father.spouses[0]);
		}

		// ★ 兄弟姐妹 = 父亲的子女（清空重填，去重、跳过自己，含字符串名字）
		clearRelations(_siblings);
		const signs = await mergeRelation(_siblings, _siblingsAdd, father.children || [], { skipSelf: true });

		// 字辈唯一时自动填
		if (signs.length === 1) {
			_sign.value = signs[0];
		}
	}

	// ============================================================
	// ★ 添加配偶 → 自动把配偶的子女补进「子女」
	// ============================================================
	async function onSpouseAdded(btn) {
		if (!btn) return;

		let spouse = null;
		if (btn.dataset.id) {
			spouse = FamilyStore.get(btn.dataset.id) || await FamilyStore.ensureLoaded(btn.dataset.id);
		} else {
			// 外姓配偶：没有 id，也没有子女数据，直接跳过
			spouse = { id: '', name: btn.dataset.name || btn.textContent.trim() };
		}
		if (!spouse) return;

		const refs = spouse.children || [];
		if (refs.length === 0) return;

		// 自动补入（去重、跳过自己）
		await mergeRelation(_children, _childrenAdd, refs, { skipSelf: true });
	}

	// ============================================================
	// ★ 添加兄弟姐妹 → 弹窗询问是否把该成员的兄弟姐妹也补入
	// ============================================================
	async function onSiblingAdded(btn) {
		if (!btn) return;

		// 外姓兄弟姐妹没有 siblings 数据，直接跳过
		if (!btn.dataset.id) return;

		const member = FamilyStore.get(btn.dataset.id) || await FamilyStore.ensureLoaded(btn.dataset.id);
		if (!member) return;

		const refs = member.siblings || [];
		if (refs.length === 0) return;

		const selfId = _name.dataset.id;
		const selfName = _name.value.trim();

		// 解析出所有候选（含人名）
		const resolved = (await Promise.all(refs.map(resolveMember))).filter(Boolean);

		const candidates = [];
		for (const m of resolved) {
			if (selfId && m.id && String(selfId) === String(m.id)) continue;
			if (!selfId && m.name && m.name === selfName) continue;
			if (hasRelationButton(_siblings, m.id, m.name)) continue;
			candidates.push(m);
		}
		if (candidates.length === 0) return;

		const names = candidates.map(m => m.name).join('、');
		if (!confirm(`「${member.name}」还有兄弟姐妹：${names}\n是否一并补入你的兄弟姐妹列表？`)) return;

		await mergeRelation(_siblings, _siblingsAdd, candidates, { skipSelf: true });
	}

	// ============================================================
	// 直接添加（输入姓名后「强制添加」）
	// ============================================================
	PuSet("#force-add").on("click", async function () {
		const value = _findInput.value.trim();
		if (value.length < 2) {
			_findInput.value = '';
			_findInput.focus();
			return;
		}

		if (currentInput && currentInput.classList.contains('add')) {
			await insertBefore(value, currentInput, currentInput.parentElement);
		} else if (currentInput) {
			currentInput.value = value;
			if (currentInput.dataset) currentInput.dataset.id = '';
		}

		_inputNameView.classList.add('hide');
	});

	// ============================================================
	// 关系按钮删除
	// ============================================================
	PuSet("#add-table").on("click", "a.button:not(.add)", function () {
		if (this.dataset.pending === '1') return;
		this.remove();
	});

	// ============================================================
	// 照片预览
	// ============================================================
	PuSet("#photos").on("change", function () {
		const file = this.files && this.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = function (ev) {
			_photoImage.src = ev.target.result;
		};
		reader.readAsDataURL(file);
	});

	// ============================================================
	// 重置
	// ============================================================
	PuSet("#reset").on("click", function () {
		document.querySelectorAll('#add-table input[type=text]').forEach(function (el) {
			el.value = '';
			if (el.dataset) el.dataset.id = '';
		});

		_gender.value = '-1';
		_father.dataset.id = '';
		_mother.dataset.id = '';
		_grampa.dataset.id = '';

		clearRelations(_siblings);
		clearRelations(_spouses);
		clearRelations(_children);

		_photoImage.src = _photoImage.dataset.src || _photoImage.src;
		_photos.value = '';

		_submit.dataset.editingId = '';

		_inputNameView.classList.add('hide');
		return false;
	});

	// ============================================================
	// 提交（新增 → /api/family/insert；修改 → /api/family/update）
	// ============================================================
	PuSet("#submit").on("click", async function () {
		// 检查有没有还在加载的关系按钮
		const pendingBtn = document.querySelector('#add-table a.button[data-pending="1"]');
		if (pendingBtn) {
			if (!confirm('还有关系成员正在加载中，是否继续提交？')) return;
		}

		const json = {
			name: _name.value.trim(),
			sign: _sign.value.trim(),
			gender: _gender.value,
			birthday: _birthday.value.trim(),
			father: _father.dataset.id || _father.value.trim(),
			mother: _mother.dataset.id || _mother.value.trim(),
			grampa: _grampa.dataset.id || _grampa.value.trim(),
			spouses: collectRelations(_spouses),
			siblings: collectRelations(_siblings),
			children: collectRelations(_children),
			residence: _residence.value.trim(),
			photos: null,
			life: _life.value || ''
		};

		const editingId = _submit.dataset.editingId;
		const isUpdate = !!editingId;
		if (isUpdate) {
			json.id = editingId;
		}

		// 校验
		if (!json.name || /^\d+$/.test(json.name)) {
			return alert('姓名不能是纯数字或空白');
		}
		if (!json.sign) {
			return alert('字辈不能留空');
		}
		if (json.grampa && /^\d+$/.test(json.grampa) && !FamilyStore.has(json.grampa)) {
			return alert('祖父 id 无效：' + json.grampa);
		}

		const btn = this;
		btn.disabled = true;
		const originalValue = btn.value;
		btn.value = isUpdate ? '更新中…' : '提交中…';

		console.log(isUpdate ? '[update]' : '[insert]', json);

		try {
			const body = new URLSearchParams();
			Object.keys(json).forEach(function (k) {
				body.append(k, json[k]);
			});

			const res = await fetch(isUpdate ? API_UPDATE : API_INSERT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
				},
				body: body.toString()
			});

			if (!res.ok) throw new Error('HTTP ' + res.status);
			const data = await res.json();
			handleSubmitResult(data, isUpdate);
		} catch (e) {
			console.error('提交失败', e);
			showCallback(
				isUpdate ? '更新失败' : '提交失败',
				(e && e.message) ? e.message : '与服务器通讯错误'
			);
		} finally {
			btn.disabled = false;
			btn.value = originalValue || '提交';
		}
	});

	// ============================================================
	// 提交结果
	// ============================================================
	function handleSubmitResult(data, isUpdate) {
		const statuses = data.status || {};
		const okText = isUpdate ? '修改成功' : '添加成功';
		const failText = isUpdate ? '修改失败' : '添加失败';

		if (data.result === statuses.DONE) {
			showCallback(okText, '', true);
		} else if (data.result === statuses.EXIST) {
			showCallback('存在高度重合的信息', '请检查是否已有相同成员，或修改信息后重试。', false);
		} else if (data.result === statuses.FAIL) {
			showCallback(failText, '请稍后重试或联系管理员。', false);
		} else {
			showCallback('未知状态', JSON.stringify(data), false);
		}
	}

	function showCallback(status, message, success) {
		_callbackStatus.textContent = status;
		_callbackMessage.textContent = message || '';
		_callbackView.classList.remove('hide');
		_callbackView.dataset.success = success ? '1' : '0';
	}

	PuSet("#callback-button").on("click", "input[type=button]", function () {
		if (this.value === '确认') {
			_callbackView.classList.add('hide');
			if (_callbackView.dataset.success === '1') {
				_reset.click();
			}
		} else if (this.value === '返回') {
			_callbackView.classList.add('hide');
		}
	});

	window.AddForm = {
		getCurrentInput: () => currentInput,
		forceReset: () => _reset.click()
	};

});