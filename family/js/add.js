const _input_name_view = document.querySelector("#input-name-view");

let currentInput = null, ajaxResult = null;;

_input_name_view.querySelector(".button-back").addEventListener("click", function () {
	_input_name_view.classList.add("hide");
}, false);

// 查询数据
const _find_input = document.getElementById("find-input");
const vm_find_list = PuSet.View({
	target: document.getElementById("find-list"),
	selector: "li",
	data: [],
	layout: function (target, value) {
		target.dataset.id = value.id;
		target.querySelector("img").src = "/mediae/icons/timg.jfif";
		target.querySelector("span.name").textContent = value.name;
		target.querySelector("span.sign").textContent = value.sign;
		target.querySelector("span.father").textContent = isLikeNumber(value.father) ? FamilyMembers.getLocalMember(value.father).name : value.father;
		target.querySelector("span.mother").textContent = isLikeNumber(value.mother) ? FamilyMembers.getLocalMember(value.mother).name : value.mother;
		target.querySelector("span.residence").textContent = value.residence;
		// console.log(target)
	}
});

jQuery(vm_find_list.target).on("click", "li", function () {
	FamilyMembers.getMember(this.dataset.id, true).then(function (member) {
		if (currentInput.className === "add") {
			insertBefore(member.id, currentInput, currentInput.parentElement, true);
		} else {
			currentInput.value = member.name;

			// 自动填充
			if (currentInput.id === "father") {
				currentInput.dataset.id = member.id;
				_residence.value = member.residence;

				if (_mother.value == "" && member.spouses.length == 1) {
					const spouse = member.spouses[0];
					if (isLikeNumber(spouse)) {
						_mother.value = FamilyMembers.getLocalMember(spouse).name;
						_mother.dataset.id = spouse;
					} else {
						_mother.value = spouse;
						_mother.dataset.id = "";
					}
				}

				const signs = [];
				member.children.forEach(function (child) {
					if (isLikeNumber(child)) {
						addUniqueItem(signs, FamilyMembers.getLocalMember(child).sign);
					}
					insertBefore(child, _siblings_add, _siblings);
				});
				if (signs.length === 1) {
					_sign.value = signs[0];
				}
			} else if (currentInput.id === "mother") {
				currentInput.dataset.id = member.id;
			}
		}
		_input_name_view.classList.add("hide");
	});
});

var findResult = document.getElementById("find-result");

document.getElementById("find-send").addEventListener("click", function () {
	const value = _find_input.value.trim();
	if (value.length < 2) {
		return _find_input.focus();
	} else jQuery.ajax({
		url: "php/find.php",
		type: "POST",
		data: { "key": "name", "value": value },
		success: function (data) {
			ajaxResult = data.result.map(obj => FamilyMembers.setMember(obj));
			data.relevant.forEach(value => FamilyMembers.setMember(value));
			console.log(ajaxResult);

			Object.assign(vm_find_list.data, ajaxResult);
			vm_find_list.data.length = ajaxResult.length;

			findResult.classList.remove("hide");
		}
	});
}, false);


const [_name, _father, _mother] = jQuery("#name,#father,#mother,#add-table input.add").on("click", function () {
	currentInput = this;
	_input_name_view.classList.remove("hide");
	_find_input.value = "";
	_find_input.focus();
});

var _gender = document.getElementById("gender");
var _birthday = document.getElementById("birthday");
var _sign = document.getElementById("sign");
var _residence = document.getElementById("residence");

// td
var _siblings = document.getElementById("siblings");
var _siblings_add = _siblings.querySelector(".add");

var _spouses = document.getElementById("spouses");
var _spouses_add = _spouses.querySelector(".add");

var _children = document.getElementById("children");
var _children_add = _children.querySelector(".add");

var photoImage = document.getElementById("photo-image");

/**
 * 在指定位置插入新元素
 * @param {String} id 唯一标识符
 * @param {Element} elem 指定元素位置
 * @param {Element} parent 指定目标元素的父元素
 * @param {Boolean} has 是否是新成员
 * @returns 
 */
function insertBefore(id, elem, parent, has) {
	let a = document.createElement("a");
	let name;
	a.className = has ? "button has" : "button";
	a.dataset.id = "";

	if (isLikeNumber(id)) {
		const obj = FamilyMembers.getLocalMember(id);
		a.className = "button has";
		a.dataset.id = obj.id;
		a.innerText = name = obj.name;
	} else {
		a.innerText = name = id;
	}

	// 如果兄弟姐妹名字和当前成员名字一样，放弃添加这个
	if (parent.id == "siblings" && name == _name.value) {
		return;
	} else {
		parent.insertBefore(a, elem);
	}
}


// 直接填入
document.getElementById("force-add").addEventListener("click", function () {
	// var _find_input = _find_input;
	var value = _find_input.value.trim();
	if (value.length > 1) {
		if (currentInput.className == "add") {
			insertBefore(value, currentInput, currentInput.parentElement);
		} else {
			currentInput.value = value;
		}
		_input_name_view.classList.add("hide");
	} else {
		_find_input.value = "";
		_find_input.focus();
	}
});

// 删除成员按钮
jQuery("#add-table").on("click", "a.button", function () {
	this.remove();
});

var clearTable;
var allInputBox = document.querySelectorAll("#add-table input[type=text]");
document.getElementById("reset").addEventListener("click", clearTable = function () {
	allInputBox.forEach(elem => elem.value = "");
	_gender.value = "-1";
	_father.dataset.id = "";
	_mother.dataset.id = "";
	_siblings.querySelectorAll("a.button").forEach(elem => _siblings.removeChild(elem));
	_spouses.querySelectorAll("a.button").forEach(elem => _spouses.removeChild(elem));
	_children.querySelectorAll("a.button").forEach(elem => _children.removeChild(elem));
	photoImage.src = photoImage.dataset.src;
	return false;
});

document.getElementById("submit").addEventListener("click", function () {
	var json = {
		'name': _name.value,
		'sign': _sign.value,
		'gender': _gender.value,
		'birthday': _birthday.value,
		'father': _father.dataset.id || _father.value,
		'mother': _mother.dataset.id || _mother.value,
		'spouses': [],
		'siblings': [],
		'children': [],
		'residence': _residence.value,
		'photos': null,
		'life': ""
	};

	_spouses.querySelectorAll("a.button").forEach(elem => json.spouses.push(elem.dataset.id || elem.innerText));
	json.spouses = JSON.stringify(json.spouses);

	_siblings.querySelectorAll("a.button").forEach(elem => json.siblings.push(elem.dataset.id || elem.innerText));
	json.siblings = JSON.stringify(json.siblings);

	_children.querySelectorAll("a.button").forEach(elem => json.children.push(elem.dataset.id || elem.innerText));
	json.children = JSON.stringify(json.children);

	if (!json.name || isLikeNumber(json.name)) {
		return alert("姓名不能是纯数字或空白");
	}

	if (!json.sign) {
		return alert("字辈不能留空");
	}

	console.dir(json);

	jQuery.ajax({
		url: "php/add.php",
		type: "POST",
		dataType: "json",
		data: json,
		success: function (data) {

			switch (data.result) {
				// 添加成功
				case data.status.DONE: {
					console.log("添加成功");
					break;
				};
				// 存在高度重合的信息
				case data.status.EXIST: {
					console.log("存在高度重合的信息");
					break;
				};
				// 添加信息出错
				case data.status.FAIL: {
					console.log("添加信息出错");
					break;
				};
			}

		},
		error: function () {
			console.log("与服务器通讯错误");
		}
	});
});