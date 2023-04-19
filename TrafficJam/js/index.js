/**
 * 
 * @param {*} horiz 马路横向格数
 * @param {*} verti 马路竖向格数
 * @param {*} index 汽车初始位置
 */
var Car = function (horiz, verti, index = 0) {
    var $car = jQuery(document.createElement("div"));

    $car.css({

        "position": "absolute",
        "width": "20px",
        "height": "20px",
        "background-color": "blueviolet",
        "top": "2px",
        "left": "2px",
        "line-height": "20px",
        "text-align": "center",
        "color": "#fff",
        "transition": "top .1s linear,left .1s linear"

    });

    this.horiz = horiz - 1;
    this.verti = verti - 1;

    this.yiban = this.horiz + this.verti;
    this.sanduan = this.yiban + this.horiz;
    this.max = (this.horiz + this.verti) * 2;

    this.car = $car;

    this.goto(index);
}

Car.prototype = {
    index: 0,
    goto: function (index) {

        var index = index % this.max;

        this.index = index;

        let width, height;

        if (index > this.sanduan) { // 左边路段
            width = 0,
                height = this.verti - (index - this.sanduan);
        } else if (index > this.yiban) { // 下面路段
            width = this.horiz - (index - this.yiban),
                height = this.verti;
        } else if (index > this.horiz) { // 右边
            width = this.horiz,
                height = index - this.horiz;
        } else { // 上边
            width = index,
                height = 0;
        }

        this.car.css({
            "top": (height * 25 + 2) + "px",
            "left": (width * 25 + 2) + "px"
        });
    },

    start: function () {

        if (this.brake == 1) {
            this.t = setTimeout(() => {
                this.goto(this.index + 1);
            }, 100);
        } else {
            clearTimeout(this.t);
        }
    },

    // 0  停止
    // 1  运行
    //-1  强制停止

    brake: 1,

    t: 0
}


var TrafficJam = function (lu, width, height, n) {
    this.$lu = jQuery(lu);


    var style = document.createElement('style');

    var road_horiz = Math.floor(width / 25),
        road_verti = Math.floor(height / 25);

    var road_w = road_horiz * 25,
        road_h = road_verti * 25;



    style.innerHTML =
        `#lu {
        box-sizing: border-box;
        width: ${road_w}px;
        height: ${road_h}px;
        border: 1px solid red;
        position: relative;
    }
    
    #lu::after {
        content: "";
        box-sizing: border-box;
        width: ${road_w - 50}px;
        height: ${road_h - 50}px;
        border: 1px solid red;
        position: absolute;
        top: 25px;
        left: 25px;
    }`;

    document.head.appendChild(style);

    this.cars = [];
    for (let car, i = 0; i < n; i++) {
        car = new Car(road_horiz, road_verti, i);
        car.car.appendTo(lu).html(i);
        this.cars.push(car);
    }

}

TrafficJam.prototype = {
    $lu: null,
    cars: null
}


var num = 60;



var tj = new TrafficJam(document.getElementById("lu"), 1500, 600, num);


setInterval(function () {
    for (let car, i = 0; i < num; i++) {
        car = tj.cars[i];

        let index = tj.cars[(i + 1) % num].index;

        if (index < car.index) {
            index += car.max;
        }

        if (index - car.index < 2) {
            car.brake = 0;
            clearTimeout(car.t)
        }

        if (index - car.index > 2) {
            if (car.brake == 0) {
                car.brake = 1;
            }
            car.start()
        }

    }
}, 100)

console.log(tj);



document.getElementById("stop").addEventListener("click", function () {
    let car = tj.cars[num-1];
    car.brake = car.brake == -1 ? 1 : -1;
})