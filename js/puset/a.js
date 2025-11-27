class Trajectory extends Array {
    constructor() {
        super();
        this.trend = 0;
        this.current = 0;
        this.count = 0;
    }

    // 初始化: initialize(value)
    initialize(value) {
        this.length = 0;
        this.push(value, value);
        this.trend = 0;
        this.current = value;
        this.count = 1;
    }

    // 计算变化量: delta(start, end)
    delta(start = 0, end = this.count) {
        return this.at(end) - this.at(start);
    }

    // 添加新值: add(value)
    add(value) {
        const change = value - this.current;
        if ((this.trend > 0 && change < 0) || (this.trend < 0 && change > 0)) {
            this.count++;
        }
        this.current = value;
        if (this.count >= this.length) {
            this.push(value);
        } else {
            this[this.count] = value;
        }
        this.trend = this.delta(-2, -1);
    }
}