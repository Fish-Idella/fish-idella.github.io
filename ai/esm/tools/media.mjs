/**
 * tools/media.mjs
 * 媒体相关工具。
 */

import { runtime } from '../runtime.mjs';



export function push_image(ctx, args) {
    runtime.vm_images.data.push(...args.src);
    return { "message": "已插入图片，随下轮用户对话载入，但用户可以选择移除。" };
}

export async function offer(ctx, args) {
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