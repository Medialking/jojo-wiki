// Firebase Init (Matches your existing config)f
const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let userId = localStorage.getItem('jojoland_userId');
let userPoints = 0;
let userInventory = [];
let userEquipped = {};
let currentCategory = 'all';

// ================= SHOP DATABASE (HARDCODED ITEMS) =================
const SHOP_ITEMS = [
    // --- THEMES ---
    {
        id: 'theme_matrix',
        type: 'theme',
        name: 'The Matrix',
        desc: 'Цифровой дождь и зеленый неон для вашего профиля.',
        price: 300,
        rarity: 'rare',
        cssClass: 'theme-matrix',
        icon: '💻'
    },
    {
        id: 'theme_gold',
        type: 'theme',
        name: 'Royal Gold',
        desc: 'Роскошная золотая тема для настоящих богачей.',
        price: 1000,
        rarity: 'legendary',
        cssClass: 'theme-gold',
        icon: '👑'
    },
    {
        id: 'theme_neon',
        type: 'theme',
        name: 'Cyberpunk',
        desc: 'Футуристический стиль ночного города.',
        price: 500,
        rarity: 'epic',
        cssClass: 'theme-neon',
        icon: '🌃'
    },

    // --- FRAMES ---
    {
        id: 'frame_neon_green',
        type: 'frame',
        name: 'Neon Circle',
        desc: 'Простая, но стильная неоновая обводка.',
        price: 150,
        rarity: 'common',
        cssClass: 'frame-neon',
        icon: '⭕'
    },
    {
        id: 'frame_fire',
        type: 'frame',
        name: 'Inferno',
        desc: 'Анимированная огненная аура вокруг аватара.',
        price: 800,
        rarity: 'mythical',
        cssClass: 'frame-fire',
        icon: '🔥'
    },

    // --- BADGES ---
    {
        id: 'badge_rich',
        type: 'badge',
        name: 'Rich Member',
        desc: 'Эксклюзивный значок в профиль.',
        price: 2000,
        rarity: 'epic',
        cssClass: 'badge-rich',
        icon: '💎'
    }
];

// ================= INITIALIZATION =================
window.onload = async function() {
    createParticles();
    
    if (!userId) {
        alert("Пожалуйста, войдите в аккаунт!");
        window.location.href = "index.html";
        return;
    }

    await loadUserData();
    renderShop();
    setupListeners();

    // Hide Loader
    document.getElementById("loader").style.opacity = "0";
    setTimeout(() => document.getElementById("loader").style.display = "none", 400);
};

// ================= DATA LOADING =================
async function loadUserData() {
    try {
        // Load Points
        const pointsSnap = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnap.exists()) {
            userPoints = pointsSnap.val().total_points || 0;
            document.getElementById('user-balance').textContent = userPoints;
        }

        // Load Inventory & Equipped
        const userSnap = await database.ref('users/' + userId).once('value');
        if (userSnap.exists()) {
            const data = userSnap.val();
            userInventory = data.inventory || []; // Array of IDs
            userEquipped = data.equipped || {};   // { theme: 'id', frame: 'id' }
            
            // Set Avatar for Preview
            const mockAvatar = document.getElementById('mock-avatar-img');
            mockAvatar.src = data.avatar || 'images/default_avatar.png'; // Make sure default exists or use data URL
            document.getElementById('mock-name').textContent = data.nickname;
        }
    } catch (e) {
        console.error("Error loading data:", e);
    }
}

