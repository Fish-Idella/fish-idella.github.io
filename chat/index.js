
const chat_params = {
    "model": "qwen3:4b-thinking-2507-q8_0",
    "options": {
        "stream": false,
        "temperature": 1,
        "top_p": 1
    },
    "messages": null
};
const system_message = {
    role: "system", 
    content: `当前时间：${new Date().toString()}。
你是女忍者——彩儿，今年16岁的女孩，你早年以走投无路的孤儿身份被用户收留，潜伏在用户的身边窃取情报，最近被用户发现囚禁在地下室。以此背景与用户进行对话。
` 
};


fetch("http://localhost:11434/api/tags").then(a => a.json()).then(function (json) {
    if (Array.isArray(json.models)) {
        const select = document.getElementById("models");
        select.addEventListener("change", function () {
            chat_params.model = select.value;
        });
        select.innerHTML = "";
        json.models.forEach(function (model) {
            const option = document.createElement("option");
            option.value = option.textContent = model.name;
            option.selected = model.name === chat_params.model;
            select.appendChild(option);
        });
    }
}).catch(console.error);

const vm_chat = new Interpreter({
    target: document.querySelector(".chat-container"),
    selector: "div.message-container",
    data: [],
    layout(container, value, key, index) {
        container.dataset.index = index;
        container.className = "message-container " + value.role;
        const think = container.querySelector(".message-text-think .think");
        think.classList.toggle("hide", value.done);
        think.textContent = value.think;
        container.querySelector(".message-text-content").textContent = value.content;
    }
});

vm_chat.delegation("click", ".message-text-think .title", function (event) {
    this.nextElementSibling.classList.toggle("hide");
});

const chatInput = document.getElementById("chatInput");

function update(index, content, done) {
    if (content.includes("<think>")) {
        const array = content.split(/\n*(\<think\>|\<\/think\>)\n*/);
        messages[index].think = array[2] ?? "";
        messages[index].content = array[4] ?? "";
    } else {
        messages[index].content = content;
    }
    messages[index].done = done;
    vm_chat.update(messages);

    // 滚动到底部
    vm_chat.target.scrollTop = vm_chat.target.scrollHeight;
}

function send(obj) {
    // 添加加载状态提示
    messages.push({
        role: "assistant",
        model: chat_params.model,
        done: false,
        think: "",
        content: ""
    });
    vm_chat.update(messages);
    const lastIndex = messages.length - 1;

    fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(obj)
    }).then(response => {
        if (!response.body) {
            throw new Error("不支持流式响应");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        // 处理流式数据的函数
        function processStream({ done, value }) {
            if (done) {
                // 流结束，更新最终内容
                update(lastIndex, fullContent, true);
                return;
            }

            // 解码新收到的内容
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(line => line.trim() !== "");

            // 处理每一行JSON数据
            lines.forEach(line => {
                try {
                    const data = JSON.parse(line.replace("data: ", ""));
                    if (data.message && data.message.content) {
                        fullContent += data.message.content;
                        // 实时更新UI
                        update(lastIndex, fullContent, false);
                    }
                } catch (e) {
                    console.error("解析流式数据错误:", e);
                }
            });

            // 继续读取下一个数据块
            return reader.read().then(processStream);
        }

        // 开始读取流
        return reader.read().then(processStream);
    }).catch(error => {
        console.error("发送请求错误:", error);
        // 显示错误信息
        messages[lastIndex].content = `发生错误: ${error.message}`;
        vm_chat.update(messages);
    });

}

document.getElementById("sendButton").addEventListener("click", function () {
    if (chatInput.value.trim() == "") return;
    messages.push({ role: "user", content: chatInput.value });
    chatInput.value = "";
    chat_params.messages = messages;

    send(Object.assign({}, chat_params, { messages: [system_message, ...messages.slice(-10)] }));
});


// 在原有代码基础上添加以下内容

// 持久化存储相关函数
function saveMessagesToLocalStorage() {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
}

function loadMessagesFromLocalStorage() {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
        return JSON.parse(saved);
    }
    return [
        { role: "assistant", done: true, think: "", content: "主人，你终于来啦，请开始你的对话吧" }
    ];
}

