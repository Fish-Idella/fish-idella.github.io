/**
 * core.mjs
 * 无副作用工具层：常量、日期格式化、URL 拼接、HTTP 请求配置与封装。
 */

export const mimejson = 'application/json';

/** 按小时划分时段 */
export const PERIODS_BY_HOUR = [
    "深夜", "深夜", "深夜", "凌晨", "凌晨", "凌晨",
    "上午", "上午", "上午", "上午", "上午", "中午",
    "中午", "中午", "下午", "下午", "下午", "下午",
    "傍晚", "傍晚", "夜晚", "夜晚", "夜晚", "深夜"
];
/** 月份 → 季节映射 */
export const SEASON_MAP = ['冬', '春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬', '冬'];
/** 星期几映射 */
export const WEEK_MAP = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 格式化日期时间为中文友好字符串
 * @param {Date} [targetDate=new Date()]
 * @returns {string} 例如 "2026年夏 6月14日 中午12时30分 星期日"
 */
export function formatDate(targetDate = new Date()) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const date = targetDate.getDate();
    const hours = targetDate.getHours();
    const minutes = targetDate.getMinutes();
    const day = targetDate.getDay();
    const season = SEASON_MAP[month];
    const period = PERIODS_BY_HOUR[hours];
    const timeStr = `${hours}时${minutes}分`;
    const week = WEEK_MAP[day];
    return `${year}年${season} ${month + 1}月${date}日 ${period}${timeStr} 星期${week}`;
}

/** 拼接 URL：去除 base 尾部与 path 首部的多余斜杠 */
export function concatURL(base, path) {
    return String(base).replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
}

/** 模型温度的取值范围与默认值（与设置弹窗里的滑轨保持一致） */
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 2;
export const DEFAULT_TEMPERATURE = 0.8;

/** 生成默认的 AI 请求配置（每次调用返回新对象） */
export function createDefaultAiRequestConfig() {
    return {
        "model": 'deepseek-v4-flash',
        "stream": true,
        "temperature": DEFAULT_TEMPERATURE,
        "thinking": { "type": "enabled" },
        "tools": null,
        "tool_choice": "none",
        "messages": []
    };
}

/** 生成携带 Bearer token 的请求头 */
export function authHeaders(token) {
    return {
        'Accept': mimejson,
        'Content-Type': mimejson,
        'Authorization': `Bearer ${token}`
    };
}

/** 简易 HTTP GET 返回文本 */
export function XMLHttpRequestGetTextPromise(url) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error("请求失败，网址：" + xhr.responseURL || url));
                }
            }
        };
        xhr.send();
    });
}

/**
 * 拉取某个 API 的模型列表，返回 model 数组（每项含 id）。
 * 格式异常时抛错，由调用方决定如何提示。
 * @param {string} api API 根地址
 * @param {string} key Bearer token
 * @returns {Promise<Array<{id:string}>>}
 */
export async function fetchModelList(api, key) {
    const res = await fetch(concatURL(api, "models"), {
        method: 'GET',
        headers: authHeaders(key)
    });
    const modelList = await res.json();
    if (!modelList.data || !Array.isArray(modelList.data)) {
        throw new Error("模型列表格式错误");
    }
    return modelList.data;
}