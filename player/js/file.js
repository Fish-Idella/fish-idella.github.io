const c = Interpreter({
    target: document.querySelector("#c>ul"),
    selector: "li",
    data: [],
    layout(li, value) {
        console.log(value)
        li.class = value.type
        li.textContent = value.name
    }
});


fetch("/api/directory_content_fetcher.php", {
    method: "POST",
    body: new URLSearchParams({ path: "Videos" })
}).then(r => r.json()).then(json => {
    if (json.success) {
        c.update(json.data)
    }
})