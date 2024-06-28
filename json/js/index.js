const mCodeView = document.getElementById("code_view");

const template = {};
Array.prototype.forEach.call(mCodeView.children, function(target) {
    template[target.className.replace(/(type|\s)/g, "")] = target;
});

function getParentElement(current, className) {
    const parent = current.parentElement;
    if (parent.classList.contains(className)) {
        return parent;
    }
    if (Object.is(mCodeView, parent)) {
        return null;
    }
    return getParentElement(parent, className);
}

function addMin(element) {
    const parent = getParentElement(element, "type");
    if (parent !== null) {
        parent.classList.add("min");
    }
}

function removeMin(element) {
    const parent = getParentElement(element, "type");
    if (parent !== null) {
        parent.classList.remove("min");
    }
}

function parse(parent, key, json) {
    const type = PuSet.type(json);
    let clone = template[type].cloneNode(true);
    clone.querySelector("b.key").innerText = key;

    if ("object" == type || "array" == type) {
        const content = clone.querySelector("div.content");
        PuSet.each(json, function(value, key) {
            parse(content, key, value);
        });
    } else {
        clone.querySelector("b.value").innerText = json;
    }
    parent.appendChild(clone);
}














PuSet(mCodeView).on("click", "div.type.object>div.start>b.key,div.type.array>div.start>b.key", function () {
    addMin(this);
}).on("click", "div.type.object>div.start>span.subtitle,div.type.array>div.start>span.subtitle", function () {
    removeMin(this);
});



mCodeView.innerHTML = "";
parse(mCodeView, "json", unit_data)


