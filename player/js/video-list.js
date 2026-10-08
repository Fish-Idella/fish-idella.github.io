(function () {
    let listData;
    const path = 'Videos';

    const player = new PuSetPlayer(document.getElementById("player-video-layer"));

    const c = document.getElementById("c");
    const v_list = PuSet.mvvm({
        target: c.querySelector("ul"),
        selector: "li",
        data: [],
        compare(a, b) {
            return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
        },
        layout(li, value) {
            li.className = value.type
            li.textContent = value.name
            if (value.type === "file") {
                const ext = (value.name.split(".").pop() || "").toLowerCase()
                if (["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v", "ts", "rmvb"].includes(ext)) {
                    li.classList.add("video")
                } else if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"].includes(ext)) {
                    li.classList.add("image")
                } else if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"].includes(ext)) {
                    li.classList.add("audio")
                }
            }
        }
    }).on("click", (li, value) => {
        if (value.type === "directory") {
            getList(listData.path + "/" + value.name)
        } else if (value.type === "file") {
            player.play("/av/" + listData.path + "/" + value.name);
            c.classList.remove("show")
        }
    });

    // 面包屑导航
    const pathBar = document.getElementById("path-bar");

    function renderPathBar(fullPath) {
        const segments = String(fullPath).split("/");
        pathBar.innerHTML = "";
        let accumulated = "";
        segments.forEach((seg, i) => {
            accumulated = accumulated ? accumulated + "/" + seg : seg;
            if (i > 0) {
                const sep = document.createElement("span");
                sep.className = "crumb-sep";
                sep.textContent = "/";
                pathBar.appendChild(sep);
            }
            const crumb = document.createElement("span");
            crumb.className = "crumb" + (i === segments.length - 1 ? " current" : "");
            crumb.dataset.path = accumulated;
            crumb.textContent = i === 0 ? "视频" : seg;
            pathBar.appendChild(crumb);
        });
    }

    pathBar.addEventListener("click", (ev) => {
        const crumb = ev.target.closest(".crumb");
        if (!crumb || crumb.classList.contains("current")) return;
        getList(crumb.dataset.path);
    });

    function getList(path) {
        fetch("/api/files", {
            method: "POST",
            body: new URLSearchParams({ path, type: "get" })
        }).then(r => r.json()).then(json => {
            if (json.success) {
                listData = json;
                v_list.update(listData.data.sort(v_list.compare))
                renderPathBar(listData.path)
            } else {
                throw new Error(json.message)
            }
        }).catch(e => {
            alert(e.message)
        })
    }

    getList(path)
})();