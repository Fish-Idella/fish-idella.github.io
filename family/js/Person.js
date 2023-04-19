/**
 * 单个成员信息
 * 
 * @version 1.0.0 for ES 2106
 */
class Person {

    // {String} 名字
    name = "Person";

    // {String} 字辈
    sign = "";

    // {Number} 性别 1 = 男，0 = 女
    gender = 0;

    // {String} 生日
    birthday = "";

    /**
     * @type {Person} 父亲
     */
    father = null;

    // {Person} 母亲
    mother = null;

    // {Array<Person>} 配偶们
    spouses = new Array();

    // {Array<Person>} 兄弟姐妹们
    siblings = new Array();

    // {Array<Person>} 孩子们
    children = new Array();

    // {String} 居住地
    residence = "";

    // {Array<String>} 照片 url
    photos = new Array();

    // {String} 生平简介
    life = "";

    constructor(name) {
        this.name = ("" + name).trim();
        return this;
    }

    // name, sign, gender, birthday, father, mother, spouses, siblings, children, residence, photos, life
    updata(obj) {

        let mPerson = this;

        return new Promise(function (resolve, reject) {

            let PromiseArray = new Array();

            for (let key in obj) {
                switch (key) {
                    case "name": mPerson.name = ("" + obj.name).trim(); break;
                    case "sign": mPerson.sign = ("" + obj.sign).trim(); break;
                    case "gender": mPerson.gender = ((obj.gender === 1) ? 1 : 0); break;
                    case "birthday": mPerson.birthday = ("" + obj.birthday).trim(); break;

                    case "residence": mPerson.residence = ("" + obj.residence).trim(); break;
                    case "life": mPerson.life = ("" + obj.life); break;

                    case "photos": mPerson.parsePhotos(obj.photos); break;

                    // 父母的信息 唯一
                    case "father":
                    case "mother": {
                        PromiseArray.push(Person.findPerson(obj[key]).then((person) => mPerson[key] = person));
                        break;
                    }

                    // 解析配偶、兄弟姐妹、后代  不唯一
                    case "spouses":
                    case "siblings":
                    case "children": {
                        PromiseArray.push(Person.parsePersonArray(obj[key], mPerson[key]));
                        break;
                    }
                }
            }

            Promise.all(PromiseArray).then(() => resolve(mPerson));

        });
    }

    parsePhotos(array) {

    }


    static parsePersonArray(arr, arr2) {

        return new Promise(function (resolve, reject) {

            let PromiseArray = new Array();

            if (Array.isArray(arr)) {
                arr.forEach(function (value) {
                    PromiseArray.push(Person.findPerson(value).then(person => arr2.push(person)));
                });
            } else if ("string" === typeof arr) {
                arr2.push(new Person(arr));
            }

            Promise.all(PromiseArray).then(a => resolve(a));
        });
    }


    static findPerson(id) {

        return new Promise(function (resolve, reject) {

            // 如果信息是人物编号
            if ("number" === typeof id) {

                // 判断本地的人物信息是否存在
                if (!Person.AllPersons.has(id)) {

                    // 不存在就从数据库拉取
                    Person.findPersonFromDatabase("id", id).then(function (arr) {

                        // 如果数据库中存在
                        if (Array.isArray(arr) && arr.length) {

                            // 记录到本地
                            Person.parse(arr[0]).then(function (per) {

                                // 回执 3
                                resolve(Person.AllPersons.setItem(id, per));
                            });
                        } else {

                            // 数据库中也不存在
                            resolve(new Person(id));
                        }
                    });
                } else {
                    // 回执 1
                    resolve(Person.AllPersons.getItem(id));
                }
            } else {
                // 回执 2
                resolve(new Person(id));
            }
        });

    }

    static findPersonFromDatabase(type, id) {

        return new Promise(function (resolve, reject) {
            let xhr = new XMLHttpRequest();
            xhr.onload = function () {
                resolve(JSON.parse(xhr.responseText));
            };
            xhr.onerror = function () {
                reject();
            };
            xhr.open("POST", "php/find.php", true);
            // 设置POST请求的请求头
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.send(`key=${type}&value=${id}`);
        });

    }

    static isObject(obj) {
        return (obj && obj.name);
    }

    /**
     * 
     * @param {*|String} obj 数据库原始对象 | 名字
     */
    static parse(obj) {

        return new Promise(function (resolve, reject) {

            let person = new Person();

            if ("string" === typeof obj) {
                // 如果传入参数是字符串，那么把参数设置为名字
                person.name = obj.trim();
                return resolve(person);
            } else if (Person.isObject(obj)) {
                // 如果传入参数是对象，从对象中提取有用的数据
                return person.updata(obj).then(resolve);
            } else {
                // 如果参数是其他类型，那么报错
                reject();
            }

        });

    }


    

    static AllPersons = {
        // id : Person Object

        has: function (id) {
            return (("number" === typeof id) && (-1 !== Object.keys(this).indexOf(id)));
        },

        setItem: function (id, value) {
            if ("number" === typeof id) {
                this[id] = value;
            }
            return value;
        },

        getItem: function (id) {
            let result = null;
            if ("number" === typeof id) {
                result = this[id];
            }
            return result || null;
        }
    };

}

Person.findPersonFromDatabase("id", 2).then(array => {

    console.dir(array);

    Person.parse(array[0]).then(function (person) {
        console.dir(person);
    });

});