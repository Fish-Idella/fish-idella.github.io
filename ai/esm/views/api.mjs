/**
 * views/api.mjs
 * API 视图：API 列表 MVVM、模型列表构建、API 弹窗、导出/导入。
 */

import { mimejson, fetchModelList } from '../core.mjs';

export function setupApiViews(ctx) {
    const { dom, data, saveData, mergeInto, removeArrayItem } = ctx;

    // ---------- API 列表 ----------
    const apiSelect = document.getElementById('api-url-list');
    const keySelect = document.getElementById('api-key-list');
    const vm_apiList = PuSet.mvvm({
        target: document.getElementById("api-list"),
        selector: 'li',
        data: [],
        layout(li, value) {
            li.querySelector('span.name').textContent = value.api;
        }
    }).on('click', function (e, value, key) {
        dom.apiUrlInput.value = value.api;
        dom.apiKeyInput.value = value.key;
        if (nodeName(e.target, "button")) {
            Reflect.deleteProperty(data.apiList, value.id);
            removeArrayItem(vm_apiList.data, value);
            // 原代码删完不落盘：data.apiList 已改但 storage 里还是旧的，
            // 刷新页面后删除的 API 会复活。
            saveData();
        }
    });
    ctx.vm_apiList = vm_apiList;

    function buildDataList() {
        const apis = new Set(['https://api.deepseek.com/', 'https://api.openai.com/v1/']);
        const keys = new Set(['none']);
        const values = Object.values(data.apiList);
        values.forEach(a => {
            apis.add(a.api);
            keys.add(a.key);
        });
        vm_apiList.update(values);
        apiSelect.innerHTML = '';
        keySelect.innerHTML = '';
        apis.forEach(v => apiSelect.appendChild(new Option(v, v)));
        keys.forEach(v => keySelect.appendChild(new Option(v, v)));
    }
    ctx.buildDataList = buildDataList;

    // ---------- API 弹窗 ----------
    const apiModal = document.getElementById('api-m');
    PuSet(apiModal).on("click", "button.login-btn", function () {
        if (this.name === "save") {
            const baseUrl = dom.apiUrlInput.value.trim();
            const baseKey = dom.apiKeyInput.value.trim();
            if (!baseUrl) return ModalDialog.show("请填写API地址", "确定");
            fetchModelList(baseUrl, baseKey).then(modelList => {
                const newId = crypto.randomUUID();
                data.apiList[newId] = {
                    "id": newId,
                    "api": baseUrl,
                    "key": baseKey
                };
                modelList.forEach(modelObj => {
                    const name = String(modelObj.id);
                    const value = newId + "||" + name;
                    dom.modelSelect.appendChild(new Option(name, value, false, false));
                });
                if (!data.currentModel) {
                    const first = dom.modelSelect.children.item(0);
                    if (first) ctx.initAPI(first.value);
                }
                saveData();
                PuSet.show(apiModal, false);
            }).catch(e => ModalDialog.show(`测试链接失败：${e.message}`, "确定"));
            return;
        }
        PuSet.show(apiModal, false);
    });
    ctx.apiModal = apiModal;

    // ---------- 设置：导出 / 导入 ----------
    PuSet('.settings').on('click', 'button', function () {
        switch (this.name) {
            case 'api': {
                buildDataList();
                PuSet.show(apiModal, true);
                break;
            }
            case 'export': {
                ModalDialog.show({
                    type: "list",
                    message: "以下信息将会被明文导出，注意信息安全",
                    list: [
                        { value: "apiList", text: "API 配置" },
                        { value: "agents", text: "所有智能体" },
                        { value: "memory_map", text: "所有词条" },
                        { value: "branch", text: "与初姬的聊天记录" }
                    ]
                }).then(function (res) {
                    if (res.which != 0) return;
                    const obj = {};
                    res.selected.forEach(key => {
                        if (key in data) {
                            if (key === 'agents') {
                                // 导出智能体时剔除默认智能体（id=0，初姬），它不属于用户创建的角色
                                const { '0': _omit, ...rest } = data.agents;
                                obj[key] = rest;
                            } else {
                                obj[key] = data[key];
                            }
                        }
                    });
                    const fr = new FileReader();
                    fr.addEventListener('load', () => PuSet.download(fr.result, "chat-data.json"));
                    fr.readAsDataURL(new Blob([JSON.stringify(obj)], { type: mimejson }));
                });
                break;
            }
            case 'import': {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = mimejson;
                input.addEventListener('input', () => {
                    const files = input.files;
                    if (files.length < 1) return;
                    const fr = new FileReader();
                    fr.addEventListener('load', function () {
                        try {
                            const json = JSON.parse(fr.result);
                            ModalDialog.show("文件已读取，选择导入方式\n注意：合并可能导致现有关联词条混乱", "合并", "覆盖", "取消").then(function (res) {
                                switch (res.which) {
                                    case 0: {
                                        mergeInto(data, json);
                                        saveData();
                                        window.location.reload(true);
                                        break;
                                    }
                                    case 1: {
                                        // 覆盖导入：先把 data 清空再写入，
                                        // 原代码 Object.assign 只覆盖 json 里存在的键，
                                        // 旧的 agents / memory_map 残留会与新数据混在一起。
                                        for (const k of Object.keys(data)) Reflect.deleteProperty(data, k);
                                        Object.assign(data, json);
                                        saveData();
                                        window.location.reload(true);
                                        break;
                                    }
                                    default: return;
                                }
                            });
                        } catch {
                            ModalDialog.show("无法解析文件", "确定");
                        }
                    });
                    fr.readAsText(files[0]);
                });
                input.click();
                break;
            }
        }
    });

    // ---------- 启动时拉取所有 API 的模型列表 ----------
    Object.keys(data.apiList).forEach(id => {
        const cfg = data.apiList[id];
        fetchModelList(cfg.api, cfg.key).then(modelList => {
            modelList.forEach(modelObj => {
                const name = String(modelObj.id);
                const value = id + "||" + name;
                const selected = (value === data.currentModel);
                dom.modelSelect.appendChild(new Option(name, value, selected, selected));
            });
        }).catch(() => console.warn("无法访问: " + cfg.api));
    });
}