(function () {
    let listData;
    const path = 'Videos';

    const player = new PuSetPlayer(document.getElementById("player-video-layer"));

    const c = PuSet.mvvm({
        target: document.querySelector("#c>ul"),
        selector: "li",
        data: [],
        compare(a, b) { 
            return a.type.localeCompare(b.type) || a.name.localeCompare(b.name) ;
        },
        layout(li, value) {
            li.className = value.type
            li.textContent = value.name
        }
    }).on("click", (li, value) => {
        if (value.type === "directory") {
            getList(listData.path + "/" + value.name)
        } else if (value.type === "file") {
            player.play("/av/" + listData.path + "/" + value.name)
        }
    });

    PuSet("#path-bar").on("click", () => {
        if (listData.path === path) return;
        getList(listData.path.split("/").slice(0, -1).join("/") || path)
    })

    function getList(path) {
        fetch("/api/directory_content_fetcher.php", {
            method: "POST",
            body: new URLSearchParams({ path })
        }).then(r => r.json()).then(json => {
            if (json.success) {
                listData = json;
                c.update(listData.data.sort(c.compare))
            } else {
                throw new Error(json.message)
            }
        }).catch(e => {
            alert(e.message)
        })
    }

    getList(path)
})();