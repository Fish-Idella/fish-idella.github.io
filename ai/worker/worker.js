import { marked } from "./marked.esm.js"

self.onmessage = function (e) {
    const { uuid, value } = e.data;
    const isArray = Array.isArray(value);
    const content = isArray ? value[0].text : value
    self.postMessage({
        uuid, isArray, value,
        content: marked.parse(content ?? "")
    });
}