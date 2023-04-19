(function(e) {
    function t(t) {
        for (var r, l, i = t[0], s = t[1], c = t[2], d = 0, p = []; d < i.length; d++) l = i[d], 
        Object.prototype.hasOwnProperty.call(a, l) && a[l] && p.push(a[l][0]), a[l] = 0;
        for (r in s) Object.prototype.hasOwnProperty.call(s, r) && (e[r] = s[r]);
        u && u(t);
        while (p.length) p.shift()();
        return o.push.apply(o, c || []), n();
    }
    function n() {
        for (var e, t = 0; t < o.length; t++) {
            for (var n = o[t], r = !0, i = 1; i < n.length; i++) {
                var s = n[i];
                0 !== a[s] && (r = !1);
            }
            r && (o.splice(t--, 1), e = l(l.s = n[0]));
        }
        return e;
    }
    var r = {}, a = {
        app:0
    }, o = [];
    function l(t) {
        if (r[t]) return r[t].exports;
        var n = r[t] = {
            i:t,
            l:!1,
            exports:{}
        };
        return e[t].call(n.exports, n, n.exports, l), n.l = !0, n.exports;
    }
    l.m = e, l.c = r, l.d = function(e, t, n) {
        l.o(e, t) || Object.defineProperty(e, t, {
            enumerable:!0,
            get:n
        });
    }, l.r = function(e) {
        "undefined" !== typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
            value:"Module"
        }), Object.defineProperty(e, "__esModule", {
            value:!0
        });
    }, l.t = function(e, t) {
        if (1 & t && (e = l(e)), 8 & t) return e;
        if (4 & t && "object" === typeof e && e && e.__esModule) return e;
        var n = Object.create(null);
        if (l.r(n), Object.defineProperty(n, "default", {
            enumerable:!0,
            value:e
        }), 2 & t && "string" != typeof e) for (var r in e) l.d(n, r, function(t) {
            return e[t];
        }.bind(null, r));
        return n;
    }, l.n = function(e) {
        var t = e && e.__esModule ? function() {
            return e["default"];
        } :function() {
            return e;
        };
        return l.d(t, "a", t), t;
    }, l.o = function(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
    }, l.p = "/";
    var i = window["webpackJsonp"] = window["webpackJsonp"] || [], s = i.push.bind(i);
    i.push = t, i = i.slice();
    for (var c = 0; c < i.length; c++) t(i[c]);
    var u = s;
    o.push([ 0, "chunk-vendors" ]), n();
})({
    0:function(e, t, n) {
        e.exports = n("56d7");
    },
    "034f":function(e, t, n) {
        "use strict";
        var r = n("85ec"), a = n.n(r);
        a.a;
    },
    "56d7":function(e, t, n) {
        "use strict";
        n.r(t);
        n("e260"), n("e6cf"), n("cca6"), n("a79d");
        var r = n("2b0e"), a = function() {
            var e = this, t = e.$createElement, n = e._self._c || t;
            return n("div", {
                staticClass:"min-h-screen",
                attrs:{
                    id:"app"
                }
            }, [ n("header", {
                staticClass:"header"
            }, [ n("div", {
                staticClass:"hero py-8 sm:pt-24 text-center"
            }, [ e._m(0), n("div", {
                staticClass:"hero-options my-8 w-64 max-w-sm sm:w-full mx-auto"
            }, [ n("label", {
                attrs:{
                    "for":"ln"
                }
            }, [ n("input", {
                directives:[ {
                    name:"model",
                    rawName:"v-model",
                    value:e.lineNumbers,
                    expression:"lineNumbers"
                } ],
                attrs:{
                    type:"checkbox",
                    name:"ln"
                },
                domProps:{
                    checked:Array.isArray(e.lineNumbers) ? e._i(e.lineNumbers, null) > -1 :e.lineNumbers
                },
                on:{
                    change:function(t) {
                        var n = e.lineNumbers, r = t.target, a = !!r.checked;
                        if (Array.isArray(n)) {
                            var o = null, l = e._i(n, o);
                            r.checked ? l < 0 && (e.lineNumbers = n.concat([ o ])) :l > -1 && (e.lineNumbers = n.slice(0, l).concat(n.slice(l + 1)));
                        } else e.lineNumbers = a;
                    }
                }
            }), e._v(" Line Numbers ") ]), n("label", {
                staticClass:"ml-4",
                attrs:{
                    "for":"ln"
                }
            }, [ n("input", {
                directives:[ {
                    name:"model",
                    rawName:"v-model",
                    value:e.readonly,
                    expression:"readonly"
                } ],
                attrs:{
                    type:"checkbox",
                    name:"ln"
                },
                domProps:{
                    checked:Array.isArray(e.readonly) ? e._i(e.readonly, null) > -1 :e.readonly
                },
                on:{
                    change:function(t) {
                        var n = e.readonly, r = t.target, a = !!r.checked;
                        if (Array.isArray(n)) {
                            var o = null, l = e._i(n, o);
                            r.checked ? l < 0 && (e.readonly = n.concat([ o ])) :l > -1 && (e.readonly = n.slice(0, l).concat(n.slice(l + 1)));
                        } else e.readonly = a;
                    }
                }
            }), e._v(" Readonly ") ]) ]), e._m(1) ]) ]), n("main", {
                staticClass:"main max-w-lg mx-auto my-0 p-0"
            }, [ n("Editor", {
                staticClass:"my-editor",
                attrs:{
                    language:"html",
                    highlight:e.highlight,
                    "line-numbers":e.lineNumbers,
                    readonly:e.readonly
                },
                model:{
                    value:e.code,
                    callback:function(t) {
                        e.code = t;
                    },
                    expression:"code"
                }
            }) ], 1) ]);
        }, o = [ function() {
            var e = this, t = e.$createElement, n = e._self._c || t;
            return n("div", {
                staticClass:"hero-text font-mono text-xl w-64 sm:w-full mx-auto"
            }, [ n("h1", {
                staticClass:"text-2xl"
            }, [ e._v("Vue Prism Code Editor") ]), n("h3", {
                staticClass:"font-normal text-xl mt-4"
            }, [ e._v(" A dead simple code editor with syntax highlighting and line numbers. 3kb/gz ") ]) ]);
        }, function() {
            var e = this, t = e.$createElement, n = e._self._c || t;
            return n("div", {
                staticClass:"hero-info"
            }, [ e._v(" Documentation on "), n("a", {
                attrs:{
                    href:"https://github.com/koca/vue-prism-editor"
                }
            }, [ e._v("Github") ]) ]);
        } ], l = n("5530"), i = (n("c8b9"), n("e57a")), s = (n("cabf"), n("8c7a")), c = (n("cb55"), 
        n("6cf3"), n("416b"), n("6605"), {
            name:"App",
            components:{
                Editor:i["a"]
            },
            data:function() {
                return {
                    lineNumbers:!0,
                    readonly:!1,
                    code:n("8b41").default
                };
            },
            methods:{
                highlight:function(e) {
                    return Object(s["highlight"])(e, Object(l["a"])(Object(l["a"])(Object(l["a"])({}, s["languages"]["markup"]), s["languages"]["js"]), s["languages"]["css"]), "markup");
                }
            }
        }), u = c, d = (n("034f"), n("2877")), p = Object(d["a"])(u, a, o, !1, null, null, null), m = p.exports;
        n("185b");
        r["a"].config.productionTip = !1, new r["a"]({
            render:function(e) {
                return e(m);
            }
        }).$mount("#app");
    },
    "85ec":function(e, t, n) {},
    "8b41":function(e, t, n) {
        "use strict";
        n.r(t), t["default"] = '<template>\n  <div id="app">\n    <p>{{ message }}</p>\n    <input v-model="message">\n  </div>\n</template>\n<script>\nexport default {\n  data:() => ({\n    message: \'Hello Vue!\'\n  })\n}\n</script>\n<style>\n#app {\n  color: #2ecc71\n}\n</style>';
    },
    c8b9:function(e, t, n) {}
});