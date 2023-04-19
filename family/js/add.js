var Data = {
	"-1": "未知",
	"0": "女",
	"1": "男",

	'name': "",
	'sign': "",
	'gender': "",
	'birthday': "",
	'father': "",
	'mother': "",
	'spouses': [],
	'siblings': [],
	'children': [],
	'residence': "",
	'photos': null,
	'life': ""
};

var FamilyMembers = {

	data: {},

	/**
	 * 添加/修改成员信息
	 * @param {Object} obj 成员信息
	 * @param {String} id 唯一标识符
	 * @returns 解析后的成员信息
	 */
	setMember: function (obj, id) {

		obj.siblings = JSON.parse(obj.siblings || null);
		obj.spouses = JSON.parse(obj.spouses || null);
		obj.children = JSON.parse(obj.children || null);

		return this.data[id || obj.id] = obj;
	},

	/**
	 * 获取成员信息
	 * @param {String} id 唯一标识符
	 * @param {Boolean} force true 强制从数据库获取,   false 优先从本地获取
	 * @returns {Promise<Object>} 包含解析后的成员信息的 Promise 对象
	 */
	getMember: function (id, force) {

		return new Promise((resolve, reject) => {

			let result = this.data[id];

			if (force || !result) {

				jQuery.ajax({
					url: "php/find.php",
					type: "POST",
					dataType: "json",
					data: {
						"key": "id",
						"value": id
					},
					success: function (data) {
						if (data.result.length == 1) {
							data.relevant.forEach(value => FamilyMembers.setMember(value));
							resolve(FamilyMembers.setMember(data.result[0], id));
						}
					},
					error: function (params) {
						reject(params);
					}
				});
			} else {
				resolve(result);
			}
		});
	}

};

var ajaxResult = null;

var targetInput = null;

// input
var _name = document.querySelector("#name");
var _father = document.querySelector("#father");
var _mother = document.querySelector("#mother");
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

var _v_find = document.querySelector("#input-name-view");


var r_number = /^\d+$/;
function isLikeNumber(i) {
	return ("number" === typeof i) || r_number.test("" + i);
}

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
	a.className = has ? "button has" : "button";
	a.dataset.id = "";

	if (isLikeNumber(id)) {
		FamilyMembers.getMember(id).then(obj => {
			a.dataset.id = obj.id;
			a.innerText = obj.name;
			a.className = "button has";
		});
	} else {
		a.innerText = id;
	}

	// 如果兄弟姐妹名字和当前成员名字一样，放弃添加这个
	if (parent.id == "father" && a.innerText == _name.value) {
		return false;
	}

	parent.insertBefore(a, elem);
}






// 照片
var photoImage = document.querySelector("#photo-image");
document.querySelector("#photos").addEventListener("change", function () {

	var fileReader = new FileReader();
	fileReader.onload = function () {
		photoImage.src = fileReader.result;
		Data.photos = fileReader.result;
	}

	fileReader.readAsDataURL(this.files[0]);
});

// 查询
var findInput = document.getElementById("find-input");
var findSend = document.getElementById("find-send");
var findResult = document.getElementById("find-result");
var findList = document.getElementById("find-list");
var $findTips = jQuery(findList.querySelector(".tips"));



function findPerByName(target) {

	targetInput = target;

	findInput.value = "";
	
	clearList();
	
	_v_find.classList.remove("hide");

}

_name.addEventListener("click", () => findPerByName(_name), false);
_father.addEventListener("click", () => findPerByName(_father), false);
_mother.addEventListener("click", () => findPerByName(_mother), false);
jQuery("#add-table input.add").on("click", function () {
	findPerByName(this);
});

var clearList, clearTable;

findInput.addEventListener("click", clearList = function clearList() {
	let child;
	while (child = findList.firstElementChild) {
		findList.removeChild(child);
	}

	findResult.classList.add("hide");
});

