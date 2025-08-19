// background.js（后台脚本）
chrome.tabs.onCreated.addListener(function (tab) {
    const blankUrls = ["", "null", "chrome://newtab/", "about:blank", "edge://newtab/"];
    const blankTitles = ["New Tab", "新标签页"];

    const isUrlBlank = blankUrls.includes("" + tab.url);
    const isTitleBlank = blankTitles.includes(tab.title);

    if (isUrlBlank || isTitleBlank) {
        console.log("空白标签页已创建", tab.id);
        // 在此添加自定义逻辑（如重定向、注入内容等）
        chrome.tabs.update(tab.id, { url: "http://localhost/main/" });
    }
});