// (function (customElements) {

//     class HTMLEditorElement extends HTMLElement {

//     }

//     customElements.define('puset-editor', HTMLEditorElement);

// } (customElements));

const editor = document.getElementById("content");
const lineBar = editor.querySelector(".line-number-bar");
const codeIn = editor.querySelector("[contenteditable]");
const scrollBar = codeIn.parentElement;

const codeOut = document.getElementById("out");

codeIn.addEventListener("input", function(ev) {
    codeOut.value = codeIn.innerText;
});

scrollBar.addEventListener("scroll", function() {
    lineBar.scrollTo(0, this.scrollTop);
});