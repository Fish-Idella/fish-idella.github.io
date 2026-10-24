/**
 * tools/browser.mjs
 * 浏览器（WebView）相关工具。
 */

import { runtime } from '../runtime.mjs';

/**
 * 浏览器工具开关：由 agent 的 settings["use-browser"] 控制。
 * 所有浏览器工具都必须先过这一关——原先只有 open_browser / get_browser_content 检查，
 * get_browser_url 漏了，导致用户已明确禁用浏览器时 LLM 仍能读走当前网址（隐私口子）。
 */
function browserEnabled() {
    return !!runtime.currentAgentConfig?.settings?.["use-browser"];
}

/** 宿主 WebView 桥接是否可用（非 Android WebView 环境或引导未完成时可能为 null） */
function bridgeReady() {
    return !!(runtime.AndroidObject && typeof runtime.AndroidObject.openWebView === 'function');
}

/** 统一守卫：开关未开或桥接不可用时直接拒绝，避免抛到上层被 catch 成静默失败 */
function guard() {
    if (!browserEnabled()) return { "message": "用户已禁用" };
    if (!bridgeReady()) return { "message": "当前环境不支持浏览器能力" };
    return null;
}

export const browser = {
    schema: {
        "type": "function",
        "function": {
            "name": "browser",
            "description": "【浏览器】打开网页",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": { "type": "string", "description": "控制浏览器窗口的开关", "enum": ["open", "close"] },
                    "ratio": { "type": "number", "description": "浏览器窗口占屏幕的高度百分比， 0 ~ 1直接的小数" },
                    "url": { "type": "string", "description": "网页链接，可以省略，保持上次的页面" }
                },
                "required": ["action"]
            }
        }
    },
    async handler(ctx, args) {
        const denied = guard(); if (denied) return denied;
        if (args.action === "open") {
            await runtime.AndroidObject.openWebView(String(args.url ?? ''), args.ratio ?? 0.4);
            // 等待页面首屏渲染完成再返回，否则紧接着读取内容会拿到空串。
            await new Promise(resolve => setTimeout(resolve, 2000));
            return { "message": "已打开浏览器窗口" };
        } else {
            await runtime.AndroidObject.closeWebView(true);
            return { "message": "已关闭浏览器窗口" };
        }
    }
};

export const read_browser = {
    schema: {
        "type": "function",
        "function": {
            "name": "read_browser",
            "description": "【浏览器】读取已打开的网页的网址/可视文档，没有用户明确允许禁止读取网页",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": { "type": "string", "description": "读取类型，URL、屏幕截图（可以通过push_image工具迂回看图）、可视文本或者 HTML 标签，默认读取可视文本", "enum": ["url", "screenshot", "text", "html"] },
                    "selector": { "type": "string", "description": "CSS选择器，默认 body" }
                },
                "required": []
            }
        }
    },
    async handler(ctx, args) {
        const denied = guard(); if (denied) return denied;
        if (args.type === 'url') {
            const url = await runtime.AndroidObject.getWebViewURL();
            return { url };
        } else if (args.type === 'screenshot') {
            const url = await fetch("/screenshot").then(r => r.blob()).then(blob => URL.createObjectURL(blob));
            return { url };
        } else {
            const result = await runtime.AndroidObject.getWebViewContent(args.type ?? 'text', args.selector ?? 'body');
            return { result };
        }
    }
};