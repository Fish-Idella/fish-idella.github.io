/**!
 * const storage = new PuSet.Storage();
 * storage.then(() => {
 *     storage.getItem()
 * })
 */

(function (PuSet) {

    // In the following line, you should include the prefixes of implementations you want to test.
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    // DON'T use "const indexedDB = ..." if you're not in a function.
    // Moreover, you may need references to some window.IDB* objects:
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
    // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

    const DATABASE_NAME = "puset_database";
    const TABLE_NAME = "store";

    const StorageHelper = function (type, name, version) {
        if (name && (this.name = name));
        if (version && (this.version = version));
        this.promise = new Promise((resolve, reject) => {
            if (this.getType(type) === null) {
                reject(null);
            } else {
                StorageHelper[this.type].init(this, resolve, reject);
            }
        });
        return this;
    };

    StorageHelper.indexedDB = {
        api: window.indexedDB,
        // 创建数据库和表
        init: function (obj, resolve, reject) {

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
            obj.request.onerror = reject;
        },
        setItem: function (obj, resolve, reject, key, value) {
            try {
                const transaction = obj.db.transaction(TABLE_NAME, "readwrite");
                // 在所有数据添加完毕后的处理
                transaction.oncomplete = resolve;
                transaction.onerror = reject;

                transaction.objectStore(TABLE_NAME).put(value, key);
            } catch (ex) {
                reject(ex);
            }
        },
        getItem: function (obj, resolve, reject, key) {
            try {
                let value, transaction = obj.db.transaction(TABLE_NAME);
                // 在所有数据添加完毕后的处理
                transaction.oncomplete = () => resolve(value.result);
                transaction.onerror = reject;

                value = transaction.objectStore(TABLE_NAME).get(key);
            } catch (ex) {
                reject(ex);
            }
        },
        removeItem: function (obj, resolve, reject, key) {
            try {
                const transaction = obj.db.transaction(TABLE_NAME, "readwrite");
                // 在所有数据添加完毕后的处理
                transaction.oncomplete = resolve;
                transaction.onerror = reject;

                transaction.objectStore(TABLE_NAME).delete(key);
            } catch (ex) {
                reject(ex);
            }
        }
    };

    StorageHelper.localStorage = {
        api: window.localStorage,
        init: function (obj, resolve, reject) {
            try {
                obj.db = window.localStorage;
                window.localStorage.setItem(DATABASE_NAME, TABLE_NAME);
                if (window.localStorage.getItem(DATABASE_NAME) == TABLE_NAME) {
                    return resolve();
                }
            } finally {
                reject();
            }
        },
        setItem: function (obj, resolve, reject, key, value) {
            window.localStorage.setItem(key, value);
            resolve("complete");
        },
        getItem: function (obj, resolve, reject, key) {
            resolve(window.localStorage.getItem(key));
        },
        removeItem: function (obj, resolve, reject, key) {
            window.localStorage.removeItem(key);
            resolve("complete");
        }
    };

    StorageHelper.openDatabase = {
        api: window.openDatabase,
        init: function (obj, resolve, reject) {
            obj.db = window.openDatabase(DATABASE_NAME, "1.0", "PUSET_DATABASE_DEFAULT", 10 * 1024 * 1024);
            obj.db.transaction(function (tx) {
                const sql = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (key text unique, value text)`;
                tx.executeSql(sql, null, resolve, reject);
            });
        },
        setItem: function (obj, resolve, reject, key, value) {
            obj.db.transaction(function (tx) {
                const sql = `INSERT INTO ${TABLE_NAME} (key, value) VALUES (? , ?)`;
                tx.executeSql(sql, [key, JSON.stringify(value)], resolve, function () {
                    sql = `UPDATE ${TABLE_NAME} SET value=? WHERE key=?`;
                    tx.executeSql(sql, [("" + value), key], resolve, reject);
                });
            });
        },
        getItem: function (obj, resolve, reject, key) {
            obj.db.transaction(function (tx) {
                const sql = `SELECT value FROM ${TABLE_NAME} WHERE key = ?`;
                tx.executeSql(sql, [key], function (tx, results) {
                    try {
                        resolve(results.rows.item(0).value);
                    } catch (ex) {
                        reject(resolve(null));
                    }
                }, reject);
            })
        },
        removeItem: function (obj, resolve, reject, key) {
            obj.db.transaction(function (tx) {
                const sql = `DELETE FROM ${TABLE_NAME} WHERE key = ?`;
                tx.executeSql(sql, [key], resolve, reject);
            });
        }
    };

    StorageHelper.cookie = {
        api: document,
        init: function (obj, resolve, reject) {
            obj.db = document;
            document.cookie = "storage_test=true;max-age=25920000";
            if (this.getCookie().storage_test) {
                resolve()
            } else {
                reject()
            }
        },
        getCookie: function () {
            return new Function(`return {${document.cookie.replace(/\;/g, ",").replace(/\=/g, ":")}};`)();
        },
        setItem: function (obj, resolve, reject, key, value) {
            document.cookie = `${key}=${value};max-age=25920000`;
            resolve("complete");
        },
        getItem: function (obj, resolve, reject, key) {
            resolve(this.getCookie()[key]);
        },
        removeItem: function (obj, resolve, reject, key) {
            document.cookie = `${key}=null;max-age=0`;
            resolve("complete");
        }
    };

    StorageHelper.prototype.name = DATABASE_NAME;
    StorageHelper.prototype.request = null;
    StorageHelper.prototype.promise = null;
    StorageHelper.prototype.db = null;
    StorageHelper.prototype.type = null;
    StorageHelper.prototype.data = null;

    StorageHelper.prototype.getType = function (type = "indexedDB") {
        const keys = Object.keys(StorageHelper);
        keys.unshift(type);
        for (let key of keys) {
            if (StorageHelper[key].api != null) {
                return this.type = key;
            }
        }
        return null;
    };

    StorageHelper.prototype.then = function (onfulfilled, onrejected) {
        this.promise.then(ev => onfulfilled(this, ev), ev => (onrejected && onrejected(this, ev)));
        return this;
    };

    StorageHelper.prototype.catch = function (onrejected) {
        this.promise.catch(ev => onrejected(this, ev));
        return this;
    };

    StorageHelper.prototype.finally = function (onfinally) {
        this.promise.finally(ev => onfinally(this, ev));
        return this;
    };

    StorageHelper.prototype.setItem = function (key, value) {
        return new Promise((resolve, reject) => StorageHelper[this.type].setItem(this, resolve, reject, key, value));
    };

    StorageHelper.prototype.getItem = function (key) {
        return new Promise((resolve, reject) => StorageHelper[this.type].getItem(this, resolve, reject, key));
    };

    StorageHelper.prototype.removeItem = function (key) {
        return new Promise((resolve, reject) => StorageHelper[this.type].removeItem(this, resolve, reject, key));
    };

    (PuSet || window).StorageHelper = StorageHelper;

}(window.PuSet));