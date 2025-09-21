(function iief() {
    function ifArray(a, b) { return Array.isArray(a) ? a : b; }

    function loadImage(url) {
        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = reject;
            img.src = url;
        });
    }

    const json = ifArray(JSON.parse(window.localStorage.getItem('websites') || '[]'), []);

    const vm_websites = new Interpreter({
        target: document.getElementById('websitesContainer'),
        selector: ".website-item",
        data: json,
        layout(node, value, key, index) {
            node.dataset.id = index;
            node.querySelector('input.website-name').value = value.name;
            const anchor = node.querySelector('a.website-home');
            anchor.querySelector("input").value = anchor.href = (value.url ?? value.href) || '#';
            const logo = node.querySelector('label.website-logo>span.logo');
            loadImage(value.logo).then(function () {
                logo.style.backgroundImage = `url(${value.logo})`;
                logo.textContent = '';
            }).catch(function () {
                logo.style.backgroundImage = 'none';
                logo.textContent = value.name[0];
            });
        }
    });

    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                // 验证导入的数据结构
                if (Array.isArray(importedData)) {
                    vm_websites.update(importedData);
                    alert('数据导入成功！');
                } else {
                    alert('导入的数据格式不正确！');
                }
            } catch (error) {
                alert('JSON解析错误：' + error.message);
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('importBtn').addEventListener('click', () => {
        fileInput.click();
    });
    document.getElementById('exportBtn').addEventListener('click', () => {
        const jsonString = JSON.stringify(vm_websites.data, null, 0);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'website_credentials_' + Date.now() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

}());




/** 
// 初始化数据
let websites = [
    {
        id: 1,
        name: "QQ",
        url: "https://xx.xx.com",
        logo: "https://picsum.photos/id/237/40/40",
        data: [
            {
                id: 1,
                username: "xxxxxxxxx",
                password: "xxxxxxxxx",
                email: ["aa@xx.com", "bb@yy.com"],
                tel: ["123-456", "789-456"]
            },
            {
                id: 2,
                username: "yyyyyyyyy",
                password: "yyyyyyyyy",
                email: ["bb@xx.com", "bb@yy.com"],
                tel: ["123-456", "789-456"]
            }
        ]
    },
    {
        id: 2,
        name: "WW",
        url: "https://ww.ww.com",
        logo: "https://picsum.photos/id/239/40/40",
        data: [
            {
                id: 1,
                username: "xxxxxxxxx",
                password: "xxxxxxxxx",
                email: ["aa@xx.com", "bb@yy.com"],
                tel: ["123-456", "789-456"]
            },
            {
                id: 2,
                username: "yyyyyyyyy",
                password: "yyyyyyyyy",
                email: ["bb@xx.com", "bb@yy.com"],
                tel: ["123-456", "789-456"]
            }
        ]
    }
];

let currentWebsiteId = null;
let nextWebsiteId = 3;
let nextUserId = {};

// 初始化用户ID计数器
websites.forEach(website => {
    if (website.data && website.data.length > 0) {
        const maxId = Math.max(...website.data.map(user => user.id));
        nextUserId[website.id] = maxId + 1;
    } else {
        nextUserId[website.id] = 1;
    }
});

// DOM元素
const websitesContainer = document.getElementById('websitesContainer');
const usersContainer = document.getElementById('usersContainer');
const userSectionTitle = document.getElementById('userSectionTitle');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const fileInput = document.getElementById('file-input');
const addWebsiteBtn = document.getElementById('addWebsiteBtn');
const addWebsiteBtn2 = document.getElementById('addWebsiteBtn2');
const addUserBtn = document.getElementById('addUserBtn');
const websiteModal = document.getElementById('websiteModal');
const userModal = document.getElementById('userModal');
const websiteForm = document.getElementById('websiteForm');
const userForm = document.getElementById('userForm');
const cancelWebsiteBtn = document.getElementById('cancelWebsiteBtn');
const cancelUserBtn = document.getElementById('cancelUserBtn');
const websiteModalTitle = document.getElementById('websiteModalTitle');
const userModalTitle = document.getElementById('userModalTitle');
const showButtonsBtn = document.getElementById('showButtonsBtn');
const showWebsitesBtn = document.getElementById('showWebsitesBtn');
const buttonListLayer = document.getElementById('button-list-layer');
const websiteListLayer = document.getElementById('website-list-layer');
const userListLayer = document.getElementById('user-list-layer');
const addArrayItemBtns = document.querySelectorAll('.add-array-item');

// 渲染网站列表
function renderWebsites() {
    websitesContainer.innerHTML = '';

    if (websites.length === 0) {
        websitesContainer.innerHTML = `
                    <div class="empty-state">
                        <div>暂无网站数据</div>
                        <p>点击"添加新网站"按钮开始添加</p>
                    </div>
                `;
        return;
    }

    websites.forEach(website => {
        const websiteItem = document.createElement('div');
        websiteItem.className = `website-item ${currentWebsiteId === website.id ? 'active' : ''}`;
        websiteItem.innerHTML = `
                    <div class="website-info">
                        <img src="${website.logo || 'https://picsum.photos/id/1/40/40'}" alt="${website.name} logo" class="website-logo">
                        <div>
                            <div>${website.name}</div>
                            <div style="font-size: 0.8rem; color: #7f8c8d;">${website.url}</div>
                        </div>
                    </div>
                    <div class="website-actions">
                        <button class="edit-website" data-id="${website.id}">编辑</button>
                        <button class="view-users" data-id="${website.id}">用户</button>
                        <button class="open-website" data-url="${website.url}">打开</button>
                    </div>
                `;
        websitesContainer.appendChild(websiteItem);
    });

    // 添加事件监听
    document.querySelectorAll('.view-users').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const websiteId = parseInt(e.currentTarget.dataset.id);
            viewUsers(websiteId);

            // 在移动视图下切换到用户列表
            if (window.innerWidth <= 1024) {
                websiteListLayer.classList.remove('show-layer');
                userListLayer.classList.add('show-layer');
            }
        });
    });

    document.querySelectorAll('.edit-website').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const websiteId = parseInt(e.currentTarget.dataset.id);
            editWebsite(websiteId);
        });
    });

    document.querySelectorAll('.open-website').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.currentTarget.dataset.url;
            window.open(url, '_blank');
        });
    });
}

// 查看用户列表
function viewUsers(websiteId) {
    currentWebsiteId = websiteId;
    const website = websites.find(w => w.id === websiteId);

    if (!website) return;

    userSectionTitle.textContent = `${website.name} 的用户信息`;
    usersContainer.innerHTML = '';

    if (!website.data || website.data.length === 0) {
        usersContainer.innerHTML = `
                    <div class="empty-state">
                        <div>暂无用户数据</div>
                        <p>点击"添加用户"按钮开始添加</p>
                    </div>
                `;
        renderWebsites(); // 更新选中状态
        return;
    }

    website.data.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';

        // 构建邮箱列表HTML
        const emailsHtml = user.email.map(email =>
            `<div class="list-item">${email}</div>`
        ).join('');

        // 构建电话列表HTML
        const telsHtml = user.tel.map(tel =>
            `<div class="list-item">${tel}</div>`
        ).join('');

        userItem.innerHTML = `
                    <h3>${user.username}</h3>
                    <div class="user-field">
                        <label>密码：</label>
                        <span>${user.password}</span>
                    </div>
                    <div class="user-field">
                        <label>邮箱：</label>
                        <div>${emailsHtml}</div>
                    </div>
                    <div class="user-field">
                        <label>电话：</label>
                        <div>${telsHtml}</div>
                    </div>
                    <div class="user-actions">
                        <button class="edit-user" data-id="${user.id}" data-website-id="${websiteId}">编辑</button>
                        <button class="delete-user danger" data-id="${user.id}" data-website-id="${websiteId}">删除</button>
                    </div>
                `;
        usersContainer.appendChild(userItem);
    });

    // 添加用户事件监听
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = parseInt(e.currentTarget.dataset.id);
            const websiteId = parseInt(e.currentTarget.dataset.websiteId);
            editUser(websiteId, userId);
        });
    });

    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = parseInt(e.currentTarget.dataset.id);
            const websiteId = parseInt(e.currentTarget.dataset.websiteId);
            deleteUser(websiteId, userId);
        });
    });

    renderWebsites(); // 更新选中状态
}

// 导入JSON文件
importBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            // 验证导入的数据结构
            if (Array.isArray(importedData)) {
                // 为导入的数据添加ID
                websites = importedData.map((website, index) => {
                    const web = { ...website, id: index + 1 };
                    if (web.data && Array.isArray(web.data)) {
                        web.data = web.data.map((user, uIndex) => ({ ...user, id: uIndex + 1 }));
                    } else {
                        web.data = [];
                    }
                    return web;
                });

                // 更新ID计数器
                nextWebsiteId = websites.length > 0 ? Math.max(...websites.map(w => w.id)) + 1 : 1;

                websites.forEach(website => {
                    if (website.data && website.data.length > 0) {
                        const maxId = Math.max(...website.data.map(user => user.id));
                        nextUserId[website.id] = maxId + 1;
                    } else {
                        nextUserId[website.id] = 1;
                    }
                });

                renderWebsites();
                alert('数据导入成功！');
            } else {
                alert('导入的数据格式不正确！');
            }
        } catch (error) {
            alert('JSON解析错误：' + error.message);
        }
    };
    reader.readAsText(file);
});

// 导出JSON文件
exportBtn.addEventListener('click', () => {
    // 准备要导出的数据（移除ID字段，保持与原始格式一致）
    const exportData = websites.map(website => {
        const { id, ...rest } = website;
        if (rest.data) {
            rest.data = rest.data.map(user => {
                const { id, ...userRest } = user;
                return userRest;
            });
        }
        return rest;
    });

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'website_credentials_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// 添加网站
function addWebsite() {
    websiteModalTitle.textContent = '添加网站';
    websiteForm.reset();
    document.getElementById('websiteId').value = '';
    websiteModal.style.display = 'flex';
}

addWebsiteBtn.addEventListener('click', addWebsite);
addWebsiteBtn2.addEventListener('click', addWebsite);

// 编辑网站
function editWebsite(websiteId) {
    const website = websites.find(w => w.id === websiteId);
    if (!website) return;

    websiteModalTitle.textContent = '编辑网站';
    document.getElementById('websiteId').value = website.id;
    document.getElementById('websiteName').value = website.name;
    document.getElementById('websiteUrl').value = website.url;
    document.getElementById('websiteLogo').value = website.logo || '';
    websiteModal.style.display = 'flex';
}

// 保存网站
websiteForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const websiteId = document.getElementById('websiteId').value;
    const name = document.getElementById('websiteName').value;
    const url = document.getElementById('websiteUrl').value;
    const logo = document.getElementById('websiteLogo').value;

    if (websiteId) {
        // 更新现有网站
        const index = websites.findIndex(w => w.id === parseInt(websiteId));
        if (index !== -1) {
            websites[index] = {
                ...websites[index],
                name,
                url,
                logo: logo || websites[index].logo
            };
        }
    } else {
        // 添加新网站
        const newWebsite = {
            id: nextWebsiteId++,
            name,
            url,
            logo,
            data: []
        };
        websites.push(newWebsite);
        nextUserId[newWebsite.id] = 1;
    }

    websiteModal.style.display = 'none';
    renderWebsites();
});

// 取消网站编辑
cancelWebsiteBtn.addEventListener('click', () => {
    websiteModal.style.display = 'none';
});

// 添加用户
addUserBtn.addEventListener('click', () => {
    if (!currentWebsiteId) {
        alert('请先选择一个网站');
        return;
    }

    userModalTitle.textContent = '添加用户';
    userForm.reset();
    document.getElementById('userId').value = '';
    document.getElementById('userWebsiteId').value = currentWebsiteId;

    // 重置数组输入
    document.getElementById('emailsContainer').innerHTML = `
                <div class="array-item">
                    <input type="email" name="email" required>
                    <button type="button" class="danger remove-array-item">×</button>
                </div>
            `;

    document.getElementById('telsContainer').innerHTML = `
                <div class="array-item">
                    <input type="text" name="tel">
                    <button type="button" class="danger remove-array-item">×</button>
                </div>
            `;

    userModal.style.display = 'flex';
});

// 编辑用户
function editUser(websiteId, userId) {
    const website = websites.find(w => w.id === websiteId);
    if (!website) return;

    const user = website.data.find(u => u.id === userId);
    if (!user) return;

    userModalTitle.textContent = '编辑用户';
    document.getElementById('userId').value = user.id;
    document.getElementById('userWebsiteId').value = websiteId;
    document.getElementById('username').value = user.username;
    document.getElementById('password').value = user.password;

    // 填充邮箱数组
    const emailsContainer = document.getElementById('emailsContainer');
    emailsContainer.innerHTML = '';
    user.email.forEach(email => {
        const emailItem = document.createElement('div');
        emailItem.className = 'array-item';
        emailItem.innerHTML = `
                    <input type="email" name="email" value="${email}" required>
                    <button type="button" class="danger remove-array-item">×</button>
                `;
        emailsContainer.appendChild(emailItem);
    });

    // 填充电话数组
    const telsContainer = document.getElementById('telsContainer');
    telsContainer.innerHTML = '';
    user.tel.forEach(tel => {
        const telItem = document.createElement('div');
        telItem.className = 'array-item';
        telItem.innerHTML = `
                    <input type="text" name="tel" value="${tel}">
                    <button type="button" class="danger remove-array-item">×</button>
                `;
        telsContainer.appendChild(telItem);
    });

    userModal.style.display = 'flex';
}

// 保存用户
userForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const websiteId = parseInt(document.getElementById('userWebsiteId').value);
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // 收集邮箱
    const emailInputs = document.querySelectorAll('#emailsContainer input[name="email"]');
    const emails = Array.from(emailInputs).map(input => input.value).filter(Boolean);

    // 收集电话
    const telInputs = document.querySelectorAll('#telsContainer input[name="tel"]');
    const tels = Array.from(telInputs).map(input => input.value).filter(Boolean);

    const websiteIndex = websites.findIndex(w => w.id === websiteId);
    if (websiteIndex === -1) {
        userModal.style.display = 'none';
        return;
    }

    if (userId) {
        // 更新现有用户
        const userIndex = websites[websiteIndex].data.findIndex(u => u.id === parseInt(userId));
        if (userIndex !== -1) {
            websites[websiteIndex].data[userIndex] = {
                ...websites[websiteIndex].data[userIndex],
                username,
                password,
                email: emails,
                tel: tels
            };
        }
    } else {
        // 添加新用户
        const newUser = {
            id: nextUserId[websiteId]++,
            username,
            password,
            email: emails,
            tel: tels
        };
        websites[websiteIndex].data.push(newUser);
    }

    userModal.style.display = 'none';
    viewUsers(websiteId);
});

// 取消用户编辑
cancelUserBtn.addEventListener('click', () => {
    userModal.style.display = 'none';
});

// 删除用户
function deleteUser(websiteId, userId) {
    if (!confirm('确定要删除这个用户吗？')) return;

    const websiteIndex = websites.findIndex(w => w.id === websiteId);
    if (websiteIndex === -1) return;

    websites[websiteIndex].data = websites[websiteIndex].data.filter(u => u.id !== userId);
    viewUsers(websiteId);
}

// 添加数组项
addArrayItemBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const container = document.getElementById(targetId);
        const inputType = targetId === 'emailsContainer' ? 'email' : 'text';
        const name = targetId === 'emailsContainer' ? 'email' : 'tel';
        const required = targetId === 'emailsContainer' ? 'required' : '';

        const newItem = document.createElement('div');
        newItem.className = 'array-item';
        newItem.innerHTML = `
                    <input type="${inputType}" name="${name}" ${required}>
                    <button type="button" class="danger remove-array-item">×</button>
                `;
        container.appendChild(newItem);

        // 为新添加的按钮添加事件
        newItem.querySelector('.remove-array-item').addEventListener('click', function () {
            container.removeChild(newItem);
        });
    });
});

// 事件委托：删除数组项
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-array-item')) {
        const arrayItem = e.target.closest('.array-item');
        if (arrayItem && arrayItem.parentElement.children.length > 1) {
            arrayItem.parentElement.removeChild(arrayItem);
        } else {
            alert('至少保留一项');
        }
    }
});

// 响应式布局控制
showButtonsBtn.addEventListener('click', () => {
    buttonListLayer.classList.add('show-layer');
    websiteListLayer.classList.remove('show-layer');
    userListLayer.classList.remove('show-layer');
});

showWebsitesBtn.addEventListener('click', () => {
    buttonListLayer.classList.remove('show-layer');
    websiteListLayer.classList.add('show-layer');
    userListLayer.classList.remove('show-layer');
});

// 初始渲染
renderWebsites();

// 窗口大小变化时重新渲染
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
        // 在桌面视图下显示所有层
        buttonListLayer.classList.remove('show-layer');
        websiteListLayer.classList.remove('show-layer');
        userListLayer.classList.remove('show-layer');
    } else if (!currentWebsiteId) {
        // 在移动视图下，默认显示网站列表
        buttonListLayer.classList.remove('show-layer');
        websiteListLayer.classList.add('show-layer');
        userListLayer.classList.remove('show-layer');
    }
});

// 初始化移动视图
if (window.innerWidth <= 1024) {
    websiteListLayer.classList.add('show-layer');
}
    */