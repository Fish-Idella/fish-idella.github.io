(function () {

    const provincial = {
        AZJ: "浙江省",
        AHA: "湖南省",
        ASX: "山西省",
        AYN: "云南省",
        ALN: "辽宁省",
        AGD: "广东省",
        AHB: "湖北省",
        AGX: "广西壮族自治区",
        AJS: "江苏省",
        ANM: "内蒙古自治区",
        AHE: "河北省",
        ASC: "四川省",
        AXZ: "西藏自治区",
        ASD: "山东省",
        ATJ: "天津市",
        ACQ: "重庆市",
        AXJ: "新疆维吾尔自治区",
        AHN: "河南省",
        AHI: "海南省",
        AAH: "安徽省",
        ASN: "陕西省",
        AHL: "黑龙江省",
        AGS: "甘肃省",
        AJX: "江西省",
        AFJ: "福建省",
        ATW: "台湾省",
        AJL: "吉林省",
        AQH: "青海省",
        AGZ: "贵州省",
        ASH: "上海市",
        ABJ: "北京市",
        ANX: "宁夏回族自治区",
        AAM: "澳门特别行政区",
        AXG: "香港特别行政区"
    };

    const attrs = "id name path humidity precipitation pressure high dayText dayCode dayWindDirection dayWindScale low nightText nightCode nightWindDirection nightWindScale provincial regionCode".split(" ");

    // https://r.inews.qq.com/api/ip2city?otype=jsonp&callback=callback&callback=jQuery1111043938532727070245_1657160678357&_=1657160678358

    // 中国气象局 全国天气API GET
    var getWeatherURL = function () {
        return `https://weather.cma.cn/api/map/weather/1?t=${Date.now()}`;
    };

    // 中国气象局 城市天气API GET
    var getLocationWeatherURL = function (city = ParseWeather.AUTO, weather) {
        let id = "";
        if (city !== ParseWeather.AUTO) {
            PuSet.each(weather.data.city, function (value) {
                if (city == value[1]) {
                    id = value[0];
                    return false;
                }
            });
        }
        // if (navigator.geolocation) {
        //     navigator.geolocation.getCurrentPosition(showPosition);
        // } else {
        //     alert( "该浏览器不支持获取地理位置。" );
        // }

        // function showPosition(GeolocationPosition) {
        //     console.log(GeolocationPosition)
        // }

        return "https://weather.cma.cn/api/weather/view?stationid=" + id;
    }

    // 天气图片
    var getWeatherIconPath = function (i) {
        return `https://weather.cma.cn/static/img/w/icon/w${i}.png`;
    };

    function formatTime(i, n = 2) {
        i = "" + i;
        return i.length < n ? formatTime("0" + i) : i.substring(0, n);
    }

    function updateTime() {
        let date = new Date();
        $time.text(`${getDateString(date)} ${formatTime(date.getHours())}:${formatTime(date.getMinutes())}`);
    }

    function getDateString(date = new Date) {
        return `${date.getFullYear()}/${formatTime(date.getMonth() + 1)}/${formatTime(date.getDate())}`;
    }

    function corsGet(url, type) {
        return fetch(`/get`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: `path=${encodeURIComponent(url)}&type=${type || 'text/html'}`
        });
    }

    const ParseWeather = window.ParseWeather = function (today, weather, city) {
        const self = this;
        // console.log(city)
        self.now = false;
        self.today = today;

        // 自动定位
        if (weather.data.location) {
            // console.log(weather)
            PuSet.extend(self, weather.data.alarm[0], weather.data.location, weather.data.daily[0], weather.data.now);
            self.now = true;
        } else {
            self.date = weather.data.date;
            PuSet.each(weather.data.city, function (value) {
                if (city == value[1]) {
                    attrs.forEach((key, i) => self[key] = value[i]);
                    return false;
                }
            });
        }
        return self;
    };

    ParseWeather.prototype = {
        "now": true,
        "today": "2022-08-24T01:05:57.045Z",
        // 城市ID
        "id": "56187",

        "title": "",
        "signaltype": "",
        "signallevel": "",
        "effective": "",
        "eventType": "11B09",
        "severity": "#fff",
        // 城市名
        "name": "温江",
        // 路径/国别
        "path": "中国, 四川, 温江",
        // 经度
        "longitude": 103.83,
        // 纬度
        "latitude": 30.7,
        // 时区
        "timezone": 8,
        // 
        "date": "2022/08/24",

        "high": 36,
        "dayText": "雷阵雨",
        "dayCode": 4,
        "dayWindDirection": "无持续风向",
        "dayWindScale": "微风",

        "low": 25,
        "nightText": "阵雨",
        "nightCode": 3,
        "nightWindDirection": "无持续风向",
        "nightWindScale": "微风",

        "precipitation": 0,

        // 气温
        "temperature": 30.3,
        // 气压
        "pressure": 944,
        // 湿度
        "humidity": 67,

        // 风
        "windDirection": "东北风",
        // 风向角度
        "windDirectionDegree": 47,
        // 风速
        "windSpeed": 3.7,
        "windScale": "3级"
    };

    ParseWeather.getDateString = getDateString;

    ParseWeather.AUTO = "--PALW";

    ParseWeather.ifDefault = function (value, a, b) {
        return (value == 9999 || ("" + value).includes("9999")) ? a : b;
    };

    ParseWeather.getWeatherInfo = function (city = ParseWeather.AUTO, today, callback) {

        if (!PuSet.isFunction(callback)) {
            return;
        }

        var promise = new Promise((resolve, reject) => {

            getLocalConfig("puset-local-weather", {
                "lastUpdate": "1994/10/01 20:00",
                "msg": "success",
                "code": 0,
                "data": {
                    "lastUpdate": "1994/10/01 20:00"
                }
            }, function (weather) {
                // 当前时间距离上次刷新超过12小时
                if ((today.getTime() - (new Date(weather.lastUpdate || weather.data.lastUpdate || weather.data.date)).getTime()) > 43200000) {

                    corsGet(getWeatherURL(), 'application/json').then(function (response) {
                        return response.json();
                    }).then(function (weather) {
                        if (weather && weather.msg == "success") {
                            weather.lastUpdate = weather.data.lastUpdate;
                            setLocalConfig("puset-local-weather", weather);
                            resolve(weather);
                        }
                    }).catch(reject);
                } else {
                    resolve(weather);
                }

            });

        });

        promise.then(function (allWeather) {
            corsGet(getLocationWeatherURL(city, allWeather), 'application/json').then(function (response) {
                return response.json();
            }).then(function (weather) {
                if (weather && weather.msg == "success") {
                    callback(new ParseWeather(today, weather, city));
                }
            }).catch(function () {
                callback(new ParseWeather(today, allWeather, city));
            });
        });
    };

    /**
     * 通过地名部分名字自动补全
     * @param {string} str 地名
     * @param {function} callback 回执
     */
    ParseWeather.autoComplete = function (str, callback) {

        if (PuSet.isFunction(callback)) {
            const url = `https://weather.cma.cn/api/autocomplete?q=${encodeURIComponent(str)}&limit=10&timestamp=${Date.now()}`;
            corsGet(url, 'application/json').then(r => r.json()).then(callback);
        }
    }

}());