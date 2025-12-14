// Инициализация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

// Инициализируем Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Глобальные переменные
let userId = null;
let userNickname = null;
let userBalance = 0;
let userInventory = [];
let giftsData = {};
let exchangeOrders = [];
let priceChart = null;
let threeDScenes = {};

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// СОЗДАНИЕ ФОНОВЫХ ЧАСТИЦ
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    particlesContainer.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        const size = Math.random() * 2 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        
        const duration = Math.random() * 20 + 15;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        particlesContainer.appendChild(particle);
    }
}

// ПОКАЗ УВЕДОМЛЕНИЙ
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(0, 204, 102, 0.9)' : 'rgba(255, 68, 68, 0.9)'};
        border: 1px solid ${type === 'success' ? '#00cc66' : '#ff4444'};
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 2000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
        font-size: 14px;
    `;
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">
            ${type === 'success' ? '✅ Успешно!' : '⚠️ Ошибка'}
        </div>
        <div>${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ПОКАЗ ОШИБОК
function showError(message) {
    showNotification(message, 'error');
}

// ПРОВЕРКА АВТОРИЗАЦИИ
async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    userNickname = localStorage.getItem('jojoland_nickname');
    
    console.log('Проверка авторизации:', { userId, userNickname });
    
    if (!userId || !userNickname) {
        showError('Для доступа к магазину необходимо войти в аккаунт');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 3000);
        return false;
    }
    
    return true;
}

// ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserData() {
    try {
        console.log('Загрузка данных пользователя...');
        // Загружаем баланс (новогодние очки)
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnapshot.exists()) {
            const pointsData = pointsSnapshot.val();
            userBalance = pointsData.total_points || pointsData.totalPoints || 0;
            console.log('Баланс загружен:', userBalance);
        } else {
            userBalance = 0;
            console.log('Баланс не найден, установлен 0');
        }
        
        // Загружаем инвентарь
        const inventorySnapshot = await database.ref('gift_inventory/' + userId).once('value');
        if (inventorySnapshot.exists()) {
            const inventory = inventorySnapshot.val();
            userInventory = Object.values(inventory);
            console.log('Инвентарь загружен:', userInventory.length, 'предметов');
        } else {
            userInventory = [];
            console.log('Инвентарь пуст');
        }
        
        // Обновляем UI
        updateBalance();
        updateInventoryStats();
        
        return true;
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        showError('Ошибка загрузки данных');
        return false;
    }
}

// ОБНОВЛЕНИЕ БАЛАНСА
function updateBalance() {
    const userBalanceEl = document.getElementById('user-balance');
    const balanceAmountEl = document.getElementById('balance-amount');
    
    if (userBalanceEl) userBalanceEl.textContent = userBalance;
    if (balanceAmountEl) balanceAmountEl.textContent = userBalance;
    
    console.log('Баланс обновлен:', userBalance);
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ ИНВЕНТАРЯ
function updateInventoryStats() {
    const counts = {
        common: 0,
        rare: 0,
        mythical: 0,
        golden: 0,
        selling: 0
    };
    
    userInventory.forEach(item => {
        const gift = giftsData[item.gift_id];
        if (gift && counts.hasOwnProperty(gift.rarity)) {
            counts[gift.rarity]++;
        }
        if (item.is_selling) {
            counts.selling++;
        }
    });
    
    const total = userInventory.length;
    
    const elements = {
        'total-gifts': total,
        'golden-count': counts.golden,
        'mythical-count': counts.mythical,
        'rare-count': counts.rare,
        'common-count': counts.common,
        'selling-count': counts.selling
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    console.log('Статистика инвентаря обновлена:', elements);
}

// ПОЛУЧЕНИЕ НАЗВАНИЯ РЕДКОСТИ
function getRarityName(rarity) {
    const names = {
        'common': 'Обычный',
        'rare': 'Редкий',
        'mythical': 'Мифический',
        'golden': 'Золотой'
    };
    return names[rarity] || rarity;
}

// НАСТРОЙКА ОБНОВЛЕНИЙ В РЕАЛЬНОМ ВРЕМЕНИ
function setupRealtimeUpdates() {
    console.log('Настройка обновлений в реальном времени...');
    
    // Обновление баланса
    database.ref('holiday_points/' + userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            userBalance = data.total_points || data.totalPoints || 0;
            updateBalance();
        }
    });
    
    // Обновление инвентаря
    database.ref('gift_inventory/' + userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const inventory = snapshot.val();
            userInventory = Object.values(inventory);
        } else {
            userInventory = [];
        }
        updateInventoryStats();
    });
    
    // Обновление ордеров биржи
    database.ref('exchange_orders').on('value', async (snapshot) => {
        if (snapshot.exists()) {
            const orders = snapshot.val();
            exchangeOrders = Object.entries(orders)
                .map(([id, order]) => ({ id, ...order }))
                .filter(order => order.status === 'active');
            
            displayExchangeOrders();
            updateExchangeStats();
        } else {
            exchangeOrders = [];
        }
    });
    
    // Обновление подарков
    database.ref('shop_gifts').on('value', (snapshot) => {
        if (snapshot.exists()) {
            giftsData = snapshot.val();
            displayAllGifts();
        }
    });
}

// ИНИЦИАЛИЗАЦИЯ ПОДАРКОВ
async function initializeGifts() {
    try {
        console.log('Инициализация подарков...');
        const snapshot = await database.ref('shop_gifts').once('value');
        
        if (snapshot.exists()) {
            giftsData = snapshot.val();
            console.log('Подарки загружены:', Object.keys(giftsData).length, 'подарков');
        } else {
            console.log('Подарки не найдены, создаем начальные...');
            await createInitialGifts();
        }
        
        displayAllGifts();
        
    } catch (error) {
        console.error('Ошибка инициализации подарков:', error);
        showError('Ошибка загрузки подарков');
    }
}

// СОЗДАНИЕ НАЧАЛЬНЫХ ПОДАРКОВ
async function createInitialGifts() {
    console.log('Создание начальных подарков...');
    const gifts = {
        // 3D Золотые подарки (3 штуки)
        golden_1: {
            id: 'golden_1',
            name: 'Золотая Корона',
            description: 'Эксклюзивная 3D корона с вращающимися драгоценными камнями',
            price: 5000,
            rarity: 'golden',
            icon: '👑',
            animation_type: '3d',
            model_type: 'crown',
            max_owners: 1,
            current_owners: 0,
            created_at: new Date().toISOString(),
            effects: ['glow', 'rotate', 'sparkle']
        },
        golden_2: {
            id: 'golden_2',
            name: 'Сокровища Дракона',
            description: '3D сундук с сокровищами, открывающийся с анимацией',
            price: 7500,
            rarity: 'golden',
            icon: '🐉',
            animation_type: '3d',
            model_type: 'treasure',
            max_owners: 1,
            current_owners: 0,
            created_at: new Date().toISOString(),
            effects: ['glow', 'open', 'sparkle']
        },
        golden_3: {
            id: 'golden_3',
            name: 'Феникс',
            description: '3D мифическая птица с анимацией полета',
            price: 10000,
            rarity: 'golden',
            icon: '🔥',
            animation_type: '3d',
            model_type: 'phoenix',
            max_owners: 1,
            current_owners: 0,
            created_at: new Date().toISOString(),
            effects: ['fly', 'glow', 'particles']
        },
        
        // Анимированные мифические подарки (5 штук) - упрощенные
        mythical_1: {
            id: 'mythical_1',
            name: 'Кристалл Силы',
            description: 'Пульсирующий кристалл с меняющимся цветом',
            price: 500,
            rarity: 'mythical',
            icon: '💎',
            animation_type: 'css',
            animation: 'pulse-glow',
            created_at: new Date().toISOString(),
            effects: ['pulse', 'color-change']
        },
        mythical_2: {
            id: 'mythical_2',
            name: 'Крылья Ангела',
            description: 'Парящие крылья с плавной анимацией',
            price: 1000,
            rarity: 'mythical',
            icon: '👼',
            created_at: new Date().toISOString()
        },
        mythical_3: {
            id: 'mythical_3',
            name: 'Лунный Камень',
            description: 'Камень с фазой луны, меняющейся со временем',
            price: 1500,
            rarity: 'mythical',
            icon: '🌙',
            created_at: new Date().toISOString()
        },
        mythical_4: {
            id: 'mythical_4',
            name: 'Океанская Жемчужина',
            description: 'Жемчужина с волновой анимацией',
            price: 2000,
            rarity: 'mythical',
            icon: '🐚',
            created_at: new Date().toISOString()
        },
        mythical_5: {
            id: 'mythical_5',
            name: 'Волшебный Свиток',
            description: 'Разворачивающийся свиток с мерцающим текстом',
            price: 2500,
            rarity: 'mythical',
            icon: '📜',
            created_at: new Date().toISOString()
        },
        
        // Редкие подарки (5 штук) - упрощенный вариант
        rare_1: {
            id: 'rare_1',
            name: 'Серебряный Кубок',
            description: 'Искусно выполненный кубок из чистого серебра',
            price: 100,
            rarity: 'rare',
            icon: '🏆',
            created_at: new Date().toISOString()
        },
        rare_2: {
            id: 'rare_2',
            name: 'Хрустальный Шар',
            description: 'Магический шар для предсказаний',
            price: 200,
            rarity: 'rare',
            icon: '🔮',
            created_at: new Date().toISOString()
        },
        rare_3: {
            id: 'rare_3',
            name: 'Статуэтка Дракона',
            description: 'Детализированная статуэтка мифического существа',
            price: 300,
            rarity: 'rare',
            icon: '🐲',
            created_at: new Date().toISOString()
        },
        rare_4: {
            id: 'rare_4',
            name: 'Золотой Ключ',
            description: 'Таинственный ключ от секретной двери',
            price: 400,
            rarity: 'rare',
            icon: '🗝️',
            created_at: new Date().toISOString()
        },
        rare_5: {
            id: 'rare_5',
            name: 'Карта Сокровищ',
            description: 'Древняя карта, ведущая к кладу',
            price: 500,
            rarity: 'rare',
            icon: '🗺️',
            created_at: new Date().toISOString()
        },
        
        // Обычные подарки (5 штук) - упрощенный вариант
        common_1: {
            id: 'common_1',
            name: 'Красная Коробка',
            description: 'Простая красная коробка с лентой',
            price: 10,
            rarity: 'common',
            icon: '🎁',
            created_at: new Date().toISOString()
        },
        common_2: {
            id: 'common_2',
            name: 'Зеленая Коробка',
            description: 'Простая зеленая коробка с бантом',
            price: 20,
            rarity: 'common',
            icon: '🎁',
            created_at: new Date().toISOString()
        },
        common_3: {
            id: 'common_3',
            name: 'Синяя Коробка',
            description: 'Простая синяя коробка с узором',
            price: 30,
            rarity: 'common',
            icon: '🎁',
            created_at: new Date().toISOString()
        },
        common_4: {
            id: 'common_4',
            name: 'Шоколадный Подарок',
            description: 'Коробка вкусного шоколада',
            price: 40,
            rarity: 'common',
            icon: '🍫',
            created_at: new Date().toISOString()
        },
        common_5: {
            id: 'common_5',
            name: 'Плюшевый Медведь',
            description: 'Мягкая игрушка для уюта',
            price: 60,
            rarity: 'common',
            icon: '🧸',
            created_at: new Date().toISOString()
        }
    };
    
    await database.ref('shop_gifts').set(gifts);
    giftsData = gifts;
    
    console.log('✅ Начальные подарки созданы');
}

// ОТОБРАЖЕНИЕ ВСЕХ ПОДАРКОВ
function displayAllGifts() {
    console.log('Отображение подарков...');
    const categories = {
        'golden': 'golden-gifts-grid',
        'mythical': 'mythical-gifts-grid',
        'rare': 'rare-gifts-grid',
        'common': 'common-gifts-grid'
    };
    
    for (const [rarity, containerId] of Object.entries(categories)) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Контейнер не найден:', containerId);
            continue;
        }
        
        const gifts = Object.values(giftsData).filter(gift => gift.rarity === rarity);
        console.log(`Подарки ${rarity}:`, gifts.length);
        
        if (gifts.length === 0) {
            container.innerHTML = '<div class="empty-gifts">Подарки загружаются...</div>';
            continue;
        }
        
        container.innerHTML = gifts.map(gift => createGiftCard(gift)).join('');
        
        // Добавляем обработчики для кнопок покупки
        gifts.forEach(gift => {
            const buyBtn = container.querySelector(`.buy-btn[data-gift-id="${gift.id}"]`);
            if (buyBtn) {
                buyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    buyGift(gift.id);
                });
            }
        });
    }
}

// СОЗДАНИЕ КАРТОЧКИ ПОДАРКА
function createGiftCard(gift) {
    const userOwns = userInventory.some(item => item.gift_id === gift.id);
    const canBuyGolden = gift.rarity === 'golden' && gift.current_owners < gift.max_owners && !userOwns;
    const canBuy = gift.rarity !== 'golden' && !userOwns;
    const isSoldOut = gift.rarity === 'golden' && gift.current_owners >= gift.max_owners;
    
    let buttonHtml = '';
    if (isSoldOut) {
        buttonHtml = '<button class="sold-btn" disabled>🛑 Распродан</button>';
    } else if (userOwns) {
        buttonHtml = '<button class="owned-btn" disabled>✅ В инвентаре</button>';
    } else if (canBuy || canBuyGolden) {
        buttonHtml = `<button class="buy-btn" data-gift-id="${gift.id}">🛒 Купить за ${gift.price}</button>`;
    }
    
    // Для 3D подарков
    let previewHtml = '';
    if (gift.animation_type === '3d') {
        previewHtml = `
            <div class="gift-3d-container" data-gift-id="${gift.id}">
                <div class="loading-3d">
                    <div class="loading-spinner"></div>
                    <p>Загрузка 3D...</p>
                </div>
            </div>
        `;
    } else if (gift.animation_type === 'css') {
        previewHtml = `
            <div class="gift-animated">
                <div class="animated-gift ${gift.animation}">
                    ${gift.icon}
                </div>
            </div>
        `;
    } else {
        previewHtml = `<div class="gift-image">${gift.icon}</div>`;
    }
    
    return `
        <div class="gift-card ${gift.rarity}" data-gift-id="${gift.id}">
            <div class="rarity-badge ${gift.rarity}">${getRarityName(gift.rarity)}</div>
            
            ${gift.rarity === 'golden' && gift.current_owners >= gift.max_owners ? 
                '<div class="gift-ribbon">SOLD</div>' : ''}
            
            ${previewHtml}
            
            <h3 class="gift-name">${gift.name}</h3>
            <p class="gift-description">${gift.description}</p>
            
            <div class="gift-price">${gift.price} 🎄</div>
            
            ${gift.rarity === 'golden' ? 
                `<div class="gift-stock">Осталось: ${gift.max_owners - gift.current_owners} из ${gift.max_owners}</div>` : ''}
            
            <div class="gift-actions">
                ${buttonHtml}
            </div>
        </div>
    `;
}

// ПОКУПКА ПОДАРКА
async function buyGift(giftId) {
    console.log('Покупка подарка:', giftId);
    
    const gift = giftsData[giftId];
    if (!gift) {
        showError('Подарок не найден');
        return;
    }
    
    const userOwns = userInventory.some(item => item.gift_id === giftId);
    if (userOwns) {
        showError('У вас уже есть этот подарок');
        return;
    }
    
    if (gift.rarity === 'golden' && gift.current_owners >= gift.max_owners) {
        showError('Этот 3D подарок уже распродан');
        return;
    }
    
    if (userBalance < gift.price) {
        showError(`Недостаточно средств. Нужно: ${gift.price}, у вас: ${userBalance}`);
        return;
    }
    
    if (!confirm(`Купить "${gift.name}" за ${gift.price} новогодних очков?`)) {
        return;
    }
    
    try {
        // Списание средств
        await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(-gift.price));
        
        // Обновляем локальный баланс
        userBalance -= gift.price;
        updateBalance();
        
        // Добавление подарка в инвентарь
        const giftData = {
            gift_id: giftId,
            purchased_at: new Date().toISOString(),
            purchase_price: gift.price,
            is_selling: false
        };
        
        const giftKey = `${giftId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await database.ref(`gift_inventory/${userId}/${giftKey}`).set(giftData);
        
        // Обновление счетчика владельцев для золотых подарков
        if (gift.rarity === 'golden') {
            await database.ref(`shop_gifts/${giftId}/current_owners`).set((gift.current_owners || 0) + 1);
        }
        
        showNotification(`🎉 Вы купили "${gift.name}"!`, 'success');
        
        // Обновление данных
        await loadUserData();
        displayAllGifts();
        
    } catch (error) {
        console.error('Ошибка покупки подарка:', error);
        showError('Ошибка при покупке подарка');
    }
}

