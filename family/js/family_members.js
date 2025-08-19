// alert(screen.availWidth);// * window.devicePixelRatio);
// ⠄⠄⠄⠄⠄⠄⣠⢼⣿⣿⣿⣿⣿⡟⣗⣯⣿⣶⣿⣶⡄
// ⠄⠄⣀⣤⣴⣾⣿⣷⣭⣭⣭⣭⣭⣾⣿⣿⣿⣿⣿⣿⣿⡀
// ⠄⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣸⣿⣿⣧
// ⠄⣿⣿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⢻⣿⣿⡄
// ⠄⢸⣿⣮⣿⣿⣿⣿⣿⣿⣿⡟⢹⣿⣿⣿⡟⢛⢻⣷⢻⣿⣧
// ⠄⠄⣿⡏⣿⡟⡛⢻⣿⣿⣿⣿⠸⣿⣿⣿⣷⣬⣼⣿⢸⣿⣿
// ⠄⠄⣿⣧⢿⣧⣥⣾⣿⣿⣿⡟⣴⣝⠿⣿⣿⣿⠿⣫⣾⣿⣿
// ⠄⠄⢸⣿⣮⡻⠿⣿⠿⣟⣫⣾⣿⣿⣿⣷⣶⣾⣿⡏⣿⣿⣿  0123█09887⣿⣿⣿██ ⬛▉▊▋⃞□
// ⠄⠄⢸⣿⣿⣿⡇⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⣿⣿⣿
// ⠄⠄⢸⣿⣿⣿⡇⠄⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢸⣿⣿⣿
// ⠄⠄⣼⣿⣿⣿⢃⣾⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⣿⣿⣿⡇             12 *  26
// ⠄⠄⣿⣿⡟⣵⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢃⣿⣿⣿              14    25
//                                          15 27
// 
//  ⣿ ⠿ ⠾ ⠽ ⠼ ⠻ ⠺ ⠹ ⠸ ⠷ ⠶ ⠵ ⠴ ⠳ ⠲ ⠱ ⠰ ⠯ ⠮ ⠭ ⠬ ⠫ ⠪ ⠩ ⠨ ⠧ ⠦ ⠥ ⠤ ⠣ ⠢ ⠡ ⠠ ⠟ ⠞ ⠝ ⠜ ⠛ ⠚ ⠙ ⠘ ⠗ ⠖ ⠕ ⠔ ⠓ ⠒ ⠑ ⠐ ⠏ ⠎ ⠍ ⠌ ⠋ ⠊ ⠉ ⠈ ⠇ ⠆ ⠅ ⠄ ⠃ ⠂ ⠁ ⠀

const r_number = /^\d+$/;
function isLikeNumber(i) {
	return r_number.test(String(i));
}

function tryGet(handler, defaultValue) {
	try {
		return ("function" === typeof handler) ? handler() : handler;
	} catch (o_O) {
		return tryGet(defaultValue);
	}
}

function addUniqueItem(arr, item) {
	// 如果存在则不添加
	if (arr.includes(item)) return;

	arr.push(item);
}

function createClass(obj, p) {
	const fn = obj.constructor;
	if ("function" !== typeof fn) {
		throw new TypeError("obj.constructor is not a function");
	}
	fn.prototype = obj;
	return Object.assign(fn, p);
}

const Member = createClass({
	'id': 0,
	'name': "",
	'sign': "",
	'gender': "",
	'birthday': "",
	'father': "",
	'mother': "",
	'spouses': null,
	'siblings': null,
	'children': null,
	'residence': "",
	'photos': null,
	'life': "",
	"td": null,
	colspan: 0,
	constructor: function Member(obj = "", id) {
		this.id = String(id ?? obj.id);
		if ("string" === typeof obj) {
			this.name = obj;
		} else {
			Object.assign(this, obj);
		}
		this.siblings = Member.parse(obj.siblings);
		this.spouses = Member.parse(obj.spouses);
		this.children = Member.parse(obj.children);
		this.td = document.createElement("td");
	},

	addColSpan: function (index = 0) {
		const i = this.colspan + index;
		this.colspan = i;
		this.td.colSpan = i;
	}

}, {
	parse: function parse(json) {
		return tryGet(_ => JSON.parse(json), []);
	}
});


