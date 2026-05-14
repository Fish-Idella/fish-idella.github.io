
document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const centerBtn = document.getElementById('center-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const previewBtn = document.getElementById('preview-btn');
    const exportBtn = document.getElementById('export-btn');
    const mainCanvas = document.getElementById('main-canvas');
    const previewContainer = document.getElementById('preview-container');

    // 获取canvas上下文
    const ctx = mainCanvas.getContext('2d');

    // 图片和变换状态
    let image = null;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastX, lastY;

    // 初始化预览容器
    function initPreviewContainer() {
        previewContainer.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.dataset.index = i;

            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            previewItem.appendChild(canvas);

            previewContainer.appendChild(previewItem);
        }
    }

    initPreviewContainer();

    // 处理文件选择
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // 拖放功能
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.style.borderColor = '#2196F3';
        dropArea.style.backgroundColor = '#e8f4fd';
    }

    function unhighlight() {
        dropArea.style.borderColor = '#666';
        dropArea.style.backgroundColor = '#f9f9f9';
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length) {
            handleImageFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    }

    function handleImageFile(file) {
        if (!file.type.match('image.*')) {
            alert('请选择图片文件！');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                image = img;
                scale = 1;
                centerImage();
                drawImage();
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    // 绘制图像
    function drawImage() {
        if (!image) return;

        // 清除画布
        ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

        // 计算绘制尺寸和位置
        const imgWidth = image.width * scale;
        const imgHeight = image.height * scale;
        const x = (mainCanvas.width - imgWidth) / 2 + offsetX;
        const y = (mainCanvas.height - imgHeight) / 2 + offsetY;

        // 绘制图像
        ctx.drawImage(image, x, y, imgWidth, imgHeight);

        // 绘制九宫格网格
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;

        // 垂直线
        ctx.beginPath();
        ctx.moveTo(mainCanvas.width / 3, 0);
        ctx.lineTo(mainCanvas.width / 3, mainCanvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mainCanvas.width * 2 / 3, 0);
        ctx.lineTo(mainCanvas.width * 2 / 3, mainCanvas.height);
        ctx.stroke();

        // 水平线
        ctx.beginPath();
        ctx.moveTo(0, mainCanvas.height / 3);
        ctx.lineTo(mainCanvas.width, mainCanvas.height / 3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, mainCanvas.height * 2 / 3);
        ctx.lineTo(mainCanvas.width, mainCanvas.height * 2 / 3);
        ctx.stroke();
    }

    // 图像居中
    function centerImage() {
        if (!image) return;

        // 计算图像居中后的偏移量
        const imgWidth = image.width * scale;
        const imgHeight = image.height * scale;

        // 计算保持图像在画布内的最大缩放比例
        const maxScaleX = mainCanvas.width / image.width * 0.9;
        const maxScaleY = mainCanvas.height / image.height * 0.9;
        const maxScale = Math.min(maxScaleX, maxScaleY);

        // 如果当前缩放比例使图像超出画布太多，则调整缩放比例
        if (scale > maxScale) {
            scale = maxScale;
        }

        offsetX = 0;
        offsetY = 0;
    }

    // 图像缩放
    function zoomImage(factor) {
        if (!image) return;

        // 记录鼠标位置
        const rect = mainCanvas.getBoundingClientRect();
        const mouseX = lastX - rect.left;
        const mouseY = lastY - rect.top;

        // 计算鼠标在图像上的相对位置
        const imgWidth = image.width * scale;
        const imgHeight = image.height * scale;
        const imgX = (mainCanvas.width - imgWidth) / 2 + offsetX;
        const imgY = (mainCanvas.height - imgHeight) / 2 + offsetY;
        const relX = (mouseX - imgX) / imgWidth;
        const relY = (mouseY - imgY) / imgHeight;

        // 调整缩放比例
        const newScale = scale * factor;

        // 限制缩放范围
        if (newScale > 10) return;
        if (newScale < 0.1) return;

        scale = newScale;

        // 调整偏移量，使鼠标位置保持不变
        const newImgWidth = image.width * scale;
        const newImgHeight = image.height * scale;
        const newImgX = (mainCanvas.width - newImgWidth) / 2;
        const newImgY = (mainCanvas.height - newImgHeight) / 2;

        offsetX = mouseX - (newImgX + relX * newImgWidth);
        offsetY = mouseY - (newImgY + relY * newImgHeight);

        drawImage();
    }

    // 预览九宫格
    function previewNineGrid() {
        if (!image) {
            alert('请先上传图片！');
            return;
        }

        const previewItems = previewContainer.querySelectorAll('.preview-item');

        // 计算每个格子的大小
        const gridWidth = mainCanvas.width / 3;
        const gridHeight = mainCanvas.height / 3;

        // 计算图像的绘制位置和大小
        const imgWidth = image.width * scale;
        const imgHeight = image.height * scale;
        const imgX = (mainCanvas.width - imgWidth) / 2 + offsetX;
        const imgY = (mainCanvas.height - imgHeight) / 2 + offsetY;

        // 为每个预览项绘制对应的图像部分
        previewItems.forEach((item, index) => {
            const canvas = item.querySelector('canvas');
            const ctx = canvas.getContext('2d');

            // 计算当前格子在画布中的位置
            const gridX = (index % 3) * gridWidth;
            const gridY = Math.floor(index / 3) * gridHeight;

            // 计算图像在当前格子中的位置和大小
            const imgInGridX = Math.max(gridX, imgX);
            const imgInGridY = Math.max(gridY, imgY);
            const imgInGridWidth = Math.min(gridX + gridWidth, imgX + imgWidth) - imgInGridX;
            const imgInGridHeight = Math.min(gridY + gridHeight, imgY + imgHeight) - imgInGridY;

            // 如果图像与当前格子有交集，则绘制
            if (imgInGridWidth > 0 && imgInGridHeight > 0) {
                // 计算图像上对应的区域
                const sourceX = (imgInGridX - imgX) / scale;
                const sourceY = (imgInGridY - imgY) / scale;
                const sourceWidth = imgInGridWidth / scale;
                const sourceHeight = imgInGridHeight / scale;

                // 清除画布
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // 绘制图像部分
                ctx.drawImage(
                    image,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, canvas.width, canvas.height
                );
            } else {
                // 如果没有交集，清空画布
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    }

    // 导出九宫格
    function exportNineGrid() {
        if (!image) {
            alert('请先上传图片！');
            return;
        }

        const previewItems = previewContainer.querySelectorAll('.preview-item');

        // 检查是否有预览内容
        let hasContent = false;
        previewItems.forEach(item => {
            const canvas = item.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            // 检查是否有非透明像素
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) {
                    hasContent = true;
                    break;
                }
            }

            if (hasContent) return;
        });

        if (!hasContent) {
            alert('请先预览九宫格！');
            return;
        }

        // 创建一个大画布来合并所有九宫格图像
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 300;
        exportCanvas.height = 300;
        const exportCtx = exportCanvas.getContext('2d');

        // 将九个小画布合并到大画布
        previewItems.forEach((item, index) => {
            const canvas = item.querySelector('canvas');
            const x = (index % 3) * 100;
            const y = Math.floor(index / 3) * 100;

            exportCtx.drawImage(canvas, x, y);
        });

        // 创建下载链接
        const link = document.createElement('a');
        link.download = '九宫格切图.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    // 事件监听
    centerBtn.addEventListener('click', () => {
        if (image) {
            centerImage();
            drawImage();
        }
    });

    zoomInBtn.addEventListener('click', () => {
        if (image) {
            zoomImage(1.2);
        }
    });

    zoomOutBtn.addEventListener('click', () => {
        if (image) {
            zoomImage(0.8);
        }
    });

    previewBtn.addEventListener('click', previewNineGrid);

    exportBtn.addEventListener('click', exportNineGrid);

    // 鼠标拖动功能
    mainCanvas.addEventListener('mousedown', (e) => {
        if (!image) return;

        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        mainCanvas.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !image) return;

        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        offsetX += dx;
        offsetY += dy;
        lastX = e.clientX;
        lastY = e.clientY;

        drawImage();
    });
})
