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



var FamilyMembers = {

	data: {
		0: {
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
		}
	},

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
	 * @returns {Promise<String>} 包含解析后的成员信息的 Promise 对象
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
						"value": id,
						"oneself": false
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
	},

	getLocalMember: function(id) {
		return this.data[id] || this.data[0];
	}

};


var r_number = /^\d+$/;
function isLikeNumber(i) {
	return ("number" === typeof i) || r_number.test("" + i);
}

var

	$input_find = $("input#find-in"),

	$find_list = $("#find-list"),

	$bt_find = $("input#bt-find").on("click", function () {
		let value = $input_find.val().trim();

		if (value == "") {
			$input_find.focus();
		} else jQuery.ajax({
			url: 'php/find.php',
			type: 'POST',
			dataType: 'json',
			data: {
				"key": "name",
				"value": value
			},
			success: function (arr, textStatus, xhr) {
				$find_list.empty();
				$.each(arr.result, (i, data) => {
					FamilyMembers.getMember(data.id).then(obj => {

						$(`<li><img src="/icons/timg.jfif"><div><span class="name">${obj.name}</span><div>
							<span>字辈：</span><span>${obj.sign}</span>
							<span>父亲：</span><span>${isLikeNumber(obj.father) ? FamilyMembers.getLocalMember(obj.father).name : obj.father}</span>
							<span>母亲：</span><span>${isLikeNumber(obj.mother) ? FamilyMembers.getLocalMember(obj.mother).name : obj.mother}</span><br />
							<span>居住地：</span><span>${obj.residence}</span>
						</div></div></li>`).appendTo($find_list);

					});
				});
			},
			error: function (xhr, textStatus, errorThrown) {
				//called when there is an error
			}
		});
	});