const FamilyMembers = {

	data: {},

	relevant: {},

	getMemberAndVirtualMember: function (id, name) {

		// console.log(id, name)
		const virtualID = name + "-" + id;
		let member = this.data[id] ?? this.relevant[virtualID];
		if (!member) {
			// 虚拟成员
			member = new Member(id, virtualID);
			member.isVirtual = true;
			member.children = [virtualID + "-children"];
			this.relevant[virtualID] = member;
		}
		return member;
	},

	/**
	 * 添加/修改成员信息
	 * @param {Object} obj 成员信息
	 * @param {String} id 唯一标识符
	 * @returns 解析后的成员信息
	 */
	setMember: function (obj, id) {
		id = id ?? obj.id;
		return this.data[id] = new Member(obj, id);
	},

	/**
	 * 获取成员信息
	 * @param {String} id 唯一标识符
	 * @param {Boolean} force true 强制从数据库获取,   false 优先从本地获取
	 * @returns {Promise<String>} 包含解析后的成员信息的 Promise 对象
	 */
	getMember: function (id, force) {
		const result = this.data[id];
		return new Promise((resolve, reject) => {
			// 如果需要强制从数据库获取或者本地没有该成员信息
			if (force || !result) {
				jQuery.ajax({
					url: "php/find.php",
					type: "POST",
					dataType: "json",
					data: { "key": "id", "value": id, "oneself": false },
					error: reject,
					success: function (data) {
						if (data.result.length == 1) {
							data.relevant.forEach(value => FamilyMembers.setMember(value, value.id));
							resolve(FamilyMembers.setMember(data.result[0], id));
						} else {
							reject(data);
						}
					}
				});
			} else {
				resolve(result);
			}
		});
	},

	getLocalMember: function (id) {
		return this.data[id] ?? this.data[0];
	},

	getDescendants: function (member, index) {
		if (index > 5) index = 5;
		if (index < 1) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const arr = [];
			member.children.forEach(child => {
				if (isLikeNumber(child)) {
					arr.push(this.getMember(child, false).then(obj => this.getDescendants(obj, index - 1)));
				}
			});
			Promise.all(arr).then(resolve).catch(reject);
		});
	},

	restructure: function (name) {
		if (name instanceof Set) {
			return Array.from(name).join("<br>");
		}
		// if (name.length > 3) {
		// 	return name;
		// }
		/**
		 * @type {Array<String>}
		 */
		let arr = name.split("");
		if (name.includes("spouses") || name.includes("children")) {
			arr = ["\u2003", "\u2003", "\u2003"];
		}

		if (arr.length < 3) {
			arr.splice(1, 0, "\u2003");
		}

		return arr.join("<br>");
	},

	addColSpan: function addColSpan(member, root) {
		member.addColSpan(1);
		if (member === root) return;
		console.log(member)

		if (member._parent) {
			addColSpan(member._parent, root);
		} else {
			member.spouses.forEach(spouse => addColSpan(spouse, root));
		}
	},

	/**
	 * 
	 * @param {Element} elem 
	 * @param {Member} member 
	 */
	appendChild: function (elem, member) {
		member.td.innerHTML = this.restructure(member.name);
		if (isLikeNumber(member.id)) {
			member.td.classList.add("has");
		} else {
			// console.log(member)
		}
		elem.appendChild(member.td);
	},

	fillChildren: function (member, elements, signs, index, root) {
		if (index > 4) return;
		const myself = elements[index * 2];
		const spouses = elements[index * 2 + 1];

		signs[index].add(member.sign);

		FamilyMembers.appendChild(myself, member);

		if (member.spouses.length == 0) {
			member.spouses = ["spouses"];
		}
		// 格式化
		member.spouses.forEach(function (spouse, i) {
			const _spouse = member.spouses[i] = FamilyMembers.getMemberAndVirtualMember(spouse, member.id);
			if (isLikeNumber(_spouse.id)) {
				_spouse.spouses.forEach(function (spouse, i) {
					_spouse.spouses[i] = FamilyMembers.getMemberAndVirtualMember(spouse, member.id);
				});
				_spouse.children.forEach(function (child, i) {
					_spouse.children[i] = FamilyMembers.getMemberAndVirtualMember(child, member.id);
				});
			}
		});

		if (member.children.length < member.spouses.length) {
			for (let i = member.children.length, j = member.spouses.length; i < j; i++) {
				const childrenId = member.spouses[i].name + "-children";
				member.children.push(childrenId);
			}
		}
		// const parents = new Set();
		member.children.forEach(function (id, _index) {

			// console.log(id, i)
			const child = FamilyMembers.getMemberAndVirtualMember(id, member.id);
			// member.children[i] = child;

			let parent;
			let p = member.gender == 0 ? child.father : child.mother;

			// 未指定长辈，或者刚好有长辈
			if (!p) {
				id = String(id);
				if (member.spouses.length === 1 || !id.endsWith("-children")) {
					parent = member.spouses[0];
				} else {
					parent = FamilyMembers.getMemberAndVirtualMember(id.replace(/\-children$/i, ""), member.id);
				}
			}
			// 没有长辈或者指定了长辈
			else {
				parent = FamilyMembers.getMemberAndVirtualMember(p, member.id);
			}

			addUniqueItem(member.spouses, child._parent = parent);
			addUniqueItem(parent.children, child);
			addUniqueItem(parent.spouses, member);

			// console.log(index)
			if (index === 4) {
				FamilyMembers.addColSpan(child, root);
			} else {
				FamilyMembers.fillChildren(child, elements, signs, index + 1, root);
			}
		});

		// 合并
		// member.spouses = member.spouses.concat(Array.from(parents));
		// // 去重
		// member.spouses = Array.from(new Set(member.spouses));

		member.spouses.forEach(spouse => FamilyMembers.appendChild(spouses, spouse));
	},

	getTable: function (id) {
		// 重置资源
		FamilyMembers.data = {};
		FamilyMembers.relevant = {};
		FamilyMembers.getMember(id, true).then(function (member) {
			const elements = new Array(10);
			for (let i = 0; i < 10; i++) {
				elements[i] = document.createElement("tr");
			}

			const signs = new Array(5);
			for (let i = 0; i < 5; i++) {
				signs[i] = new Set();
			}
			FamilyMembers.getDescendants(member, 5).then(_ => {

				FamilyMembers.fillChildren(member, elements, signs, 0, member);

				signs.forEach((set, i) => {
					const sign = document.createElement("td");
					sign.rowSpan = 2;
					sign.className = "sign";
					sign.innerHTML = FamilyMembers.restructure(set);
					const myself = elements[2 * i];
					myself.insertBefore(sign, myself.firstChild);
				});

				$tbody.empty().each(function (_, tbody) {
					elements.forEach(tr => tbody.appendChild(tr));
				});
			});

		});
	}

};
