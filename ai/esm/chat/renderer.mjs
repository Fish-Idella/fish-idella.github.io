/**
 * chat/renderer.mjs
 * 消息渲染：Web Worker Markdown 渲染、mvvm 消息列表、立绘切换。
 */

/**
 * 初始化渲染层，将 vm_message / worker / changeImage 挂到 ctx。
 */
export function setupRenderer(ctx) {
    const { messageList } = ctx.dom;

    // ---------- Web Worker 渲染器 ----------
    const worker = new Worker('./worker/worker.js', { type: 'module' });
    const workerMap = {};
    worker.onmessage = function (e) {
        const { uuid, content, value, isArray, not_done } = e.data;
        const el = workerMap[uuid];
        if (!el) return;
        Reflect.deleteProperty(workerMap, uuid);
        el.innerHTML = content || '';

        if (not_done) return;

        // TODO  这里有个问题，因为 PuSet.mvvm()是复用元素，导致重做消息列表时，旧的图片会在新对话中异常出现
        if (el.classList.contains('message')) {
            const ib = el.nextElementSibling;
            ib.textContent = '';
            if (isArray) {
                for (let i = 1; i < value.length; i++) {
                    const obj = value[i];
                    if (obj?.type === 'image_url') {
                        ib.appendChild(document.createElement('img')).src = obj.image_url.url;
                    }
                }
            }
        }
        if (typeof Prism !== 'undefined') Prism.highlightAllUnder(el);
    };
    ctx.worker = worker;
    ctx.workerMap = workerMap;
    ctx.autoScroll = true;

    // ---------- 立绘切换 ----------
    ctx.changeImage = function changeImage(l = 0) {
        const image = new Image();
        const positions = [[-30, 100], [0, 100], [-24, 100], [-22, 100], [-20, 120], [-2, 100], [-5, 80]];
        const max = positions.length;
        const n = l % max;
        const i = n < 0 ? n + max : n;
        image.onload = () => {
            const img = document.querySelector('#image>img');
            img.src = image.src;
            img.style.setProperty('bottom', positions[i][0] + '%');
            img.style.setProperty('width', positions[i][1] + '%');
        };
        image.src = `image/${1 + i}.png`;
    };

    // ---------- 消息列表 MVVM ----------
    ctx.vm_message = PuSet.mvvm({
        target: messageList,
        selector: ":scope>div.chat-message-output-box",
        activeItem: null,
        data: [ctx.system_prompt],
        onresize(s, l) {
            this.activeItem = s.children[l - 1];
        },
        render(box, message, index, s = '就绪') {
            // cancelStreamText();                       // 先掐断流式通道，保证首屏不被残留覆盖
            if (index > 0) {
                const group = this.data[index - 1].branch;
                const v = 1 + group.indexOf(message);
                const max = group.length;
                box.querySelector('button[name=select]').textContent = `${v}/${max}`;
            }

            box.classList.toggle('tool_calls', !!message.tool_calls);
            if (message.not_done) {
                const elapsed = ((performance.now() - message.thinkStartTime) / 1000).toFixed(2);
                message.state = `${s}（${elapsed}秒）`;
            }
            const is = message.role === 'tool';
            box.querySelector('.state').textContent = is ? '工具返回' : message.state;

            [
                { selector: '.think', value: is ? message.content : message.reasoner },
                { selector: '.message', value: is ? '' : message.content }
            ].forEach(({ selector, value }) => {
                const uuid = crypto.randomUUID();
                const el = box.querySelector(selector);
                if (!el) return;                      // 模板缺节点就跳过，别抛异常打断整列表
                workerMap[uuid] = el;
                worker.postMessage({ uuid, value, not_done: message.not_done });
            });

            if (ctx.autoScroll) this.target.scrollTo(0, this.target.scrollHeight);
        },
        layout(box, message, index) {
            this.activeItem = box;
            box.dataset.index = index;
            box.dataset.persona = message.role;
            box.querySelector('.chat-message-title').open = false;
            box.querySelector('.state').textContent = message.state;
            this.render(box, message, index);
        }
    });
    ctx.messages = ctx.vm_message.data;
}