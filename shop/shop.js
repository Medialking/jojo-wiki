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

firebase.initializeApp(firebaseConfig);
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

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await loadUserData();
            await initializeGifts();
            await loadExchangeOrders();
            setupEventListeners();
            setupRealtimeUpdates();
            initializePriceChart();
        }
    }, 400);
};

// ПРОВЕРКА АВТОРИЗАЦИИ
async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!userId || !userNickname) {
        showError('Для доступа к магазину необходимо войти в аккаунт');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return false;
    }
    
    return true;
}

// ИНИЦИАЛИЗАЦИЯ ПОДАРКОВ С 3D И АНИМАЦИЯМИ
async function initializeGifts() {
    try {
        const snapshot = await database.ref('shop_gifts').once('value');
        
        if (snapshot.exists()) {
            giftsData = snapshot.val();
        } else {
            await createInitialGifts();
        }
        
        displayAllGifts();
        
    } catch (error) {
        console.error('Ошибка инициализации подарков:', error);
        showError('Ошибка загрузки подарков');
    }
}

// СОЗДАНИЕ НАЧАЛЬНЫХ ПОДАРКОВ С 3D И АНИМАЦИЯМИ
async function createInitialGifts() {
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
        
        // Анимированные мифические подарки (5 штук)
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
            animation_type: 'css',
            animation: 'float',
            created_at: new Date().toISOString(),
            effects: ['float', 'glow']
        },
        mythical_3: {
            id: 'mythical_3',
            name: 'Лунный Камень',
            description: 'Камень с фазой луны, меняющейся со временем',
            price: 1500,
            rarity: 'mythical',
            icon: '🌙',
            animation_type: 'css',
            animation: 'phase-change',
            created_at: new Date().toISOString(),
            effects: ['phase-change', 'glow']
        },
        mythical_4: {
            id: 'mythical_4',
            name: 'Океанская Жемчужина',
            description: 'Жемчужина с волновой анимацией',
            price: 2000,
            rarity: 'mythical',
            icon: '🐚',
            animation_type: 'css',
            animation: 'wave',
            created_at: new Date().toISOString(),
            effects: ['wave', 'shine']
        },
        mythical_5: {
            id: 'mythical_5',
            name: 'Волшебный Свиток',
            description: 'Разворачивающийся свиток с мерцающим текстом',
            price: 2500,
            rarity: 'mythical',
            icon: '📜',
            animation_type: 'css',
            animation: 'unroll',
            created_at: new Date().toISOString(),
            effects: ['unroll', 'text-glow']
        },
        
        // Редкие подарки (10 штук)
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
        // ... (остальные редкие подарки)
        
        // Обычные подарки (15 штук)
        common_1: {
            id: 'common_1',
            name: 'Красная Коробка',
            description: 'Простая красная коробка с лентой',
            price: 10,
            rarity: 'common',
            icon: '🎁',
            created_at: new Date().toISOString()
        },
        // ... (остальные обычные подарки)
    };
    
    await database.ref('shop_gifts').set(gifts);
    giftsData = gifts;
    
    console.log('✅ Начальные подарки созданы');
}

