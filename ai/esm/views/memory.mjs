/**
 * views/memory.mjs
 * 记忆/智能体视图：词条列表、Agent 列表、新增/保存编辑表单。
 */

import { runtime } from '../runtime.mjs';

export function setupMemoryViews(ctx) {
    const { dom, data, memory_map, agents, chuji, saveData, registry } = ctx;
    const { loginView, characterName, characterKeys, characterPrompt, agentSelect } = dom;
    const characterList = dom.drawer.querySelector('details#memory-list');

    // ---------- 词条列表 ----------
    function getSortedCharacters() {
        return Object.values(memory_map).sort((a, b) => b.summary.localeCompare(a.summary));
    }
    ctx.getSortedCharacters = getSortedCharacters;

    ctx.vm_memory_map = PuSet.mvvm({
        target: characterList.querySelector('ul'),
        selector: 'li',
        data: getSortedCharacters(),
        layout(li, character) {
            li.querySelector('span.name').textContent = character.summary;
        }
    }).on('click', function (e, character) {
        if (nodeName(e.target, "button")) {
            return ModalDialog.show('确定要删除【' + character.summary + '】吗？', '确定', '取消').then((result) => {
                if (result.which != 0) return;
                // 显式 dryRun:false —— 此处调用方是 UI（用户手动点击删除），
                // 上面的 ModalDialog 就是这次删除的确认，UI 侧不需要两段式。
                // 若省略，forgotten 会按 LLM 工具的默认行为只返回预览、挂起等 confirm，
                // 而 UI 这条路径永远不会去调 confirm，结果就是确认了却没删掉。
                registry.forgotten({ memory_map }, { keys: [character.key], dryRun: false });
                ctx.vm_memory_map.update(getSortedCharacters());
                saveData();
            });
        }
        loginView.dataset.type = 'character';
        loginView.dataset.id = character.key;
        characterName.value = character.summary;
        characterKeys.value = character.tags?.join('\uff0c') ?? '';
        characterPrompt.value = character.memory;
        PuSet.show(loginView, true);
    });

    // ---------- Agent 列表 ----------
    ctx.vm_agent = PuSet.mvvm({
        target: document.getElementById('agent-list').querySelector('ul'),
        selector: 'li',
        data: Object.values(agents),
        onresize(ul, now, old) {
            if (now === old) return;
            // 同步下拉框选项数：原代码误用全局 length（=0），会清空选项后 item(0) 为 null
            agentSelect.options.length = now;
            // 仅当当前选中的智能体已不存在时才回退到第一个；
            // 否则新增/删除其他智能体时会被误切到第一个（例如 recruit 刷新列表）。
            if (!agents[ctx.data.currentAgent]) {
                const first = agentSelect.options.item(0);
                if (first) ctx.initAgent(first.value);
            }
        },
        layout(li, value, index) {
            li.querySelector('span.name').textContent = value.name;
            const children = agentSelect.options;
            const option = children.length > index
                ? children.item(index)
                : agentSelect.appendChild(document.createElement("option"));
            option.textContent = value.name;
            option.value = value.id;
        }
    }).on('click', function (e, value) {
        if (value === chuji) return ModalDialog.show("不可修改初姬的提示词", "确定");
        if (nodeName(e.target, "button")) {
            return ModalDialog.show('确定要删除【' + value.name + '】吗？', '确定', '取消').then(result => {
                if (result.which != 0) return;
                Reflect.deleteProperty(agents, value.id);
                ctx.vm_agent.update(Object.values(agents));
                saveData();
            });
        }
        loginView.dataset.type = 'agent';
        loginView.dataset.id = value.id;
        characterName.value = value.name;
        // 本回调的第二个参数名为 value（智能体对象），不是 character ——
        // character 是上面词条列表回调的参数名，两者不同源，写错会抛 ReferenceError。
        characterKeys.value = value.tags?.join('\uff0c') ?? '';
        characterPrompt.value = value.content;
        PuSet.show(loginView, true);
    });
    runtime.vm_agent = ctx.vm_agent;
    agentSelect.value = ctx.data.currentAgent;
    agentSelect.addEventListener('change', function () {
        ctx.initAgent(this.value);
    });

    // ---------- 增删编辑 ----------
    const aaa = {
        add(type) {
            loginView.reset();
            loginView.dataset.type = type;
            loginView.dataset.id = '';
            PuSet.show(loginView, true);
        },
        save(type) {
            try {
                const id = loginView.dataset.id || crypto.randomUUID();
                switch (type) {
                    case 'character': {
                        const config = Object.assign({
                            "key": id
                        }, memory_map[id] || {}, {
                            "summary": characterName.value,
                            "memory": characterPrompt.value,
                            "tags": characterKeys.value.trim().split(/\s*,\s*|\s*\uff0c\s*/)
                        });
                        memory_map[config.key] = config;
                        ctx.vm_memory_map.update(getSortedCharacters());
                        break;
                    }
                    case 'agent': {
                        const config = Object.assign({
                            "id": id,
                            'branch': [],
                            "settings": { thinking: true }
                        }, agents[id] || {}, {
                            "name": characterName.value,
                            "tags": characterKeys.value.trim().split(/\s*,\s*|\s*\uff0c\s*/),
                            "content": characterPrompt.value
                        });
                        agents[config.id] = config;
                        ctx.vm_agent.update(Object.values(agents));
                        if (data.currentAgent === id) {
                            ctx.system_prompt.content = config.content;
                        }
                        break;
                    }
                }
                PuSet.show(loginView, false);
                saveData();
            } catch (e) {
                ModalDialog.show('保存失败：' + e.message, "确定");
            }
        }
    };
    ctx.aaa = aaa;

    document.getElementById('enter-chat').addEventListener("click", function () {
        aaa.save(loginView.dataset.type);
    });
    PuSet(characterList).add('#agent-list').on('click', '.subtitle button', function () {
        aaa.add(this.className);
    });
    document.getElementById('gotomain').addEventListener('click', () => {
        ctx.vm_memory_map.update(getSortedCharacters());
        PuSet.show(dom.drawer, true);
    });
    dom.drawer.addEventListener('click', (ev) => {
        if (ev.target === dom.drawer) PuSet.show(dom.drawer, false);
    });
}