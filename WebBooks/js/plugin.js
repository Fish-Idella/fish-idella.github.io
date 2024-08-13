const WEB_BOOK_PARSE = {
	"www.bxwx.tv": {
		"bookName": "#info>h1",
		"cover": "#fmimg>img",
		"firstListURL": "",
		"list": "div.listmain>dl>*",
		"content": "#content"
	},
	"www.bigee.cc": {
		"bookName": "body > div.book > div.info > h1",
		"cover": "body > div.book > div.info > div.cover > img",
		"firstListURL": "",
		"list": "body div.listmain dd>a",
		"content": "#chaptercontent"
	},
};


function getImageBase64(src) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = function () {
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			canvas.height = this.naturalHeight;
			canvas.width = this.naturalWidth;
			context.drawImage(this, 0, 0);
			resolve( canvas.toDataURL('image/png') );
		}
		image.onerror = reject;
		image.src = src;
	});
}