// ИНИЦИАЛИЗАЦИЯ 3D СЦЕН
function initialize3DScenes() {
    console.log('Инициализация 3D сцен...');
    Object.values(giftsData).forEach(gift => {
        if (gift.animation_type === '3d') {
            const container = document.querySelector(`[data-gift-id="${gift.id}"] .gift-3d-container`);
            if (container) {
                try {
                    create3DScene(container, gift);
                } catch (error) {
                    console.error(`Ошибка создания 3D сцены для ${gift.id}:`, error);
                    container.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">${gift.icon}</div>`;
                }
            }
        }
    });
}

// СОЗДАНИЕ 3D СЦЕНЫ (упрощенная версия)
function create3DScene(container, gift) {
    try {
        if (!THREE) {
            throw new Error('Three.js не загружен');
        }
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0x000000, 0);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        
        // Освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffd700, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
        
        // Создаем простую геометрию
        let geometry;
        let material;
        
        if (gift.model_type === 'crown') {
            geometry = new THREE.ConeGeometry(1, 1.5, 8);
            material = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 100 });
        } else if (gift.model_type === 'treasure') {
            geometry = new THREE.BoxGeometry(1.5, 1, 1);
            material = new THREE.MeshPhongMaterial({ color: 0x8b4513, shininess: 30 });
        } else if (gift.model_type === 'phoenix') {
            geometry = new THREE.SphereGeometry(1, 16, 16);
            material = new THREE.MeshPhongMaterial({ color: 0xff4500, emissive: 0x442200 });
        } else {
            geometry = new THREE.BoxGeometry(1, 1, 1);
            material = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 100 });
        }
        
        const object = new THREE.Mesh(geometry, material);
        scene.add(object);
        camera.position.z = 3;
        
        // Анимация
        function animate() {
            requestAnimationFrame(animate);
            object.rotation.x += 0.01;
            object.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        
        animate();
        
        // Сохраняем сцену
        threeDScenes[gift.id] = { scene, camera, renderer, object };
        
    } catch (error) {
        console.error('Ошибка создания 3D сцены:', error);
        container.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">${gift.icon}<br/><small>3D недоступно</small></div>`;
    }
}

