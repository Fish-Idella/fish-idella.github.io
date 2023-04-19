(function (PuSet) {

    function findParent(a, b) {

    }

    PuSet.fn.extend({
        removeAttr: function (attr) {
            return this.each(function () {
                this.removeAttribute(attr);
            })
        },

        css: function (key, value) {
            if (value && "string" === typeof key) {
                this.each(function () {
                    this.style[key] = value;
                })
            } else {
                this.each(function () {
                    for (value in key) {
                        this.style[value] = key[value];
                    }
                })
            }
            return this;
        },

        html: function(str) {
            var isFunction = PuSet.isFunction(str);
            return this.each(function() {
                this.innerHTML = isFunction?str(): str;
            })
        },

        addClass: function(str) {
            return this.each(function() {
                this.classList.add(str);
            })
        },

        removeClass: function(str) {
            return this.each(function() {
                this.classList.remove(str);
            })
        },

        on: function(type, selector, callback) {
            if (PuSet.isFunction(selector)) {
                this.on(type, null, selector);
            }
            var matches = this.find(selector);
            return this.each(function() {
                this.addEventListener(type, function(ev) {
                    if (selector === null) {
                        callback.call(this, ev);
                    } else {
                        PuSet.each(ev.path, function(i, target) {
                            if (PuSet.inArray(target, matches) >= 0) {
                                callback.call(target, ev);
                                return false;
                            }
                        })
                    }
                });
            });
        },

        hide: function() {
            return this.each(function() {
                this.style.display = "none"
            })
        }
    })

}(window.PuSet));