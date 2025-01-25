; window.ParseWeather = (function () {

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

    // 腾讯IP定位api
    // https://r.inews.qq.com/api/ip2city?otype=jsonp&callback=callback&callback=jQuery1111043938532727070245_1657160678357&_=1657160678358

    // 中国气象局 全国天气API GET
    var getWeatherURL = function () {
        // return "https://www.baidu.com";
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

        return "https://weather.cma.cn/api/weather/view?stationid=" + id;
    }

    // 天气图片
    var getWeatherIconPath = function (i) {
        return `https://weather.cma.cn/static/img/w/icon/w${i}.png`;
    };

    function getCity() {
        new Promise((resolve, reject) => {
            const offset = 200000;
            if (navigator.geolocation) {
                fetch("../main/js/geolocation-chinese.json").then(a => a.json()).then(function (pos) {
                    const success = function showPosition(position) {
                        const coords = {
                            latitude: 1000000 * position.coords.latitude,
                            longitude: 1000000 * position.coords.longitude
                        };
                        const result = [];
                        let city, latitude, longitude;
                        for (let key in pos) {
                            city = pos[key];
                            latitude = Math.abs(city.latitude - coords.latitude);
                            longitude = Math.abs(city.longitude - coords.longitude);
                            if (latitude < offset && longitude < offset) {
                                result.push({ name: key, offset: latitude + longitude });
                            }
                        }
                        resolve(result.sort((a, b) => a.offset - b.offset).slice(0, 5));
                    };

                    navigator.geolocation.getCurrentPosition(success, reject, { timeout: 10000 });
                });
            } else {
                reject({ code: 4, message: "该浏览器不支持获取地理位置。" });
            }
        }).then(function(arr) {
            const cityname = arr?.[0].name;
            console.log(cityname)
        });
    }

    function formatTime(i, n = 2) {
        return i.toString().padStart(n, '0');
    }

    function updateTime() {
        let date = new Date();
        $time.text(`${getDateString(date)} ${formatTime(date.getHours())}:${formatTime(date.getMinutes())}`);
    }

    function getDateString(date = new Date) {
        return `${date.getFullYear()}/${formatTime(date.getMonth() + 1)}/${formatTime(date.getDate())}`;
    }

    const ParseWeather = PuSet.createClass({

        constructor: function ParseWeather(today, weather, city) {
            const self = this;
            // console.log(weather)
            self.now = false;
            self.today = today;

            // 自动定位
            if (weather.data.location) {
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
        },

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

        "high": 9999,
        "dayText": "雷阵雨",
        "dayCode": 4,
        "dayWindDirection": "无持续风向",
        "dayWindScale": "微风",

        "low": 9999,
        "nightText": "阵雨",
        "nightCode": 3,
        "nightWindDirection": "无持续风向",
        "nightWindScale": "微风",

        "precipitation": 0,

        // 气温
        "temperature": 9999,
        // 气压
        "pressure": 9999,
        // 湿度
        "humidity": 9999,

        // 风
        "windDirection": "东北风",
        // 风向角度
        "windDirectionDegree": 0,
        // 风速
        "windSpeed": 0,
        "windScale": "3级"
    }, {
        AUTO: "--PALW",

        def: {
            "lastUpdate": "1994/10/01 20:00",
            "msg": "success",
            "code": 0,
            "data": {
                "lastUpdate": "1994/10/01 20:00"
            }
        },

        getDateString: getDateString,

        ifDefault: function (value, a, b) {
            return (value === undefined || (value == 9999) || ("" + value).includes("9999")) ? a : b;
        },

        ss: function (a, b) {
            return a.getTime() - b.getTime();
        },

        getWeatherInfo: function (city = ParseWeather.AUTO, today, callback) {
            if (!callback) {
                return;
            }

            new Promise((resolve, reject) => {
                getLocalConfig("puset-local-weather", ParseWeather.def, function (weather) {
                    // 当前时间距离上次刷新超过12小时
                    if (ParseWeather.ss(today, new Date(weather.lastUpdate || weather.data.lastUpdate || weather.data.date)) < 43200000) {
                        resolve(weather);
                    } else corsGet(getWeatherURL(), 'application/json').then(response => response.json()).catch(reject).then(function (weather) {
                        if (weather && weather.msg == "success") {
                            weather.lastUpdate = weather.data.lastUpdate;
                            setLocalConfig("puset-local-weather", weather);
                            resolve(weather);
                        }
                    });
                });
            }).then(function (allWeather) {
                getLocalConfig("puset-local-weather-current", null, function (weather) {
                    // 当前时间距离上次刷新超过6小时
                    if (weather && (ParseWeather.ss(today, new Date(weather.lastUpdate || weather.data.lastUpdate || weather.data.date)) < 21600000)) {
                        callback(new ParseWeather(today, weather, city));
                    } else corsGet(getLocationWeatherURL(city, allWeather), 'application/json').then(response => response.json()).catch(e => {throw e}).then(function (weather) {
                        if (weather && weather.msg == "success") {
                            weather.lastUpdate = weather.data.lastUpdate;
                            setLocalConfig("puset-local-weather-current", weather);
                            callback(new ParseWeather(today, weather, city));
                            // getLocalConfig("puset-local-geolocation-position", {}, function (pos) {
                            //     pos[weather.path + ", "+ weather.name] = {
                            //         "name": weather.name,
                            //         // 路径/国别
                            //         "path": weather.path, // "中国, 四川, 温江",
                            //         // 经度
                            //         "longitude": weather.longitude,
                            //         // 纬度
                            //         "latitude": weather.latitude,
                            //     };
                            //     setLocalConfig("puset-local-geolocation-position", pos);
                            // });
                        }
                    });
                });
            }).catch(callback);
        },

        /**
         * 通过地名部分名字自动补全
         * @param {string} str 地名
         * @param {function} callback 回执
         */
        autoComplete: function (str, callback) {

            if (PuSet.isFunction(callback)) {
                const url = `https://weather.cma.cn/api/autocomplete?q=${encodeURIComponent(str)}&limit=10&timestamp=${Date.now()}`;
                corsGet(url, 'application/json').then(r => r.json()).then(callback);
            }
        }
    });

    return ParseWeather;

}());