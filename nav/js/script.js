
let navData = [];
let originalData = [];

// 加载数据
async function loadData() {
    try {
        const response = await fetch('info.json');
        navData = await response.json();
        Object.entries(navData).forEach(([url, obj]) => {
            obj.url = obj.url ?? url;
            originalData.push(obj);
        });
        renderNav();
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 渲染导航项
function renderNav() {
    const navGrid = document.getElementById('navGrid');
    navGrid.innerHTML = '';

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const sortBy = document.getElementById('sortSelect').value;

    let filteredData = originalData.filter(item =>
        item.title.toLowerCase().includes(searchTerm)
    );

    // 排序逻辑
    switch (sortBy) {
        case 'hot':
            filteredData.sort((a, b) => b.hot - a.hot);
            break;
        case 'title':
            filteredData.sort((a, b) => a.title.localeCompare(b.title));
            break;
        default:
            // 保持原始顺序
            break;
    }

    filteredData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'nav-item';
        card.innerHTML = `
                    <img src="${item.icon}" alt="${item.title}" class="nav-icon">
                    <div class="nav-title">${item.title}</div>
                    <div class="nav-hot">热度：${item.hot}</div>
                `;

        card.onclick = () => {
            window.location.href = item.url || item.key;
        };

        navGrid.appendChild(card);
    });
}

// 事件监听
document.getElementById('searchInput').addEventListener('input', renderNav);
document.getElementById('sortSelect').addEventListener('change', renderNav);

// 初始化
loadData();