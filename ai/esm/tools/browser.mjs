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

export async function open_browser(ctx, args) {
    const denied = guard(); if (denied) return denied;
    await runtime.AndroidObject.openWebView(String(args.url ?? ''));
    // 等待页面首屏渲染完成再返回，否则紧接着读取内容会拿到空串。
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { "message": "已打开浏览器窗口" };
}

export async function get_browser_content(ctx, args) {
    const denied = guard(); if (denied) return denied;
    const result = await runtime.AndroidObject.getWebViewContent(args.type ?? 'text', args.selector ?? 'body');
    return { result };
}

export async function get_browser_url(ctx, args) {
    const denied = guard(); if (denied) return denied;
    const url = await runtime.AndroidObject.getWebViewURL();
    return { url };
}

export async function close_browser(ctx, args) {
    // 关闭窗口无需「已启用」开关：用户关掉开关后仍需能关掉已开的窗口，
    // 否则窗口会一直挂着。仅要求桥接可用。
    if (!bridgeReady()) return { "message": "当前环境不支持浏览器能力" };
    await runtime.AndroidObject.closeWebView(true);
    return { "message": "已关闭浏览器窗口" };
}