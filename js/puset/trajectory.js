
/**
 * 轨迹追踪类（继承自原生Array）
 * 核心功能：记录数值序列，自动检测数值趋势反转，按趋势阶段管理数值
 */
class Trajectory extends Array {
    current = 0;  // 当前记录的最新数值
    count = 0;    // 趋势阶段计数器
    trend = 0;    // 最新趋势

    /**
     * 构造函数：创建轨迹实例并初始化
     * @param {number} [value=0] - 初始化基准值
     */
    constructor(value = 0) {
        super();
        this.initialize(value);
    }

    /**
     * 初始化/重置轨迹状态
     * @param {number} [value=0] - 初始化基准值
     */
    initialize(value = 0) {
        // 无法在内部使用 splice()，splice > [Symbol.species] > initialize 无限递归
        this.current = value;
        this[0] = value;
        this[1] = value;
        this.length = 2;
        this.count = 1;
        this.trend = 0;
    }

    /**
     * 计算指定位置的数值差值（end - start）
     * @param {number} [start=0] - 起始索引
     * @param {number} [end=this.count] - 结束索引
     * @returns {number} 差值
     */
    delta(start = 0, end = this.count) {
        return this.at(end) - this.at(start);
    }

    /**
     * 记录新数值，更新轨迹和趋势
     * @param {number} value - 新数值
     */
    record(value) {
        const change = value - this.current;
        // 检测趋势反转（滑动方向改变）
        if ((this.trend > 0 && change < 0) || (this.trend < 0 && change > 0)) {
            this.count++;
        }
        this.current = this[this.count] = value;
        // 更新最新趋势（最后两个坐标的差值）
        this.trend = this.delta(-2, -1);
    }
}
