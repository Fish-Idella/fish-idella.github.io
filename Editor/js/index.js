// (function (customElements) {

//     class HTMLEditorElement extends HTMLElement {

//     }

//     customElements.define('puset-editor', HTMLEditorElement);

// } (customElements));

const editor = document.getElementById("content");
const lineBar = editor.querySelector(".line-number-bar");
const codeIn = editor.querySelector("[contenteditable]");
const scrollBar = codeIn.parentElement;

codeIn.addEventListener("input", function(ev) {
    this.style.width = "100%";
    const result = [];
    for (let i = 1, l = this.innerText.split("\n").length; i < l; i++) {
        result.push('<b>', i, '</b>');
    }
    lineBar.innerHTML = result.join('');
    // console.dir(this)
    this.style.width = scrollBar.scrollWidth + "px";
});

scrollBar.addEventListener("scroll", function() {
    lineBar.scrollTo(0, this.scrollTop);
});