// ЗАГРУЗКА ОРДЕРОВ БИРЖИ
async function loadExchangeOrders() {
    try {
        console.log('Загрузка ордеров биржи...');
        const snapshot = await database.ref('exchange_orders').once('value');
        
        if (snapshot.exists()) {
            const orders = snapshot.val();
            exchangeOrders = Object.entries(orders)
                .map(([id, order]) => ({ id, ...order }))
                .filter(order => order.status === 'active');
            
            console.log('Ордеров загружено:', exchangeOrders.length);
            displayExchangeOrders();
            updateExchangeStats();
        } else {
            exchangeOrders = [];
            showNoOrdersMessage();
            console.log('Ордеров нет');
        }
    } catch (error) {
        console.error('Ошибка загрузки ордеров:', error);
        showError('Ошибка загрузки биржи');
    }
}

// ОТОБРАЖЕНИЕ ОРДЕРОВ БИРЖИ
function displayExchangeOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    if (exchangeOrders.length === 0) {
        showNoOrdersMessage();
        return;
    }
    
    container.innerHTML = exchangeOrders.map(order => createOrderRow(order)).join('');
}

// СОЗДАНИЕ СТРОКИ ОРДЕРА
function createOrderRow(order) {
    const gift = giftsData[order.gift_id];
    if (!gift) return '';
    
    const isMyOrder = order.user_id === userId;
    const canExecute = !isMyOrder && order.status === 'active';
    
    return `
        <div class="order-row ${order.type}-order" data-order-id="${order.id}">
            <div class="table-col" style="width: 150px;">
                <div class="order-type ${order.type}-badge">
                    ${order.type === 'sell' ? '💰 Продажа' : '🛒 Покупка'}
                    ${isMyOrder ? '<span class="order-status status-active">Мой</span>' : ''}
                </div>
            </div>
            
            <div class="table-col" style="width: 200px;">
                <div class="order-gift">
                    <span class="order-gift-icon">${order.gift_icon || gift.icon}</span>
                    <span>${order.gift_name || gift.name}</span>
                </div>
            </div>
            
            <div class="table-col" style="width: 120px;">
                <div class="rarity-badge ${order.gift_rarity || gift.rarity}">
                    ${getRarityName(order.gift_rarity || gift.rarity)}
                </div>
            </div>
            
            <div class="table-col" style="width: 150px;">
                <div class="order-user">
                    ${order.user_nickname || 'Неизвестный'}
                </div>
            </div>
            
            <div class="table-col" style="width: 150px;">
                <div class="order-price">${order.price} 🎄</div>
            </div>
            
            <div class="table-col" style="width: 120px;">
                <div class="order-quantity">${order.quantity} шт.</div>
            </div>
            
            <div class="table-col" style="width: 100px;">
                ${canExecute ? 
                    `<button class="execute-btn available" onclick="executeOrder('${order.id}')">
                        ${order.type === 'sell' ? 'Купить' : 'Продать'}
                    </button>` :
                    `<button class="execute-btn" disabled>
                        ${isMyOrder ? 'Мой' : 'Недоступно'}
                    </button>`
                }
            </div>
        </div>
    `;
}