findSend.addEventListener("click", function () {

	var value = findInput.value.trim();
	if (value.length < 2) {
		findInput.focus();
		return;
	}

	jQuery.ajax({
		url: "php/find.php",
		type: "POST",
		data: {
			"key": "name",
			"value": findInput.value
		}
	}).done(function (data) {
		ajaxResult = data;
		for (let obj, i = 0; i < data.result.length; i++) {

			obj = FamilyMembers.setMember(data.result[i]);
			console.log(obj)

			$(`<li data-id="${obj.id}"><span class="photo"><img src="/images/3a0f670b8737925880c516cfba9cd39f.jpg" /></span><span class="name">${obj.name}</span><span class="gender">${Data[obj.gender]}</span><span class="sign">${obj.sign}</span><span class="residence">${obj.residence}</span></li>`).appendTo(findList);
		}
		
		findResult.classList.remove("hide");
	});
});


// 录入

_v_find.querySelector(".button-back").addEventListener("click", function () {
	_v_find.classList.add("hide");
});

findList.addEventListener("click", function (ev) {
	ev.path.forEach(elem => {
		if (("" + elem.nodeName).toUpperCase() == "LI" && elem.parentElement == findList) {

			if (targetInput.className == "add") {
				insertBefore(elem.dataset.id, targetInput, targetInput.parentElement, true);
			} else {
				targetInput.dataset.id = elem.dataset.id;
				targetInput.value = elem.querySelector("span.name").innerText;

				// 通过父亲的相关信息自动填充
				if (targetInput.id == "father") {

					FamilyMembers.getMember(elem.dataset.id, true).then(fatherData => {

						// 将
						_residence.value = fatherData.residence;
						if (_mother.value == "" && fatherData.spouses.length == 1) {
							_mother.value = fatherData.spouses[0];
						}
						fatherData.children.forEach(function (value) {
							insertBefore(value, _siblings_add, _siblings);
						});

					});
				}
				// 通过兄弟姐妹的相关信息自动填充
				// else if (targetInput.id == "siblings") {

				// }
			}
			_v_find.classList.add("hide");
			return;
		}
	});
});

// 直接填入
document.getElementById("force-add").addEventListener("click", function () {

	var value = findInput.value.trim();

	if (value.length > 1) {
		if (targetInput.className == "add") {
			insertBefore(value, targetInput, targetInput.parentElement);
		} else {
			targetInput.value = value;
		}

		_v_find.classList.add("hide");
	} else {
		findInput.value = "";
		findInput.focus();
	}
});

jQuery("#add-table").on("click", "a.button", function () {
	this.remove();
});

var allInputBox = document.querySelectorAll("#add-table input[type=text]");

document.getElementById("reset").addEventListener("click", clearTable = function () {
	allInputBox.forEach(elem => elem.value = "");
	_gender.value = "-1";
	_siblings.querySelectorAll("a.button").forEach(elem => _siblings.removeChild(elem));
	_spouses.querySelectorAll("a.button").forEach(elem => _spouses.removeChild(elem));
	_children.querySelectorAll("a.button").forEach(elem => _children.removeChild(elem));
	Data.photos = null;
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
	json.spouses = json.spouses.length ? JSON.stringify(json.spouses) : null;

	_siblings.querySelectorAll("a.button").forEach(elem => json.siblings.push(elem.dataset.id || elem.innerText));
	json.siblings = json.siblings.length ? JSON.stringify(json.siblings) : null;

	_children.querySelectorAll("a.button").forEach(elem => json.children.push(elem.dataset.id || elem.innerText));
	json.children = json.children.length ? JSON.stringify(json.children) : null;

	console.log(json);

	if (!json.name || isLikeNumber(json.name)) {
		return alert("姓名不能是纯数字或空白");
	}
	if (!json.sign) {
		return alert("字辈不能留空");
	}

	jQuery.ajax({
		url: "php/add.php",
		type: "POST",
		dataType: "json",
		data: json,
		success: function (data) {
			
			switch (data.result) {
				// 添加成功
				case data.status.DONE: {
					break;
				};
				// 存在高度重合的信息
				case data.status.EXIST: {
					break;
				};
				// 添加信息出错
				case data.status.FAIL: {
					break;
				};
			}

		},
		error: function (params) {
		}
	});
});