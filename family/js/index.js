


var $input_find = $("input#find-in"),

	$tbody = $("table#table>tbody").on("click", "td.has", function() {
		alert(this);
	}),

	$find_list = $("#find-list").on("click", "li", function (event) {
		FamilyMembers.getTable(this.dataset.id);
	}),

	$bt_find = $("input#bt-find").on("click", function () {
		let value = $input_find.val().trim();

		if (value == "") {
			$input_find.focus();
			return;
		}

		jQuery.ajax({
			url: 'php/find.php',
			type: 'POST',
			dataType: 'json',
			data: { "key": "name", "value": value },
			success: function (arr, textStatus, xhr) {
				$find_list.empty();
				arr.relevant.forEach(data => FamilyMembers.setMember(data, data.id));
				arr.result.forEach(data => FamilyMembers.getMember(data.id).then(obj => {
					$(`<li class="flex-horizontal" data-id="${data.id}"><img src="/mediae/icons/timg.jfif"><div class="fill"><span class="name">${obj.name}</span><div>
							<span>字辈：</span><span>${obj.sign}</span>
							<span>父亲：</span><span>${isLikeNumber(obj.father) ? FamilyMembers.getLocalMember(obj.father).name : obj.father}</span>
							<span>母亲：</span><span>${isLikeNumber(obj.mother) ? FamilyMembers.getLocalMember(obj.mother).name : obj.mother}</span><br />
							<span>居住地：</span><span>${obj.residence}</span>
						</div></div></li>`).appendTo($find_list);
				}));
			},
			error: function (xhr, textStatus, errorThrown) {
				//called when there is an error
			}
		});
	});