// ИНИЦИАЛИЗАЦИЯ ГРАФИКА ЦЕН
function initializePriceChart() {
    const ctx = document.getElementById('price-chart');
    if (!ctx) return;
    
    try {
        priceChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['День 1', 'День 2', 'День 3', 'День 4', 'День 5', 'День 6', 'День 7'],
                datasets: [{
                    label: 'Цена золотых подарков',
                    data: [5000, 5200, 5100, 5300, 5250, 5400, 5500],
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#aaaaff'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#aaaaff',
                            callback: function(value) {
                                return value + ' 🎄';
                            }
                        }
                    }
                }
            }
        });
        console.log('График цен инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации графика:', error);
    }
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ БИРЖИ
function updateExchangeStats() {
    const elements = {
        'active-orders': exchangeOrders.length,
        'trade-volume': exchangeOrders.reduce((sum, order) => sum + (order.price * order.quantity), 0),
        'today-trades': exchangeOrders.filter(order => {
            const today = new Date().toDateString();
            const orderDate = new Date(order.created_at).toDateString();
            return orderDate === today;
        }).length,
        'price-change': '+5%'
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
}

// ПОКАЗ СООБЩЕНИЯ ЕСЛИ НЕТ ОРДЕРОВ
function showNoOrdersMessage() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-orders">
            <div class="empty-icon">📊</div>
            <h3>На бирже пока нет ордеров</h3>
            <p>Будьте первым, кто создаст торговый ордер!</p>
            <button class="action-btn" onclick="showCreateOrderModal('sell')">📤 Создать ордер</button>
        </div>
    `;
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
function switchTab(tabName) {
    console.log('Переключение на вкладку:', tabName);
    
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убрать активный класс со всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показывать выбранную вкладку
    const tabElement = document.getElementById(`${tabName}-tab`);
    const btnElement = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    if (btnElement) {
        btnElement.classList.add('active');
    }
}

// ==================== ФУНКЦИИ СОЗДАНИЯ ОРДЕРОВ ====================

// ПОКАЗАТЬ МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ОРДЕРА
function showCreateOrderModal(type = 'sell') {
    console.log('Открытие модального окна создания ордера:', type);
    
    const modal = document.getElementById('create-order-modal');
    if (!modal) return;
    
    // Сброс формы
    resetOrderForm();
    
    // Установка типа ордера
    setOrderType(type);
    
    // Заполнение списка подарков
    populateGiftSelector(type);
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Добавляем обработчики для формы
    setupOrderFormListeners();
}

// СБРОС ФОРМЫ
function resetOrderForm() {
    const formElements = {
        'order-price': '',
        'order-quantity': '1',
        'available-qty': '0',
        'market-price': '0',
        'min-price': '10',
        'max-price': '100000',
        'order-total': '0',
        'commission-amount': '0'
    };
    
    for (const [id, value] of Object.entries(formElements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    const priceInput = document.getElementById('order-price');
    const quantityInput = document.getElementById('order-quantity');
    if (priceInput) priceInput.value = '';
    if (quantityInput) quantityInput.value = '1';
    
    // Снимаем выделение с подарков
    document.querySelectorAll('.gift-selector-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// УСТАНОВКА ТИПА ОРДЕРА
function setOrderType(type) {
    const buttons = document.querySelectorAll('.order-type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
}

// ЗАПОЛНЕНИЕ ВЫБОРА ПОДАРКОВ
function populateGiftSelector(type) {
    const container = document.getElementById('order-gift-selector');
    if (!container) return;
    
    let giftsToShow = [];
    
    if (type === 'sell') {
        // Для продажи показываем только те подарки, которые есть в инвентаре
        giftsToShow = userInventory
            .filter(item => !item.is_selling)
            .map(item => ({
                ...item,
                gift: giftsData[item.gift_id]
            }))
            .filter(item => item.gift);
    } else {
        // Для покупки показываем все подарки
        giftsToShow = Object.values(giftsData).map(gift => ({
            gift_id: gift.id,
            gift: gift
        }));
    }
    
    if (giftsToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-gifts">
                <p>${type === 'sell' ? 'Нет подарков для продажи' : 'Нет доступных подарков'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = giftsToShow.map(item => {
        const gift = item.gift;
        const inventoryItem = type === 'sell' ? item : null;
        const countInInventory = type === 'sell' ? 
            userInventory.filter(i => i.gift_id === gift.id && !i.is_selling).length : 0;
        
        return `
            <div class="gift-selector-item" 
                 data-gift-id="${gift.id}"
                 data-max-qty="${type === 'sell' ? countInInventory : 999}">
                <span class="gift-selector-icon">${gift.icon}</span>
                <span class="gift-selector-name">${gift.name}</span>
                <span class="gift-selector-rarity ${gift.rarity}">${getRarityName(gift.rarity)}</span>
                ${type === 'sell' ? `<small>${countInInventory} шт.</small>` : ''}
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики выбора подарка
    container.querySelectorAll('.gift-selector-item').forEach(item => {
        item.addEventListener('click', function() {
            selectGiftForOrder(this);
        });
    });
}

