// 从文件获取系统提示词，并初始化应用
fetch("system.txt").then(response => response.text()).then(function (systemPromptText) {
    // 从本地存储获取API配置，若不存在则使用默认值
    let apiBaseUrl = window.localStorage.getItem("api-path") ?? 'http://localhost:11434/v1/';
    let apiSecretKey = window.localStorage.getItem("api-key") ?? 'sk-xxxxxxxxxxxxxxxxxxxxxx';
    let selectedModel = window.localStorage.getItem("api-model-name") ?? "deepseek-r1:latest";
    let autoAdvanceInterval = 0; // 自动推进对话的间隔（分钟），0表示禁用

    // 游戏状态对象，包含视频播放列表、AI对话与行为文本、当前播放索引
    let gameState = {
        // 初始视频播放列表
        "videos": ["title_b", "title_a"],
        "index": 1 // 当前播放的视频在列表中的索引
    };

    let openAI;

    // 获取页面上的DOM元素
    const apiPathInput = document.getElementById("api-path");
    apiPathInput.value = apiBaseUrl;
    const apiKeyInput = document.getElementById("api-key");
    apiKeyInput.value = apiSecretKey;
    const apiTestTips = document.getElementById("tips");
    const modelSelect = document.getElementById("models");

    const videoElement = document.getElementById('video');
    const chatOutput = document.getElementById('chat-messages-output');
    const chatInput = document.getElementById('chat-message-input');
    const submitButton = document.getElementById('chat-message-submit');
    const chatDialog = document.getElementById('chat-dialog');

    /**
     * 更新聊天输出区域的HTML内容
     * 将换行符转换为<br>，并将括号内的内容（如旁白、动作描述）用特定样式包裹
     */
    function updateChatDisplay() {
        chatOutput.innerHTML = openAI.requestConfig.messages.at(-1).content
            .replace(/[\r\n]/g, "<br>")
            .replace(/(\uff08[^\uff09]*\uff09)|(\([^\)]*\))/g, "<span class='dd'>$1</span>");
    }

    // 点击设置界面的“开始”按钮，重置游戏并播放第一个视频
    document.getElementById("start-settings").addEventListener("click", function (ev) {
        if (this === ev.target) {
            gameState.index = 0;
            getPlayableVideoPath(gameState, 0).then(path => videoElement.src = path);
        }
    });

    // 测试API连接并获取可用模型列表
    document.getElementById("api-test").addEventListener("click", function () {
        const baseUrl = apiPathInput.value.trim().replace(/\/*$/, "/");
        apiSecretKey = apiKeyInput.value.trim();
        fetch(new URL("models", baseUrl).href, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${apiSecretKey}` // 传递API Key
            }
        }).then(response => response.json()).then(function (modelList) {
            modelSelect.innerHTML = ''; // 清空现有选项
            modelSelect.disabled = false;
            apiPathInput.value = apiBaseUrl = baseUrl; // 更新内存和输入框中的URL
            // 动态填充模型下拉选项
            modelList.data.forEach(function (modelObj) {
                const option = document.createElement('option');
                option.textContent = option.value = modelObj.id;
                if (modelObj.id === selectedModel) {
                    option.selected = true;
                }
                modelSelect.appendChild(option);
            });
            apiTestTips.textContent = "可正常访问";
        }).catch(function () {
            apiTestTips.textContent = "无法访问";
        });
    });

    // 点击“开始游戏”按钮，应用设置并正式启动游戏
    document.getElementById("start-game").addEventListener("click", function () {
        if (modelSelect.disabled) return; // 如果未测试API，则不允许开始

        // 保存配置到本地存储
        window.localStorage.setItem("api-path", apiBaseUrl);
        window.localStorage.setItem("api-key", apiSecretKey);
        window.localStorage.setItem("api-model-name", (selectedModel = modelSelect.value));

        openAI = new OpenAIStream({
            "api-url": apiBaseUrl,
            "api-key": apiSecretKey
        }).setToolFunctions({
            async get_video_list(args) {
                return args.types.map(type => posture[type]).join("\n\n");
            },
            async set_video_list(args) {
                gameState.videos = args.keys;
                gameState.index = 0;
                getPlayableVideoPath(gameState, 0).then(path => videoElement.src = path);
                return "成功"
            }
        }).setRequestConfig({
            "model": selectedModel,
            "stream": true,
            "temperature": 0.8,
            "thinking": {
                "type": "enabled"
            },
            "tools": [
                {
                    type: "function",
                    function: {
                        name: "get_video_list",
                        description: "获取一个或多个类型场景的全部视频列表",
                        parameters: {
                            type: "object",
                            properties: {
                                types: {
                                    type: "array",
                                    items: { type: "string" },
                                    enum: Object.keys(posture),
                                    description: "类型，只允许枚举中的类型",
                                }
                            },
                            required: ["types"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "set_video_list",
                        description: "与对话场景匹配的视频列表",
                        parameters: {
                            type: "object",
                            properties: {
                                keys: {
                                    type: "array",
                                    description: "视频 ID",
                                    items: { type: "string" }
                                }
                            },
                            required: ["keys"]
                        }
                    }
                },
            ],
            "tool_choice": "auto",
            "messages": [
                {
                    "role": "system",
                    "content": systemPromptText // 主要的系统指令
                }, {
                    "role": "assistant",
                    "content": "（默认以乳交开场，女仆邀约男主人，脱掉内衣 …… 屏幕一闪，男主人已坐在沙发上，女仆跪在主人身前，乳房夹着男主人的阴茎，手指把玩着主人龟头）主人，人家的奶子是不是超软超舒服呢？"
                }
            ]
        })

        // 设置正式的游戏视频列表和初始状态
        openAI.functions.set_video_list({
            keys: ["op_e_01", "op_e_02", "paizuri_a_02", "paizuri_a_03"]
        })
        updateChatDisplay();

        // 获取并设置自动推进间隔
        autoAdvanceInterval = Math.ceil(document.getElementById("auto-advance").value);
        if (isNaN(autoAdvanceInterval)) {
            autoAdvanceInterval = 0;
        }

        // 切换界面：隐藏设置页，显示聊天/游戏主界面
        document.getElementById("start-settings").classList.add("hide");
        document.getElementById("chat-container").classList.remove("hide");

        // 启动空闲状态计时器（用于自动推进）
        startIdleTimer();
    });

    /**
     * 自动隐藏聊天对话框的函数
     * 根据当前文本长度计算一个延迟时间，然后隐藏对话框
     */
    const autoHideDialog = function hide() {
        autoHideDialog.cancelLast(); // 取消上一次设置的计时器

        // 根据文本长度动态计算隐藏延迟（约300ms/字符），确保阅读时间
        hide.timer = setTimeout(() => chatDialog.classList.add("hide"), 9000);
    };
    // 为自动隐藏函数附加一个取消上次计时的方法
    autoHideDialog.cancelLast = function () {
        clearTimeout(autoHideDialog.timer);
    };

    /**
     * 启动空闲状态计时器
     * 如果设置了自动推进间隔，则在指定时间后自动发送一条“保持沉默”的用户消息
     */
    function startIdleTimer() {
        clearTimeout(startIdleTimer.timer);
        if (autoAdvanceInterval <= 0) return;
        startIdleTimer.timer = setTimeout(() => {
            if (submitButton.thinking) return;

            chatInput.value = `（男主人没有说话，只是一味地享受。就这样又持续了${autoAdvanceInterval}分钟）`;
            chatDialog.classList.remove("hide");
            submitButton.click(); // 模拟用户发送
        }, (autoAdvanceInterval * 60000)); // 将分钟转换为毫秒
    }

    /**
     * 异步检查并返回可播放的视频路径
     * @param {Object} state - 游戏状态对象
     * @param {number} targetIndex - 想要播放的视频在state.videos中的索引
     * @returns {Promise<string>} 可播放的视频文件路径
     */
    async function getPlayableVideoPath(state, targetIndex) {
        return new Promise((resolve, reject) => {
            if (targetIndex >= state.videos.length) {
                reject(); // 索引超出范围
                return;
            }

            const videoId = state.videos[targetIndex];
            const videoPath = "video/" + videoId + ".webm";
            // 如果视频是结束动画，则播放后关闭窗口
            if (videoId === "end_g_01") {
                setTimeout(() => window.close(), 5000);
                resolve(videoPath);
                return;
            }

            // 通过HEAD请求检查视频文件是否真实存在
            fetch(videoPath, { method: 'HEAD' }).then(res => res.ok).then(function (exists) {
                if (exists) {
                    resolve(videoPath);
                } else {
                    reject(); // 文件不存在
                }
            });
        });
    }

    // 用户输入时，重置空闲计时器
    chatInput.addEventListener("input", function () {
        startIdleTimer();
    });

    // 当前视频播放结束时，尝试播放下一个视频
    videoElement.addEventListener('ended', function () {
        getPlayableVideoPath(gameState, gameState.index + 1).then(function (path) {
            gameState.index++;
            videoElement.src = path;
        }).catch(function () {
            // 如果没有下一个视频，则循环播放当前视频
            videoElement.play();
        });
    });

    // 视频开始播放时，预加载列表中的下一个视频（如果存在），以提升体验
    videoElement.addEventListener("playing", function () {
        getPlayableVideoPath(gameState, gameState.index + 1).then(function (path) {
            const preloadVideo = document.createElement("video");
            preloadVideo.muted = true;
            preloadVideo.preload = "auto";
            preloadVideo.src = path;
            console.log("预加载下一个视频：" + path);
        }).catch(function () {
            // 没有更多视频可预加载
        });
    });

    // 视频可以播放时，自动开始播放
    videoElement.addEventListener("canplay", function () {
        videoElement.play();
    });

    // 鼠标在视频区域移动时，显示并延时隐藏对话框
    videoElement.parentElement.addEventListener("pointermove", function () {
        if (submitButton.thinking) return; // 如果AI正在思考，则不干扰
        autoHideDialog.cancelLast();
        chatDialog.classList.remove("hide");
        autoHideDialog(); // 重新设置自动隐藏计时
    });

    // 鼠标悬停在对话框上时，取消自动隐藏
    chatDialog.addEventListener("pointerover", function (ev) {
        ev.preventDefault();
        autoHideDialog.cancelLast();
    });

    // 点击输入框时，取消自动隐藏
    chatInput.addEventListener("click", autoHideDialog.cancelLast);
    // 输入框获得焦点时，清空其内容
    chatInput.addEventListener('focusin', () => {
        chatInput.value = '';
    });

    // 发送消息给AI
    submitButton.addEventListener('click', function sendMessage() {

        const userMessage = chatInput.value.trim();
        if (userMessage === "") return;

        submitButton.thinking = true;
        submitButton.textContent = "Thinking...";
        autoHideDialog.cancelLast(); // 发送时取消自动隐藏
        clearTimeout(startIdleTimer.timer); // 发送时重置空闲计时

        // 将用户消息添加到请求历史中
        openAI
            .addMessage({ "role": "user", "content": userMessage })
            .send(function (type, string) {
                if (type === "finish") {

                    updateChatDisplay();

                    submitButton.thinking = false;
                    submitButton.textContent = "Send";
                    autoHideDialog(); // 启动对话框自动隐藏
                    startIdleTimer(); // 重新启动空闲计时器
                }
            });
    });
});