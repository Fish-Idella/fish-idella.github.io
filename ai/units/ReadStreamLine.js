// 流式读取行迭代器
class ReadStreamLine {
    constructor(response) {
        this.response = response;
    }
    [Symbol.asyncIterator]() {
        const reader = this.response.body.getReader();
        const decoder = new TextDecoder("UTF-8");
        let buffer = "";
        return {
            next: async function next() {
                const idx = buffer.indexOf("\n");
                if (idx >= 0) {
                    const msg = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 1);
                    return {
                        value: msg,
                        done: false
                    };
                }
                const {
                    done,
                    value
                } = await reader.read();
                if (done) {
                    if (buffer.length > 0) {
                        const msg = buffer;
                        buffer = '';
                        return {
                            value: msg,
                            done: false
                        };
                    }
                    return {
                        value: buffer,
                        done: true
                    };
                } else {
                    buffer += decoder.decode(value, {
                        stream: true
                    });
                    return next();
                }
            }
        };
    }
}