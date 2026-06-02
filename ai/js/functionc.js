// ============================================================
// 世界书（大白）核心引擎 —— OpenAIFunctionCalling
// 维护者：李乾（主人）
// 说明：这个世界里一切"被记录的存在"，都由这段代码在背后撑着
// ============================================================

const OpenAIFunctionCalling = (function () {

    // ========================
    // Ⅰ. 时间与日期工具
    // ========================

    // 按小时划分时段（24小时制索引）
    const PERIODS_BY_HOUR = [
        "深夜", "深夜", "深夜", "凌晨", "凌晨", "凌晨",
        "上午", "上午", "上午", "上午", "上午", "中午",
        "中午", "中午", "下午", "下午", "下午", "下午",
        "傍晚", "傍晚", "夜晚", "夜晚", "夜晚", "深夜"
    ];
    // 月份→季节映射（0=1月）
    const SEASON_MAP = ['冬', '春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬', '冬'];
    // 星期映射
    const WEEK_MAP = ['日', '一', '二', '三', '四', '五', '六'];

    /**
     * 将日期格式化为中文自然语言描述
     * 示例： "2024年春 3月15日 下午3时30分 星期五"
     * @param {Date} targetDate - 目标日期，默认当前时间
     * @returns {string} 格式化后的时间字符串
     */
    function formatDate(targetDate = new Date()) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const date = targetDate.getDate();
        const hours = targetDate.getHours();
        const minutes = targetDate.getMinutes();
        const day = targetDate.getDay();
        const timeStr = `${hours}时${minutes}分`;
        const season = SEASON_MAP[month];
        const week = WEEK_MAP[day];
        const period = PERIODS_BY_HOUR[hours];
        return `${year}年${season} ${month + 1}月${date}日 ${period}${timeStr} 星期${week}`;
    }

    /**
     * 深拷贝一个对象（用于保存版本历史快照）
     * @param {*} obj - 要拷贝的对象
     * @returns {*} 深拷贝副本
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    return {

        // ========================
        // Ⅱ. 工具调用分发器
        // ========================

        /**
         * 处理 AI 发起的工具调用请求
         * @param {Array} tool_calls - OpenAI 格式的 tool_calls 数组
         * @param {Object} assistantBox - 助手消息容器（用于追溯）
         */
        handleToolCalls(tool_calls, assistantBox) {
            const data = OpenAIFunctionCalling.data;       // 全局数据存储
            const characters = PuSet.ensureObjectProperty(data, "characters", Object);
            const messages = OpenAIFunctionCalling.messages; // 消息历史

            for (const toolCall of tool_calls) {
                if (toolCall.type === "function") {
                    const functionName = toolCall.function.name;
                    // 只调用自身拥有的方法，防止执行非法操作
                    if (OpenAIFunctionCalling.hasOwnProperty(functionName)) {
                        const functionArgs = JSON.parse(toolCall.function.arguments);
                        const result = OpenAIFunctionCalling?.[functionName]?.(data, characters, functionArgs);
                        const object = {
                            role: "tool",
                            tool_call_id: toolCall.id,
                            branch: [],
                            content: JSON.stringify(result || {}, null, 4)
                        };
                        messages.at(-1).branch.push(object);
                        messages.push(object);
                    }
                }
            }
        },

        /**
         * 生成或复用唯一标识符（UUID）
         * @param {string|number} [id] - 如果传入则直接返回（用于更新已有词条）
         * @returns {string} UUID 字符串
         */
        randomUUID(id) {
            if (id) return String(id);
            return crypto?.randomUUID?.() || String((Date.now() * Math.random()));
        },

        // ========================
        // Ⅲ. 核心 CRUD 操作
        // ========================

        // ---------- 创建 / 更新 ----------

        /**
         * 保存或修改词条信息
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { summary, information, key?, tags? }
         *   - summary: 一句话简介（必填）
         *   - information: 扁平 JSON 内容（必填）
         *   - key: 更新时传入已有 key；创建时不传，自动生成
         *   - tags: 标签数组，如 ["人物", "帝都"]（可选，新增功能）
         * @returns {Object} 操作结果
         */
        save_information(data, characters, args) {
            try {
                const { summary, information, key, tags } = args;
                const isUpdate = !!key;   // 是否为更新操作
                const uuid = OpenAIFunctionCalling.randomUUID(key);

                // 禁止篡改目录索引
                if (key === "book-index") {
                    return "Modification Prohibited";
                }

                // 确保目录存在
                const bookIndex = PuSet.ensureObjectProperty(data, "book-index", Object);

                // ----- 版本历史（新增功能） -----
                // 如果是更新操作，先将旧版本备份到 version-history
                if (isUpdate && characters?.[uuid]) {
                    const versionHistory = PuSet.ensureObjectProperty(data, "version-history", Object);
                    if (!versionHistory[uuid]) versionHistory[uuid] = [];
                    const oldSnapshot = deepClone(characters[uuid]);
                    oldSnapshot.__version_time = formatDate();
                    oldSnapshot.__version_id = versionHistory[uuid].length + 1;
                    versionHistory[uuid].push(oldSnapshot);
                }

                // 构建词条对象
                const obj = {
                    key: uuid,
                    summary: summary,
                    information: information,
                    tags: tags || [],               // 标签系统
                    __created_at: isUpdate ? (characters?.[uuid]?.__created_at || formatDate()) : formatDate(),
                    __updated_at: formatDate()
                };

                characters[uuid] = obj;

                // 更新目录
                bookIndex[uuid] = summary;

                // ----- 标签索引（新增功能） -----
                if (tags && Array.isArray(tags) && tags.length > 0) {
                    const tagIndex = PuSet.ensureObjectProperty(data, "tag-index", Object);
                    for (const tag of tags) {
                        if (!tagIndex[tag]) tagIndex[tag] = [];
                        if (!tagIndex[tag].includes(uuid)) {
                            tagIndex[tag].push(uuid);
                        }
                    }
                }

                return { message: `Successful ${isUpdate ? "Updated" : "Created"}. key = "${uuid}"` };

            } catch (e) {
                return { error: e.message };
            }
        },

        // ---------- 查询 ----------

        /**
         * 按键名查询词条信息
         * 支持特殊键： "book-index" → 返回目录； "current-datetime" → 返回当前时间
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { keys: string[] }
         * @returns {Object} 键名到查得结果的映射
         */
        query_information(data, characters, args) {
            const result = {};
            const bookIndex = PuSet.ensureObjectProperty(data, "book-index", Object);

            args.keys.forEach(key => {
                let obj = characters?.[key];
                if (obj == null) {
                    switch (key) {
                        case "book-index": obj = bookIndex; break;
                        case "current-datetime": obj = formatDate(); break;
                        default: obj = null;
                    }
                }
                result[key] = obj;
            });
            return result;
        },

        // ---------- 模糊搜索（新增功能） ----------

        /**
         * 按关键词模糊搜索词条
         * 在 summary（简介）和 information（内容）中检索匹配项
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { keyword: string, scope?: "summary"|"information"|"all" }
         *   - keyword: 搜索关键词（必填）
         *   - scope: 搜索范围，默认 "all"（同时在 summary 和 information 中搜索）
         * @returns {Object} 匹配结果列表
         */
        search_information(data, characters, args) {
            const { keyword, scope = "all" } = args;
            if (!keyword || keyword.trim() === "") {
                return { message: "请输入搜索关键词", results: [] };
            }

            const kw = keyword.toLowerCase();
            const bookIndex = PuSet.ensureObjectProperty(data, "book-index", Object);
            const results = [];

            for (const [key, summary] of Object.entries(bookIndex)) {
                let match = false;

                // 在简介中搜索
                if (scope === "all" || scope === "summary") {
                    if (summary.toLowerCase().includes(kw)) match = true;
                }

                // 在详细内容中搜索
                if ((scope === "all" || scope === "information") && !match) {
                    const charData = characters?.[key];
                    if (charData?.information) {
                        const infoStr = JSON.stringify(charData.information).toLowerCase();
                        if (infoStr.includes(kw)) match = true;
                    }
                    // 也在 tags 里搜一下
                    if (!match && charData?.tags) {
                        const tagsStr = JSON.stringify(charData.tags).toLowerCase();
                        if (tagsStr.includes(kw)) match = true;
                    }
                }

                if (match) {
                    results.push({
                        key: key,
                        summary: summary,
                        tags: characters?.[key]?.tags || []
                    });
                }
            }

            return {
                keyword: keyword,
                scope: scope,
                count: results.length,
                results: results
            };
        },

        // ---------- 按标签查询（新增功能） ----------

        /**
         * 按标签筛选词条
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { tag: string }
         * @returns {Object} 匹配结果
         */
        query_by_tag(data, characters, args) {
            const { tag } = args;
            const tagIndex = PuSet.ensureObjectProperty(data, "tag-index", Object);
            const keys = tagIndex[tag] || [];

            const results = keys.map(key => {
                const entry = characters?.[key];
                return entry ? {
                    key: key,
                    summary: entry.summary,
                    tags: entry.tags || []
                } : null;
            }).filter(Boolean);

            return {
                tag: tag,
                count: results.length,
                results: results
            };
        },

        // ---------- 更新单个属性 ----------

        /**
         * 修改词条的某个特定属性
         * 若不传 attribute_value，则视为删除该属性
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { information_key, attribute_key, attribute_value? }
         * @returns {Object} 操作结果
         */
        update_information_attribute(data, characters, args) {
            const { information_key, attribute_key, attribute_value } = args;

            const charData = characters?.[information_key];
            if (!charData) {
                return { message: `找不到词条 ${information_key}` };
            }

            const information = charData.information;
            if (!information) {
                return { message: "该词条没有 information 对象" };
            }

            // ----- 版本历史备份（新增） -----
            const versionHistory = PuSet.ensureObjectProperty(data, "version-history", Object);
            if (!versionHistory[information_key]) versionHistory[information_key] = [];
            const oldSnapshot = deepClone(charData);
            oldSnapshot.__version_time = formatDate();
            oldSnapshot.__version_id = versionHistory[information_key].length + 1;
            oldSnapshot.__change_log = `修改属性: ${attribute_key}`;
            versionHistory[information_key].push(oldSnapshot);

            // 更新修改时间
            charData.__updated_at = formatDate();

            if (attribute_value !== undefined) {
                // 设置属性值
                information[attribute_key] = attribute_value;
                return { message: `修改属性 "${attribute_key}" 成功` };
            } else {
                // 删除属性
                const deleted = Reflect.deleteProperty(information, attribute_key);
                return { message: `删除属性 "${attribute_key}" ${deleted ? "成功" : "失败（属性不存在）"}` };
            }
        },

        // ---------- 删除 ----------

        /**
         * 删除词条（高危操作！）
         * 会同时清理：characters 中的条目、book-index 目录索引、tag-index 标签索引
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { keys: string[] }
         * @returns {Object} 删除结果
         */
        delete_information(data, characters, args) {
            const bookIndex = PuSet.ensureObjectProperty(data, "book-index", Object);
            const tagIndex = PuSet.ensureObjectProperty(data, "tag-index", Object);
            const result = {};

            args.keys.forEach(key => {
                // 禁止删除目录本身
                if (key === "book-index") {
                    result["book-index"] = "Modification Prohibited";
                    return;
                }

                // 从 characters 中删除
                const deletedChar = characters?.[key];
                const charDeleted = Reflect.deleteProperty(characters, key);

                // 从目录中删除
                const libDeleted = Reflect.deleteProperty(bookIndex, key);

                // ----- 清理标签索引（新增） -----
                if (deletedChar?.tags) {
                    for (const tag of deletedChar.tags) {
                        if (tagIndex[tag]) {
                            const idx = tagIndex[tag].indexOf(key);
                            if (idx !== -1) tagIndex[tag].splice(idx, 1);
                            if (tagIndex[tag].length === 0) Reflect.deleteProperty(tagIndex, tag);
                        }
                    }
                }

                result[key] = {
                    character_deleted: charDeleted,
                    library_deleted: libDeleted
                };
            });

            return result;
        },

        // ---------- 批量操作（新增功能） ----------

        /**
         * 批量给多个词条添加相同的标签
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { keys: string[], tag: string }
         * @returns {Object} 操作结果
         */
        batch_tag(data, characters, args) {
            const { keys, tag } = args;
            if (!tag || !keys || !Array.isArray(keys) || keys.length === 0) {
                return { message: "参数无效，需要 keys 数组和 tag 字符串" };
            }

            const tagIndex = PuSet.ensureObjectProperty(data, "tag-index", Object);
            let successCount = 0;

            for (const key of keys) {
                const charData = characters?.[key];
                if (!charData) continue;

                // 初始化 tags 数组
                if (!Array.isArray(charData.tags)) charData.tags = [];

                // 避免重复添加
                if (!charData.tags.includes(tag)) {
                    charData.tags.push(tag);
                    // 更新标签索引
                    if (!tagIndex[tag]) tagIndex[tag] = [];
                    if (!tagIndex[tag].includes(key)) tagIndex[tag].push(key);
                    charData.__updated_at = formatDate();
                    successCount++;
                }
            }

            return {
                message: `成功为 ${successCount}/${keys.length} 个词条添加标签 "${tag}"`,
                tag: tag,
                affected_count: successCount
            };
        },

        /**
         * 批量查询词条的版本历史
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { keys: string[], limit?: number }
         * @returns {Object} 版本历史信息
         */
        batch_query_history(data, characters, args) {
            const { keys, limit = 5 } = args;
            const versionHistory = data["version-history"] || {};
            const result = {};

            for (const key of keys) {
                const history = versionHistory[key];
                if (history && history.length > 0) {
                    // 只返回最近的 N 条记录（默认最近5条）
                    result[key] = history.slice(-limit).map(v => ({
                        version_id: v.__version_id,
                        time: v.__version_time,
                        change_log: v.__change_log || "未知变更",
                        summary: v.summary
                    }));
                } else {
                    result[key] = { message: "无历史版本记录" };
                }
            }

            return result;
        },

        // ========================
        // Ⅴ. 版本恢复（新增功能）
        // ========================

        /**
         * 从版本历史中恢复词条到指定版本
         * 恢复前会自动备份当前版本，防止误操作
         * @param {Object} data - 全局数据对象
         * @param {Object} characters - 辅助工具对象
         * @param {Object} args - 参数 { key, version_id }
         *   - key: 要恢复的词条键名
         *   - version_id: 目标版本的ID（从1开始递增）
         * @returns {Object} 恢复结果
         */
        restore_version(data, characters, args) {
            const { key, version_id } = args;
            const versionHistory = data["version-history"];

            // 检查词条是否存在
            if (!characters?.[key]) {
                return { message: `找不到词条 ${key}` };
            }

            // 检查是否有版本历史
            if (!versionHistory?.[key] || versionHistory[key].length === 0) {
                return { message: `词条 ${key} 没有版本历史记录` };
            }

            // 查找目标版本
            const targetVersion = versionHistory[key].find(v => v.__version_id === version_id);
            if (!targetVersion) {
                return {
                    message: `未找到版本号 ${version_id}`,
                    available_versions: versionHistory[key].map(v => ({
                        version_id: v.__version_id,
                        time: v.__version_time,
                        change_log: v.__change_log || "未知变更"
                    }))
                };
            }

            // 【安全保护】恢复前先备份当前版本
            const currentSnapshot = deepClone(characters[key]);
            currentSnapshot.__version_time = formatDate();
            currentSnapshot.__version_id = versionHistory[key].length + 1;
            currentSnapshot.__change_log = `自动备份（恢复前快照，目标版本: ${version_id}）`;
            versionHistory[key].push(currentSnapshot);

            // 执行恢复：用历史版本的数据覆盖当前词条
            const restoredData = deepClone(targetVersion);
            delete restoredData.__version_time;
            delete restoredData.__version_id;
            delete restoredData.__change_log;

            // 保留当前的 key、tags 和创建时间，恢复 summary 和 information
            const currentTags = characters[key].tags || [];
            restoredData.tags = currentTags;
            restoredData.__updated_at = formatDate();
            restoredData.__restored_from_version = version_id;
            restoredData.__restored_at = formatDate();

            characters[key] = restoredData;

            // 同步更新 book-index 中的 summary
            const bookIndex = PuSet.ensureObjectProperty(data, "book-index", Object);
            bookIndex[key] = restoredData.summary;

            return {
                message: `成功将词条 "${restoredData.summary}" 恢复到版本 ${version_id}`,
                version_id: version_id,
                restored_at: formatDate(),
                summary: restoredData.summary
            };
        },

        // ========================
        // Ⅳ. OpenAI Function Calling 工具定义
        // ========================

        /**
         * 以下 tools 数组是暴露给 AI 的功能接口声明
         * AI 只能通过这些定义好的工具来操作数据
         */
        tools: [
            // ----- 查询工具 -----
            {
                type: "function",
                function: {
                    name: "query_information",
                    description: "【基础查询】按存储键名（key）查询词条的详细信息。支持特殊键：book-index（返回全局目录）、current-datetime（返回当前时间）",
                    parameters: {
                        type: "object",
                        properties: {
                            keys: {
                                type: "array",
                                description: "需要查询的词条键名数组，可同时查询多个",
                                items: { type: "string" }
                            }
                        },
                        required: ["keys"]
                    }
                }
            },
            // ----- 模糊搜索（新增） -----
            {
                type: "function",
                function: {
                    name: "search_information",
                    description: "【模糊搜索】通过关键词搜索词条，可在简介（summary）和详细内容（information）中匹配。支持指定搜索范围。",
                    parameters: {
                        type: "object",
                        properties: {
                            keyword: {
                                type: "string",
                                description: "搜索关键词"
                            },
                            scope: {
                                type: "string",
                                enum: ["all", "summary", "information"],
                                description: "搜索范围：all（全部）、summary（仅简介）、information（仅详细内容+标签）"
                            }
                        },
                        required: ["keyword"]
                    }
                }
            },
            // ----- 按标签查询（新增） -----
            {
                type: "function",
                function: {
                    name: "query_by_tag",
                    description: "【按标签筛选】通过标签名查找所有打上该标签的词条",
                    parameters: {
                        type: "object",
                        properties: {
                            tag: {
                                type: "string",
                                description: "标签名称，如 人物、地点、事件、道具"
                            }
                        },
                        required: ["tag"]
                    }
                }
            },
            // ----- 保存 / 更新 -----
            {
                type: "function",
                function: {
                    name: "save_information",
                    description: "【创建/更新词条】保存或修改一个词条。创建时不传key，自动生成UUID；更新时必须传入原key。支持 tags 标签数组。",
                    parameters: {
                        type: "object",
                        properties: {
                            summary: {
                                type: "string",
                                description: "一句话简介，以主体名开头，例如：”张三的基础信息“、”飞机的定义及常见类型“"
                            },
                            information: {
                                type: "object",
                                description: "扁平化 JSON 文档，记录词条的详细信息，属性值只允许 string/number，禁止嵌套多层对象"
                            },
                            key: {
                                type: "string",
                                description: "更新时必传原key；新建时不传"
                            },
                            tags: {
                                type: "array",
                                items: { type: "string" },
                                description: "【新增】标签数组，方便分类管理，如 [”人物“, ”帝都“]"
                            }
                        },
                        required: ["summary", "information"]
                    }
                }
            },
            // ----- 修改单个属性 -----
            {
                type: "function",
                function: {
                    name: "update_information_attribute",
                    description: "【修改单个属性】修改词条的某个具体属性值。不传 attribute_value 则视为删除该属性。会自动备份旧版本到历史记录。",
                    parameters: {
                        type: "object",
                        properties: {
                            information_key: {
                                type: "string",
                                description: "要修改的词条键名"
                            },
                            attribute_key: {
                                type: "string",
                                description: "要修改的属性名"
                            },
                            attribute_value: {
                                type: "string",
                                description: "新的属性值。若不传入，则删除该属性"
                            }
                        },
                        required: ["information_key", "attribute_key"]
                    }
                }
            },
            // ----- 删除 -----
            {
                type: "function",
                function: {
                    name: "delete_information",
                    description: "【高危！删除词条】彻底删除一个或多个词条及相关索引。此操作不可逆！必须在删除前向用户展示即将删除的内容并获取最终确认。",
                    parameters: {
                        type: "object",
                        properties: {
                            keys: {
                                type: "array",
                                description: "需要删除的词条键名数组",
                                items: { type: "string" }
                            }
                        },
                        required: ["keys"]
                    }
                }
            },
            // ----- 批量操作（新增） -----
            {
                type: "function",
                function: {
                    name: "batch_tag",
                    description: "【批量操作】为多个词条批量添加相同的标签。自动维护标签索引。",
                    parameters: {
                        type: "object",
                        properties: {
                            keys: {
                                type: "array",
                                description: "需要添加标签的词条键名数组",
                                items: { type: "string" }
                            },
                            tag: {
                                type: "string",
                                description: "要添加的标签名称"
                            }
                        },
                        required: ["keys", "tag"]
                    }
                }
            },
            // ----- 版本历史查询（新增） -----
            {
                type: "function",
                function: {
                    name: "batch_query_history",
                    description: "【版本历史】查询指定词条的历史修改记录，默认返回最近5个版本。",
                    parameters: {
                        type: "object",
                        properties: {
                            keys: {
                                type: "array",
                                description: "要查询历史记录的词条键名数组",
                                items: { type: "string" }
                            },
                            limit: {
                                type: "number",
                                description: "返回的版本数量上限，默认5"
                            }
                        },
                        required: ["keys"]
                    }
                }
            },// ----- 版本恢复（新增） -----
            {
                type: "function",
                function: {
                    name: "restore_version",
                    description: "【版本恢复】将词条恢复到指定历史版本。恢复前会自动备份当前版本，防止误操作。",
                    parameters: {
                        type: "object",
                        properties: {
                            key: {
                                type: "string",
                                description: "要恢复的词条键名"
                            },
                            version_id: {
                                type: "number",
                                description: "目标版本的ID（从1开始递增），可通过 batch_query_history 查询可用版本"
                            }
                        },
                        required: ["key", "version_id"]
                    }
                }
            }
        ]
    };

}());
