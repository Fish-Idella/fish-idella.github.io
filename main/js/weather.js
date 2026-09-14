const ParseWeather = (async function () {

    const storage = StorageHelper.open({ name: "weather" });
    const location = await storage.getItem("location") || {};
    const weather = await storage.getItem("weather") || {};
    const CACHE_DURATION = 60 * 60 * 1000; // 1小时 = 3600000 毫秒

    function save() {
        storage.setItem("location", location);
        storage.setItem("weather", weather);
    }

    // ==========================================
    // 2. 通用天气代码解析器 (WMO Standard)
    // ==========================================
    const WMO = {
        0: '晴',
        1: '大部晴朗',
        2: '多云',
        3: '阴天',
        45: '雾',
        48: '雾凇',
        51: '小毛毛雨',
        53: '中毛毛雨',
        55: '大毛毛雨',
        61: '小雨',
        63: '中雨',
        65: '大雨',
        71: '小雪',
        73: '中雪',
        75: '大雪',
        95: '雷暴',
        96: '雷暴伴冰雹',
        99: '强雷暴伴冰雹'
    };

    // 腾讯IP定位api
    // https://r.inews.qq.com/api/ip2city?otype=jsonp&callback=callback&callback=jQuery1111043938532727070245_1657160678357&_=1657160678358
    // ==========================================

    function getCacheKey(lat, lon) {
        // 将经纬度保留4位小数（约10米精度）作为缓存键，避免微小漂移导致缓存失效
        return `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    }

    return Object.assign(function ParseWeather() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(async function (position) {
                const { latitude, longitude } = position.coords;
                try {
                    // const location = await ParseWeather.getLocationName(latitude, longitude);
                    const weather = await ParseWeather.getWeather(latitude, longitude);

                    save()

                    resolve({ weather });
                } catch (e) {
                    reject(e)
                }
            }, function () {
                reject(new Error("无法获取位置"))
            }, { timeout: 10000 });
        });
    }, {

        /**
         * 解析天气对象，返回 "天气 温度 风速 风向" 格式字符串
         * @param {Object} obj 原始天气接口返回对象
         * @returns {string} 拼接后的结果字符串
         */
        parseWeatherObj(obj) {
            const current = obj.current;
            // weather_code 这里直接原样输出，如需转中文天气可再加映射表
            const weather = WMO[current.weather_code];
            const temp = current.temperature_2m + obj.current_units.temperature_2m;
            const windSpeed = current.wind_speed_10m + obj.current_units.wind_speed_10m;
            const windDir = current.wind_direction_10m + obj.current_units.wind_direction_10m;
            return `${weather} ${temp} 风速 ${windSpeed} 风向 ${windDir}`;
        },

        async getWeather(latitude, longitude) {
            const key = getCacheKey(latitude, longitude);
            if (Object.hasOwn(weather, key)) {
                const w = weather[key];
                if (Date.now() - w.timestamp < CACHE_DURATION) {
                    return w;
                }
            }

            const url = new URL('https://api.open-meteo.com/v1/forecast');
            url.searchParams.set('latitude', latitude);
            url.searchParams.set('longitude', longitude);
            url.searchParams.set('current', 'temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code');
            url.searchParams.set('timezone', 'auto');

            const res = await fetch(url);
            if (!res.ok) throw new Error(`天气API请求失败: ${res.status}`);

            const data = await res.json();

            return weather[key] = result = {
                timestamp: Date.now(),
                data: data
            };
        }
    });

}());
