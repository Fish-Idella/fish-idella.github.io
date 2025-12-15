const storage = new PuSet.StorageHelper();
Promise.all([PuSet.load('data/template.html'), PuSet.load("data/t-main.html")]).then(async function () {

    const result = await storage.getItem("puset-local-configure");
    const settings = JSON.parse(result ? decodeURIComponent(atob(result)) : "null") ?? null;

    if ((MainUI.GS = settings) === null) {
        return window.location.replace("/main/reset.html?" + Date.now());
    } else {
        const list = window.matchMedia("(prefers-color-scheme: dark)");
        const themeListener = function themeListener() {
            const hours = new Date().getHours();
            document.body.setAttribute("theme", (list.matches || hours < 6 || hours > 20) ? "dark" : "default");
            PuSet.show(document.body, true);
        }
        MainUI.setUiTheme = function setUiTheme(theme) {
            // 先移除现有的监听器，避免重复添加
            list.onchange = null;

            if ("os" === theme) {
                // 添加监听器，并立即触发一次
                ((list.onchange = themeListener)());
            } else {
                document.body.setAttribute("theme", theme);
            }
        };
        MainUI.setUiTheme(settings.string_theme);
    }

    const _main = document.getElementById('main');

    PuSet.get("search").init(true, function (root, options) {
        options.exec(root, settings, options);
    }, _main.querySelector(".search"));

    PuSet.get("link-manager").init(true, function (root, options) {
        document.body.appendChild(root);
        options.exec(root, settings, options);
    });

    PuSet.get("link-list").init(true, function (root, options) {
        options.exec(root, settings, options);
    }, _main.querySelector(".links"));

    PuSet.get('background').init(true, function (root, options) {
        root.classList.add('view', 'unselect');
        document.body.insertBefore(root, _main);
        options.exec(root, settings, options);
    });

    PuSet.get('image-selector').init(true, function (root, options) {
        document.body.appendChild(root);
        options.exec(root, settings, options);
    });

    // settings.openImageSelector(function(blob) {
    //     console.log(blob)
    // });
});