// ВЫБОР ПОДАРКА ДЛЯ ОРДЕРА
function selectGiftForOrder(element) {
    // Снимаем выделение со всех
    document.querySelectorAll('.gift-selector-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Выделяем выбранный
    element.classList.add('selected');
    
    const giftId = element.dataset.giftId;
    const gift = giftsData[giftId];
    if (!gift) return;
    
    // Обновляем информацию о доступном количестве
    const maxQty = parseInt(element.dataset.maxQty) || 1;
    document.getElementById('available-qty').textContent = maxQty;
    
    // Устанавливаем максимальное количество
    const quantityInput = document.getElementById('order-quantity');
    if (quantityInput) {
        quantityInput.max = maxQty;
        if (parseInt(quantityInput.value) > maxQty) {
            quantityInput.value = maxQty;
        }
    }
    
    // Рассчитываем рыночную цену
    calculateMarketPrice(giftId);
    
    // Обновляем общую сумму
    calculateOrderTotal();
}

// РАССЧЕТ РЫНОЧНОЙ ЦЕНЫ
function calculateMarketPrice(giftId) {
    const gift = giftsData[giftId];
    if (!gift) return;
    
    let marketPrice = gift.price;
    
    // Ищем похожие ордера на бирже
    const similarOrders = exchangeOrders.filter(order => 
        order.gift_id === giftId && order.status === 'active'
    );
    
    if (similarOrders.length > 0) {
        // Берем среднюю цену
        const avgPrice = similarOrders.reduce((sum, order) => sum + order.price, 0) / similarOrders.length;
        marketPrice = Math.round(avgPrice);
    }
    
    // Обновляем UI
    const marketPriceEl = document.getElementById('market-price');
    if (marketPriceEl) marketPriceEl.textContent = marketPrice;
    
    // Устанавливаем подсказку в поле цены
    const priceInput = document.getElementById('order-price');
    if (priceInput && !priceInput.value) {
        priceInput.placeholder = `Рынок: ${marketPrice}`;
    }
}

// НАСТРОЙКА ОБРАБОТЧИКОВ ДЛЯ ФОРМЫ
function setupOrderFormListeners() {
    // Кнопки изменения количества
    const decreaseBtn = document.getElementById('decrease-qty');
    const increaseBtn = document.getElementById('increase-qty');
    const quantityInput = document.getElementById('order-quantity');
    
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            if (quantityInput) {
                let value = parseInt(quantityInput.value) || 1;
                if (value > 1) {
                    quantityInput.value = value - 1;
                    calculateOrderTotal();
                }
            }
        });
    }
    
    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            if (quantityInput) {
                let value = parseInt(quantityInput.value) || 1;
                const max = parseInt(quantityInput.max) || 100;
                if (value < max) {
                    quantityInput.value = value + 1;
                    calculateOrderTotal();
                }
            }
        });
    }
    
    // Изменение количества вручную
    if (quantityInput) {
        quantityInput.addEventListener('input', calculateOrderTotal);
        quantityInput.addEventListener('change', function() {
            let value = parseInt(this.value) || 1;
            const max = parseInt(this.max) || 100;
            const min = parseInt(this.min) || 1;
            
            if (value < min) this.value = min;
            if (value > max) this.value = max;
            
            calculateOrderTotal();
        });
    }
    
    // Изменение цены
    const priceInput = document.getElementById('order-price');
    if (priceInput) {
        priceInput.addEventListener('input', calculateOrderTotal);
        priceInput.addEventListener('change', function() {
            let value = parseInt(this.value) || 0;
            const min = parseInt(document.getElementById('min-price').textContent) || 1;
            const max = parseInt(document.getElementById('max-price').textContent) || 100000;
            
            if (value < min) this.value = min;
            if (value > max) this.value = max;
            
            calculateOrderTotal();
        });
    }
    
    // Кнопки отмены
    const cancelBtn = document.getElementById('cancel-order');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('create-order-modal').style.display = 'none';
        });
    }
    
    // Кнопка отправки
    const submitBtn = document.getElementById('submit-order');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitOrder);
    }
}

// РАСЧЕТ ОБЩЕЙ СУММЫ
function calculateOrderTotal() {
    const price = parseInt(document.getElementById('order-price').value) || 0;
    const quantity = parseInt(document.getElementById('order-quantity').value) || 1;
    const type = document.querySelector('.order-type-btn.active')?.dataset.type || 'sell';
    
    const total = price * quantity;
    const commission = type === 'sell' ? Math.ceil(total * 0.02) : 0;
    
    document.getElementById('order-total').textContent = `${total} 🎄`;
    document.getElementById('commission-amount').textContent = commission;
}

// ОТПРАВКА ОРДЕРА
async function submitOrder() {
    console.log('Отправка ордера...');
    
    // Получаем данные из формы
    const type = document.querySelector('.order-type-btn.active')?.dataset.type;
    const selectedGift = document.querySelector('.gift-selector-item.selected');
    
    if (!selectedGift) {
        showError('Выберите подарок');
        return;
    }
    
    const giftId = selectedGift.dataset.giftId;
    const gift = giftsData[giftId];
    if (!gift) {
        showError('Подарок не найден');
        return;
    }
    
    const price = parseInt(document.getElementById('order-price').value) || 0;
    const quantity = parseInt(document.getElementById('order-quantity').value) || 1;
    
    // Проверки
    if (price < 1 || price > 100000) {
        showError('Цена должна быть от 1 до 100000 очков');
        return;
    }
    
    if (quantity < 1 || quantity > 100) {
        showError('Количество должно быть от 1 до 100');
        return;
    }
    
    // Проверка для продажи
    if (type === 'sell') {
        const availableQty = parseInt(selectedGift.dataset.maxQty) || 0;
        
        if (quantity > availableQty) {
            showError(`У вас только ${availableQty} шт. этого подарка`);
            return;
        }
        
        if (!confirm(`Выставить ${quantity} шт. "${gift.name}" на продажу по ${price} очков за штуку?`)) {
            return;
        }
    }
    
    // Проверка для покупки
    if (type === 'buy') {
        const totalCost = price * quantity;
        if (userBalance < totalCost) {
            showError(`Недостаточно средств. Нужно: ${totalCost}, у вас: ${userBalance}`);
            return;
        }
        
        if (!confirm(`Создать ордер на покупку ${quantity} шт. "${gift.name}" по ${price} очков за штуку?`)) {
            return;
        }
        
        // Резервируем средства
        await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(-totalCost));
        userBalance -= totalCost;
        updateBalance();
    }
    
    try {
        // Создаем ордер
        const orderData = {
            user_id: userId,
            user_nickname: userNickname,
            gift_id: giftId,
            gift_name: gift.name,
            gift_icon: gift.icon,
            gift_rarity: gift.rarity,
            type: type,
            price: price,
            quantity: quantity,
            total: price * quantity,
            status: 'active',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
        };
        
        // Для продажи резервируем подарки
        if (type === 'sell') {
            orderData.reserved_items = await reserveItemsForSale(giftId, quantity);
        }
        
        // Сохраняем в базу данных
        const orderRef = database.ref('exchange_orders').push();
        await orderRef.set(orderData);
        
        showNotification(`Ордер успешно создан!`, 'success');
        
        // Закрываем модальное окно
        document.getElementById('create-order-modal').style.display = 'none';
        
        // Обновляем данные
        await loadUserData();
        
    } catch (error) {
        console.error('Ошибка создания ордера:', error);
        showError('Ошибка создания ордера');
        
        // Возвращаем средства при ошибке покупки
        if (type === 'buy') {
            await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(price * quantity));
            userBalance += price * quantity;
            updateBalance();
        }
    }
}

// РЕЗЕРВИРОВАНИЕ ПОДАРКОВ ДЛЯ ПРОДАЖИ
async function reserveItemsForSale(giftId, quantity) {
    const reserved = [];
    
    // Находим подарки в инвентаре
    const inventorySnapshot = await database.ref(`gift_inventory/${userId}`).once('value');
    if (!inventorySnapshot.exists()) {
        throw new Error('Инвентарь пуст');
    }
    
    const inventory = inventorySnapshot.val();
    let reservedCount = 0;
    
    for (const [key, item] of Object.entries(inventory)) {
        if (item.gift_id === giftId && !item.is_selling && reservedCount < quantity) {
            // Резервируем подарок
            await database.ref(`gift_inventory/${userId}/${key}/is_selling`).set(true);
            reserved.push(key);
            reservedCount++;
        }
    }
    
    if (reservedCount < quantity) {
        throw new Error(`Недостаточно подарков для резервирования (нужно: ${quantity}, найдено: ${reservedCount})`);
    }
    
    return reserved;
}

