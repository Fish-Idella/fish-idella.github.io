function ListView(target) {

    this.target = "string" === typeof target ? document.querySelector(target): target;

    if (("" + this.target.nodeName).toUpperCase() === "UL") {
        this.target.classList.add("puset-list-view");
        this.target.addEventListener("resize", (ev) => this.onresize(ev));
        this.target.addEventListener("scroll", (ev) => this.onscroll(ev));
        this.onresize();
    }
}

ListView.prototype = {
    /** @type {Element} */
    target: null,

    array: null,

    onresize: function(ev) {
        this.width = this.target.clientWidth;
        this.height = this.target.clientHeight;
    },

    onscroll: function(ev) {

    },

    bindEventListener: function() {

    },

    /**
     * 
     * @param {Array} array 
     */
    layout: function(array) {
        this.array = array;
        
    }

};

var arr = new Array();
for (let i = 1; i < 1001; i++) {
    arr.push(i);
}

(new ListView("#list")).layout(arr, function(view, i) {

});