const Ren = (function () {

    var SuiBian = {
        "0": "女",
        "1": "男",
        "女": "女",
        "男": "男",
    };

    for (let obj of arguments) {
        const proto_class = SuiBian[obj.name] = function () { };
        proto_class.prototype = obj;
    }

    return class Ren {

        constructor(fname, sname, gender) {
            this.name = fname + sname;
            this.fname = fname;
            this.sname = sname;
            this.gender = gender;
            this.genderText = SuiBian[gender];
            this.zhandou = new SuiBian.ZhanDou();
            this.beibao = new SuiBian.BeiBao(20);
        }

        /**
         * 
         * @param {object} animation 全局动画
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         * @param {number} MAIN_WIDTH 画布宽度
         * @param {number} MAIN_HEIGHT 画布高度
         */
        animation(animation, ctx, MAIN_WIDTH, MAIN_HEIGHT) {
            ctx.fillStyle = "red"
            ctx.fillRect(100, 100, 100, 100);
        }

    };

}({
    name: "ZhanDou",
    ss: 10
}, {
    name: "BeiBao"
}));