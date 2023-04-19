// document.addEventListener('deviceready', function() {
// document.addEventListener('DOMContentLoaded', function() {

// PuSet.local.clear();
var Global = {
	$document: $(document),
	$currentTarget: null,
	$currentObject: null
};

// PuSet.local.clear();
var SHU_INFO = PuSet.local.get("shuben");

Global.$menuView = $("#menu").click(function () {
	if (window.event.target === this) {
		if (!Global.$menuTitle[0].readOnly) {
			if (confirm("是否保存新名字？")) {
				Global.$currentTarget.find(".shuming").val(
					Global.$currentObject.bookName = Global.$menuTitle.val()
				);
				PuSet.local.set("shuben", SHU_INFO);
			}
		}
		Global.$menuTitle.attr("readonly", "");
		Global.$changeName.val("修改书名");
		this.classList.add("hide");
	}
});
Global.$menuTitle = Global.$menuView.find(".title");
Global.$menuView.find(".removeBook").click(function () {
	if (confirm("是否移除书籍《" + Global.$currentObject.bookName + "》？")) {
		delete SHU_INFO[Global.currentId];
		PuSet.local.set("shuben", SHU_INFO);
		Global.$currentTarget.remove();
		Global.$menuView.addClass("hide");
	}
});
Global.$changeName = Global.$menuView.find(".changeName").click(function () {
	if ("修改书名" == this.value) {
		this.value = "确认修改";
		Global.$menuTitle.removeAttr("readonly").focus().select();
	} else {
		this.value = "修改书名";
		Global.$menuTitle.attr("readonly", "");
		Global.$currentTarget.find(".shuming").val(
			Global.$currentObject.bookName = Global.$menuTitle.val()
		);
		PuSet.local.set("shuben", SHU_INFO);
	}
});
Global.$menuView.find(".changeIcon").click(function () {

});
Global.$menuView.find(".goBack").click(function() {
	Global.$menuTitle.attr("readonly", "");
	Global.$changeName.val("修改书名");
	Global.$menuView.addClass("hide");
});
Global.$icon = $("#selectIcon");
Global.$icon_body = Global.$icon.find("#icon-box").on("click", "div.icon", function () {
	Global.$icon.addClass("hide");
	
	var id = this.dataset.id;
	var obj = SHU_INFO[id];

	var dataIconID = 'COVER' + Date.now();

	obj.baseIcon = this.dataset.baseurl;
	obj.dataIcon = dataIconID;

	PuSet.local.set(dataIconID, this.dataset.src);
	PuSet.local.set("shuben", SHU_INFO);

	createShuJi(id);
	setZhangjieList(id);
});
Global.$icon.find(".title").on("click", null, function() {
	createShuJi(Global.URL);
	setZhangjieList(Global.URL);
});
Global.$shujia_box = $("#shujia-box").on("click", ".book", function(ev) {
	ev.preventDefault();
	openShu(this.dataset.id);
});
Global.$button_tianjia = $("#tianjia").click(function (ev) {
	ev.preventDefault();
	var url = prompt("输入书籍首页的网址", "网页中应当包含书名和封面");
	
	fetch(url).then(a => a.text()).then(text => {
		console.log(text)
	})
});
Global.$shubenView = $("#shuben");

console.log(SHU_INFO);

$.each(SHU_INFO, createShuJi);