// ОТОБРАЖЕНИЕ ВСЕХ ПОДАРКОВ
function displayAllGifts() {
    const categories = {
        'golden': 'golden-gifts-grid',
        'mythical': 'mythical-gifts-grid',
        'rare': 'rare-gifts-grid',
        'common': 'common-gifts-grid'
    };
    
    for (const [rarity, containerId] of Object.entries(categories)) {
        const container = document.getElementById(containerId);
        const gifts = Object.values(giftsData).filter(gift => gift.rarity === rarity);
        
        if (gifts.length === 0) {
            container.innerHTML = '<div class="empty-gifts">Подарки загружаются...</div>';
            continue;
        }
        
        container.innerHTML = gifts.map(gift => createGiftCard(gift)).join('');
        
        gifts.forEach(gift => {
            const card = document.querySelector(`[data-gift-id="${gift.id}"]`);
            if (card) {
                card.addEventListener('click', () => openGiftModal(gift));
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

// ИНИЦИАЛИЗАЦИЯ 3D СЦЕН
function initialize3DScenes() {
    Object.values(giftsData).forEach(gift => {
        if (gift.animation_type === '3d') {
            const container = document.querySelector(`[data-gift-id="${gift.id}"] .gift-3d-container`);
            if (container) {
                create3DScene(container, gift);
            }
        }
    });
}

// СОЗДАНИЕ 3D СЦЕНЫ
function create3DScene(container, gift) {
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
    
    // Создаем 3D объект в зависимости от типа
    let object;
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    
    switch(gift.model_type) {
        case 'crown':
            // Корона
            const crownGroup = new THREE.Group();
            
            // Основа короны
            const crownBase = new THREE.ConeGeometry(1.5, 0.5, 8);
            const crownMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffd700,
                shininess: 100,
                emissive: 0x222200
            });
            const baseMesh = new THREE.Mesh(crownBase, crownMaterial);
            crownGroup.add(baseMesh);
            
            // Драгоценные камни
            const gemGeometry = new THREE.OctahedronGeometry(0.3);
            const gemMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff0000,
                shininess: 300,
                emissive: 0x220000
            });
            
            for (let i = 0; i < 8; i++) {
                const gem = new THREE.Mesh(gemGeometry, gemMaterial);
                const angle = (i / 8) * Math.PI * 2;
                gem.position.set(
                    Math.cos(angle) * 1.2,
                    0.3,
                    Math.sin(angle) * 1.2
                );
                crownGroup.add(gem);
            }
            
            object = crownGroup;
            break;
            
        case 'treasure':
            // Сундук с сокровищами
            const chestGroup = new THREE.Group();
            
            // Основа сундука
            const chestGeometry = new THREE.BoxGeometry(2, 1.5, 1.5);
            const chestMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x8b4513,
                shininess: 30
            });
            const chest = new THREE.Mesh(chestGeometry, chestMaterial);
            chestGroup.add(chest);
            
            // Крышка сундука
            const lidGeometry = new THREE.BoxGeometry(2.1, 0.3, 1.6);
            const lid = new THREE.Mesh(lidGeometry, chestMaterial);
            lid.position.y = 0.9;
            lid.rotation.x = 0.3;
            chestGroup.add(lid);
            
            // Золотые монеты
            const coinGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8);
            const coinMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffd700,
                shininess: 100
            });
            
            for (let i = 0; i < 20; i++) {
                const coin = new THREE.Mesh(coinGeometry, coinMaterial);
                coin.position.set(
                    (Math.random() - 0.5) * 1.5,
                    -0.2,
                    (Math.random() - 0.5) * 1
                );
                coin.rotation.x = Math.random() * Math.PI;
                coin.rotation.z = Math.random() * Math.PI;
                chestGroup.add(coin);
            }
            
            object = chestGroup;
            break;
            
        case 'phoenix':
            // Феникс
            const phoenixGroup = new THREE.Group();
            
            // Тело
            const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 16);
            const bodyMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff4500,
                emissive: 0x442200,
                shininess: 100
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            phoenixGroup.add(body);
            
            // Крылья
            const wingGeometry = new THREE.PlaneGeometry(1.5, 0.8);
            const wingMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff8c00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(-1, 0, 0);
            leftWing.rotation.y = -0.5;
            phoenixGroup.add(leftWing);
            
            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
            rightWing.position.set(1, 0, 0);
            rightWing.rotation.y = 0.5;
            phoenixGroup.add(rightWing);
            
            // Хвост
            const tailGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
            const tailMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff0000,
                emissive: 0x220000
            });
            const tail = new THREE.Mesh(tailGeometry, tailMaterial);
            tail.position.z = -1;
            tail.rotation.x = Math.PI / 2;
            phoenixGroup.add(tail);
            
            object = phoenixGroup;
            break;
            
        default:
            // Стандартный куб
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xffd700,
                shininess: 100
            });
            object = new THREE.Mesh(geometry, material);
    }
    
    scene.add(object);
    camera.position.z = 5;
    
    // Анимация
    function animate() {
        requestAnimationFrame(animate);
        
        // Вращение объекта
        if (object) {
            object.rotation.x += 0.01;
            object.rotation.y += 0.01;
            
            // Специальные анимации
            if (gift.model_type === 'phoenix') {
                // Анимация крыльев для феникса
                const wings = object.children.filter(child => child.geometry.type === 'PlaneGeometry');
                wings.forEach((wing, index) => {
                    wing.rotation.z = Math.sin(Date.now() * 0.002 + index) * 0.3;
                });
            } else if (gift.model_type === 'treasure') {
                // Анимация открытия сундука
                const lid = object.children.find(child => child.position.y === 0.9);
                if (lid) {
                    lid.rotation.x = 0.3 + Math.sin(Date.now() * 0.001) * 0.1;
                }
            }
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Сохраняем сцену для повторного использования
    threeDScenes[gift.id] = { scene, camera, renderer, object };
    
    // Ресайз
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// ЗАГРУЗКА ОРДЕРОВ БИРЖИ
async function loadExchangeOrders() {
    try {
        const snapshot = await database.ref('exchange_orders').once('value');
        
        if (snapshot.exists()) {
            const orders = snapshot.val();
            exchangeOrders = Object.entries(orders)
                .map(([id, order]) => ({ id, ...order }))
                .filter(order => order.status === 'active');
            
            displayExchangeOrders();
            updateExchangeStats();
        } else {
            exchangeOrders = [];
            showNoOrdersMessage();
        }
    } catch (error) {
        console.error('Ошибка загрузки ордеров:', error);
        showError('Ошибка загрузки биржи');
    }
}

// ОТОБРАЖЕНИЕ ОРДЕРОВ БИРЖИ
function displayExchangeOrders() {
    const container = document.getElementById('orders-list');
    
    if (exchangeOrders.length === 0) {
        showNoOrdersMessage();
        return;
    }
    
    // Применяем фильтры
    let filteredOrders = [...exchangeOrders];
    
    const rarityFilter = document.getElementById('rarity-filter').value;
    if (rarityFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            const gift = giftsData[order.gift_id];
            return gift && gift.rarity === rarityFilter;
        });
    }
    
    const orderTypeFilter = document.getElementById('order-type-filter').value;
    if (orderTypeFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.type === orderTypeFilter);
    }
    
    // Применяем сортировку
    const sortFilter = document.getElementById('sort-filter').value;
    switch (sortFilter) {
        case 'price_asc':
            filteredOrders.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            filteredOrders.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
            filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'popular':
            filteredOrders.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
            break;
    }
    
    container.innerHTML = filteredOrders.map(order => createOrderRow(order)).join('');
    
    // Добавляем обработчики
    filteredOrders.forEach(order => {
        const executeBtn = document.querySelector(`[data-order-id="${order.id}"] .execute-btn`);
        if (executeBtn) {
            executeBtn.addEventListener('click', () => executeOrder(order));
        }
    });
}

