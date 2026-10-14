/**
 * domain.mjs
 * 领域模型与工具协议：Memory 词条、双向关联、工具 JSON Schema。
 */

import { formatDate } from './core.mjs';

/**
 * 信息条目类（记忆的基本存储单元）
 */
export class Memory {
    constructor(uuid) {
        this.key = uuid;
        this.summary = "";         // 词条简要概括
        this.memory = "";          // 正文内容，Markdown
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
 * 工具 JSON Schema 定义
 */
export const definitions = [
    {
        "type": "function",
        "function": {
            "name": "reset_key",
            "description": "只改词条的key",
            "parameters": {
                "type": "object",
                "properties": {
                    "oldKey": { "type": "string", "description": "原始键名" },
                    "newKey": { "type": "string", "description": "新键名" }
                },
                "required": ["oldKey", "newKey"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list",
            "description": "从记忆库中列出所有词条，但每次最多返回30条",
            "parameters": {
                "type": "object",
                "properties": {
                    "namespace": { "type": "string", "description": "key 命名前缀，设置后只返回前缀匹配的项" },
                    "start": { "type": "number", "description": "指定起始位置，默认0" },
                    "count": { "type": "number", "description": "指定返回条目数量，默认5，最大30" }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recall_by_key",
            "description": "【基础查询】按存储键名（key）查询词条的详细信息。支持特殊键：datetime（返回当前时间）",
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": {
                        "type": "array",
                        "description": "需要查询的词条键名数组，可同时查询多个",
                        "items": { "type": "string" }
                    }
                },
                "required": ["keys"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recall_by_keyword",
            "description": "【检索】根据关键词搜索记忆中的词条。支持多关键词匹配，会同时检索摘要、详细信息和标签字段。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "array",
                        "description": "搜索关键词数组",
                        "items": { "type": "string" },
                        "minItems": 1
                    }
                },
                "required": ["keyword"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remember",
            "description": "【创建/更新词条】保存或修改一个词条。",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "description": "指定是创建新词条，或者更新老词条",
                        "enum": ["create", "update"]
                    },
                    "key": { "type": "string", "description": "语义键，作为存储的唯一标识符" },
                    "summary": { "type": "string", "description": "简短精炼概括此记忆" },
                    "memory": { "type": "string", "description": "维护为 Markdown 记忆，记录词条的详细信息" },
                    "tags": { "type": "array", "items": { "type": "string" }, "description": "标签数组" }
                },
                "required": ["type", "key"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "associate_memory",
            "description": "【建立关联】在多个词条之间建立双向关联。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": {
                        "type": "array",
                        "description": "需要互相关联的词条键名数组，至少需要2个",
                        "items": { "type": "string" },
                        "minItems": 2
                    }
                },
                "required": ["keys"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_associated",
            "description": "【查询关联】获取指定词条所关联的所有其他词条，返回每个关联词条的 key 和摘要。",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": { "type": "string", "description": "要查询关联关系的词条键名" }
                },
                "required": ["key"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "forgotten",
            "description": "【高危！删除词条】彻底删除一个或多个词条及相关索引。此操作不可逆！默认只预览（dryRun=true）返回待删词条的摘要，必须调用 confirm 工具（tool='forgotten', key=上一轮的 keys）才会真正删除。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": { "type": "array", "items": { "type": "string" }, "description": "需要删除的词条键名数组" },
                    "dryRun": { "type": "boolean", "description": "是否仅预览，默认 true ，预览和确认中间不能调用其他工具" }
                },
                "required": ["keys"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "open_browser",
            "description": "【浏览器】打开网页",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "网页链接，可以接受空字符串显示窗口，保持上次的页面" }
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_browser_content",
            "description": "【浏览器】读取已打开的网页的可视文档，没有用户明确允许禁止读取网页",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": { "type": "string", "description": "读取类型，可视文本或者 HTML 标签，默认读取可视文本", "enum": ["text", "html"] },
                    "selector": { "type": "string", "description": "CSS选择器，默认 body" }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_browser_url",
            "description": "【浏览器】读取已打开的网页的网址",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "close_browser",
            "description": "【浏览器】关闭浏览器窗口，使用结束应该主动关闭",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "push_image",
            "description": "在用户对话框的图片栈加入一张或一组图片",
            "parameters": {
                "type": "object",
                "properties": {
                    "src": { "type": "array", "items": { "type": "string" }, "description": "图片的绝对路径" }
                },
                "required": ["src"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "replace",
            "description": "【编辑】用 SEARCH/REPLACE 块修改单一词条正文的多个位置。SEARCH 须在正文中唯一；严格匹配失败时回退到忽略缩进匹配（公共缩进归一，相对层级保留）。默认只预览（dryRun=true）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": { "type": "string", "description": "词条键名" },
                    "body": { "type": "string", "description": "SEARCH/REPLACE 块正文，每块三段：<<<<<<< SEARCH / ======= / >>>>>>> REPLACE" },
                    "dryRun": { "type": "boolean", "description": "是否仅预览，默认 true ，预览和确认中间不能调用其他工具" }
                },
                "required": ["key", "body"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recovery",
            "description": "【编辑】退回到最近的一次更改。默认只预览（dryRun=true）。预览模式返回内容差异，每个文档只保留单层历史。",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": { "type": "string", "description": "词条键名" },
                    "dryRun": { "type": "boolean", "description": "是否仅预览，默认 true ，预览和确认中间不能调用其他工具" }
                },
                "required": ["key"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "offer",
            "description": "【发起选项】为用户发起一组可多选的选项供用户选择",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": { "type": "string", "description": "问题本身，避免弹窗覆盖问题导致用户不知道怎么选" },
                    "duration": { "type": "number", "description": "单位毫秒, 默认3分钟自动关闭选择框，避免自动任务期间用户不在导致进度卡死" },
                    "options": {
                        "type": "array",
                        "description": "键值对 数组",
                        "items": {
                            "type": "object",
                            "properties": {
                                "value": { "type": "string", "description": "自定义，返回给你的信息" },
                                "text": { "type": "string", "description": "展示的文本，用户能看到的信息" }
                            }
                        }
                    }
                },
                "required": ["options"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "confirm",
            "description": "【预览确认】应用上一步工具返回预览结果，避免写大量重复文本。",
            "parameters": {
                "type": "object",
                "properties": {
                    "tool": { "type": "string", "description": "上一轮调用的工具名" },
                    "key": { "type": "string", "description": "上一轮操作对应的词条键名（forgotten 传 keys 拼成的字符串）" }
                },
                "required": ["tool", "key"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "coworker",
            "description": "【协作】获取包括自己的智能体列表。所以智能体共享记忆空间和工具库",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cooperate",
            "description": "【交接】智能体之间唯一通讯手段。通过用户消息通道附加一个信息传递给新智能体。日常对话或者请求帮助都必须用这个工具，否则对方不会看到你的消息。",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": { "type": "string", "description": "目标智能体的 id" },
                    "message": { "type": "string", "description": "通过用户消息通道，将你想要传递的信息告诉目标智能体" },
                    "beginning": { "type": "boolean", "description": "如果是 true，作为新任务的起点，对面将看不到任何历史对话，默认 false" }
                },
                "required": ["to", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recruit",
            "description": "【协作】创建一个新的智能体（招募）。创建后不会自动切换，需要用 cooperate 交接。评价：请神容易送神难",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "新智能体的名称" },
                    "content": { "type": "string", "description": "新智能体的系统提示/角色设定" },
                    "tags": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "能力标签数组，用于其他智能体了解其能力"
                    },
                    "settings": { "type": "object", "description": "可选设置，默认 { thinking: true }" }
                },
                "required": ["name"]
            }
        }
    }
];