// ИСПОЛНЕНИЕ ОРДЕРА
async function executeOrder(orderId) {
    console.log('Исполнение ордера:', orderId);
    
    const order = exchangeOrders.find(o => o.id === orderId);
    if (!order) {
        showError('Ордер не найден');
        return;
    }
    
    // Нельзя исполнять свои ордера
    if (order.user_id === userId) {
        showError('Нельзя исполнять свои ордера');
        return;
    }
    
    // Проверка для покупки
    if (order.type === 'sell') {
        const totalCost = order.total;
        
        if (userBalance < totalCost) {
            showError(`Недостаточно средств. Нужно: ${totalCost}, у вас: ${userBalance}`);
            return;
        }
        
        if (!confirm(`Купить ${order.quantity} шт. "${order.gift_name}" за ${order.total} очков?`)) {
            return;
        }
    }
    
    // Проверка для продажи
    if (order.type === 'buy') {
        // Проверяем, есть ли у нас нужные подарки
        const availableGifts = userInventory.filter(item => 
            item.gift_id === order.gift_id && !item.is_selling
        );
        
        if (availableGifts.length < order.quantity) {
            showError(`У вас недостаточно подарков для продажи (нужно: ${order.quantity}, есть: ${availableGifts.length})`);
            return;
        }
        
        if (!confirm(`Продать ${order.quantity} шт. "${order.gift_name}" за ${order.total} очков?`)) {
            return;
        }
    }
    
    try {
        // Показываем окно подтверждения
        showTradeConfirmation(order);
        
    } catch (error) {
        console.error('Ошибка исполнения ордера:', error);
        showError('Ошибка при исполнении ордера');
    }
}

// ПОКАЗ ОКНА ПОДТВЕРЖДЕНИЯ СДЕЛКИ
function showTradeConfirmation(order) {
    const modal = document.getElementById('trade-modal');
    if (!modal) return;
    
    const gift = giftsData[order.gift_id];
    
    // Заполняем данные
    document.getElementById('trade-title').textContent = order.type === 'sell' ? 'Покупка подарка' : 'Продажа подарка';
    document.getElementById('trade-type').textContent = order.type === 'sell' ? 'Покупка' : 'Продажа';
    document.getElementById('trade-type').className = `trade-type ${order.type}`;
    document.getElementById('trade-gift-name').textContent = order.gift_name;
    document.getElementById('trade-partner').innerHTML = `Контрагент: <span>${order.user_nickname}</span>`;
    document.getElementById('trade-price').textContent = `${order.price} 🎄`;
    document.getElementById('trade-quantity').textContent = `${order.quantity} шт.`;
    document.getElementById('trade-total').textContent = `${order.total} 🎄`;
    
    const commission = Math.ceil(order.total * 0.02);
    const receiveAmount = order.total - commission;
    
    document.getElementById('trade-commission').textContent = `${commission} 🎄`;
    document.getElementById('trade-receive').textContent = `${receiveAmount} 🎄`;
    
    const confirmMessage = document.getElementById('trade-confirm-message');
    if (order.type === 'sell') {
        confirmMessage.innerHTML = `<p>Вы покупаете подарок у <strong>${order.user_nickname}</strong>. После подтверждения подарок будет добавлен в ваш инвентарь.</p>`;
    } else {
        confirmMessage.innerHTML = `<p>Вы продаете подарок пользователю <strong>${order.user_nickname}</strong>. После подтверждения очки будут зачислены на ваш баланс.</p>`;
    }
    
    // Настройка обработчиков
    const confirmBtn = document.getElementById('confirm-trade');
    const cancelBtn = document.getElementById('cancel-trade');
    
    confirmBtn.onclick = async () => {
        try {
            await processTrade(order);
            modal.style.display = 'none';
        } catch (error) {
            console.error('Ошибка сделки:', error);
        }
    };
    
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// ОБРАБОТКА СДЕЛКИ
async function processTrade(order) {
    console.log('Обработка сделки:', order.id);
    
    const gift = giftsData[order.gift_id];
    const commission = Math.ceil(order.total * 0.02);
    const receiveAmount = order.total - commission;
    
    try {
        // Обновляем статус ордера
        await database.ref(`exchange_orders/${order.id}/status`).set('completed');
        await database.ref(`exchange_orders/${order.id}/completed_at`).set(new Date().toISOString());
        await database.ref(`exchange_orders/${order.id}/completed_by`).set(userId);
        
        // Логируем сделку
        await database.ref('trade_history').push().set({
            order_id: order.id,
            buyer_id: order.type === 'sell' ? userId : order.user_id,
            seller_id: order.type === 'sell' ? order.user_id : userId,
            gift_id: order.gift_id,
            gift_name: order.gift_name,
            price: order.price,
            quantity: order.quantity,
            total: order.total,
            commission: commission,
            completed_at: new Date().toISOString()
        });
        
        // Обработка для покупки (покупатель получает подарок)
        if (order.type === 'sell') {
            // Покупатель получает подарок
            const giftData = {
                gift_id: order.gift_id,
                purchased_at: new Date().toISOString(),
                purchase_price: order.price,
                purchased_from: order.user_id,
                is_selling: false
            };
            
            const giftKey = `${order.gift_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await database.ref(`gift_inventory/${userId}/${giftKey}`).set(giftData);
            
            // Продавец получает деньги (минус комиссия)
            await database.ref(`holiday_points/${order.user_id}/total_points`).set(
                firebase.database.ServerValue.increment(receiveAmount)
            );
            
            // Покупатель платит
            await database.ref(`holiday_points/${userId}/total_points`).set(
                firebase.database.ServerValue.increment(-order.total)
            );
            
            // Увеличиваем счетчик владельцев для золотых подарков
            if (gift.rarity === 'golden') {
                await database.ref(`shop_gifts/${order.gift_id}/current_owners`).set(
                    firebase.database.ServerValue.increment(1)
                );
            }
            
            // Освобождаем зарезервированные подарки
            if (order.reserved_items) {
                for (const itemKey of order.reserved_items) {
                    await database.ref(`gift_inventory/${order.user_id}/${itemKey}`).remove();
                }
            }
            
            userBalance -= order.total;
            
        } else { // Обработка для продажи (покупатель ищет подарок)
            // Продавец получает деньги (минус комиссия)
            await database.ref(`holiday_points/${userId}/total_points`).set(
                firebase.database.ServerValue.increment(receiveAmount)
            );
            
            // Покупатель получает подарок
            const giftData = {
                gift_id: order.gift_id,
                purchased_at: new Date().toISOString(),
                purchase_price: order.price,
                purchased_from: userId,
                is_selling: false
            };
            
            const giftKey = `${order.gift_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await database.ref(`gift_inventory/${order.user_id}/${giftKey}`).set(giftData);
            
            // Резервируем подарки продавца
            const reservedItems = await reserveItemsForSale(order.gift_id, order.quantity);
            
            // Удаляем зарезервированные подарки
            for (const itemKey of reservedItems) {
                await database.ref(`gift_inventory/${userId}/${itemKey}`).remove();
            }
            
            userBalance += receiveAmount;
            
            // Увеличиваем счетчик владельцев для золотых подарков
            if (gift.rarity === 'golden') {
                await database.ref(`shop_gifts/${order.gift_id}/current_owners`).set(
                    firebase.database.ServerValue.increment(1)
                );
            }
        }
        
        updateBalance();
        showNotification('Сделка успешно завершена!', 'success');
        
        // Обновляем данные
        await loadUserData();
        await loadExchangeOrders();
        
    } catch (error) {
        console.error('Ошибка обработки сделки:', error);
        showError('Ошибка при обработке сделки');
        throw error;
    }
}

// ФУНКЦИЯ ДЛЯ ОТОБРАЖЕНИЯ МОИХ ОРДЕРОВ
async function loadMyOrders() {
    try {
        console.log('Загрузка моих ордеров...');
        
        const snapshot = await database.ref('exchange_orders').orderByChild('user_id').equalTo(userId).once('value');
        const myOrders = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data })) : [];
        
        const activeOrders = myOrders.filter(order => order.status === 'active');
        const completedOrders = myOrders.filter(order => order.status === 'completed');
        const cancelledOrders = myOrders.filter(order => order.status === 'cancelled');
        
        displayOrdersInTab('my-active-orders', activeOrders);
        displayOrdersInTab('my-completed-orders', completedOrders);
        displayOrdersInTab('my-cancelled-orders', cancelledOrders);
        
    } catch (error) {
        console.error('Ошибка загрузки моих ордеров:', error);
    }
}

