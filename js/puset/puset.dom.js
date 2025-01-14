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

        hide: function() {
            return this.each(function() {
                this.style.display = "none"
            })
        }
    })

}(window.PuSet));