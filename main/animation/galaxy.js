// 匿名函数内部实现 new Function(this.content)

// --- 1. 从 GitHub 项目复制的 Particle 类 ---
// 出处: https://github.com/Animesh2102/Interactive-Particle-Galaxy
class Particle {
    constructor(x, y, options) {
        this.x = x;
        this.y = y;
        // 随机初始位置微调，避免所有粒子完全重叠
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 3 + 1; // 随机粒子大小
        this.options = options;
        this.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`; // 随机颜色
    }

    // 更新粒子位置，并处理边界反弹
    update(mouse) {
        this.x += this.vx;
        this.y += this.vy;

        // 边界碰撞检测与反弹
        if (this.x > this.options.dw || this.x < 0) this.vx *= -1;
        if (this.y > this.options.dh || this.y < 0) this.vy *= -1;

        // 鼠标交互：如果鼠标在画布内，产生引力效果
        if (mouse.x && mouse.y) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 150) {
                // 引力强度与距离成反比
                let force = 0.05;
                this.vx += dx / distance * force;
                this.vy += dy / distance * force;
            }
        }
    }

    // 绘制单个粒子
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.fillStyle; // 使用粒子自身的颜色
        ctx.fill();
    }
}

// --- 2. 返回符合你接口的函数 ---
return function galaxy(ctx, c3d, options) {
    // 确保画布显示
    ctx.canvas.classList.remove("hide");

    // 从 options 中读取尺寸
    const width = options.dw;
    const height = options.dh;

    // 初始化粒子数组
    const particleCount = 120;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        particles.push(new Particle(x, y, options));
    }

    // 鼠标位置对象（初始为 null）
    let mouse = { x: null, y: null };

    // --- 鼠标事件监听 (关键!) ---
    // 原项目通过监听 canvas 的 mousemove 事件来更新鼠标位置
    function onMouseMove(event) {
        const rect = ctx.canvas.getBoundingClientRect();
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
    }
    function onMouseLeave() {
        mouse.x = null;
        mouse.y = null;
    }
    document.addEventListener("pointermove", onMouseMove);
    document.addEventListener("pointerleave", onMouseLeave);

    // --- 动画主循环 ---
    let lastTime = 0;
    function animate(time) {
        // 计算时间增量，用于平滑动画
        const delta = (time - lastTime) / 16;
        lastTime = time;

        // 清空画布 (半透明实现拖尾效果)
        ctx.clearRect(0, 0, options.dw, options.dh);
        // 可选：添加半透明背景实现拖尾
        // ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        // ctx.fillRect(0, 0, width, height);

        // 1. 更新所有粒子
        for (let p of particles) {
            p.update(mouse);
        }

        // 2. 绘制所有粒子
        for (let p of particles) {
            p.draw(ctx);
        }

        // 3. 绘制粒子间的连线 (星座效果)
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 距离小于阈值时画线
                const maxDist = 150;
                if (distance < maxDist) {
                    // 根据距离调整线条透明度，越近越不透明
                    const alpha = 1 - (distance / maxDist);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    // 启动动画
    requestAnimationFrame(animate);
};
