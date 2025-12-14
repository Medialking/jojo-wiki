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

// ДОБАВЬТЕ ЭТИ СТИЛИ ДЛЯ АНИМАЦИЙ УВЕДОМЛЕНИЙ
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(notificationStyles);

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

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

// СОЗДАНИЕ СТРОКИ ОРДЕРА (упрощенная)
function createOrderRow(order) {
    const gift = giftsData[order.gift_id];
    if (!gift) return '';
    
    return `
        <div class="order-row ${order.type}-order" data-order-id="${order.id}">
            <div class="table-col" style="width: 150px;">
                <div class="order-type ${order.type}-badge">
                    ${order.type === 'sell' ? '💰 Продажа' : '🛒 Покупка'}
                </div>
            </div>
            
            <div class="table-col" style="width: 200px;">
                <div class="order-gift">
                    <span class="order-gift-icon">${gift.icon}</span>
                    <span>${gift.name}</span>
                </div>
            </div>
            
            <div class="table-col" style="width: 120px;">
                <div class="rarity-badge ${gift.rarity}">${getRarityName(gift.rarity)}</div>
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
                <button class="execute-btn" onclick="showNotification('Функция в разработке', 'info')">
                    🔒 В разработке
                </button>
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
            <button class="action-btn" onclick="showNotification('Функция в разработке', 'info')">📤 Создать ордер</button>
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
    
    // Показать выбранную вкладку
    const tabElement = document.getElementById(`${tabName}-tab`);
    const btnElement = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    if (btnElement) {
        btnElement.classList.add('active');
    }
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
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
            await loadExchangeOrders();
            showNotification('Биржа обновлена', 'success');
        });
    }
    
    // Создание ордера
    const createOrderBtn = document.getElementById('create-order-btn');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', () => {
            showNotification('Функция создания ордера в разработке', 'info');
        });
    }
    
    console.log('Обработчики событий настроены');
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

// ОТОБРАЖЕНИЕ МОИХ ОРДЕРОВ
function displayMyOrders() {
    // Показываем заглушки для вкладок "Мои заказы"
    const tabs = ['active-orders', 'completed-orders', 'cancelled-orders'];
    
    tabs.forEach(tab => {
        const container = document.getElementById(`my-${tab}`);
        if (container) {
            container.innerHTML = `
                <div class="empty-orders">
                    <div class="empty-icon">📝</div>
                    <h3>${tab === 'active-orders' ? 'Нет активных ордеров' : 
                         tab === 'completed-orders' ? 'Нет исполненных ордеров' : 'Нет отмененных ордеров'}</h3>
                    <p>${tab === 'active-orders' ? 'Создайте свой первый ордер на бирже!' : 
                         'Здесь будут отображаться ваши сделки'}</p>
                </div>
            `;
        }
    });
}

// ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
async function initializeShop() {
    console.log('=== ИНИЦИАЛИЗАЦИЯ МАГАЗИНА ===');
    
    try {
        // Проверяем авторизацию
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            // Если не авторизован, все равно скрываем лоадер
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
        
        // Отображаем мои ордера
        displayMyOrders();
        
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
            buyGift: (id) => buyGift(id)
        };
        
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        showError('Ошибка загрузки магазина: ' + error.message);
        
        // Все равно показываем контент при ошибке
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
