// 持久化本地存储方案
const StorageHelper = (function () {
    // "use strict";

    // In the following line, you should include the prefixes of implementations you want to test.
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    // DON'T use "const indexedDB = ..." if you're not in a function.
    // Moreover, you may need references to some window.IDB* objects:
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
    // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

    const DATABASE_NAME = "puset_database";
    const TABLE_NAME = "store";

    class StorageHelperError extends Error {
        constructor(methodName, customMessage, originalError) {
            // 调用父类Error的构造函数，传入自定义的错误信息
            super(`${methodName} 方法出错: ${customMessage}`);

            // 确保错误名称正确
            this.name = 'StorageHelperError';

            // 保存方法名和自定义信息作为错误对象的属性
            this.methodName = methodName;
            this.customMessage = customMessage;

            // 如果提供了原始错误对象，则保存它，以便获取更详细的错误堆栈信息
            if (originalError) {
                this.originalError = originalError;

                // 如果原始错误有堆栈信息，将其合并到当前错误的堆栈中
                if (originalError.stack) {
                    this.stack = `${this.stack}\n原始错误堆栈: ${originalError.stack}`;
                }
            }
        }
    }


    /**
     * 
     * @param {String} type 优先选择的存储方式
     * @param {String} name 存储库名称
     * @param {String} version 版本号
     * @returns 
     */
    const StorageHelper = function StorageHelper(type, name = DATABASE_NAME, version = 1) {
        if (!(this instanceof StorageHelper)) {
            return new StorageHelper(type, name, version);
        }
        this.name = name, this.version = version;
        this.promise = new Promise((resolve, reject) => {
            const keys = Object.keys(StorageHelper);
            keys.unshift(type); // 优先插入指定的type
            this.type = keys.find(key => StorageHelper[key]?.api);
            if (!this.type) {
                return reject(new StorageHelperError("StorageHelper", "预设的存储方式浏览器全不支持", null));
            } else {
                this.storage = StorageHelper[this.type];
                this.storage.init(this, resolve, reject);
            }
        });
        return this;
    };

    StorageHelper.indexedDB = {
        api: window.indexedDB,
        // 创建数据库和表
        init: function (obj, resolve, reject) {
            try {
                obj.request = this.api.open(obj.name, obj.version);
                obj.request.onupgradeneeded = function (ev) {
                    let db = ev.target.result;
                    let objectStore = db.createObjectStore(TABLE_NAME);
                    objectStore.createIndex("key", "key", { unique: true });
                };

                obj.request.onsuccess = ev => {
                    obj.db = ev.target.result;
                    resolve(ev);
                };

                obj.request.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.init", "数据库初始化失败", ev.target.error));
                };

                obj.request.onblocked = ev => {
                    reject(new StorageHelperError("indexedDB.init", "数据库被阻塞", ev.target.error));
                };
            } catch (error) {
                reject(new StorageHelperError("indexedDB.init", "数据库初始化过程中发生异常", error));
            }
        },
        setItem: function (obj, resolve, reject, key, value) {
            try {

                const transaction = obj.db.transaction(TABLE_NAME, "readwrite");

                transaction.oncomplete = resolve;

                transaction.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.setItem", "事务操作失败", ev.target.error));
                };

                const store = transaction.objectStore(TABLE_NAME);
                const request = store.put(value, key);

                request.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.setItem", "数据写入失败", ev.target.error));
                };

            } catch (error) {
                reject(new StorageHelperError("indexedDB.setItem", "保存过程中发生异常", error));
            }
        },
        getItem: function (obj, resolve, reject, key) {
            try {

                const transaction = obj.db.transaction(TABLE_NAME);
                const store = transaction.objectStore(TABLE_NAME);
                const request = store.get(key);

                request.onsuccess = ev => {
                    resolve(ev.target.result);
                };

                request.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.getItem", "数据读取失败", ev.target.error));
                };

                transaction.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.getItem", "事务操作失败", ev.target.error));
                };

            } catch (error) {
                reject(new StorageHelperError("indexedDB.getItem", "读取过程中发生异常", error));
            }
        },
        removeItem: function (obj, resolve, reject, key) {
            try {

                const transaction = obj.db.transaction(TABLE_NAME, "readwrite");

                transaction.oncomplete = resolve;

                transaction.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.removeItem", "事务操作失败", ev.target.error));
                };

                const store = transaction.objectStore(TABLE_NAME);
                const request = store.delete(key);

                request.onerror = ev => {
                    reject(new StorageHelperError("indexedDB.removeItem", "数据删除失败", ev.target.error));
                };

            } catch (error) {
                reject(new StorageHelperError("indexedDB.removeItem", "删除过程中发生异常", error));
            }
        }
    };

    StorageHelper.localStorage = {
        api: window.localStorage,
        init: function (obj, resolve, reject) {
            try {
                obj.db = this.api;
                obj.db.setItem(DATABASE_NAME, TABLE_NAME);
                if (obj.db.getItem(DATABASE_NAME) === TABLE_NAME) {
                    resolve();
                } else {
                    throw new Error("无法写入localStorage");
                }
            } catch (error) {
                reject(new StorageHelperError("localStorage.init", "初始化失败，可能浏览器不支持或已禁用localStorage", error));
            }
        },
        setItem: function (obj, resolve, reject, key, value) {
            try {
                if (typeof value !== 'string') {
                    value = JSON.stringify(value);
                }
                obj.db.setItem(key, value);
                resolve("complete");
            } catch (error) {
                reject(new StorageHelperError("localStorage.setItem", "保存失败，可能超出存储限制", error));
            }
        },
        getItem: function (obj, resolve, reject, key) {
            try {
                const value = obj.db.getItem(key);
                resolve(value);
            } catch (error) {
                reject(new StorageHelperError("localStorage.getItem", "读取失败", error));
            }
        },
        removeItem: function (obj, resolve, reject, key) {
            try {
                obj.db.removeItem(key);
                resolve("complete");
            } catch (error) {
                reject(new StorageHelperError("localStorage.removeItem", "删除失败", error));
            }
        }
    };

    StorageHelper.openDatabase = {
        api: window.openDatabase,
        init: function (obj, resolve, reject) {
            try {

                obj.db = window.openDatabase(DATABASE_NAME, "1.0", "PUSET_DATABASE_DEFAULT", 10 * 1024 * 1024);

                if (!obj.db) {
                    throw new Error("无法创建或打开数据库");
                }

                obj.db.transaction(
                    tx => {
                        const sql = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (key text unique, value text)`;
                        tx.executeSql(
                            sql,
                            null,
                            () => resolve(),
                            (tx, error) => {
                                reject(new StorageHelperError("openDatabase.init", "创建表失败", error));
                                return false;
                            }
                        );
                    },
                    error => {
                        reject(new StorageHelperError("openDatabase.init", "数据库事务失败", error));
                    }
                );
            } catch (error) {
                reject(new StorageHelperError("openDatabase.init", "初始化失败", error));
            }
        },
        setItem: function (obj, resolve, reject, key, value) {
            try {

                obj.db.transaction(
                    tx => {
                        const insertSql = `INSERT INTO ${TABLE_NAME} (key, value) VALUES (? , ?)`;
                        const updateSql = `UPDATE ${TABLE_NAME} SET value=? WHERE key=?`;

                        tx.executeSql(
                            insertSql,
                            [key, JSON.stringify(value)],
                            () => resolve(),
                            (tx, error) => {
                                // 插入失败，尝试更新
                                tx.executeSql(
                                    updateSql,
                                    [JSON.stringify(value), key],
                                    () => resolve(),
                                    (tx, error) => {
                                        reject(new StorageHelperError("openDatabase.setItem", "更新失败", error));
                                        return false;
                                    }
                                );
                                return false;
                            }
                        );
                    },
                    error => {
                        reject(new StorageHelperError("openDatabase.setItem", "数据库事务失败", error));
                    }
                );
            } catch (error) {
                reject(new StorageHelperError("openDatabase.setItem", "保存失败", error));
            }
        },
        getItem: function (obj, resolve, reject, key) {
            try {

                obj.db.transaction(
                    tx => {
                        const sql = `SELECT value FROM ${TABLE_NAME} WHERE key = ?`;
                        tx.executeSql(
                            sql,
                            [key],
                            (tx, results) => {
                                try {
                                    if (results.rows.length > 0) {
                                        resolve(JSON.parse(results.rows.item(0).value));
                                    } else {
                                        resolve(null);
                                    }
                                } catch (parseError) {
                                    reject(new StorageHelperError("openDatabase.getItem", "解析数据失败", parseError));
                                }
                            },
                            (tx, error) => {
                                reject(new StorageHelperError("openDatabase.getItem", "查询失败", error));
                                return false;
                            }
                        );
                    },
                    error => {
                        reject(new StorageHelperError("openDatabase.getItem", "数据库事务失败", error));
                    }
                );
            } catch (error) {
                reject(new StorageHelperError("openDatabase.getItem", "读取失败", error));
            }
        },
        removeItem: function (obj, resolve, reject, key) {
            try {

                obj.db.transaction(
                    tx => {
                        const sql = `DELETE FROM ${TABLE_NAME} WHERE key = ?`;
                        tx.executeSql(
                            sql,
                            [key],
                            () => resolve(),
                            (tx, error) => {
                                reject(new StorageHelperError("openDatabase.removeItem", "删除失败", error));
                                return false;
                            }
                        );
                    },
                    error => {
                        reject(new StorageHelperError("openDatabase.removeItem", "数据库事务失败", error));
                    }
                );
            } catch (error) {
                reject(new StorageHelperError("openDatabase.removeItem", "删除失败", error));
            }
        }
    };

    StorageHelper.cookie = {
        api: document,
        init: function (obj, resolve, reject) {
            try {
                obj.db = document;
                document.cookie = "storage_test=true;max-age=25920000";

                if (this.getCookie().storage_test) {
                    resolve();
                } else {
                    throw new Error("无法设置cookie");
                }
            } catch (error) {
                reject(new StorageHelperError("cookie.init", "初始化失败，可能浏览器不支持或已禁用cookie", error));
            }
        },
        getCookie: function () {
            try {
                return Object.fromEntries(
                    document.cookie
                        .split('; ')
                        .filter(part => part)
                        .map(part => part.split('=').map(decodeURIComponent))
                );
            } catch (error) {
                // 这里不使用reject，因为此方法不直接处理Promise
                console.error("解析cookie失败:", error);
                return {};
            }
        },
        setItem: function (obj, resolve, reject, key, value) {
            try {
                if (typeof value !== 'string') {
                    value = JSON.stringify(value);
                }

                // 编码键和值
                const encodedKey = encodeURIComponent(key);
                const encodedValue = encodeURIComponent(value);

                document.cookie = `${encodedKey}=${encodedValue};max-age=25920000;path=/`;
                resolve("complete");
            } catch (error) {
                reject(new StorageHelperError("cookie.setItem", "保存失败", error));
            }
        },
        getItem: function (obj, resolve, reject, key) {
            try {
                const cookies = this.getCookie();
                const encodedKey = encodeURIComponent(key);

                if (cookies[encodedKey]) {
                    try {
                        // 尝试解析为JSON
                        resolve(JSON.parse(decodeURIComponent(cookies[encodedKey])));
                    } catch {
                        // 如果不是有效的JSON，直接返回原始值
                        resolve(decodeURIComponent(cookies[encodedKey]));
                    }
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(new StorageHelperError("cookie.getItem", "读取失败", error));
            }
        },
        removeItem: function (obj, resolve, reject, key) {
            try {
                const encodedKey = encodeURIComponent(key);
                document.cookie = `${encodedKey}=;max-age=0;path=/`;
                resolve("complete");
            } catch (error) {
                reject(new StorageHelperError("cookie.removeItem", "删除失败", error));
            }
        }
    };

    StorageHelper.prototype.name = DATABASE_NAME;
    StorageHelper.prototype.request = null;
    StorageHelper.prototype.promise = null;
    StorageHelper.prototype.db = null;
    StorageHelper.prototype.type = null;
    StorageHelper.prototype.storage = null;

    StorageHelper.prototype.setItem = async function (key, value) {
        return this.promise.then(() => {
            return new Promise((resolve, reject) => this.storage.setItem(this, resolve, reject, key, value));
        });
    };

    StorageHelper.prototype.getItem = async function (key) {
        return this.promise.then(() => {
            return new Promise((resolve, reject) => this.storage.getItem(this, resolve, reject, key));
        });
    };

    StorageHelper.prototype.removeItem = async function (key) {
        return this.promise.then(() => {
            return new Promise((resolve, reject) => this.storage.removeItem(this, resolve, reject, key));
        });
    };

    if ("function" === typeof PuSet) {
        PuSet.StorageHelper = StorageHelper;
    }

    return StorageHelper;

}());