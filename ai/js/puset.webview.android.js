(function (SimpleWebViewJavascriptInterface) {
    'use strict';

    // 如果全局对象不存在则退出（避免覆盖其他脚本可能挂载的同名对象）
    if (!SimpleWebViewJavascriptInterface) return;

    // 提取到闭包中，复用同一个实例（且它不会被外部访问到）
    const domParser = new DOMParser();
    const removeTags = new Set(['style', 'script', 'svg', 'template', 'textarea']);

    Object.assign(SimpleWebViewJavascriptInterface, {

        // 保存图片组（标题 + 图片 URL 列表）
        saveHJD2048ImageGroups() {
            const title = document.querySelector('#subject_tpc')?.textContent ?? null;
            const imageUrls = Array.from(document.querySelectorAll('#read_tpc img'))
                .map(img => img.dataset.original ?? img.src)
                .filter(Boolean);
            this.saveImageGroups(title, imageUrls.join('\n'));
        },

        // 获取指定 URL 的 Data URL（支持重定向，空 Referer 尝试绕过防盗链）
        async getDataURL(url) {
            try {
                const response = await fetch(url, {
                    redirect: 'follow',
                    referrerPolicy: 'no-referrer'
                });

                if (!response.ok) {
                    return null;
                }

                const blob = await response.blob();

                // 如果 blob 为空，也可以视为失败
                if (!blob || blob.size === 0) {
                    return null;
                }

                // FileReader 包裹在 Promise 中，并处理错误
                return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result ?? null);
                    reader.readAsDataURL(blob);
                });
            } catch (_) {
                // 捕获所有异常（fetch 失败、blob 处理异常等）
                return null;
            }
        },

        // 将图片 URL 转为 Data URL 后保存（失败时自动传 null）
        async srcToDataURL(id, url) {
            const dataUrl = await this.getDataURL(url);
            this.saveImageFromBase64(id, url, dataUrl);
        },

        // 获取网页内容
        getWebVisualTextContent(type, selector) {
            const op = type === 'html'
                ? el => el.outerHTML
                : el => el.innerText;
            return Array.from(document.querySelectorAll(selector), op).join('\n')
                .replace(/data:[^;,\s]+(?:;[^;,\s]+)*;base64,[A-Za-z0-9+/=_-]+/g, 'data url removed');
        }
    });
})(window.SimpleWebViewJavascriptInterface);