/**
 * tools/interact.mjs
 * 通用交互工具：草稿、图片、选项、按需加载。
 */


import { runtime } from '../runtime.mjs';
import { OpenAIFunctionCalling } from './index.mjs';

export const install_tools = {
    schema: {
        "type": "function",
        "function": {
            "name": "install_tools",
            "description": "按需加载其他工具能力，不要加载用不到的工具包",
            "parameters": {
                "type": "object",
                "properties": {
                    "package": {
                        "type": "array",
                        "description": "工具包",
                        "items": {
                            type: "string",
                            "description": "key, 可选值和工具包简介：" + JSON.stringify({
                                memory: "记忆库增删查改，已默认加载",
                                browser: "简单操作浏览器",
                                agents: "Agent协作"
                            })
                        }
                    }
                },
                "required": ["package"]
            }
        }
    },
    handler(ctx, args) {
        const arr = args.package ?? [];
        const schema = OpenAIFunctionCalling.install(arr);
        if (schema.length === 0) {
            return { message: "未加载新工具（包名无效或已加载）", schema: [] };
        }
        return { message: `已加载工具包`, schema: schema };
    }
};


export const draft = {
    schema: {
        "type": "function",
        "function": {
            "name": "draft",
            "description": "占用特殊词条key `draft` 作为可复写草稿纸，你的所有文档变动应该先直接在草稿纸中改动。可以通过replace工具部分修改`draft`词条的内容",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": { "type": ["string", "null"], "description": "覆盖写入的文本。默认值 null 不修改草稿现有内容" },
                    "show": { "type": "boolean", "description": "是否弹窗展示" }
                },
                "required": []
            }
        }
    },
    async handler(ctx, args) {
        const { content = null, show } = args;
        let s = '不改变草稿';
        if (content !== null) {
            ctx.memory_map.draft = {
                key: 'draft',
                summary: "草稿纸",
                memory: String(content)
            };
            s = "修改草稿"
        }
        if (show) {
            await ModalDialog.show(ctx.memory_map.draft.memory, "确定");
            return { message: s + "，用户已确认" }
        }
        return { message: s }
    }
};

export const push_image = {
    schema: {
        "type": "function",
        "function": {
            "name": "push_image",
            "description": "【看图】在用户对话框的图片栈加入一张或一组图片；或者借用这种方式让AI看到画面",
            "parameters": {
                "type": "object",
                "properties": {
                    "src": { "type": "array", "items": { "type": "string" }, "description": "图片的完整URL" },
                    "reinject": { "type": "boolean", "description": "默认 false - 把图片给用户就结束； true - 自动回传图片到视觉" }
                },
                "required": ["src"]
            }
        }
    },
    async handler(ctx, args) {
        for (const url of args.src) {
            runtime.vm_images.data.push((url.startsWith('blob:'))
                ? (await push_image.blobUrlToDataUrl(url))
                : url);
        }
        return {
            "reinject": !!args.reinject,
            "message": "图片已载入"
        };
    },
    async blobUrlToDataUrl(blobUrl) {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000; // 分块避免超长字符串栈溢出
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        const base64 = btoa(binary);
        return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
    }
};


export const offer = {
    schema: {
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
    async handler(ctx, args) {
        const res = await ModalDialog.show({
            type: "list",
            ai: true,
            duration: args.duration ?? 3 * 60 * 1000, // 3分钟
            list: args.options
        });
        if (res.which == -1) {
            return { message: "超时" }
        } else if (res.which == 0) {
            return {
                message: "用户确认",
                selected: res.selected
            }
        }
        return { message: "用户拒绝" }
    }
};