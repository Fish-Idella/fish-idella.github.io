
function promisify(options) {
    const pending = new Map();
    const timeout = 10 * 60 * 1000;
    let index = 0;

    // 1. 保存可能存在的原有回调，避免直接覆盖导致功能丢失
    const originalAsyncMessage = options.asyncMessage;

    options.asyncMessage = function (code, status, data) {
        // 先调用原有回调（如果有），保证兼容性
        if (typeof originalAsyncMessage === 'function') {
            originalAsyncMessage.call(this, code, status, data);
        }

        const entry = pending.get(code);
        if (!entry) return;

        // 2. 收到回调后立即清理定时器并从 Map 中删除，防止内存泄漏
        clearTimeout(entry.timer);
        pending.delete(code);

        if (status === 'error') {
            entry.reject(new Error(data));
        } else {
            entry.resolve(data);
        }
    };

    // 3. 为旧环境补充 Promise.withResolvers
    if (typeof Promise.withResolvers !== 'function') {
        Promise.withResolvers = function () {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
    }

    // 4. 安全生成唯一 code，避免无限递增和冲突
    function generateCode() {
        const MAX_SAFE = Number.MAX_SAFE_INTEGER;
        let code;
        do {
            code = index;
            index = (index + 1) % MAX_SAFE;
            // 若 code 因某种原因仍在 pending 中，则跳过（极少出现）
        } while (pending.has(code));
        return code;
    }

    return new Proxy(options, {
        get(target, property, receiver) {
            return function (...args) {
                const { promise, resolve, reject } = Promise.withResolvers();
                const value = Reflect.get(target, property, receiver);

                // 5. 对非函数属性的处理保持不变（无参返回属性值，有参报错）
                if (typeof value !== 'function') {
                    if (args.length === 0) {
                        resolve(value);
                    } else {
                        reject(new Error(`当前环境无法调用此函数`));
                    }
                    return promise;
                }

                let code;
                let timer;
                try {
                    code = generateCode();

                    // 6. 超时回调中主动删除 pending 条目，避免内存泄漏
                    timer = setTimeout(() => {
                        if (pending.has(code)) {
                            pending.delete(code);
                            reject(new Error('任务超时'));
                        }
                    }, timeout);

                    pending.set(code, { resolve, reject, timer });

                    // 7. 调用原始方法，第一个参数固定为 code
                    const nntw = value.call(target, code, ...args);

                    // 8. 严格判断返回值：只有显式返回 true 才表示同步完成
                    if (nntw === true) {
                        clearTimeout(timer);
                        pending.delete(code);
                        resolve(nntw);
                    }
                    // 返回 false / undefined / 其他值 均视为需要异步等待 asyncMessage
                } catch (e) {
                    // 9. 异常时清理定时器和 Map，避免残留
                    if (timer) clearTimeout(timer);
                    if (code !== undefined) pending.delete(code);
                    reject(e);
                }

                return promise;
            };
        }
    });
}