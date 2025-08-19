class StorageHelper {
    static DATABASE_NAME = "puset_database";
    static TABLE_NAME = "store";

    constructor(type = "indexedDB", name = StorageHelper.DATABASE_NAME, version = 1) {
        this.name = name;
        this.version = version;
        this.promise = this.initialize(type);
    }

    async initialize(type) {
        const storageType = this.getType(type);
        if (!storageType) {
            throw new Error("预设的存储方式浏览器全不支持");
        }

        this.type = storageType;
        this.storage = StorageHelper[this.type];
        return this.storage.init(this);
    }

    getType(type) {
        const storageTypes = [...Object.keys(StorageHelper), type];
        for (const key of storageTypes) {
            if (StorageHelper[key]?.api) {
                return key;
            }
        }
        return null;
    }

    // 简化 Promise 链处理
    async then(onfulfilled, onrejected) {
        return this.promise.then(() => onfulfilled(this), onrejected);
    }

    async catch(onrejected) {
        return this.promise.catch(onrejected);
    }

    async finally(onfinally) {
        return this.promise.finally(onfinally);
    }

    // 存储方法
    async setItem(key, value) {
        await this.promise;
        return this.storage.setItem(this, key, value);
    }

    async getItem(key) {
        await this.promise;
        return this.storage.getItem(this, key);
    }

    async removeItem(key) {
        await this.promise;
        return this.storage.removeItem(this, key);
    }
}

// 存储实现
StorageHelper.indexedDB = {
    api: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,

    async init(storageHelper) {
        return new Promise((resolve, reject) => {
            const request = this.api.open(storageHelper.name, storageHelper.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const objectStore = db.createObjectStore(StorageHelper.TABLE_NAME);
                objectStore.createIndex("key", "key", { unique: true });
            };

            request.onsuccess = (event) => {
                storageHelper.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                reject(new Error(`IndexedDB 错误: ${event.target.error}`));
            };
        });
    },

    async setItem(storageHelper, key, value) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = storageHelper.db.transaction(StorageHelper.TABLE_NAME, "readwrite");
                const store = transaction.objectStore(StorageHelper.TABLE_NAME);

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(new Error(`IndexedDB 事务错误`));

                store.put(value, key);
            } catch (error) {
                reject(error);
            }
        });
    },

    async getItem(storageHelper, key) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = storageHelper.db.transaction(StorageHelper.TABLE_NAME);
                const request = transaction.objectStore(StorageHelper.TABLE_NAME).get(key);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(new Error(`获取 IndexedDB 数据失败`));
            } catch (error) {
                reject(error);
            }
        });
    },

    async removeItem(storageHelper, key) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = storageHelper.db.transaction(StorageHelper.TABLE_NAME, "readwrite");
                const request = transaction.objectStore(StorageHelper.TABLE_NAME).delete(key);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error(`删除 IndexedDB 数据失败`));
            } catch (error) {
                reject(error);
            }
        });
    }
};

StorageHelper.localStorage = {
    api: window.localStorage,

    async init() {
        try {
            window.localStorage.setItem(StorageHelper.DATABASE_NAME, StorageHelper.TABLE_NAME);
            if (window.localStorage.getItem(StorageHelper.DATABASE_NAME) !== StorageHelper.TABLE_NAME) {
                throw new Error("LocalStorage 不可用");
            }
        } catch (error) {
            throw new Error(`LocalStorage 初始化失败: ${error.message}`);
        }
    },

    async setItem(_, key, value) {
        window.localStorage.setItem(key, value);
    },

    async getItem(_, key) {
        return window.localStorage.getItem(key);
    },

    async removeItem(_, key) {
        window.localStorage.removeItem(key);
    }
};

StorageHelper.openDatabase = {
    api: window.openDatabase,

    async init(storageHelper) {
        return new Promise((resolve, reject) => {
            try {
                storageHelper.db = window.openDatabase(
                    StorageHelper.DATABASE_NAME,
                    "1.0",
                    "PUSET_DATABASE_DEFAULT",
                    10 * 1024 * 1024
                );

                storageHelper.db.transaction(
                    (tx) => tx.executeSql(
                        `CREATE TABLE IF NOT EXISTS ${StorageHelper.TABLE_NAME} (key text unique, value text)`,
                        [],
                        () => resolve(),
                        (_, error) => reject(new Error(`SQL 错误: ${error.message}`))
                    )
                );
            } catch (error) {
                reject(new Error(`WebSQL 初始化失败: ${error.message}`));
            }
        });
    },

    async setItem(storageHelper, key, value) {
        return new Promise((resolve, reject) => {
            storageHelper.db.transaction(
                (tx) => tx.executeSql(
                    `INSERT INTO ${StorageHelper.TABLE_NAME} (key, value) VALUES (?, ?)`,
                    [key, JSON.stringify(value)],
                    () => resolve(),
                    (tx, error) => {
                        // 更新操作
                        tx.executeSql(
                            `UPDATE ${StorageHelper.TABLE_NAME} SET value=? WHERE key=?`,
                            [value, key],
                            () => resolve(),
                            (_, updateError) => reject(new Error(`SQL 更新失败: ${updateError.message}`))
                        );
                    }
                )
            );
        });
    },

    async getItem(storageHelper, key) {
        return new Promise((resolve, reject) => {
            storageHelper.db.transaction(
                (tx) => tx.executeSql(
                    `SELECT value FROM ${StorageHelper.TABLE_NAME} WHERE key = ?`,
                    [key],
                    (_, results) => {
                        try {
                            resolve(results.rows.length > 0 ? results.rows.item(0).value : null);
                        } catch (error) {
                            reject(new Error(`解析 SQL 查询结果失败: ${error.message}`));
                        }
                    },
                    (_, error) => reject(new Error(`SQL 查询失败: ${error.message}`))
                )
            );
        });
    },

    async removeItem(storageHelper, key) {
        return new Promise((resolve, reject) => {
            storageHelper.db.transaction(
                (tx) => tx.executeSql(
                    `DELETE FROM ${StorageHelper.TABLE_NAME} WHERE key = ?`,
                    [key],
                    () => resolve(),
                    (_, error) => reject(new Error(`SQL 删除失败: ${error.message}`))
                )
            );
        });
    }
};

StorageHelper.cookie = {
    api: document,

    async init() {
        document.cookie = "storage_test=true;max-age=25920000";
        if (!this.getCookie().storage_test) {
            throw new Error("Cookie 存储不可用");
        }
    },

    getCookie() {
        return document.cookie.split('; ')
            .reduce((acc, cookie) => {
                const [key, value] = cookie.split('=');
                acc[key] = value;
                return acc;
            }, {});
    },

    async setItem(_, key, value) {
        document.cookie = `${key}=${value};max-age=25920000`;
    },

    async getItem(_, key) {
        return this.getCookie()[key] || null;
    },

    async removeItem(_, key) {
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
};

// 导出类
export default StorageHelper;

// 如果在浏览器环境中，将其添加到全局作用域
if (typeof window !== 'undefined') {
    window.StorageHelper = StorageHelper;
}