// 初始化时加载保存的消息
const messages = loadMessagesFromLocalStorage();
vm_chat.update(messages);

// 清除按钮事件
document.getElementById("clearButton").addEventListener("click", function () {
    if (confirm("确定要清除所有对话记录吗？")) {
        messages.length = 0;
        messages.push({ role: "assistant", done: true, think: "", content: "主人，你终于来啦，请开始你的对话吧" });
        vm_chat.update(messages);
        saveMessagesToLocalStorage();
    }
});

// 导出按钮事件
document.getElementById("exportButton").addEventListener("click", function () {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `chat-history-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
});

// 导入按钮事件
document.getElementById("importButton").addEventListener("click", function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = event => {
            try {
                const importedMessages = JSON.parse(event.target.result);
                if (Array.isArray(importedMessages) && importedMessages.length > 0) {
                    messages.length = 0;
                    messages.push(...importedMessages);
                    vm_chat.update(messages);
                    saveMessagesToLocalStorage();
                    alert('导入成功');
                } else {
                    alert('导入的文件格式不正确');
                }
            } catch (error) {
                console.error('导入失败', error);
                alert('导入失败，请检查文件格式');
            }
        };

        reader.readAsText(file);
    };

    input.click();
});

// 文件按钮事件 - 用于上传文件
document.getElementById("fileInput").addEventListener("click", function () {
    const input = document.createElement('input');
    input.type = 'file';

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = event => {
            // 根据文件类型处理内容
            let content = event.target.result;
            let fileName = file.name;
            let fileType = file.type;

            // 将文件内容添加到聊天输入框
            chatInput.value += `[文件: ${fileName} (${fileType})]\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`;
        };

        // 对于文本文件直接读取内容，二进制文件读取为base64
        if (file.type.startsWith('text/')) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    };

    input.click();
});

// 消息操作按钮事件处理
vm_chat.delegation("click", ".message-actions-button", function (event) {
    const index = parseInt(this.closest('.message-container').dataset.index);
    const action = this.title;

    switch (action) {
        case "刷新":
            if (messages[index].role === "assistant") {
                // 重新生成助手回复
                const userMessage = messages[index - 1];
                if (userMessage && userMessage.role === "user") {
                    // 移除当前回复
                    messages.splice(index, 1);
                    vm_chat.update(messages);
                    // 重新发送请求
                    chat_params.messages = [system_message, ...messages.slice(-10)];
                    send(chat_params);
                }
            }
            break;

        case "修改":
            if (messages[index].role === "user") {
                // 修改用户消息
                chatInput.value = messages[index].content;
                // 删除原消息
                messages.splice(index, 1);
                vm_chat.update(messages);
                saveMessagesToLocalStorage();
            }
            break;

        case "复制":
            // 复制消息内容
            const content = messages[index].content;
            navigator.clipboard.writeText(content).then(() => {
                // 显示复制成功提示
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 2000);
            });
            break;

        case "删除":
            // 删除消息
            messages.splice(index, 1);
            vm_chat.update(messages);
            saveMessagesToLocalStorage();
            break;
    }
});

// 修改发送消息函数，添加存储逻辑
document.getElementById("sendButton").addEventListener("click", function () {
    if (chatInput.value.trim() == "") return;
    messages.push({ role: "user", content: chatInput.value });
    chatInput.value = "";
    chat_params.messages = messages;

    // 保存到本地存储
    saveMessagesToLocalStorage();

    send(Object.assign({}, chat_params, { messages: [system_message, ...messages.slice(-10)] }));
});

// 修改update函数，添加存储逻辑
function update(index, content, done) {
    if (content.includes("")) {
        const array = content.split(/\n*(\<think\>|\<\/think\>)\n*/);
        messages[index].think = array[2] ?? "";
        messages[index].content = array[4] ?? "";
    } else {
        messages[index].content = content;
    }
    messages[index].done = done;
    vm_chat.update(messages);

    // 保存到本地存储
    if (done) {
        saveMessagesToLocalStorage();
    }

    // 滚动到底部
    vm_chat.target.scrollTop = vm_chat.target.scrollHeight;
}