// ================= RENDER LOGIC =================
function renderShop(filter = 'all', sort = 'newest') {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    let items = SHOP_ITEMS.filter(item => filter === 'all' || item.type === filter);

    // Sorting
    if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    // Add logic for rarity sorting if needed

    items.forEach(item => {
        const isOwned = userInventory.includes(item.id);
        const card = document.createElement('div');
        card.className = `shop-item-card rarity-${item.rarity}`;
        
        card.innerHTML = `
            <div class="item-image-box">${item.icon}</div>
            <div class="item-info">
                <h4 class="item-title">${item.name}</h4>
                <div class="item-type">${translateType(item.type)}</div>
                <div class="item-price">
                    ${isOwned ? '<span class="owned-badge">КУПЛЕНО</span>' : `<span class="price-tag">${item.price} 🎄</span>`}
                </div>
                <button class="shop-btn preview-btn" onclick="openPreview('${item.id}')">
                    ${isOwned ? 'Примерить / Надеть' : '👁️ Примерить'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function translateType(type) {
    const types = { 'theme': 'Тема', 'frame': 'Рамка', 'effect': 'Эффект', 'badge': 'Бейдж' };
    return types[type] || type;
}

// ================= PREVIEW & MODAL =================
const modal = document.getElementById('preview-modal');
let currentPreviewItem = null;

window.openPreview = function(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    currentPreviewItem = item;
    const isOwned = userInventory.includes(item.id);

    // Update Modal Info
    document.getElementById('preview-item-name').textContent = item.name;
    document.getElementById('preview-item-desc').textContent = item.desc;
    document.getElementById('preview-price-val').textContent = item.price;
    document.getElementById('preview-rarity').textContent = item.rarity.toUpperCase();
    document.getElementById('preview-rarity').className = `preview-rarity-badge rarity-${item.rarity}`;

    // Update Buttons
    const buyBtn = document.getElementById('btn-buy');
    const equipBtn = document.getElementById('btn-equip');

    if (isOwned) {
        buyBtn.style.display = 'none';
        equipBtn.style.display = 'block';
        equipBtn.textContent = isEquipped(item) ? 'Снять' : 'Надеть';
    } else {
        buyBtn.style.display = 'block';
        equipBtn.style.display = 'none';
        buyBtn.disabled = userPoints < item.price;
        buyBtn.textContent = userPoints < item.price ? 'Недостаточно очков' : `Купить за ${item.price}`;
    }

    // Apply Visuals to Mock Profile
    applyPreviewVisuals(item);

    modal.style.display = 'flex';
};

function applyPreviewVisuals(item) {
    const container = document.getElementById('preview-container');
    const frame = document.getElementById('mock-frame');
    const badge = document.getElementById('mock-badge');

    // Reset styles
    container.className = 'mock-profile-container';
    frame.className = 'avatar-frame-layer';
    badge.style.display = 'none';

    // Apply specific logic
    if (item.type === 'theme') {
        container.classList.add(item.cssClass);
    } else if (item.type === 'frame') {
        frame.classList.add(item.cssClass);
    } else if (item.type === 'badge') {
        badge.style.display = 'flex';
        badge.textContent = item.icon + ' ' + item.name;
    }
}

function isEquipped(item) {
    return userEquipped[item.type] === item.id;
}

// ================= ACTIONS =================
document.getElementById('btn-buy').addEventListener('click', async () => {
    if (!currentPreviewItem || userPoints < currentPreviewItem.price) return;

    if (!confirm(`Купить "${currentPreviewItem.name}" за ${currentPreviewItem.price} очков?`)) return;

    const price = currentPreviewItem.price;
    const itemId = currentPreviewItem.id;

    // Use transaction to ensure safe deduction
    try {
        await database.ref('holiday_points/' + userId + '/total_points').transaction(currentPoints => {
            if (currentPoints >= price) return currentPoints - price;
            return; // Abort if insufficient
        }, (error, committed, snapshot) => {
            if (error) {
                alert("Ошибка транзакции!");
            } else if (!committed) {
                alert("Недостаточно средств!");
            } else {
                // Success deduction, add to inventory
                const newInventory = [...userInventory, itemId];
                database.ref('users/' + userId).update({ inventory: newInventory }).then(() => {
                    alert("Покупка успешна!");
                    userPoints = snapshot.val();
                    userInventory = newInventory;
                    document.getElementById('user-balance').textContent = userPoints;
                    modal.style.display = 'none';
                    renderShop(currentCategory);
                });
            }
        });
    } catch (e) {
        console.error(e);
    }
});

document.getElementById('btn-equip').addEventListener('click', async () => {
    if (!currentPreviewItem) return;
    
    const type = currentPreviewItem.type;
    const id = currentPreviewItem.id;
    
    let newEquipped = { ...userEquipped };
    
    // Toggle Logic
    if (newEquipped[type] === id) {
        newEquipped[type] = null; // Unequip
    } else {
        newEquipped[type] = id; // Equip
    }

    await database.ref('users/' + userId + '/equipped').set(newEquipped);
    userEquipped = newEquipped;
    alert("Профиль обновлен!");
    modal.style.display = 'none';
});

// ================= UI HELPERS =================
function setupListeners() {
    // Tabs
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.cat;
            renderShop(currentCategory, document.getElementById('sort-select').value);
        });
    });

    // Sort
    document.getElementById('sort-select').addEventListener('change', (e) => {
        renderShop(currentCategory, e.target.value);
    });

    // Modal Close
    document.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; }
    
    // Inventory Filter
    document.getElementById('show-inventory-btn').addEventListener('click', () => {
        const grid = document.getElementById('shop-grid');
        grid.innerHTML = '';
        const ownedItems = SHOP_ITEMS.filter(item => userInventory.includes(item.id));
        
        if(ownedItems.length === 0) {
            grid.innerHTML = '<div style="color:white; grid-column: 1/-1; text-align:center;">У вас пока нет покупок :(</div>';
            return;
        }

        ownedItems.forEach(item => {
            // Render (Reusing render logic simplified)
            const card = document.createElement('div');
            card.className = `shop-item-card rarity-${item.rarity}`;
            card.innerHTML = `
                <div class="item-image-box">${item.icon}</div>
                <div class="item-info">
                    <h4 class="item-title">${item.name}</h4>
                    <button class="shop-btn preview-btn" onclick="openPreview('${item.id}')">Настроить</button>
                </div>`;
            grid.appendChild(card);
        });
    });
}

function createParticles() {
    /* Copy from points.js */
    const container = document.getElementById('particles');
    if(!container) return;
    for(let i=0; i<20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random()*100 + '%';
        p.style.top = Math.random()*100 + '%';
        p.style.animationDelay = Math.random()*5 + 's';
        container.appendChild(p);
    }
}
