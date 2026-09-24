function nodeName(elem, name) {
    return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
}
class ModalDialog {
    static #instance = null;
    template = null;
    constructor() {
        const container = document.createElement('dialog');
        container.className = 'unselect';
        container.style.border = 'none';
        container.style.borderRadius = '0.6rem';
        container.style.boxShadow = '0px 0px 5px #4f4b4b';
        const content = document.createElement('div');
        content.className = 'dialog-content-a flex-vertical';
        content.style.maxHeight = '80vh';
        content.style.maxWidth = '80vw';
        content.style.width = 'fit-content';
        content.style.borderRadius = '1rem';
        content.style.margin = '0';
        const messageDiv = document.createElement('code');
        messageDiv.className = 'dialog-message';
        messageDiv.style.overflow = 'auto';
        messageDiv.style.whiteSpace = 'pre';
        const input = document.createElement('input');
        input.className = 'dialog-input hide';
        input.style.marginTop = '1rem';
        input.style.padding = '6px 10px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '4px';
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        const customContainer = document.createElement('div');
        customContainer.className = 'dialog-custom flex-vertical';
        customContainer.style.lineHeight = '2rem';
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dialog-buttons flex-horizontal place-center';
        buttonContainer.style.flexDirection = 'row-reverse';
        buttonContainer.style.gap = '1rem';
        buttonContainer.style.marginTop = '1rem';
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
                    empty.textContent = '（无选项）';
                    empty.style.color = '#999';
                    customContainer.appendChild(empty);
                }
                break;
            case 'toast':
                break;
            case "progress":
                const progressBar = document.createElement('progress');
                progressBar.className = 'dialog-progress';
                progressBar.max = 1;
                progressBar.value = Math.max(0, Math.min(progress, 1));
                customContainer.appendChild(progressBar);
                break;
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
            const isPrimary = (typeLower !== 'toast' && idx === 0);
            Object.assign(btn.style, {
                flex: 1,
                padding: '8px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: '80px',
                backgroundColor: isPrimary ? '#1890ff' : '#d1d1d1',
                color: isPrimary ? '#fff' : '#333'
            });
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
                container.show(); // 非模态
                Object.assign(container.style, {
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: '9999',
                    background: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '12px 24px',
                    borderRadius: '8px'
                });
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