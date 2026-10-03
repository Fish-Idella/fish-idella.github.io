/**
 * data.js
 * 纯数据与工具层：常量、日期格式化、数据类、diff 解析、工具定义、通用 HTTP 工具
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

/**
 * 信息条目类（世界书的基本存储单元）
 */
export class Information {
    constructor(uuid) {
        this.key = uuid;
        this.summary = "";         // 词条简要概括
        this.information = "";     // 正文内容，Markdown
        this.tags = null;          // 标签
        this.associated = [];      // 关联的其他词条 key
        this.created_at = formatDate();
        this.updated_at = this.created_at;
    }
}

/**
 * 为两个词条建立双向关联
 */
export function addBidirectionalAssociation(infoA, infoB) {
    PuSet.ensureObjectProperty(infoA, "associated", Array);
    PuSet.ensureObjectProperty(infoB, "associated", Array);
    if (!infoA.associated.includes(infoB.key)) infoA.associated.push(infoB.key);
    if (!infoB.associated.includes(infoA.key)) infoB.associated.push(infoA.key);
}

/**
 * 解析标准 unified diff 文本
 * @param {string} text
 * @returns {Array<{start:number, lines:string[]}>}
 */
export function parseUnifiedDiff(text) {
    const hunks = [];
    let current = null;
    const rawLines = String(text).replace(/\r\n/g, "\n").split("\n");
    for (const line of rawLines) {
        if (line.startsWith("@@")) {
            const m = line.match(/@@\s*-(\d+)/);
            if (!m) throw new Error(`无法解析 hunk 头: ${line}`);
            current = { start: parseInt(m[1], 10), lines: [] };
            hunks.push(current);
        } else if (line.startsWith("---") || line.startsWith("+++")) {
            continue;
        } else if (current && (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-"))) {
            current.lines.push(line);
        }
    }
    return hunks.filter(h => h.lines.length > 0);
}

/**
 * 工具 JSON Schema 定义
 */
export const definitions = [
    {
        type: "function",
        function: {
            name: "reset_key",
            description: "只改词条的key",
            parameters: {
                type: "object",
                properties: {
                    oldKey: { type: "string", description: "原始键名" },
                    newKey: { type: "string", description: "新键名" }
                }
            },
            required: ["oldKey", "newKey"]
        }
    },
    {
        type: "function",
        function: {
            name: "query_information_by_key",
            description: "【基础查询】按存储键名（key）查询词条的详细信息。支持特殊键：book-index（返回全局目录）、current-datetime（返回当前时间）",
            parameters: {
                type: "object",
                properties: {
                    keys: {
                        type: "array",
                        description: "需要查询的词条键名数组，可同时查询多个",
                        items: { type: "string" }
                    }
                },
                required: ["keys"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "query_information_by_keyword",
            description: "【全文检索】根据关键词搜索世界书中的词条。支持多关键词匹配，会同时检索摘要、详细信息和标签字段。",
            parameters: {
                type: "object",
                properties: {
                    keyword: {
                        type: "array",
                        description: "搜索关键词数组",
                        items: { type: "string" },
                        minItems: 1
                    }
                },
                required: ["keyword"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "save_information",
            description: "【创建/更新词条】保存或修改一个词条。",
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        description: "指定是创建新词条，或者更新老词条",
                        enum: ["create", "update"]
                    },
                    key: { type: "string", description: "语义键，作为存储的唯一标识符" },
                    summary: { type: "string", description: "简短精炼概括此文档" },
                    information: { type: "string", description: "维护为 Markdown 文档，记录词条的详细信息" },
                    tags: { type: "array", items: { type: "string" }, description: "标签数组" }
                },
                required: ["type", "key"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "associate_information",
            description: "【建立关联】在多个词条之间建立双向关联。",
            parameters: {
                type: "object",
                properties: {
                    keys: {
                        type: "array",
                        description: "需要互相关联的词条键名数组，至少需要2个",
                        items: { type: "string" },
                        minItems: 2
                    }
                },
                required: ["keys"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "query_associated",
            description: "【查询关联】获取指定词条所关联的所有其他词条，返回每个关联词条的 key 和摘要。",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string", description: "要查询关联关系的词条键名" }
                },
                required: ["key"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_information",
            description: "【高危！删除词条】彻底删除一个或多个词条及相关索引。此操作不可逆！必须在删除前向用户获取最终确定。",
            parameters: {
                type: "object",
                properties: {
                    keys: { type: "array", items: { type: "string" }, description: "需要删除的词条键名数组" }
                },
                required: ["keys"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "open_browser",
            description: "调用浏览器打开网页",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "网页链接，可以接受空字符串显示窗口，保持上次的页面" }
                },
                required: ["url"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_browser_content",
            description: "读取已打开的网页的可视文档，没有用户明确允许禁止读取网页",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", description: "读取类型，可视文本或者 HTML 标签，默认读取可视文本", enum: ["text", "html"] },
                    selector: { type: "string", description: "CSS选择器，默认 body" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_browser_url",
            description: "读取已打开的网页的网址",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "close_browser",
            description: "关闭浏览器窗口，使用结束应该主动关闭",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "push_image",
            description: "在用户对话框的图片栈加入一张或一组图片",
            parameters: {
                type: "object",
                properties: {
                    src: { type: "array", items: { type: "string" }, description: "图片的绝对路径" },
                },
                required: ["src"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "view_information",
            description: "【查看正文】按 key 查看词条正文（Markdown），返回带行号的内容。",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string", description: "词条键名" },
                    start: { type: "integer", description: "起始行号（1-based，可选，默认 1）" },
                    end: { type: "integer", description: "结束行号（1-based，可选，默认到末尾）" }
                },
                required: ["key"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "patch_information",
            description: "【精准编辑正文】用标准 unified diff 修改词条正文的多个位置。默认只预览（dryRun=true）。",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string", description: "词条键名" },
                    diff: { type: "string", description: "标准 unified diff 文本" },
                    dryRun: { type: "boolean", description: "是否仅预览，默认 true" }
                },
                required: ["key", "diff"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "confirm",
            description: "【预览确认】应用上一步工具返回预览结果，避免写大量重复文本。",
            parameters: {
                type: "object",
                properties: {
                    tool: { type: "string", description: "上一轮调用的工具名" },
                    key: { type: "string", description: "上一轮操作对应的词条键名" }
                },
                required: ["tool", "key"]
            }
        }
    }
];

/** 生成默认的 AI 请求配置（每次调用返回新对象） */
export function createDefaultAiRequestConfig() {
    return {
        "model": 'deepseek-v4-flash',
        "stream": true,
        "temperature": 0.8,
        "thinking": { "type": "enabled" },
        "tools": definitions,
        "tool_choice": "auto",
        "messages": []
    };
}

/** 生成默认请求头 */
export function createDefaultHeaders() {
    return {
        'Accept': mimejson,
        'Content-Type': mimejson,
        "Authorization": ''
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