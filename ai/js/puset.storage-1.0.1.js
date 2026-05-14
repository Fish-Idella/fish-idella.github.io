/**
 * 存储助手模块，封装了多种客户端存储方式
 * 提供统一的API接口（setItem、getItem、removeItem），自动选择可用的存储方式
 */
const StorageHelper = (function () {
    "use strict";

    // 数据库名称和表名常量
    const DATABASE_NAME = "puset_database";
    const TABLE_NAME = "store";
    // 存储已注册的存储助手类集合
    const mStorageHelperSet = [];

    /**
     * 存储助手自定义错误类，用于捕获和传递存储操作中的错误信息
     * @extends Error
     */
    class StorageHelperError extends Error {
        /**
         * 构造函数
         * @param {string} methodName - 出错的方法名
         * @param {string} customMessage - 自定义错误信息
         * @param {Error} [originalError] - 原始错误对象
         */
        constructor(methodName, customMessage, originalError) {
            super(`${methodName}方法出错:${customMessage}`);
            this.name = 'StorageHelperError';
            this.methodName = methodName;
            this.customMessage = customMessage;
            // 保留原始错误堆栈信息
            if (originalError) {
                this.originalError = originalError;
                if (originalError.stack) {
                    this.stack = `${this.stack}\n原始错误堆栈:${originalError.stack}`
                }
            }
        }
    }

    function abstractMethodError(className, methodName) {
        return new StorageHelperError(`${className}.${methodName}`, "is an abstract method that must be overridden.");
    }

    /**
     * 存储助手基类，定义了统一的存储操作接口
     * 具体存储实现由子类完成
     */
    class StorageHelper {
        static open(options = {}) {
            const { name = DATABASE_NAME, type = "IndexedDBStorageHelper" } = options;
            // 优先查找指定类型且可用的存储助手，找不到则使用第一个可用的
            const lt = type.toLowerCase();
            const Helper = StorageHelper.find(item => (item.name.toLowerCase().indexOf(lt) === 0) && item.isValid()) || StorageHelper.find(item => item.isValid());

            if (!Helper) {
                throw new Error("未找到有效的存储助手");
            }
            return new Helper(name, options);
        }

        /**
         * 在已注册的存储助手中查找符合条件的类
         * @param {Function} fn - 筛选函数
         * @returns {Class|null} 符合条件的存储助手类
         */
        static find(fn) {
            return mStorageHelperSet.find(fn)
        }

        /**
         * 注册存储助手类
         * @param {Class} helper - 存储助手类（需继承自StorageHelper）
         */
        static register(helper) {
            mStorageHelperSet.push(helper)
        }

        /**
         * 获取所有已注册的存储助手名称
         * @returns {string[]} 存储助手名称数组
         */
        static names() {
            return mStorageHelperSet.map(item => item.name)
        }

        /**
         * 检查存储方式是否可用（抽象方法，由子类实现）
         * @returns {boolean} 是否可用
         * @throws {StorageHelperError} 未实现时抛出错误
         */
        static isValid() {
            throw abstractMethodError("static " + this.name, this.isValid.name);
        }

        /**
         * 存储初始化Promise对象，用于处理异步初始化
         * @type {Promise}
         */
        promise = null;

        constructor() {
            if (this.constructor === StorageHelper) {
                throw new TypeError("Cannot construct StorageHelper instances directly, use StorageHelper.open() instead.");
            }
        }

        /**
         * 存储数据（抽象方法，由子类实现）
         * @param {string} key - 键名
         * @param {any} value - 数据值
         * @returns {Promise} 操作结果Promise
         * @throws {StorageHelperError} 未实现时抛出错误
         */
        setItem(key, value) {
            throw abstractMethodError(this.constructor.name, this.setItem.name);
        }

        /**
         * 获取数据（抽象方法，由子类实现）
         * @param {string} key - 键名
         * @returns {Promise} 包含数据的Promise
         * @throws {StorageHelperError} 未实现时抛出错误
         */
        getItem(key) {
            throw abstractMethodError(this.constructor.name, this.getItem.name);
        }

        /**
         * 删除数据（抽象方法，由子类实现）
         * @param {string} key - 键名
         * @returns {Promise} 操作结果Promise
         * @throws {StorageHelperError} 未实现时抛出错误
         */
        removeItem(key) {
            throw abstractMethodError(this.constructor.name, this.removeItem.name);
        }
    }

    // 获取IndexedDB全局对象（兼容不同浏览器前缀）
    const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

    /**
     * IndexedDB存储助手实现类
     * 基于IndexedDB的存储方式，适合存储大量数据
     */
    StorageHelper.register(class IndexedDBStorageHelper extends StorageHelper {
        /**
         * 检查IndexedDB是否可用
         * @returns {boolean} 是否可用
         */
        static isValid() {
            return indexedDB && typeof indexedDB.open === "function"
        }

        /**
         * 构造函数，初始化IndexedDB数据库
         * @param {string} [name=DATABASE_NAME] - 数据库名称
         */
        constructor(name = DATABASE_NAME) {
            super();
            // 初始化数据库连接Promise
            this.promise = new Promise((resolve, reject) => {
                const request = indexedDB.open(name, 1);

                // 数据库版本升级时触发，创建对象存储和索引
                request.onupgradeneeded = ev => {
                    const store = ev.target.result.createObjectStore(TABLE_NAME);
                    store.createIndex("key", "key", { unique: true });
                };

                // 数据库打开成功
                request.onsuccess = event => resolve(event.target.result);

                // 数据库打开失败
                request.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.init", "数据库初始化失败", ev.target.error))
                };

                // 数据库被其他进程占用
                request.onblocked = ev => {
                    reject(new StorageHelperError("indexedDB.init", "数据库被阻塞", ev.target.error))
                }
            })
        }

        /**
         * 存储数据到IndexedDB
         * @param {string} key - 键名
         * @param {any} value - 数据值
         * @returns {Promise} 操作结果Promise（成功返回"complete"）
         */
        setItem(key, value) {
            return new Promise((resolve, reject) => {
                this.promise.then(db => {
                    // 创建读写事务
                    const transaction = db.transaction(TABLE_NAME, "readwrite");
                    transaction.onerror = event => {
                        reject(new StorageHelperError("indexedDB.setItem", "事务操作失败", event.target.error))
                    };

                    // 获取对象存储并写入数据
                    const objectStore = transaction.objectStore(TABLE_NAME);
                    const request = objectStore.put(value, String(key));
                    request.onsuccess = () => resolve("complete");
                    request.onerror = event => {
                        reject(new StorageHelperError("indexedDB.setItem", "数据写入失败", event.target.error))
                    }
                }).catch(error => reject(error))
            })
        }

        /**
         * 从IndexedDB获取数据
         * @param {string} key - 键名
         * @returns {Promise} 包含数据的Promise
         */
        getItem(key) {
            return new Promise((resolve, reject) => {
                this.promise.then(db => {
                    // 创建只读事务
                    const transaction = db.transaction(TABLE_NAME, "readonly");
                    transaction.onerror = event => {
                        reject(new StorageHelperError("indexedDB.getItem", "事务操作失败", event.target.error))
                    };

                    // 获取对象存储并读取数据
                    const objectStore = transaction.objectStore(TABLE_NAME);
                    const request = objectStore.get(String(key));
                    request.onsuccess = event => resolve(event.target.result);
                    request.onerror = event => {
                        reject(new StorageHelperError("indexedDB.getItem", "数据读取失败", event.target.error))
                    }
                }).catch(error => reject(error))
            })
        }

        /**
         * 从IndexedDB删除数据
         * @param {string} key - 键名
         * @returns {Promise} 操作结果Promise（成功返回"complete"）
         */
        removeItem(key) {
            return new Promise((resolve, reject) => {
                this.promise.then(db => {
                    // 创建读写事务
                    const transaction = db.transaction(TABLE_NAME, "readwrite");
                    transaction.onerror = event => reject(new StorageHelperError("indexedDB.removeItem", "事务操作失败", event.target.error));

                    // 获取对象存储并删除数据
                    const objectStore = transaction.objectStore(TABLE_NAME);
                    const request = objectStore.delete(String(key));
                    request.onsuccess = () => resolve("complete");
                    request.onerror = event => reject(new StorageHelperError("indexedDB.removeItem", "删除数据失败", event.target.error))
                }).catch(error => reject(error))
            })
        }
    });

    /**
     * localStorage存储助手实现类
     * 基于localStorage的存储方式，适合存储少量数据
     */
    StorageHelper.register(class LocalStorageHelper extends StorageHelper {
        /**
         * 检查localStorage是否可用（可能被浏览器禁用）
         * @returns {boolean} 是否可用
         */
        static isValid() {
            try {
                const testKey = '__global_storage_test__';
                window.localStorage.setItem(testKey, testKey);
                // 验证是否能正常读写
                if (window.localStorage.getItem(testKey) === testKey) {
                    window.localStorage.removeItem(testKey);
                    return true
                }
            } catch (e) { }
            return false
        }

        /**
         * 构造函数，初始化localStorage
         */
        constructor() {
            super();
            // localStorage是同步API，直接用已解析的Promise包装
            this.promise = Promise.resolve(window.localStorage)
        }

        /**
         * 存储数据到localStorage（自动JSON序列化）
         * @param {string} key - 键名
         * @param {any} value - 数据值
         * @returns {Promise} 操作结果Promise（成功返回"complete"）
         */
        setItem(key, value) {
            return new Promise((resolve, reject) => {
                this.promise.then(db => {
                    try {
                        const storedValue = JSON.stringify(value);
                        db.setItem(String(key), storedValue);
                        resolve("complete")
                    } catch (error) {
                        reject(new StorageHelperError("localStorage.setItem", "设置数据失败", error))
                    }
                }).catch(error => reject(error))
            })
        }

        /**
         * 从localStorage获取数据（自动JSON反序列化）
         * @param {string} key - 键名
         * @returns {Promise} 包含数据的Promise
         */
        getItem(key) {
            return new Promise((resolve, reject) => {
                this.promise.then(db => {
                    try {
                        const storedValue = db.getItem(String(key));
                        // 区分null和未定义，反序列化数据
                        resolve(storedValue === null ? null : JSON.parse(storedValue))
                    } catch (error) {
                        reject(new StorageHelperError("localStorage.getItem", "读取数据失败", error))
                    }
                }).catch(error => reject(error))
            })
        }

        /**
         * 从localStorage删除数据
         * @param {string} key - 键名
         * @returns {Promise} 操作结果Promise（成功返回"complete"）
         */
        removeItem(key) {
            return new Promise((resolve, reject) => {
                this.promise.then(db => {
                    try {
                        db.removeItem(String(key));
                        resolve("complete")
                    } catch (error) {
                        reject(new StorageHelperError("localStorage.removeItem", "删除数据失败", error))
                    }
                }).catch(error => reject(error))
            })
        }
    });

    // 注册FileSystem API存储模块
    StorageHelper.register(class FileSystemStorageHelper extends StorageHelper {
        static isValid() {
            // 检测浏览器是否支持File System Access API
            return typeof window.showOpenFilePicker === 'function'
                && typeof window.showSaveFilePicker === 'function'
                && typeof window.FileSystemFileHandle !== 'undefined';
        }

        constructor(name = DATABASE_NAME) {
            super();
            this.fileHandle = null; // 文件句柄
            // 初始化：请求用户选择存储文件（首次使用需用户授权）
            this.promise = new Promise(async (resolve, reject) => {
                try {
                    // 尝试获取现有文件句柄（如果之前保存过）
                    const handles = await window.showOpenFilePicker({
                        startIn: 'documents',
                        types: [{
                            description: 'Puset Storage Data',
                            accept: { 'application/json': ['.json'] },
                        }],
                        multiple: false,
                        excludeAcceptAllOption: true
                    });
                    this.fileHandle = handles[0];
                    resolve(true);
                } catch (err) {
                    // 没有现有文件，创建新文件
                    try {
                        this.fileHandle = await window.showSaveFilePicker({
                            suggestedName: `${name}.json`,
                            types: [{
                                description: 'Puset Storage Data',
                                accept: { 'application/json': ['.json'] },
                            }],
                        });
                        // 初始化空数据
                        const writable = await this.fileHandle.createWritable();
                        await writable.write(JSON.stringify({}));
                        await writable.close();
                        resolve(true);
                    } catch (createErr) {
                        reject(new StorageHelperError(
                            "fileSystem.init",
                            "用户未授权文件访问或浏览器不支持",
                            createErr
                        ));
                    }
                }
            });
        }

        // 读取文件内容
        async #readData() {
            if (!this.fileHandle) throw new Error("未获取文件句柄");
            const file = await this.fileHandle.getFile();
            const content = await file.text();
            return content ? JSON.parse(content) : {};
        }

        // 写入文件内容
        async #writeData(data) {
            if (!this.fileHandle) throw new Error("未获取文件句柄");
            const writable = await this.fileHandle.createWritable();
            await writable.write(JSON.stringify(data));
            await writable.close();
            return "complete";
        }

        setItem(key, value) {
            return new Promise(async (resolve, reject) => {
                try {
                    await this.promise; // 等待初始化完成
                    const data = await this.#readData();
                    data[String(key)] = value; // 存储值（支持任意类型）
                    await this.#writeData(data);
                    resolve("complete");
                } catch (error) {
                    reject(new StorageHelperError("fileSystem.setItem", "设置数据失败", error));
                }
            });
        }

        getItem(key) {
            return new Promise(async (resolve, reject) => {
                try {
                    await this.promise;
                    const data = await this.#readData();
                    resolve(data[String(key)] ?? null);
                } catch (error) {
                    reject(new StorageHelperError("fileSystem.getItem", "读取数据失败", error));
                }
            });
        }

        removeItem(key) {
            return new Promise(async (resolve, reject) => {
                try {
                    await this.promise;
                    const data = await this.#readData();
                    delete data[String(key)];
                    await this.#writeData(data);
                    resolve("complete");
                } catch (error) {
                    reject(new StorageHelperError("fileSystem.removeItem", "删除数据失败", error));
                }
            });
        }
    });

    /**
     * Cookie存储助手实现类
     * 适合存储极少量数据（通常4KB以内），可随请求发送到服务器
     */
    StorageHelper.register(class CookieStorageHelper extends StorageHelper {
        /**
         * 检查Cookie是否可用（需要document对象）
         * @returns {boolean} 是否可用
         */
        static isValid() {
            return document !== null
        }

        /**
         * 解析Cookie字符串为对象
         * @returns {Object} 键值对形式的Cookie对象
         */
        getCookie() {
            try {
                return Object.fromEntries(
                    document.cookie
                        .split('; ')
                        .filter(part => part)  // 过滤空字符串
                        .map(part => part.split('=').map(decodeURIComponent))  // 解码键值
                )
            } catch (error) {
                return {}
            }
        }

        /**
         * 构造函数，验证Cookie可用性
         */
        constructor() {
            super();
            this.promise = new Promise((resolve, reject) => {
                try {
                    // 测试Cookie写入能力（有效期300天）
                    document.cookie = "storage_test=true;max-age=25920000";
                    if (this.getCookie().storage_test) {
                        resolve(true)
                    } else {
                        throw new Error("无法设置cookie");
                    }
                } catch (error) {
                    reject(new StorageHelperError("cookie.init", "初始化失败，可能浏览器不支持或已禁用cookie", error))
                }
            })
        }

        /**
         * 存储数据到Cookie（自动编码和JSON序列化）
         * @param {string} key - 键名
         * @param {any} value - 数据值
         * @returns {Promise} 操作结果Promise（成功返回"complete"）
         */
        setItem(key, value) {
            return new Promise((resolve, reject) => {
                this.promise.then(() => {
                    try {
                        // 非字符串值进行JSON序列化
                        if (typeof value !== 'string') {
                            value = JSON.stringify(value)
                        }
                        // 编码键名和值，设置有效期300天，路径根目录
                        const encodedKey = encodeURIComponent(String(key));
                        const encodedValue = encodeURIComponent(value);
                        document.cookie = `${encodedKey}=${encodedValue};max-age=25920000;path=/`;
                        resolve("complete")
                    } catch (error) {
                        reject(new StorageHelperError("cookie.setItem", "保存失败", error))
                    }
                }).catch(error => reject(error))
            })
        }

        /**
         * 从Cookie获取数据（自动解码和JSON反序列化）
         * @param {string} key - 键名
         * @returns {Promise} 包含数据的Promise
         */
        getItem(key) {
            return new Promise((resolve, reject) => {
                this.promise.then(() => {
                    try {
                        const cookies = this.getCookie();
                        const encodedKey = encodeURIComponent(String(key));
                        if (cookies[encodedKey]) {
                            try {
                                // 尝试JSON反序列化，失败则直接返回原始值
                                resolve(JSON.parse(decodeURIComponent(cookies[encodedKey])))
                            } catch {
                                resolve(decodeURIComponent(cookies[encodedKey]))
                            }
                        } else {
                            resolve(null)
                        }
                    } catch (error) {
                        reject(new StorageHelperError("cookie.getItem", "读取失败", error))
                    }
                }).catch(error => reject(error))
            })
        }

        /**
         * 从Cookie删除数据（设置过期时间为0）
         * @param {string} key - 键名
         * @returns {Promise} 操作结果Promise（成功返回"complete"）
         */
        removeItem(key) {
            return new Promise((resolve, reject) => {
                this.promise.then(() => {
                    try {
                        const encodedKey = encodeURIComponent(String(key));
                        // 设置max-age=0使Cookie立即过期
                        document.cookie = `${encodedKey}=;max-age=0;path=/`;
                        resolve("complete")
                    } catch (error) {
                        reject(new StorageHelperError("cookie.removeItem", "删除失败", error))
                    }
                }).catch(error => reject(error))
            })
        }
    });

    return StorageHelper
}());