// ОТОБРАЖЕНИЕ ОРДЕРОВ ВО ВКЛАДКЕ
function displayOrdersInTab(containerId, orders) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (orders.length === 0) {
        const tabName = containerId.replace('my-', '').replace('-orders', '');
        const messages = {
            'active': 'Нет активных ордеров',
            'completed': 'Нет исполненных ордеров',
            'cancelled': 'Нет отмененных ордеров'
        };
        
        container.innerHTML = `
            <div class="empty-orders">
                <div class="empty-icon">📝</div>
                <h3>${messages[tabName] || 'Нет данных'}</h3>
                <p>${tabName === 'active' ? 'Создайте свой первый ордер на бирже!' : 'Здесь будут отображаться ваши сделки'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => createMyOrderItem(order)).join('');
}

// СОЗДАНИЕ ЭЛЕМЕНТА МОЕГО ОРДЕРА
function createMyOrderItem(order) {
    const gift = giftsData[order.gift_id];
    const createdDate = new Date(order.created_at).toLocaleDateString('ru-RU');
    const expiresDate = order.expires_at ? new Date(order.expires_at).toLocaleDateString('ru-RU') : '';
    const statusClass = `status-${order.status}`;
    
    return `
        <div class="my-order-item" data-order-id="${order.id}">
            <div class="my-order-header">
                <div class="my-order-gift">
                    <span class="my-order-gift-icon">${order.gift_icon || gift?.icon || '🎁'}</span>
                    <div class="my-order-gift-info">
                        <h4>${order.gift_name || gift?.name || 'Подарок'}</h4>
                        <p>${order.type === 'sell' ? 'Продажа' : 'Покупка'} • Создан: ${createdDate}</p>
                    </div>
                </div>
                <div class="order-status ${statusClass}">
                    ${order.status === 'active' ? 'Активен' : 
                      order.status === 'completed' ? 'Исполнен' : 'Отменен'}
                </div>
            </div>
            
            <div class="my-order-details">
                <div class="my-order-detail">
                    <div class="detail-label">Цена</div>
                    <div class="detail-value">${order.price} 🎄</div>
                </div>
                <div class="my-order-detail">
                    <div class="detail-label">Количество</div>
                    <div class="detail-value">${order.quantity} шт.</div>
                </div>
                <div class="my-order-detail">
                    <div class="detail-label">Сумма</div>
                    <div class="detail-value">${order.total} 🎄</div>
                </div>
                ${order.expires_at ? `
                <div class="my-order-detail">
                    <div class="detail-label">Истекает</div>
                    <div class="detail-value">${expiresDate}</div>
                </div>` : ''}
            </div>
            
            ${order.status === 'active' ? `
            <div class="my-order-actions">
                <button class="cancel-order-btn" onclick="cancelOrder('${order.id}')">❌ Отменить</button>
                <button class="view-order-btn" onclick="viewOrderDetails('${order.id}')">👁️ Подробнее</button>
            </div>` : ''}
        </div>
    `;
}

// ОТМЕНА ОРДЕРА
async function cancelOrder(orderId) {
    if (!confirm('Вы уверены, что хотите отменить этот ордер?')) {
        return;
    }
    
    try {
        const order = exchangeOrders.find(o => o.id === orderId);
        if (!order || order.user_id !== userId) {
            showError('Ордер не найден или у вас нет прав');
            return;
        }
        
        // Обновляем статус ордера
        await database.ref(`exchange_orders/${orderId}/status`).set('cancelled');
        await database.ref(`exchange_orders/${orderId}/cancelled_at`).set(new Date().toISOString());
        
        // Возвращаем зарезервированные подарки (для продажи)
        if (order.type === 'sell' && order.reserved_items) {
            for (const itemKey of order.reserved_items) {
                await database.ref(`gift_inventory/${userId}/${itemKey}/is_selling`).set(false);
            }
        }
        
        // Возвращаем средства (для покупки)
        if (order.type === 'buy') {
            await database.ref(`holiday_points/${userId}/total_points`).set(
                firebase.database.ServerValue.increment(order.total)
            );
            userBalance += order.total;
            updateBalance();
        }
        
        showNotification('Ордер успешно отменен', 'success');
        
        // Обновляем данные
        await loadUserData();
        await loadMyOrders();
        
    } catch (error) {
        console.error('Ошибка отмены ордера:', error);
        showError('Ошибка при отмене ордера');
    }
}

// ПРОСМОТР ДЕТАЛЕЙ ОРДЕРА
function viewOrderDetails(orderId) {
    const order = exchangeOrders.find(o => o.id === orderId) ||
                 [...document.querySelectorAll('.my-order-item')].map(item => ({
                     id: item.dataset.orderId,
                     // Добавьте здесь данные ордера из атрибутов
                 })).find(o => o.id === orderId);
    
    if (!order) {
        showError('Ордер не найден');
        return;
    }
    
    showNotification(`Детали ордера #${orderId.substr(0, 8)}`, 'info');
    // Здесь можно добавить модальное окно с детальной информацией
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ НАСТРОЙКИ ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
            
            // При переключении на "Мои заказы" загружаем данные
            if (tabName === 'my-orders') {
                loadMyOrders();
            }
        });
    });
    
    // Переключение вкладок "Мои заказы"
    document.querySelectorAll('.my-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Скрываем все вкладки
            document.querySelectorAll('.my-orders-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Убираем активный класс со всех кнопок
            document.querySelectorAll('.my-tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Показываем выбранную вкладку
            const tabElement = document.getElementById(`${tabName}-content`);
            if (tabElement) {
                tabElement.classList.add('active');
                this.classList.add('active');
            }
        });
    });
    
    // Закрытие модальных окон
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || 
            e.target.classList.contains('modal-overlay')) {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
    
    // Кнопка обновления биржи
    const refreshBtn = document.getElementById('refresh-exchange');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '⏳ Загрузка...';
            
            await loadExchangeOrders();
            showNotification('Биржа обновлена', 'success');
            
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '🔄 Обновить';
        });
    }
    
    // Создание ордера - ОБНОВЛЕННЫЙ КОД
    const createOrderBtn = document.getElementById('create-order-btn');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', () => {
            showCreateOrderModal('sell');
        });
    }
    
    // Кнопки типа ордера в модальном окне
    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            showCreateOrderModal(type);
        });
    });
    
    // Фильтры биржи
    const filters = ['search-gift', 'rarity-filter', 'order-type-filter', 'sort-filter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => {
                applyExchangeFilters();
            });
            if (filterId === 'search-gift') {
                element.addEventListener('input', () => {
                    applyExchangeFilters();
                });
            }
        }
    });
    
    // Нажатие Escape для закрытия модальных окон
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
    
    console.log('Обработчики событий настроены');
}

