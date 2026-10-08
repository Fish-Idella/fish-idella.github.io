(function menu() {
    const a = document.getElementById("a");
    const b = document.getElementById("b");
    const c = document.getElementById("c");
    const d = document.getElementById("d");

    PuSet("div#sidebar").on("click", "button", function (ev) {
        ev.preventDefault();
        switch (this.name) {
            case "show-player":
                // 处理显示播放器的逻辑
                c.classList.remove('show')
                break;
            case "show-video-list":
                // 处理显示播放列表的逻辑
                c.classList.add('show')
                break;
        }
    })
}());