// СОЗДАНИЕ СТРОКИ ОРДЕРА
function createOrderRow(order) {
    const gift = giftsData[order.gift_id];
    if (!gift) return '';
    
    const isMyOrder = order.user_id === userId;
    const canExecute = !isMyOrder && 
        ((order.type === 'sell' && userBalance >= order.price * order.quantity) ||
         (order.type === 'buy' && userInventory.some(item => item.gift_id === order.gift_id)));
    
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
                    ${order.user_nickname}
                    ${isMyOrder ? '<small style="color:#00ff00;"> (Вы)</small>' : ''}
                </div>
            </div>
            
            <div class="table-col" style="width: 150px;">
                <div class="order-price">${order.price} 🎄</div>
            </div>
            
            <div class="table-col" style="width: 120px;">
                <div class="order-quantity">${order.quantity} шт.</div>
            </div>
            
            <div class="table-col" style="width: 100px;">
                ${isMyOrder ? 
                    `<button class="execute-btn" onclick="cancelOrder('${order.id}')">❌ Отменить</button>` :
                    canExecute ? 
                        `<button class="execute-btn">✅ Исполнить</button>` :
                        `<button class="execute-btn" disabled>🔒 Недоступно</button>`
                }
            </div>
        </div>
    `;
}

// ИНИЦИАЛИЗАЦИЯ ГРАФИКА ЦЕН
function initializePriceChart() {
    const ctx = document.getElementById('price-chart').getContext('2d');
    
    priceChart = new Chart(ctx, {
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
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ БИРЖИ
function updateExchangeStats() {
    document.getElementById('active-orders').textContent = exchangeOrders.length;
    
    // Объем торгов
    const totalVolume = exchangeOrders.reduce((sum, order) => 
        sum + (order.price * order.quantity), 0);
    document.getElementById('trade-volume').textContent = totalVolume;
    
    // Сделки сегодня
    const today = new Date().toDateString();
    const todayTrades = exchangeOrders.filter(order => 
        new Date(order.created_at).toDateString() === today).length;
    document.getElementById('today-trades').textContent = todayTrades;
    
    // Изменение цены (примерное)
    const priceChange = '+5%';
    document.getElementById('price-change').textContent = priceChange;
}

// СОЗДАНИЕ ОРДЕРА НА БИРЖЕ
async function createExchangeOrder(orderData) {
    try {
        const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const order = {
            id: orderId,
            ...orderData,
            user_id: userId,
            user_nickname: userNickname,
            created_at: new Date().toISOString(),
            status: 'active',
            view_count: 0
        };
        
        // Если это ордер на продажу, проверяем наличие подарков
        if (order.type === 'sell') {
            const inventoryItem = userInventory.find(item => 
                item.gift_id === order.gift_id && !item.is_selling);
            
            if (!inventoryItem) {
                showError('У вас нет этого подарка или он уже выставлен на продажу');
                return;
            }
            
            // Помечаем подарок как продаваемый
            await database.ref(`gift_inventory/${userId}/${order.gift_id}/is_selling`).set(true);
            
            // Блокируем средства (комиссия 2%)
            const commission = Math.floor(order.price * order.quantity * 0.02);
            const totalCost = commission;
            
            if (userBalance < totalCost) {
                showError('Недостаточно средств для оплаты комиссии');
                return;
            }
            
            await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(-totalCost));
            await database.ref(`holiday_points/${userId}/available_points`).set(firebase.database.ServerValue.increment(-totalCost));
            userBalance -= totalCost;
            updateBalance();
        }
        
        // Если это ордер на покупку, блокируем средства
        if (order.type === 'buy') {
            const totalCost = order.price * order.quantity;
            
            if (userBalance < totalCost) {
                showError('Недостаточно средств для покупки');
                return;
            }
            
            await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(-totalCost));
            await database.ref(`holiday_points/${userId}/available_points`).set(firebase.database.ServerValue.increment(-totalCost));
            userBalance -= totalCost;
            updateBalance();
        }
        
        // Сохраняем ордер
        await database.ref(`exchange_orders/${orderId}`).set(order);
        
        showNotification(`✅ Ордер успешно создан!`, 'success');
        closeAllModals();
        
    } catch (error) {
        console.error('Ошибка создания ордера:', error);
        showError('Ошибка создания ордера');
    }
}

// ИСПОЛНЕНИЕ ОРДЕРА
async function executeOrder(order) {
    const gift = giftsData[order.gift_id];
    
    if (!gift) {
        showError('Подарок не найден');
        return;
    }
    
    if (order.user_id === userId) {
        showError('Нельзя исполнить свой собственный ордер');
        return;
    }
    
    try {
        if (order.type === 'sell') {
            // Покупаем у продавца
            const totalCost = order.price * order.quantity;
            
            if (userBalance < totalCost) {
                showError(`Недостаточно средств. Нужно: ${totalCost}, у вас: ${userBalance}`);
                return;
            }
            
            // Списание средств у покупателя
            await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(-totalCost));
            await database.ref(`holiday_points/${userId}/available_points`).set(firebase.database.ServerValue.increment(-totalCost));
            
            // Зачисление средств продавцу (минус комиссия 2%)
            const commission = Math.floor(totalCost * 0.02);
            const sellerReceives = totalCost - commission;
            
            await database.ref(`holiday_points/${order.user_id}/total_points`).set(firebase.database.ServerValue.increment(sellerReceives));
            await database.ref(`holiday_points/${order.user_id}/available_points`).set(firebase.database.ServerValue.increment(sellerReceives));
            
            // Передача подарка
            for (let i = 0; i < order.quantity; i++) {
                const giftData = {
                    gift_id: order.gift_id,
                    purchased_at: new Date().toISOString(),
                    purchase_price: order.price,
                    is_selling: false,
                    bought_from: order.user_id,
                    bought_from_name: order.user_nickname
                };
                
                const giftKey = `${order.gift_id}_${Date.now()}_${i}`;
                await database.ref(`gift_inventory/${userId}/${giftKey}`).set(giftData);
            }
            
            // Удаление подарка у продавца
            await database.ref(`gift_inventory/${order.user_id}/${order.gift_id}`).remove();
            
            // Обновление баланса
            userBalance -= totalCost;
            updateBalance();
            
        } else if (order.type === 'buy') {
            // Продаем покупателю
            const hasGift = userInventory.some(item => item.gift_id === order.gift_id && !item.is_selling);
            
            if (!hasGift) {
                showError('У вас нет этого подарка');
                return;
            }
            
            const totalEarn = order.price * order.quantity;
            const commission = Math.floor(totalEarn * 0.02);
            const sellerReceives = totalEarn - commission;
            
            // Зачисление средств продавцу
            await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(sellerReceives));
            await database.ref(`holiday_points/${userId}/available_points`).set(firebase.database.ServerValue.increment(sellerReceives));
            
            // Возврат средств покупателю (минус то, что уже заблокировано)
            const buyerReceives = totalEarn; // Полный возврат, т.к. он уже заплатил при создании ордера
            
            // Передача подарка покупателю
            for (let i = 0; i < order.quantity; i++) {
                const giftData = {
                    gift_id: order.gift_id,
                    purchased_at: new Date().toISOString(),
                    purchase_price: order.price,
                    is_selling: false,
                    bought_from: userId,
                    bought_from_name: userNickname
                };
                
                const giftKey = `${order.gift_id}_${Date.now()}_${i}`;
                await database.ref(`gift_inventory/${order.user_id}/${giftKey}`).set(giftData);
            }
            
            // Удаление подарка у продавца
            await database.ref(`gift_inventory/${userId}/${order.gift_id}`).remove();
            
            // Обновление баланса
            userBalance += sellerReceives;
            updateBalance();
        }
        
        // Обновление статуса ордера
        await database.ref(`exchange_orders/${order.id}/status`).set('completed');
        await database.ref(`exchange_orders/${order.id}/completed_at`).set(new Date().toISOString());
        await database.ref(`exchange_orders/${order.id}/executed_by`).set(userId);
        
        showNotification(`✅ Сделка успешно завершена!`, 'success');
        
        // Обновление данных
        await loadExchangeOrders();
        await loadUserData();
        
    } catch (error) {
        console.error('Ошибка исполнения ордера:', error);
        showError('Ошибка при исполнении ордера');
    }
}

// ОТМЕНА ОРДЕРА
async function cancelOrder(orderId) {
    const order = exchangeOrders.find(o => o.id === orderId);
    
    if (!order) {
        showError('Ордер не найден');
        return;
    }
    
    if (order.user_id !== userId) {
        showError('Вы можете отменять только свои ордера');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите отменить этот ордер?')) {
        return;
    }
    
    try {
        // Возврат средств/подарков в зависимости от типа ордера
        if (order.type === 'sell') {
            // Возврат комиссии (50%)
            const commission = Math.floor(order.price * order.quantity * 0.02);
            const refund = Math.floor(commission * 0.5);
            
            await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(refund));
            await database.ref(`holiday_points/${userId}/available_points`).set(firebase.database.ServerValue.increment(refund));
            
            userBalance += refund;
            updateBalance();
            
            // Снятие отметки о продаже
            await database.ref(`gift_inventory/${userId}/${order.gift_id}/is_selling`).set(false);
            
        } else if (order.type === 'buy') {
            // Возврат заблокированных средств
            const totalCost = order.price * order.quantity;
            
            await database.ref(`holiday_points/${userId}/total_points`).set(firebase.database.ServerValue.increment(totalCost));
            await database.ref(`holiday_points/${userId}/available_points`).set(firebase.database.ServerValue.increment(totalCost));
            
            userBalance += totalCost;
            updateBalance();
        }
        
        // Обновление статуса ордера
        await database.ref(`exchange_orders/${orderId}/status`).set('cancelled');
        await database.ref(`exchange_orders/${orderId}/cancelled_at`).set(new Date().toISOString());
        
        showNotification('✅ Ордер успешно отменен', 'success');
        
        // Обновление данных
        await loadExchangeOrders();
        
    } catch (error) {
        console.error('Ошибка отмены ордера:', error);
        showError('Ошибка при отмене ордера');
    }
}

// ОТКРЫТИЕ 3D МОДАЛЬНОГО ОКНА
function open3DModal(gift) {
    const modal = document.getElementById('3d-modal');
    
    document.getElementById('3d-gift-name').textContent = gift.name;
    document.getElementById('3d-gift-title').textContent = gift.name;
    document.getElementById('3d-gift-description').textContent = gift.description;
    document.getElementById('3d-gift-price').textContent = `${gift.price} 🎄`;
    document.getElementById('3d-stock').textContent = `${gift.max_owners - gift.current_owners} из ${gift.max_owners}`;
    
    // Загружаем 3D сцену
    const container = document.getElementById('3d-container');
    container.innerHTML = `
        <div class="loading-3d">
            <div class="loading-spinner"></div>
            <p>Загрузка 3D модели...</p>
        </div>
    `;
    
    setTimeout(() => {
        if (threeDScenes[gift.id]) {
            // Используем существующую сцену
            const { scene, camera, renderer } = threeDScenes[gift.id];
            container.innerHTML = '';
            container.appendChild(renderer.domElement);
            
            // Обновляем размер
            renderer.setSize(container.clientWidth, container.clientHeight);
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
        } else {
            // Создаем новую сцену
            create3DScene(container, gift);
        }
    }, 500);
    
    // Настройка кнопок действий
    const userOwns = userInventory.some(item => item.gift_id === gift.id);
    const canBuy = gift.current_owners < gift.max_owners && !userOwns;
    
    let actionsHtml = '';
    if (userOwns) {
        actionsHtml = `
            <button class="action-btn" onclick="openCreateOrderModal('${gift.id}', 'sell')">
                💰 Выставить на продажу
            </button>
        `;
    } else if (canBuy) {
        actionsHtml = `
            <button class="action-btn" onclick="buyGift('${gift.id}')">
                🛒 Купить за ${gift.price} очков
            </button>
            <button class="action-btn secondary" onclick="openCreateOrderModal('${gift.id}', 'buy')">
                📝 Ордер на покупку
            </button>
        `;
    } else {
        actionsHtml = '<button class="action-btn" disabled>🛑 Распродан</button>';
    }
    
    document.getElementById('3d-gift-actions').innerHTML = actionsHtml;
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА СОЗДАНИЯ ОРДЕРА
function openCreateOrderModal(giftId = null, orderType = 'sell') {
    const modal = document.getElementById('create-order-modal');
    const giftSelector = document.getElementById('order-gift-selector');
    
    // Заполняем список подарков
    const availableGifts = userInventory.filter(item => {
        if (orderType === 'sell') {
            return !item.is_selling;
        } else {
            return true; // Для покупки показываем все доступные
        }
    });
    
    giftSelector.innerHTML = availableGifts.map(item => {
        const gift = giftsData[item.gift_id];
        if (!gift) return '';
        
        return `
            <div class="gift-selector-item" data-gift-id="${gift.id}">
                <div class="gift-selector-icon">${gift.icon}</div>
                <div class="gift-selector-name">${gift.name}</div>
            </div>
        `;
    }).join('');
    
    // Выбираем конкретный подарок если указан
    if (giftId) {
        const item = giftSelector.querySelector(`[data-gift-id="${giftId}"]`);
        if (item) {
            item.classList.add('selected');
            
            // Заполняем информацию о подарке
            const gift = giftsData[giftId];
            const marketPrice = gift.price;
            document.getElementById('market-price').textContent = marketPrice;
            document.getElementById('order-price').value = marketPrice;
            
            // Обновляем доступное количество
            const inventoryCount = userInventory.filter(item => item.gift_id === giftId).length;
            document.getElementById('available-qty').textContent = inventoryCount;
            document.getElementById('order-quantity').max = inventoryCount;
        }
    }
    
    // Настройка типа ордера
    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === orderType) {
            btn.classList.add('active');
        }
    });
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// ПОДТВЕРЖДЕНИЕ СОЗДАНИЯ ОРДЕРА
async function submitOrder() {
    const orderType = document.querySelector('.order-type-btn.active').dataset.type;
    const selectedGift = document.querySelector('.gift-selector-item.selected');
    
    if (!selectedGift) {
        showError('Выберите подарок');
        return;
    }
    
    const giftId = selectedGift.dataset.giftId;
    const price = parseInt(document.getElementById('order-price').value);
    const quantity = parseInt(document.getElementById('order-quantity').value);
    
    if (!price || price < 1 || price > 100000) {
        showError('Некорректная цена');
        return;
    }
    
    if (!quantity || quantity < 1) {
        showError('Некорректное количество');
        return;
    }
    
    const orderData = {
        gift_id: giftId,
        type: orderType,
        price: price,
        quantity: quantity
    };
    
    await createExchangeOrder(orderData);
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Кнопка создания ордера
    document.getElementById('create-order-btn').addEventListener('click', () => {
        openCreateOrderModal();
    });
    
    // Кнопка обновления биржи
    document.getElementById('refresh-exchange').addEventListener('click', async () => {
        await loadExchangeOrders();
        showNotification('Биржа обновлена', 'success');
    });
    
    // Выбор подарка в создании ордера
    document.addEventListener('click', function(e) {
        if (e.target.closest('.gift-selector-item')) {
            const item = e.target.closest('.gift-selector-item');
            document.querySelectorAll('.gift-selector-item').forEach(i => {
                i.classList.remove('selected');
            });
            item.classList.add('selected');
            
            // Обновляем информацию о выбранном подарке
            const giftId = item.dataset.giftId;
            const gift = giftsData[giftId];
            if (gift) {
                const marketPrice = gift.price;
                document.getElementById('market-price').textContent = marketPrice;
                document.getElementById('order-price').value = marketPrice;
                
                // Обновляем доступное количество
                const inventoryCount = userInventory.filter(item => item.gift_id === giftId).length;
                document.getElementById('available-qty').textContent = inventoryCount;
                document.getElementById('order-quantity').max = inventoryCount;
                document.getElementById('order-quantity').value = 1;
            }
        }
    });
    
    // Изменение количества
    document.getElementById('increase-qty').addEventListener('click', () => {
        const input = document.getElementById('order-quantity');
        const max = parseInt(input.max) || 100;
        const current = parseInt(input.value) || 1;
        if (current < max) {
            input.value = current + 1;
            updateOrderTotal();
        }
    });
    
    document.getElementById('decrease-qty').addEventListener('click', () => {
        const input = document.getElementById('order-quantity');
        const current = parseInt(input.value) || 1;
        if (current > 1) {
            input.value = current - 1;
            updateOrderTotal();
        }
    });
    
    // Изменение цены
    document.getElementById('order-price').addEventListener('input', updateOrderTotal);
    document.getElementById('order-quantity').addEventListener('input', updateOrderTotal);
    
    // Подтверждение ордера
    document.getElementById('submit-order').addEventListener('click', submitOrder);
    
    // Отмена ордера
    document.getElementById('cancel-order').addEventListener('click', () => {
        document.getElementById('create-order-modal').style.display = 'none';
    });
    
    // 3D контролы
    document.getElementById('rotate-btn')?.addEventListener('click', () => {
        // Логика вращения 3D модели
    });
    
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
        // Логика увеличения
    });
    
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
        // Логика уменьшения
    });
    
    document.getElementById('reset-btn')?.addEventListener('click', () => {
        // Сброс 3D сцены
    });
    
    // Фильтры биржи
    document.getElementById('rarity-filter').addEventListener('change', displayExchangeOrders);
    document.getElementById('order-type-filter').addEventListener('change', displayExchangeOrders);
    document.getElementById('sort-filter').addEventListener('change', displayExchangeOrders);
    document.getElementById('search-gift').addEventListener('input', displayExchangeOrders);
    
    // Мои заказы вкладки
    document.querySelectorAll('.my-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Убираем активный класс со всех кнопок
            document.querySelectorAll('.my-tab-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Убираем активный класс со всех вкладок
            document.querySelectorAll('.my-orders-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Активируем выбранную кнопку и вкладку
            this.classList.add('active');
            document.getElementById(`${tabName}-content`).classList.add('active');
        });
    });
}

// ОБНОВЛЕНИЕ СУММЫ ОРДЕРА
function updateOrderTotal() {
    const price = parseInt(document.getElementById('order-price').value) || 0;
    const quantity = parseInt(document.getElementById('order-quantity').value) || 1;
    const total = price * quantity;
    const commission = Math.floor(total * 0.02);
    
    document.getElementById('order-total').textContent = `${total} 🎄`;
    document.getElementById('commission-amount').textContent = commission;
}

// ПОКАЗ СООБЩЕНИЯ ЕСЛИ НЕТ ОРДЕРОВ
function showNoOrdersMessage() {
    const container = document.getElementById('orders-list');
    container.innerHTML = `
        <div class="empty-orders">
            <div class="empty-icon">📊</div>
            <h3>На бирже пока нет ордеров</h3>
            <p>Будьте первым, кто создаст торговый ордер!</p>
            <button class="action-btn" onclick="openCreateOrderModal()">📤 Создать ордер</button>
        </div>
    `;
}

// ДОБАВЛЕНИЕ АНИМАЦИЙ CSS
function addCSSAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        /* Пульсирующее свечение */
        .animation-pulse-glow {
            animation: pulseGlow 2s infinite;
        }
        
        @keyframes pulseGlow {
            0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 5px currentColor);
            }
            50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 15px currentColor);
            }
        }
        
        /* Парение */
        .animation-float {
            animation: gentleFloat 3s ease-in-out infinite;
        }
        
        @keyframes gentleFloat {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
        }
        
        /* Смена фаз */
        .animation-phase-change {
            animation: phaseChange 4s linear infinite;
        }
        
        @keyframes phaseChange {
            0% { content: "🌑"; }
            25% { content: "🌒"; }
            50% { content: "🌓"; }
            75% { content: "🌔"; }
            100% { content: "🌕"; }
        }
        
        /* Волны */
        .animation-wave {
            animation: waveEffect 2s ease-in-out infinite;
        }
        
        @keyframes waveEffect {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.05); }
        }
        
        /* Разворачивание */
        .animation-unroll {
            animation: unrollScroll 3s ease-in-out infinite;
        }
        
        @keyframes unrollScroll {
            0% { transform: scaleY(0.5) rotate(-5deg); opacity: 0.7; }
            50% { transform: scaleY(1) rotate(0deg); opacity: 1; }
            100% { transform: scaleY(0.5) rotate(5deg); opacity: 0.7; }
        }
        
        /* Блеск */
        .animation-shine {
            position: relative;
            overflow: hidden;
        }
        
        .animation-shine::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(
                to right,
                transparent 0%,
                rgba(255, 255, 255, 0.3) 50%,
                transparent 100%
            );
            transform: rotate(30deg);
            animation: shine 3s infinite;
        }
        
        @keyframes shine {
            0% { transform: translateX(-100%) rotate(30deg); }
            100% { transform: translateX(100%) rotate(30deg); }
        }
        
        /* Мерцание текста */
        .animation-text-glow {
            text-shadow: 0 0 5px currentColor;
            animation: textGlow 1.5s alternate infinite;
        }
        
        @keyframes textGlow {
            from { text-shadow: 0 0 5px currentColor; }
            to { text-shadow: 0 0 15px currentColor, 0 0 20px currentColor; }
        }
    `;
    document.head.appendChild(style);
}

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
setTimeout(() => {
    initialize3DScenes();
    addCSSAnimations();
}, 1000);
