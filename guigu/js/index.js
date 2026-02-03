
const golbalData = {};
const playerName = "韩立";


/**
 * 处理角色人际关系JSON文件：读取文件内容 → 清理无效角色引用 → 生成新文件并下载
 * @param {File} file - 待处理的JSON文件对象（来自<input type="file">或拖放）
 */
async function processCharacterRelationshipJsonFile(file) {

    // 创建Promise处理文件读取异步操作
    try {
        return await new Promise((resolve, reject) => {
            // 初始化FileReader实例用于读取文件内容
            const fileReader = new FileReader();

            // 文件读取成功回调：解析JSON并返回数据
            fileReader.onload = () => {
                try {
                    // 解析文件内容为JSON对象（包裹try/catch防止JSON格式错误）
                    const key = file.name;
                    const jsonData = JSON.parse(fileReader.result);
                    golbalData[key] = jsonData;
                    resolve(key);
                } catch (parseError) {
                    reject(new Error(`JSON解析失败：${parseError.message}`));
                }
            };

            // 文件读取失败回调：返回错误信息
            fileReader.onerror = () => reject(new Error(`文件读取失败：${fileReader.error.message}`));

            // 以文本形式读取文件（JSON文件本质是文本）
            fileReader.readAsText(file);
        });
    } catch (error) {
        console.error("处理JSON文件时出错：", error);
    }
}

/**
 * 通用事件阻止函数：阻止事件默认行为 + 停止冒泡
 * @param {Event} e - 浏览器事件对象
 */
const preventDefaultAndStopPropagation = (e) => {
    e.preventDefault();
    e.stopPropagation();
};

// ========== 绑定文件选择（input）事件 ==========
// 监听id为"json"的文件输入框选择文件事件
document.getElementById("json").addEventListener("input", function (e) {
    preventDefaultAndStopPropagation(e);
    // 处理选中的第一个文件
    processCharacterRelationshipJsonFile(this.files[0]).then(key => {
        console.log("已加载文件：" + key);
    });
});

// ========== 绑定文件拖放事件 ==========
const fileDropArea = document.getElementById("file-input");
// 拖放过程中（悬停）：阻止默认行为
fileDropArea.addEventListener("dragover", preventDefaultAndStopPropagation);
// 进入拖放区域：阻止默认行为
fileDropArea.addEventListener("dragenter", preventDefaultAndStopPropagation);
// 离开拖放区域：阻止默认行为
fileDropArea.addEventListener("dragleave", preventDefaultAndStopPropagation);
// 放下文件：处理拖入的第一个文件
fileDropArea.addEventListener("drop", function (e) {
    preventDefaultAndStopPropagation(e);
    processCharacterRelationshipJsonFile(e.dataTransfer.files[0]).then(key => {
        console.log("已加载文件：" + key);
    });
});

function saveJsonFile(jsonData, fileName) {
    // 将JSON对象转为字符串，生成Blob文件对象（JSON格式）
    // 创建Blob临时URL
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(jsonData)], {
        type: "application/json; charset=utf-8"
    }));

    // 创建隐藏的<a>标签用于触发文件下载
    const downloadLink = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    downloadLink.href = blobUrl;
    // 下载文件名沿用原文件名称
    downloadLink.download = fileName;
    // 模拟点击下载链接
    downloadLink.dispatchEvent(new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true
    }));

    // 1秒后释放Blob URL（避免内存泄漏）
    if (blobUrl.startsWith("blob:")) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
}

document.getElementById("start").addEventListener("click", function () {
    const names = new Set();

    Promise.resolve(golbalData["DataUnit.json"]).then((jsonData) => {
        console.log("原始JSON数据:", jsonData);
        // 从JSON中获取所有角色单元（核心数据）
        const characterUnits = jsonData.allUnit;
        const data2 = golbalData["DataUnit2.json"].allUnit;
        const keys = Object.keys(data2);
        const max = keys.length;

        let i = 0;
        // 遍历所有角色单元，检查并清理其人际关系
        for (const characterKey in characterUnits) {
            // 当前遍历的角色单元
            const currentCharacter = characterUnits[characterKey];
            const name = currentCharacter.q.q.join("");
            // 打印当前角色的Q字段拼接值（用于调试）
            if (currentCharacter.q.r == 1) {
                if (name === playerName) continue;
                const re = data2[keys[i++]];
                if (!re || i >= max) break;
                currentCharacter.q.q = re.q.q;
                currentCharacter.q.w = re.q.w;
                currentCharacter.q.e = re.q.e;
                currentCharacter.q.r = re.q.r;
            }
        }
        console.log("男性角色替换为女性角色数量：" + i);

        return jsonData;
    }).then(() => {
        Object.entries(golbalData).forEach(([fileName, data]) => saveJsonFile(data, fileName));
    });
});