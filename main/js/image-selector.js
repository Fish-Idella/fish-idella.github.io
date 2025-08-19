
const ImageSelector = (function () {

    // 创建dialog元素
    const dialog = document.createElement('dialog');
    dialog.style.userSelect = 'none';
    dialog.style.border = 'none';
    dialog.style.outline = 'none';
    dialog.style.borderRadius = '1rem';
    dialog.style.boxShadow = '1px 1px 4px 0px rgb(138 122 122 / 80%)';

    // 创建box div
    const boxDiv = document.createElement('div');
    boxDiv.className = 'box';
    boxDiv.style.position = 'relative';
    boxDiv.style.display = 'flex';
    boxDiv.style.flexDirection = 'column';
    boxDiv.style.overflow = 'hidden';

    // 创建top div
    const topDiv = document.createElement('div');
    topDiv.className = 'top';
    topDiv.style.display = 'flex';
    topDiv.style.lineHeight = '50px';
    topDiv.style.fontSize = '1.3rem';

    // 创建top中的第一个div
    const topDiv1 = document.createElement('div');
    topDiv1.style.flexGrow = '1';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = '图片选择器';
    topDiv1.appendChild(titleSpan);
    topDiv.appendChild(topDiv1);

    // 创建top中的第二个div（选择文件按钮）
    const topDiv2 = document.createElement('div');
    const fileLabel = document.createElement('label');
    fileLabel.className = 'custom-button';
    fileLabel.setAttribute('tabindex', '0');
    fileLabel.style.fontSize = '1rem';
    fileLabel.style.textAlign = 'center';
    fileLabel.style.verticalAlign = 'middle';
    fileLabel.style.padding = '6px';
    fileLabel.style.margin = '0 0.5rem';
    fileLabel.style.border = '1px solid #bbbbbb';
    fileLabel.style.borderRadius = '0.4rem';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.setAttribute('tabindex', '-1');
    fileInput.style.webkitAppearance = 'none';
    fileInput.style.mozAppearance = 'none';
    fileInput.style.appearance = 'none';
    fileInput.style.width = '0px';
    fileInput.style.height = '0px';
    fileInput.style.padding = '0';
    fileInput.style.margin = '0';
    fileInput.style.border = 'none';
    fileInput.style.background = 'none';

    const fileSpan = document.createElement('span');
    fileSpan.textContent = '选择文件';
    fileLabel.appendChild(fileInput);
    fileLabel.appendChild(fileSpan);
    topDiv2.appendChild(fileLabel);
    topDiv.appendChild(topDiv2);

    // 创建top中的第三个div（确认按钮）
    const topDiv3 = document.createElement('div');
    const confirmLabel = document.createElement('label');
    confirmLabel.className = 'custom-button';
    confirmLabel.setAttribute('tabindex', '0');
    confirmLabel.style.fontSize = '1rem';
    confirmLabel.style.textAlign = 'center';
    confirmLabel.style.verticalAlign = 'middle';
    confirmLabel.style.padding = '6px';
    confirmLabel.style.margin = '0 0.5rem';
    confirmLabel.style.border = '1px solid #bbbbbb';
    confirmLabel.style.borderRadius = '0.4rem';

    const confirmInput = document.createElement('input');
    confirmInput.type = 'button';
    confirmInput.setAttribute('tabindex', '-1');
    confirmInput.style.webkitAppearance = 'none';
    confirmInput.style.mozAppearance = 'none';
    confirmInput.style.appearance = 'none';
    confirmInput.style.width = '0px';
    confirmInput.style.height = '0px';
    confirmInput.style.padding = '0';
    confirmInput.style.margin = '0';
    confirmInput.style.border = 'none';
    confirmInput.style.background = 'none';

    const confirmSpan = document.createElement('span');
    confirmSpan.textContent = '确认';
    confirmLabel.appendChild(confirmInput);
    confirmLabel.appendChild(confirmSpan);
    topDiv3.appendChild(confirmLabel);
    topDiv.appendChild(topDiv3);

    // 将top div添加到box div
    boxDiv.appendChild(topDiv);

    // 创建preview div
    const previewDiv = document.createElement('div');
    previewDiv.className = 'preview';
    previewDiv.style.position = 'relative';
    previewDiv.style.width = '600px';
    previewDiv.style.height = '400px';
    previewDiv.style.overflow = 'hidden';
    previewDiv.style.backgroundColor = '#F3F4F6';
    previewDiv.style.backgroundImage = 'linear-gradient(45deg, #E5E7EB 25%, transparent 25%), linear-gradient(-45deg, #E5E7EB 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E5E7EB 75%), linear-gradient(-45deg, transparent 75%, #E5E7EB 75%)';
    previewDiv.style.backgroundSize = '20px 20px';
    previewDiv.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';

    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.margin = '0';
    previewDiv.appendChild(canvas);

    // 创建overlay div
    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'overlay';
    overlayDiv.style.position = 'absolute';
    overlayDiv.style.width = '256px';
    overlayDiv.style.height = '256px';
    overlayDiv.style.top = '50%';
    overlayDiv.style.left = '50%';
    overlayDiv.style.pointerEvents = 'none';
    overlayDiv.style.transform = 'translate(-50%, -50%)';
    overlayDiv.style.border = '1px solid #666';
    overlayDiv.style.boxSizing = "border-box";
    overlayDiv.style.backgroundColor = 'transparent';
    overlayDiv.style.boxShadow = '0 0 0 200px rgb(0 0 0 / 80%)';
    overlayDiv.style.backgroundImage = 'linear-gradient(to bottom, transparent 0%, transparent 33.13%, #666 33.13%, #666 33.53%, transparent 33.53%), linear-gradient(to bottom, transparent 66.46%, #666 66.46%, #666 66.86%, transparent 66.86%), linear-gradient(to right, transparent 0%, transparent 33.13%, #666 33.13%, #666 33.53%, transparent 33.53%), linear-gradient(to right, transparent 66.46%, #666 66.46%, #666 66.86%, transparent 66.86%)';
    overlayDiv.style.backgroundSize = '100% 100%';
    overlayDiv.style.backgroundRepeat = 'no-repeat';
    previewDiv.appendChild(overlayDiv);

    // 将preview div添加到box div
    boxDiv.appendChild(previewDiv);

    // 将box div添加到dialog
    dialog.appendChild(boxDiv);

    // 将dialog添加到文档中
    document.body.appendChild(dialog);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let img, mCallback;

    // 缩放和平移参数
    let minWidth = 0;
    let scale = 1;
    let minScale = 0.1;
    let maxScale = 10;
    let offsetX = 0;
    let offsetY = 0;

    const overlay = 256;

    let lastOffsetX, lastOffsetY;

    // 鼠标状态
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    /**
     * 将值限制在 [min, max] 范围内
     * @param {number} value - 输入值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的值
     */
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

    /**
     * 计算并限制偏移量，使其不超过基于图像尺寸和缩放比例的安全范围
     * @param {number} offset - 当前偏移量（如 offsetX 或 offsetY）
     * @param {number} imageDimension - 图像的宽度或高度
     * @param {number} scale - 当前缩放比例
     * @returns {number} 限制后的偏移量
     */
    function calculateBoundedOffset(offset, imageDimension, scale) {
        const safeEdge = (imageDimension - overlay / scale) / 2;
        return clamp(offset, -safeEdge, safeEdge);
    }

    // 绘制图片
    function drawImage() {

        // 边界限制
        offsetX = calculateBoundedOffset(offsetX, img.width, scale);
        offsetY = calculateBoundedOffset(offsetY, img.height, scale);

        if (offsetX === lastOffsetX && offsetY === lastOffsetY) {
            return;
        }

        lastOffsetX = offsetX, lastOffsetY = offsetY;


        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 保存当前状态
        ctx.save();

        // 应用变换
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);

        ctx.translate(offsetX, offsetY);

        // 绘制图片（居中）
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // 恢复状态
        ctx.restore();

        // 更新缩放信息
        // scaleInfo.value = JSON.stringify({
        //     scale, offsetX, offsetY,
        //     imgWidth: img.width,
        //     imgHeight: img.height
        // }).replace(/([\{\,\}])/g, "$1\n");
    }

    document.addEventListener("keydown", function (ev) {
        if (dialog.open && img) {
            // console.log(ev.code, ev.keyCode)
            if (ev.code === "Space" || ev.keyCode === 32) {
                ev.preventDefault();
                offsetX = 0, offsetY = 0;
            } else if (ev.code === "ArrowLeft" || ev.keyCode === 37 || ev.code === "keyA" || ev.keyCode === 65) {
                ev.preventDefault();
                offsetX -= 1;
            } else if (ev.code === "ArrowRight" || ev.keyCode === 39 || ev.code === "keyD" || ev.keyCode === 68) {
                ev.preventDefault();
                offsetX += 1;
            } else if (ev.code === "ArrowUp" || ev.keyCode === 38 || ev.code === "keyW" || ev.keyCode === 87) {
                ev.preventDefault();
                offsetY -= 1;
            } else if (ev.code === "ArrowDown" || ev.keyCode === 40 || ev.code === "keyS" || ev.keyCode === 83) {
                ev.preventDefault();
                offsetY += 1;
            }
            drawImage();
        }
    });

    // 鼠标滚轮事件处理
    previewDiv.addEventListener('wheel', function (e) {
        e.preventDefault();

        // 获取鼠标在Canvas上的位置
        const rect = canvas.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        // 计算鼠标在图片坐标系中的位置
        const imgX = (pointerX - canvas.width / 2) / scale - offsetX;
        const imgY = (pointerY - canvas.height / 2) / scale - offsetY;

        // 计算缩放因子
        const delta = -e.deltaY;
        let factor = 0.01;
        if (delta < 0) {
            factor = -0.01;
        }

        // 应用缩放限制
        const newScale = Math.min(Math.max(scale + factor, minScale), maxScale);

        // 计算新的偏移量，使缩放以鼠标位置为中心
        offsetX = (pointerX - canvas.width / 2) / newScale - imgX;
        offsetY = (pointerY - canvas.height / 2) / newScale - imgY;

        scale = newScale;

        drawImage();
    });

    // 鼠标拖动事件处理
    previewDiv.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (!img) return;
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    dialog.addEventListener('pointermove', function (e) {
        e.preventDefault();
        if (isDragging) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;

            offsetX += dx / scale;
            offsetY += dy / scale;

            lastX = e.clientX;
            lastY = e.clientY;

            drawImage();
        }
    });

    dialog.addEventListener('pointerup', function (e) {
        e.preventDefault();
        isDragging = false;
    });


    // 加载新图片
    fileInput.addEventListener("input", function (event) {
        event.preventDefault();
        if (fileInput.files.length === 0) return;
        img = new Image();
        img.addEventListener("load", function () {
            minWidth = Math.min(img.naturalWidth, img.naturalHeight)
            minScale = overlay / minWidth;
            scale = minScale;
            offsetX = 0;
            offsetY = 0;
            drawImage();
        }, { once: true });
        img.src = URL.createObjectURL(fileInput.files.item(0));
    });

    // 添加确认裁剪功能
    confirmInput.addEventListener("click", function cropImage(event) {
        event.preventDefault();
        event.stopPropagation();
        dialog.close();

        if (!img) return;

        const canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
        canvas.width = canvas.height = overlay;
        const ctx2 = canvas.getContext("2d");
        ctx2.putImageData(ctx.getImageData(172, 72, overlay, overlay), 0, 0);
        canvas.toBlob(mCallback, "image/png", 1);
    });

    return function ImageSelector(callback) {
        mCallback = callback;
        // 显示dialog
        dialog.showModal();
    }

}());
