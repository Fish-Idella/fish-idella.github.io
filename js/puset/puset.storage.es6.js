class StorageHelper {
    static DATABASE_NAME = "puset_database";
    static TABLE_NAME = "store";
    static SUPPORTED_STORAGES = ['indexedDB', 'localStorage', 'openDatabase', 'cookie'];

    constructor(type = "indexedDB", name = StorageHelper.DATABASE_NAME, version = 1) {
        this.name = name;
        this.version = version;
        this.promise = this.initialize(type);
    }

    async initialize(type) {
        this.type = this.getSupportedType(type);
        if (!this.type) {
            throw new Error("浏览器不支持任何预设的存储方式");
        }

        this.storage = StorageHelper[this.type];
        await this.storage.init(this);
    }

    getSupportedType(type) {
        // 检查用户指定的类型是否可用
        if (StorageHelper[type]?.api) return type;
        
        // 按优先级顺序检测支持的类型
        for (const storageType of StorageHelper.SUPPORTED_STORAGES) {
            if (StorageHelper[storageType]?.api) return storageType;
        }
        return null;
    }

    // 序列化处理
    serialize = JSON.stringify;
    deserialize = JSON.parse;

    // Promise 链代理
    then(onfulfilled, onrejected) {
        return this.promise.then(() => onfulfilled(this), onrejected);
    }

    catch(onrejected) {
        return this.promise.catch(onrejected);
    }

    finally(onfinally) {
        return this.promise.finally(onfinally);
    }

    // 核心存储方法
    async setItem(key, value) {
        await this.promise;
        const serialized = this.serialize(value);
        return this.storage.setItem(this, this.formatKey(key), serialized);
    }

    async getItem(key) {
        await this.promise;
        const value = await this.storage.getItem(this, this.formatKey(key));
        return value !== null ? this.deserialize(value) : null;
    }

    async removeItem(key) {
        await this.promise;
        return this.storage.removeItem(this, this.formatKey(key));
    }

    // 键名格式化（命名空间隔离）
    formatKey(key) {
        return `${this.name}_${StorageHelper.TABLE_NAME}_${key}`;
    }
}

// 存储实现基座
const BaseStorage = {
    init() { /* 初始化逻辑由具体实现覆盖 */ },
    setItem() { throw new Error("未实现 setItem 方法") },
    getItem() { throw new Error("未实现 getItem 方法") },
    removeItem() { throw new Error("未实现 removeItem 方法") }
};

// IndexedDB 实现
StorageHelper.indexedDB = {
    ...BaseStorage,
    api: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB,

    async init(instance) {
        return new Promise((resolve, reject) => {
            const request = this.api.open(instance.name, instance.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(StorageHelper.TABLE_NAME)) {
                    db.createObjectStore(StorageHelper.TABLE_NAME);
                }
            };

            request.onsuccess = (e) => {
                instance.db = e.target.result;
                resolve();
            };

            request.onerror = (e) => reject(`IndexedDB 初始化失败: ${e.target.error}`);
        });
    },

    async setItem(instance, key, value) {
        return new Promise((resolve, reject) => {
            const transaction = instance.db.transaction(
                StorageHelper.TABLE_NAME, 
                "readwrite"
            );
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
            
            transaction.objectStore(StorageHelper.TABLE_NAME)
                .put(value, key);
        });
    },

    async getItem(instance, key) {
        return new Promise((resolve, reject) => {
            const transaction = instance.db.transaction(StorageHelper.TABLE_NAME);
            const request = transaction.objectStore(StorageHelper.TABLE_NAME).get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async removeItem(instance, key) {
        return new Promise((resolve, reject) => {
            const transaction = instance.db.transaction(
                StorageHelper.TABLE_NAME, 
                "readwrite"
            );
            const request = transaction.objectStore(StorageHelper.TABLE_NAME).delete(key);
            
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });
    }
};

// localStorage 实现
StorageHelper.localStorage = {
    ...BaseStorage,
    api: window.localStorage,

    async init(instance) {
        try {
            const testKey = instance.formatKey('__storage_test__');
            this.api.setItem(testKey, 'test');
            this.api.removeItem(testKey);
        } catch (e) {
            throw new Error("localStorage 不可用");
        }
    },

    async setItem(instance, key, value) {
        this.api.setItem(key, value);
    },

    async getItem(instance, key) {
        return this.api.getItem(key);
    },

    async removeItem(instance, key) {
        this.api.removeItem(key);
    }
};

// WebSQL 实现
StorageHelper.openDatabase = {
    ...BaseStorage,
    api: window.openDatabase,

    async init(instance) {
        return new Promise((resolve, reject) => {
            instance.db = this.api(
                instance.name,
                '1.0',
                'PUSET_DATABASE',
                10 * 1024 * 1024
            );

            instance.db.transaction(tx => {
                tx.executeSql(
                    `CREATE TABLE IF NOT EXISTS ${StorageHelper.TABLE_NAME} 
                     (key TEXT PRIMARY KEY, value TEXT)`,
                    [],
                    resolve,
                    (_, err) => reject(`WebSQL 初始化失败: ${err.message}`)
                );
            });
        });
    },

    async setItem(instance, key, value) {
        return new Promise((resolve, reject) => {
            instance.db.transaction(tx => {
                tx.executeSql(
                    `INSERT OR REPLACE INTO ${StorageHelper.TABLE_NAME} VALUES (?, ?)`,
                    [key, value],
                    resolve,
                    (_, err) => reject(`WebSQL 写入失败: ${err.message}`)
                );
            });
        });
    },

    async getItem(instance, key) {
        return new Promise((resolve, reject) => {
            instance.db.transaction(tx => {
                tx.executeSql(
                    `SELECT value FROM ${StorageHelper.TABLE_NAME} WHERE key = ?`,
                    [key],
                    (_, results) => resolve(results.rows.item(0)?.value || null),
                    (_, err) => reject(`WebSQL 查询失败: ${err.message}`)
                );
            });
        });
    },

    async removeItem(instance, key) {
        return new Promise((resolve, reject) => {
            instance.db.transaction(tx => {
                tx.executeSql(
                    `DELETE FROM ${StorageHelper.TABLE_NAME} WHERE key = ?`,
                    [key],
                    resolve,
                    (_, err) => reject(`WebSQL 删除失败: ${err.message}`)
                );
            });
        });
    }
};

// Cookie 实现
StorageHelper.cookie = {
    ...BaseStorage,
    api: document.cookie,

    async init() {
        try {
            this.setItem({}, '__cookie_test__', '1', 1);
            this.removeItem({}, '__cookie_test__');
        } catch (e) {
            throw new Error("Cookie 存储不可用");
        }
    },

    async setItem(instance, key, value, maxAge = 2592000) {
        document.cookie = `${key}=${encodeURIComponent(value)};max-age=${maxAge};path=/`;
    },

    async getItem(instance, key) {
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${key}=`));
        
        return cookie ? 
            decodeURIComponent(cookie.split('=')[1]) : 
            null;
    },

    async removeItem(instance, key) {
        this.setItem(instance, key, '', -1);
    }
};

// 环境适配
if (typeof window !== 'undefined') {
    window.StorageHelper = StorageHelper;
}

export default StorageHelper;