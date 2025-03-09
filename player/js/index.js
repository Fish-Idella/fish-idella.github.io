window.customElements.define("puset-video", class PuSetVideo extends HTMLDivElement {
    constructor() {
        super();
        // Create a shadow root
        var shadow = this.attachShadow({ mode: "open" });

        shadow.appendChild(document.createElement("span"))
    }

    play() {
        
    }
}, { extends: "div" });


const view = document.getElementById("video-view");

console.dir(view)