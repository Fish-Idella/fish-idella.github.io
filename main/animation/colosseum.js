
// --- Particle 类 ---
class Particle {
    constructor(x, y, options) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.size = Math.random() * 19 + 1;
        this.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;
        this.attraction = 0.05;
        this.options = options;
    }

    init(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.size = Math.random() * 10 + 1;
        this.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;
        this.attraction = 0.05;
    }

    update(mouse) {
        this.x += this.vx;
        this.y += this.vy;

        const { dw, dh } = this.options;
        if (this.x > dw || this.x < 0) this.vx *= -1;
        if (this.y > dh || this.y < 0) this.vy *= -1;

        if (mouse.x != null && mouse.y != null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distSq = dx * dx + dy * dy;
            const radius = 150;
            if (distSq < radius * radius && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const force = this.attraction;
                this.vx += force * dx / dist;
                this.vy += force * dy / dist;
            }
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.fillStyle;
        ctx.fill();
    }
}

// --- 主函数 ---
return function colosseum(ctx, c3d, options) {
    ctx.canvas.classList.remove("hide");

    ctx.canvas.width = options.dw;
    ctx.canvas.height = options.dh;

    const mouse = { x: null, y: null };
    const canvas = ctx.canvas;
    const rect = canvas.getBoundingClientRect();

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    document.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // --- 直接初始化粒子（移除 createParticles 函数） ---
    const particleCount = 120;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * options.dw;
        const y = Math.random() * options.dh;
        particles.push(new Particle(x, y, options));
    }

    // --- 点击生成粒子 ---
    document.addEventListener('click', (e) => {
        const rect2 = canvas.getBoundingClientRect();
        const cx = e.clientX - rect2.left;
        const cy = e.clientY - rect2.top;
        for (let i = 0; i < 10; i++) {
            const idx = Math.floor(Math.random() * particles.length);
            particles[idx].init(
                cx + (Math.random() - 0.5) * 20,
                cy + (Math.random() - 0.5) * 20
            );
        }
    });

    // --- 动画主循环 ---
    function animate() {
        ctx.clearRect(0, 0, options.dw, options.dh);

        // 更新所有粒子
        for (let i = 0; i < particles.length; i++) {
            particles[i].update(mouse);
        }

        // 碰撞检测与处理（平方距离优化 + 复用 invDist）
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distSq = dx * dx + dy * dy;
                const minDist = p1.size + p2.size;

                if (distSq < minDist * minDist && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const invDist = 1 / dist;
                    const avgSize = (p1.size + p2.size) / 3;

                    p1.size = avgSize;
                    p2.size = avgSize;

                    const tempVx = p1.vx;
                    const tempVy = p1.vy;
                    p1.vx = p2.vx * 0.9;
                    p1.vy = p2.vy * 0.9;
                    p2.vx = tempVx * 0.9;
                    p2.vy = tempVy * 0.9;

                    if (p1.size < 3) {
                        p1.init(Math.random() * options.dw, Math.random() * options.dh);
                    }
                    if (p2.size < 3) {
                        p2.init(Math.random() * options.dw, Math.random() * options.dh);
                    }

                    const overlap = (p1.size + p2.size - dist) / 2;
                    const sepX = dx * invDist * overlap;
                    const sepY = dy * invDist * overlap;
                    p1.x += sepX;
                    p1.y += sepY;
                    p2.x -= sepX;
                    p2.y -= sepY;
                }
            }
        }

        // 绘制所有粒子
        for (let i = 0; i < particles.length; i++) {
            particles[i].draw(ctx);
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
};