// ФУНКЦИЯ ПРИМЕНЕНИЯ ФИЛЬТРОВ
function applyExchangeFilters() {
    const searchTerm = document.getElementById('search-gift').value.toLowerCase();
    const rarityFilter = document.getElementById('rarity-filter').value;
    const orderTypeFilter = document.getElementById('order-type-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    const filteredOrders = exchangeOrders.filter(order => {
        const gift = giftsData[order.gift_id];
        if (!gift) return false;
        
        // Поиск
        if (searchTerm && !order.gift_name.toLowerCase().includes(searchTerm) && 
            !gift.description.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // Фильтр редкости
        if (rarityFilter !== 'all' && gift.rarity !== rarityFilter) {
            return false;
        }
        
        // Фильтр типа ордера
        if (orderTypeFilter !== 'all' && order.type !== orderTypeFilter) {
            return false;
        }
        
        return true;
    });
    
    // Сортировка
    filteredOrders.sort((a, b) => {
        switch (sortFilter) {
            case 'price_asc':
                return a.price - b.price;
            case 'price_desc':
                return b.price - a.price;
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'popular':
                // Здесь можно добавить логику популярности
                return b.quantity - a.quantity;
            default:
                return 0;
        }
    });
    
    // Отображаем отфильтрованные ордера
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-orders">
                <div class="empty-icon">🔍</div>
                <h3>Ордеры не найдены</h3>
                <p>Попробуйте изменить параметры поиска</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredOrders.map(order => createOrderRow(order)).join('');
}

// ПОКАЗАТЬ ИНВЕНТАРЬ
function displayInventory() {
    const container = document.getElementById('inventory-grid');
    if (!container) return;
    
    if (userInventory.length === 0) {
        container.innerHTML = `
            <div class="empty-inventory" style="grid-column: 1 / -1;">
                <div class="empty-icon">📭</div>
                <h3>Инвентарь пуст</h3>
                <p>Купите свой первый подарок в магазине!</p>
                <button class="action-btn" onclick="switchTab('shop')">🛒 В магазин</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userInventory.map((item, index) => {
        const gift = giftsData[item.gift_id];
        if (!gift) return '';
        
        return `
            <div class="inventory-item ${gift.rarity}" data-item-id="${index}">
                <div class="rarity-badge ${gift.rarity}">${getRarityName(gift.rarity)}</div>
                
                ${item.is_selling ? '<div class="sell-indicator">💰</div>' : ''}
                
                <div class="gift-image">
                    ${gift.icon}
                </div>
                
                <h4>${gift.name}</h4>
                <div class="inventory-date">
                    Куплено: ${new Date(item.purchased_at || Date.now()).toLocaleDateString('ru-RU')}
                </div>
                
                <div class="inventory-actions">
                    <button class="small-btn" onclick="showNotification('Функция продажи в разработке', 'info')">
                        ℹ️ Подробнее
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ОБНОВЛЕННАЯ ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
async function initializeShop() {
    console.log('=== ИНИЦИАЛИЗАЦИЯ МАГАЗИНА ===');
    
    try {
        // Проверяем авторизацию
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            setTimeout(() => {
                const loader = document.getElementById('loader');
                const content = document.getElementById('content');
                if (loader) loader.style.display = 'none';
                if (content) content.style.display = 'block';
            }, 2000);
            return;
        }
        
        // Скрываем лоадер и показываем контент
        setTimeout(() => {
            const loader = document.getElementById('loader');
            const content = document.getElementById('content');
            if (loader) loader.style.display = 'none';
            if (content) content.style.display = 'block';
            console.log('Интерфейс показан');
        }, 1000);
        
        // Создаем частицы
        createParticles();
        
        // Загружаем данные пользователя
        await loadUserData();
        
        // Инициализируем подарки
        await initializeGifts();
        
        // Загружаем ордера биржи
        await loadExchangeOrders();
        
        // Инициализируем график цен
        initializePriceChart();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Отображаем инвентарь
        displayInventory();
        
        // Загружаем мои ордера
        loadMyOrders();
        
        // Настраиваем обновления в реальном времени
        setupRealtimeUpdates();
        
        // Инициализируем 3D сцены
        setTimeout(initialize3DScenes, 2000);
        
        console.log('✅ Магазин успешно инициализирован!');
        
        // Отладочные функции
        window.shopDebug = {
            state: () => {
                console.log('=== СОСТОЯНИЕ МАГАЗИНА ===');
                console.log('Пользователь:', { userId, userNickname });
                console.log('Баланс:', userBalance);
                console.log('Инвентарь:', userInventory.length, 'предметов');
                console.log('Подарки:', Object.keys(giftsData).length);
                console.log('Ордеров:', exchangeOrders.length);
                console.log('==========================');
            },
            reload: () => location.reload(),
            switchTab: (tab) => switchTab(tab),
            buyGift: (id) => buyGift(id),
            createOrder: (type) => showCreateOrderModal(type),
            cancelOrder: (id) => cancelOrder(id)
        };
        
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        showError('Ошибка загрузки магазина: ' + error.message);
        
        setTimeout(() => {
            const loader = document.getElementById('loader');
            const content = document.getElementById('content');
            if (loader) loader.style.display = 'none';
            if (content) content.style.display = 'block';
        }, 1000);
    }
}

// ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ЗАВИСАНИЯ
function checkForHang() {
    // Если через 10 секунд лоадер все еще виден, скрываем его принудительно
    setTimeout(() => {
        const loader = document.getElementById('loader');
        const content = document.getElementById('content');
        if (loader && loader.style.display !== 'none') {
            console.warn('Принудительное скрытие лоадера (таймаут)');
            if (loader) loader.style.display = 'none';
            if (content) content.style.display = 'block';
            showError('Магазин загрузился с ограничениями. Проверьте консоль.');
        }
    }, 10000);
}

// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, запуск инициализации магазина...');
    
    // Начинаем инициализацию
    setTimeout(() => {
        initializeShop();
    }, 500);
    
    // Проверяем зависание
    checkForHang();
});

// ДОБАВЛЕНИЕ АНИМАЦИЙ CSS (упрощенная версия)
function addCSSAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        /* Простые анимации для подарков */
        .gift-image {
            font-size: 48px;
            animation: gentleFloat 3s ease-in-out infinite;
        }
        
        @keyframes gentleFloat {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(2deg); }
        }
        
        /* Анимация для золотых подарков */
        .gift-card.golden .gift-image {
            animation: goldenGlow 2s infinite alternate;
        }
        
        @keyframes goldenGlow {
            from { filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.5)); }
            to { filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8)); }
        }
        
        /* Спиннер для загрузки */
        .loading-spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 3px solid #fff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Добавляем CSS анимации сразу
addCSSAnimations();

// Глобальные функции для отладки
window.showShopState = function() {
    console.log('=== СОСТОЯНИЕ МАГАЗИНА ===');
    console.log('Пользователь:', { userId, userNickname });
    console.log('Баланс:', userBalance);
    console.log('Инвентарь:', userInventory);
    console.log('Подарки:', giftsData);
    console.log('Ордеры:', exchangeOrders);
    console.log('==========================');
};

// Делаем функции доступными глобально
window.switchTab = switchTab;
window.buyGift = buyGift;
window.showCreateOrderModal = showCreateOrderModal;
window.executeOrder = executeOrder;
window.cancelOrder = cancelOrder;
window.viewOrderDetails = viewOrderDetails;
