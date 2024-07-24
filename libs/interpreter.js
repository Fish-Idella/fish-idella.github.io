const Interpreter = (function (FillView) {

    function defaultFn() { return false; }

    return FillView(class {
        view = null;
        length = 0;

        constructor(name, view, items) {
            this.name = name;
            this.view = view;
            if (items.length === 1 && "object" === typeof items[0]) {
                Object.assign(this, items[0])
            } else {
                Object.assign(this, items);
                this.length = items.length;
            }
        }

        fn(item, ...items) {
            const fn = this[item];
            (("function" == typeof fn) ? fn : defaultFn).apply(this, items);
        }

        /**
         * 
         * @returns {Element}
         */
        cloneNode() {
            return this.view.cloneNode(true);
        }
    });

}(View => {
    return {

        view: document.createElement("div"),

        fn: function (a) {
            console.warn('do not find ', a);
        },

        /**
         * 
         * @param {Element} node 
         * @returns {Element}
         */
        cloneNode: function (node) {
            return (node || this).view.cloneNode(true);
        },

        parseHtml: function (htmlString) {
            const div = this.view.cloneNode();
            div.innerHTML = htmlString;
            return div.firstElementChild;
        },

        /**
         * 
         * @param {string} type 
         * @returns {View}
         */
        get: function (type) {
            return this["uesr-" + type] || this;
        },

        /**
         * 
         * @param {string} type View 类型
         * @param {function} callback View 构造器
         * @param  {function[]} items 额外的函数集
         * @returns {FillView}
         */
        set: function (type, callback, ...items) {
            this["uesr-" + type] = new View(type, callback(), items);
            return this;
        }
    }
}));