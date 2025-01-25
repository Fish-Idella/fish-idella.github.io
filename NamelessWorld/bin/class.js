class AnyItem {
    static #id = 100;

    name = 'AnyItem';
    itemId = 0x000001;
    globalId = 0;

    constructor (name = "AnyItem") {
        this.globalId = AnyItem.#id++;
        this.name = name;
    }

    draw() {

    }

};

class Creature extends AnyItem {
    constructor(name = "Creature") {
        super(name);
    }
}

class Ren extends Creature {
    constructor(name = "Ren") {
        super(name);
    }
}

new AnyItem("石头", {
    method: "2d",

});