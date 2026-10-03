function nodeName(elem, name) {
    return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
}

class ModalDialog {
    static #instance = null;
    template = null;

    constructor() {
        const container = document.createElement('dialog');
        // 颜色/阴影/圆角等全部由 CSS 类控制
        container.className = 'unselect modal-dialog';

        const content = document.createElement('div');
        content.className = 'dialog-content-a flex-vertical';

        const messageDiv = document.createElement('code');
        messageDiv.className = 'dialog-message';

        const input = document.createElement('input');
        input.className = 'dialog-input hide';

        const customContainer = document.createElement('div');
        customContainer.className = 'dialog-custom flex-vertical';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dialog-buttons flex-horizontal place-center';

        content.appendChild(messageDiv);
        content.appendChild(input);
        content.appendChild(customContainer);
        content.appendChild(buttonContainer);
        container.appendChild(content);

        this.template = container;
    }

    static singleInstance() {
        if (ModalDialog.#instance == null) {
            return ModalDialog.#instance = new ModalDialog();
        } else {
            return ModalDialog.#instance;
        }
    }

    /**
     * 显示对话框
     * @param {string|object} options - 消息文本或配置对象
     * @param {...string} buttons - 按钮文本（兼容旧用法）
     * @returns {Promise<{which: number, value: any, selected: any[]}> & { close: Function }}
     */
    static show(options, ...buttons) {
        if (arguments.length > 1) {
            return this.show({ type: 'message', message: options, buttons });
        }

        const {
            type = 'message',
            message = '',
            duration = 2500,
            hit = '',
            list = [],
            progress = 0,   // 正常进度 0 ~ 1
            buttons: customButtons,
            placeholder = '在此输入'
        } = options;

        const container = this.singleInstance().template.cloneNode(true);
        const content = container.querySelector('.dialog-content-a');
        const messageEl = content.querySelector('.dialog-message');
        const inputEl = content.querySelector('.dialog-input');
        const customContainer = content.querySelector('.dialog-custom');
        const buttonContainer = content.querySelector('.dialog-buttons');

        const ss = messageEl.textContent = message || '';
        if (!ss.includes('\n')) {
            messageEl.style.textAlign = 'justify';
            messageEl.style.whiteSpace = 'pre-wrap';
        }

        inputEl.classList.add('hide');
        customContainer.innerHTML = '';
        customContainer.style.display = 'none';

        const typeLower = type.toLowerCase();

        switch (typeLower) {
            case 'input':
            case 'prompt':
                inputEl.classList.remove('hide');
                inputEl.value = hit;
                inputEl.placeholder = placeholder;
                break;

            case 'list':
            case 'check':
            case 'checkbox':
                customContainer.style.display = 'block';
                if (Array.isArray(list) && list.length) {
                    list.forEach((item) => {
                        const wrap = document.createElement('label');
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.value = item.value !== undefined ? item.value : item.text || '';
                        cb.checked = !!item.checked;
                        const text = document.createElement("span");
                        text.textContent = (item.text || item.value || '');
                        wrap.appendChild(cb);
                        wrap.appendChild(text);
                        customContainer.appendChild(wrap);
                    });
                } else {
                    const empty = document.createElement('div');
                    empty.className = 'dialog-empty';
                    empty.textContent = '（无选项）';
                    customContainer.appendChild(empty);
                }
                break;

            case 'toast':
                break;

            case 'progress': {
                const progressBar = document.createElement('progress');
                progressBar.className = 'dialog-progress';
                progressBar.max = 1;
                progressBar.value = Math.max(0, Math.min(progress, 1));
                customContainer.appendChild(progressBar);
                break;
            }

            default:
                break;
        }

        buttonContainer.innerHTML = '';
        let btnList = customButtons;
        if (!btnList || !btnList.length) {
            if (['toast', 'progress'].includes(typeLower)) {
                btnList = [];
            } else if (['input', 'prompt', 'list', 'check', 'checkbox'].includes(typeLower)) {
                btnList = ['确定', '取消'];
            } else {
                btnList = ['确定'];
            }
        }

        btnList.forEach((text, idx) => {
            const btn = document.createElement("button");
            btn.textContent = text;
            btn.dataset.idx = idx;
            // 主按钮仅靠类名区分，颜色走变量
            if (typeLower !== 'toast' && idx === 0) {
                btn.classList.add('primary');
            }
            buttonContainer.appendChild(btn);
        });

        let resolved = false;
        const promise = new Promise((resolve) => {
            if (!container.parentNode) {
                document.body.appendChild(container);
            }

            buttonContainer.addEventListener('click', (ev) => {
                if (resolved) return;
                resolved = true;
                if (nodeName(ev.target, "button")) {
                    const btn = ev.target;
                    const idx = parseInt(btn.dataset.idx, 10);
                    const value = inputEl.value;
                    const cbs = customContainer.querySelectorAll('input[type="checkbox"]');
                    const selected = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.value);
                    resolve({ which: idx, value, selected });
                    container.remove();
                }
            });

            if (typeLower === 'toast' && btnList.length === 0) {
                setTimeout(() => {
                    if (resolved) return;
                    resolved = true;
                    resolve({ which: -1, value: undefined, selected: null });
                    container.remove();
                }, duration);
            }

            if (typeLower === 'toast') {
                container.classList.add('toast');
                container.show(); // 非模态
            } else {
                container.showModal();
            }

            container._resolve = resolve;
        });

        promise.close = () => {
            if (resolved) return;
            resolved = true;
            if (container._resolve) {
                container._resolve({ which: -1, value: undefined, selected: null });
                container._resolve = null;
            }
            container.remove();
        };

        return promise;
    }
}