import { marked } from "./marked.esm.js"

self.onmessage = function (e) {
    try {
        const { uuid, value, not_done } = e.data;
        const isArray = Array.isArray(value);
        const content = isArray ? value[0]?.text : value;
        self.postMessage({
            uuid, isArray, value, not_done,
            content: marked.parse(String(content ?? ''))
        });
    } catch (err) {
        self.postMessage({
            uuid, isArray: false, value: [], not_done: false,
            content: '<pre class="error">marked error: ' + String(err) + '</pre>'
        });
    }
};