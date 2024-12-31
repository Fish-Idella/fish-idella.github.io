PuSet("#list").on("click", "a>.div.context", function (ev) {
    ev.preventDefault();
    if ("#" === this.getAttribute("href")) {
        this.classList.toggle("hide");
    }
});

const data = [
    {
        title: "2024/12/16",
        type: "group",
        children: [
            {
                title: "123.txt",
                type: "file",
                size: 123456,
                href: "http://123.com/123.txt"
            }
        ]
    }
];

const vm_file_list = PuSet.View({
    target: document.getElementById("list"),
    selector: "#list>a",
    data: data,
    layout: function (target, value, key, index) {
        const title = target.querySelector(".title");
        title.textContent = value.title;
        if (value.type === "group") {
            title.classList.add("group");
            const context = target.querySelector(".context");
            value.children.forEach(obj => {
                const template = target.cloneNode(true);
                this.layout(template, obj, null, null);
                context.appendChild(template);
            });
        } else if (value.type === "file") {
            title.classList.remove("group");
            target.setAttribute("download", value.title);
            target.setAttribute("href", value.href);
        }
    }
});