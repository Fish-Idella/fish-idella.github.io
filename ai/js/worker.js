import { marked } from "./marked.esm.js"

self.onmessage = function(e) {
    const { uuid, value } = e.data;
    self.postMessage({
        uuid,
        value: marked.parse(value ?? "")
    });
}