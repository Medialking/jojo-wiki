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
let auctionLots = [];

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
            await loadAuctionLots();
            setupEventListeners();
            setupRealtimeUpdates();
        }
    }, 400);
};

// СОЗДАНИЕ ФОНОВЫХ ЧАСТИЦ
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    
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

// ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserData() {
    try {
        // Загружаем баланс (новогодние очки)
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnapshot.exists()) {
            const pointsData = pointsSnapshot.val();
            userBalance = pointsData.total_points || pointsData.totalPoints || 0;
        }
        
        // Загружаем инвентарь
        const inventorySnapshot = await database.ref('gift_inventory/' + userId).once('value');
        if (inventorySnapshot.exists()) {
            userInventory = Object.values(inventorySnapshot.val());
        } else {
            userInventory = [];
        }
        
        // Обновляем UI
        updateBalance();
        updateInventoryStats();
        
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        showError('Ошибка загрузки данных');
    }
}

// ИНИЦИАЛИЗАЦИЯ ПОДАРКОВ
async function initializeGifts() {
    try {
        const snapshot = await database.ref('shop_gifts').once('value');
        
        if (snapshot.exists()) {
            giftsData = snapshot.val();
        } else {
            // Создаем начальные подарки, если их нет
            await createInitialGifts();
        }
        
        // Отображаем подарки
        displayAllGifts();
        
    } catch (error) {
        console.error('Ошибка инициализации подарков:', error);
        showError('Ошибка загрузки подарков');
    }
}

// СОЗДАНИЕ НАЧАЛЬНЫХ ПОДАРКОВ
async function createInitialGifts() {
    const gifts = {
        // Золотые подарки (3 штуки, ограниченные)
        golden_1: {
            id: 'golden_1',
            name: 'Золотая Корона',
            description: 'Эксклюзивная корона из чистого золота с драгоценными камнями',
            price: 5000,
            rarity: 'golden',
            icon: '👑',
            animation: 'sparkle',
            max_owners: 1,
            current_owners: 0,
            created_at: new Date().toISOString()
        },
        golden_2: {
            id: 'golden_2',
            name: 'Сокровища Дракона',
            description: 'Легендарные сокровища из драконьей пещеры',
            price: 7500,
            rarity: 'golden',
            icon: '🐉',
            animation: 'fire',
            max_owners: 1,
            current_owners: 0,
            created_at: new Date().toISOString()
        },
        golden_3: {
            id: 'golden_3',
            name: 'Феникс',
            description: 'Мифическая птица, возрождающаяся из пепла',
            price: 10000,
            rarity: 'golden',
            icon: '🔥',
            animation: 'phoenix',
            max_owners: 1,
            current_owners: 0,
            created_at: new Date().toISOString()
        },
        
        // Мифические подарки (5 штук)
        mythical_1: {
            id: 'mythical_1',
            name: 'Кристалл Силы',
            description: 'Древний кристалл, излучающий магическую энергию',
            price: 500,
            rarity: 'mythical',
            icon: '💎',
            animation: 'pulse',
            created_at: new Date().toISOString()
        },
        mythical_2: {
            id: 'mythical_2',
            name: 'Крылья Ангела',
            description: 'Светящиеся крылья небесного посланника',
            price: 1000,
            rarity: 'mythical',
            icon: '👼',
            animation: 'float',
            created_at: new Date().toISOString()
        },
        mythical_3: {
            id: 'mythical_3',
            name: 'Лунный Камень',
            description: 'Камень, вобравший в себя силу луны',
            price: 1500,
            rarity: 'mythical',
            icon: '🌙',
            animation: 'glow',
            created_at: new Date().toISOString()
        },
        mythical_4: {
            id: 'mythical_4',
            name: 'Океанская Жемчужина',
            description: 'Редчайшая жемчужина из глубин океана',
            price: 2000,
            rarity: 'mythical',
            icon: '🐚',
            animation: 'wave',
            created_at: new Date().toISOString()
        },
        mythical_5: {
            id: 'mythical_5',
            name: 'Волшебный Свиток',
            description: 'Древний свиток с заклинаниями',
            price: 2500,
            rarity: 'mythical',
            icon: '📜',
            animation: 'magic',
            created_at: new Date().toISOString()
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
        rare_6: {
            id: 'rare_6',
            name: 'Эликсир Жизни',
            description: 'Волшебное зелье с необычными свойствами',
            price: 600,
            rarity: 'rare',
            icon: '🧪',
            created_at: new Date().toISOString()
        },
        rare_7: {
            id: 'rare_7',
            name: 'Королевская Печать',
            description: 'Официальная печать королевства',
            price: 700,
            rarity: 'rare',
            icon: '🖋️',
            created_at: new Date().toISOString()
        },
        rare_8: {
            id: 'rare_8',
            name: 'Амулет Защиты',
            description: 'Магический амулет, защищающий владельца',
            price: 800,
            rarity: 'rare',
            icon: '🛡️',
            created_at: new Date().toISOString()
        },
        rare_9: {
            id: 'rare_9',
            name: 'Часы с Кукушкой',
            description: 'Антикварные часы с механической кукушкой',
            price: 900,
            rarity: 'rare',
            icon: '⏰',
            created_at: new Date().toISOString()
        },
        rare_10: {
            id: 'rare_10',
            name: 'Сундук с Сокровищами',
            description: 'Деревянный сундук, полный драгоценностей',
            price: 1000,
            rarity: 'rare',
            icon: '🗃️',
            created_at: new Date().toISOString()
        },
        
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
            name: 'Цветы в Корзине',
            description: 'Красивый букет полевых цветов',
            price: 50,
            rarity: 'common',
            icon: '💐',
            created_at: new Date().toISOString()
        },
        common_6: {
            id: 'common_6',
            name: 'Плюшевый Медведь',
            description: 'Мягкая игрушка для уюта',
            price: 60,
            rarity: 'common',
            icon: '🧸',
            created_at: new Date().toISOString()
        },
        common_7: {
            id: 'common_7',
            name: 'Книга Сказок',
            description: 'Сборник волшебных историй',
            price: 70,
            rarity: 'common',
            icon: '📖',
            created_at: new Date().toISOString()
        },
        common_8: {
            id: 'common_8',
            name: 'Набор Красок',
            description: 'Яркие краски для творчества',
            price: 80,
            rarity: 'common',
            icon: '🎨',
            created_at: new Date().toISOString()
        },
        common_9: {
            id: 'common_9',
            name: 'Музыкальная Шкатулка',
            description: 'Шкатулка, играющая мелодию',
            price: 90,
            rarity: 'common',
            icon: '🎵',
            created_at: new Date().toISOString()
        },
        common_10: {
            id: 'common_10',
            name: 'Фотоальбом',
            description: 'Альбом для памятных фотографий',
            price: 100,
            rarity: 'common',
            icon: '📸',
            created_at: new Date().toISOString()
        },
        common_11: {
            id: 'common_11',
            name: 'Теплый Плед',
            description: 'Мягкий плед для холодных вечеров',
            price: 150,
            rarity: 'common',
            icon: '🧣',
            created_at: new Date().toISOString()
        },
        common_12: {
            id: 'common_12',
            name: 'Настольная Игра',
            description: 'Увлекательная игра для компании',
            price: 200,
            rarity: 'common',
            icon: '🎲',
            created_at: new Date().toISOString()
        },
        common_13: {
            id: 'common_13',
            name: 'Кофеварка',
            description: 'Ароматный утренний кофе',
            price: 250,
            rarity: 'common',
            icon: '☕',
            created_at: new Date().toISOString()
        },
        common_14: {
            id: 'common_14',
            name: 'Набор для Рисования',
            description: 'Все необходимое для художника',
            price: 300,
            rarity: 'common',
            icon: '✏️',
            created_at: new Date().toISOString()
        },
        common_15: {
            id: 'common_15',
            name: 'Электронная Книга',
            description: 'Устройство для чтения книг',
            price: 500,
            rarity: 'common',
            icon: '📱',
            created_at: new Date().toISOString()
        }
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
        
        // Добавляем обработчики кликов
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
    
    // Создаем анимацию для мифических и золотых подарков
    let animationHtml = '';
    if (gift.animation) {
        animationHtml = `<div class="gift-animation" data-animation="${gift.animation}"></div>`;
    }
    
    return `
        <div class="gift-card ${gift.rarity}" data-gift-id="${gift.id}">
            <div class="rarity-badge ${gift.rarity}">${getRarityName(gift.rarity)}</div>
            
            ${gift.rarity === 'golden' && gift.current_owners >= gift.max_owners ? 
                '<div class="gift-ribbon">SOLD</div>' : ''}
            
            <div class="gift-image">
                ${animationHtml}
                <span>${gift.icon}</span>
            </div>
            
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

// ОБНОВЛЕНИЕ БАЛАНСА
function updateBalance() {
    document.getElementById('user-balance').textContent = userBalance;
    document.getElementById('balance-amount').textContent = userBalance;
}

// ПОКУПКА ПОДАРКА
async function buyGift(giftId) {
    const gift = giftsData[giftId];
    if (!gift) {
        showError('Подарок не найден');
        return;
    }
    
    // Проверяем баланс
    if (userBalance < gift.price) {
        showError(`Недостаточно очков. Нужно: ${gift.price}, у вас: ${userBalance}`);
        return;
    }
    
    // Проверяем для золотых подарков
    if (gift.rarity === 'golden') {
        if (gift.current_owners >= gift.max_owners) {
            showError('Этот золотой подарок уже распродан');
            return;
        }
        
        // Проверяем, не купил ли уже пользователь золотой подарок
        const goldenInInventory = userInventory.some(item => {
            const itemGift = giftsData[item.gift_id];
            return itemGift && itemGift.rarity === 'golden';
        });
        
        if (goldenInInventory) {
            showError('Вы уже приобрели золотой подарок. Можно иметь только один!');
            return;
        }
    }
    
    // Проверяем, есть ли уже такой подарок
    const alreadyOwns = userInventory.some(item => item.gift_id === giftId);
    if (alreadyOwns) {
        showError('У вас уже есть этот подарок');
        return;
    }
    
    try {
        // Создаем запись в инвентаре
        const inventoryItem = {
            gift_id: giftId,
            purchased_at: new Date().toISOString(),
            purchase_price: gift.price,
            is_selling: false
        };
        
        // Обновляем баланс пользователя
        const newBalance = userBalance - gift.price;
        
        // Для золотых подарков увеличиваем счетчик владельцев
        const updates = {};
        updates['gift_inventory/' + userId + '/' + giftId] = inventoryItem;
        updates['holiday_points/' + userId + '/total_points'] = newBalance;
        updates['holiday_points/' + userId + '/available_points'] = newBalance;
        
        if (gift.rarity === 'golden') {
            updates['shop_gifts/' + giftId + '/current_owners'] = gift.current_owners + 1;
        }
        
        // Выполняем все обновления атомарно
        await database.ref().update(updates);
        
        // Обновляем локальные данные
        userBalance = newBalance;
        userInventory.push(inventoryItem);
        
        // Обновляем UI
        updateBalance();
        updateInventoryStats();
        
        // Показываем успешное сообщение
        showNotification(`🎉 Вы успешно купили "${gift.name}" за ${gift.price} очков!`, 'success');
        
        // Обновляем отображение подарков
        displayAllGifts();
        
    } catch (error) {
        console.error('Ошибка покупки подарка:', error);
        showError('Ошибка при покупке подарка');
    }
}

// ЗАГРУЗКА АУКЦИОННЫХ ЛОТОВ
async function loadAuctionLots() {
    try {
        const snapshot = await database.ref('auction_lots').once('value');
        
        if (snapshot.exists()) {
            auctionLots = Object.entries(snapshot.val()).map(([id, lot]) => ({
                id,
                ...lot
            }));
            
            // Фильтруем истекшие лоты
            const now = new Date();
            auctionLots = auctionLots.filter(lot => new Date(lot.ends_at) > now);
            
            displayAuctionLots();
            updateAuctionStats();
        } else {
            auctionLots = [];
            document.getElementById('auction-list').innerHTML = `
                <div class="empty-auction">
                    <div class="empty-icon">🏷️</div>
                    <h3>На аукционе пока нет лотов</h3>
                    <p>Будьте первым, кто выставит подарок на продажу!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки аукциона:', error);
        showError('Ошибка загрузки аукциона');
    }
}

// ОТОБРАЖЕНИЕ АУКЦИОННЫХ ЛОТОВ
function displayAuctionLots() {
    const container = document.getElementById('auction-list');
    
    if (auctionLots.length === 0) {
        container.innerHTML = `
            <div class="empty-auction">
                <div class="empty-icon">🏷️</div>
                <h3>На аукционе пока нет лотов</h3>
                <p>Будьте первым, кто выставит подарок на продажу!</p>
            </div>
        `;
        return;
    }
    
    // Применяем фильтры
    let filteredLots = [...auctionLots];
    
    const rarityFilter = document.getElementById('rarity-filter').value;
    if (rarityFilter !== 'all') {
        filteredLots = filteredLots.filter(lot => {
            const gift = giftsData[lot.gift_id];
            return gift && gift.rarity === rarityFilter;
        });
    }
    
    // Применяем сортировку
    const sortFilter = document.getElementById('sort-filter').value;
    switch (sortFilter) {
        case 'cheapest':
            filteredLots.sort((a, b) => a.current_price - b.current_price);
            break;
        case 'expensive':
            filteredLots.sort((a, b) => b.current_price - a.current_price);
            break;
        case 'ending':
            filteredLots.sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at));
            break;
        default:
            filteredLots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    container.innerHTML = filteredLots.map(lot => createAuctionLotCard(lot)).join('');
    
    // Добавляем обработчики
    filteredLots.forEach(lot => {
        const bidBtn = document.querySelector(`[data-lot-id="${lot.id}"] .bid-btn`);
        if (bidBtn) {
            bidBtn.addEventListener('click', () => placeBid(lot));
        }
        
        const viewBtn = document.querySelector(`[data-lot-id="${lot.id}"] .view-btn`);
        if (viewBtn) {
            viewBtn.addEventListener('click', () => viewAuctionLot(lot));
        }
    });
}

// СОЗДАНИЕ КАРТОЧКИ АУКЦИОННОГО ЛОТА
function createAuctionLotCard(lot) {
    const gift = giftsData[lot.gift_id];
    if (!gift) return '';
    
    const now = new Date();
    const endsAt = new Date(lot.ends_at);
    const timeLeft = endsAt - now;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeText = '';
    if (hoursLeft > 0) {
        timeText = `${hoursLeft}ч ${minutesLeft}м`;
    } else if (minutesLeft > 0) {
        timeText = `${minutesLeft} минут`;
    } else {
        timeText = 'Менее минуты';
    }
    
    const isMyLot = lot.seller_id === userId;
    const hasBids = lot.current_bidder && lot.current_bidder !== lot.seller_id;
    
    return `
        <div class="auction-lot" data-lot-id="${lot.id}">
            <div class="lot-header">
                <div class="lot-seller">Продавец: ${lot.seller_name}</div>
                <div class="lot-timer" title="Заканчивается: ${endsAt.toLocaleString()}">
                    ⏰ ${timeText}
                </div>
            </div>
            
            <div class="lot-preview">
                <div class="gift-image">
                    <span>${gift.icon}</span>
                </div>
            </div>
            
            <div class="lot-details">
                <h4>${gift.name}</h4>
                <div class="rarity-badge ${gift.rarity}">${getRarityName(gift.rarity)}</div>
                
                <div class="lot-price">
                    <div class="current-price">${lot.current_price} 🎄</div>
                    ${lot.start_price !== lot.current_price ? 
                        `<div class="start-price">${lot.start_price} 🎄</div>` : ''}
                </div>
                
                ${hasBids ? 
                    `<div class="current-bidder">
                        Текущая ставка: ${lot.current_bidder_name}
                    </div>` : ''}
                
                ${isMyLot ? 
                    `<button class="bid-btn" disabled>Ваш лот</button>` :
                    `<button class="bid-btn">💰 Сделать ставку</button>`
                }
            </div>
        </div>
    `;
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ АУКЦИОНА
function updateAuctionStats() {
    document.getElementById('total-lots').textContent = auctionLots.length;
    
    if (auctionLots.length > 0) {
        const totalPrice = auctionLots.reduce((sum, lot) => sum + lot.current_price, 0);
        const avgPrice = Math.floor(totalPrice / auctionLots.length);
        document.getElementById('avg-price').textContent = avgPrice;
    } else {
        document.getElementById('avg-price').textContent = 0;
    }
    
    // Активные лоты (осталось больше часа)
    const now = new Date();
    const activeLots = auctionLots.filter(lot => {
        const endsAt = new Date(lot.ends_at);
        return endsAt - now > 60 * 60 * 1000;
    });
    
    document.getElementById('active-lots').textContent = activeLots.length;
}

// РАЗМЕЩЕНИЕ СТАВКИ
async function placeBid(lot) {
    const gift = giftsData[lot.gift_id];
    
    // Проверяем баланс
    if (userBalance < lot.current_price + 10) {
        showError(`Минимальная ставка: ${lot.current_price + 10}. У вас: ${userBalance}`);
        return;
    }
    
    const bidAmount = prompt(`Введите вашу ставку (минимальная: ${lot.current_price + 10}):`, lot.current_price + 10);
    if (!bidAmount) return;
    
    const bid = parseInt(bidAmount);
    if (isNaN(bid) || bid < lot.current_price + 10) {
        showError(`Ставка должна быть не менее ${lot.current_price + 10} очков`);
        return;
    }
    
    if (bid > userBalance) {
        showError(`Недостаточно очков. Ваш баланс: ${userBalance}`);
        return;
    }
    
    try {
        // Если это первая ставка, возвращаем деньги предыдущему ставщику
        const updates = {};
        
        if (lot.current_bidder && lot.current_bidder !== userId && lot.current_bidder !== lot.seller_id) {
            // Возвращаем деньги предыдущему ставщику
            updates['holiday_points/' + lot.current_bidder + '/total_points'] = firebase.database.ServerValue.increment(lot.current_price);
            updates['holiday_points/' + lot.current_bidder + '/available_points'] = firebase.database.ServerValue.increment(lot.current_price);
        }
        
        // Списание денег с текущего пользователя
        updates['holiday_points/' + userId + '/total_points'] = firebase.database.ServerValue.increment(-bid);
        updates['holiday_points/' + userId + '/available_points'] = firebase.database.ServerValue.increment(-bid);
        
        // Обновление лота
        updates['auction_lots/' + lot.id + '/current_price'] = bid;
        updates['auction_lots/' + lot.id + '/current_bidder'] = userId;
        updates['auction_lots/' + lot.id + '/current_bidder_name'] = userNickname;
        updates['auction_lots/' + lot.id + '/bid_count'] = (lot.bid_count || 0) + 1;
        
        // Выполняем обновления
        await database.ref().update(updates);
        
        // Обновляем локальный баланс
        userBalance -= bid;
        updateBalance();
        
        showNotification(`✅ Вы сделали ставку в ${bid} очков на "${gift.name}"!`, 'success');
        
    } catch (error) {
        console.error('Ошибка размещения ставки:', error);
        showError('Ошибка при размещении ставки');
    }
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ ИНВЕНТАРЯ
function updateInventoryStats() {
    const counts = {
        common: 0,
        rare: 0,
        mythical: 0,
        golden: 0
    };
    
    userInventory.forEach(item => {
        const gift = giftsData[item.gift_id];
        if (gift && counts.hasOwnProperty(gift.rarity)) {
            counts[gift.rarity]++;
        }
    });
    
    document.getElementById('total-gifts').textContent = userInventory.length;
    document.getElementById('common-count').textContent = counts.common;
    document.getElementById('rare-count').textContent = counts.rare;
    document.getElementById('mythical-count').textContent = counts.mythical;
    document.getElementById('golden-count').textContent = counts.golden;
    
    displayInventory();
}

// ОТОБРАЖЕНИЕ ИНВЕНТАРЯ
function displayInventory() {
    const container = document.getElementById('inventory-grid');
    
    if (userInventory.length === 0) {
        container.innerHTML = `
            <div class="empty-inventory">
                <div class="empty-icon">📭</div>
                <h3>Инвентарь пуст</h3>
                <p>Купите свой первый подарок в магазине!</p>
                <a href="#shop-tab" class="action-btn">🛒 В магазин</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userInventory.map(item => {
        const gift = giftsData[item.gift_id];
        if (!gift) return '';
        
        const purchaseDate = new Date(item.purchased_at);
        const dateStr = purchaseDate.toLocaleDateString('ru-RU');
        
        return `
            <div class="inventory-item" data-item-id="${item.gift_id}">
                ${item.is_selling ? '<div class="sell-indicator">💰</div>' : ''}
                <div class="gift-image">
                    <span>${gift.icon}</span>
                </div>
                <h4>${gift.name}</h4>
                <div class="rarity-badge ${gift.rarity}">${getRarityName(gift.rarity)}</div>
                <div class="inventory-date">Куплен: ${dateStr}</div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики кликов
    userInventory.forEach(item => {
        const elem = container.querySelector(`[data-item-id="${item.gift_id}"]`);
        if (elem) {
            elem.addEventListener('click', () => openGiftModal(giftsData[item.gift_id], item));
        }
    });
}

// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА ПОДАРКА
function openGiftModal(gift, inventoryItem = null) {
    const modal = document.getElementById('gift-modal');
    const isOwned = inventoryItem !== null;
    const canSell = isOwned && !inventoryItem.is_selling;
    
    // Заполняем данные
    document.getElementById('gift-modal-title').textContent = gift.name;
    document.getElementById('gift-name').textContent = gift.name;
    document.getElementById('gift-rarity').textContent = getRarityName(gift.rarity);
    document.getElementById('gift-rarity').className = `gift-rarity ${gift.rarity}`;
    document.getElementById('gift-description').textContent = gift.description;
    document.getElementById('gift-price').textContent = `${gift.price} 🎄`;
    document.getElementById('gift-owner').textContent = isOwned ? 'Вы' : 'Магазин';
    
    if (inventoryItem) {
        const date = new Date(inventoryItem.purchased_at);
        document.getElementById('gift-date').textContent = date.toLocaleDateString('ru-RU');
    } else {
        document.getElementById('gift-date').textContent = 'Не куплен';
    }
    
    // Настраиваем превью
    const preview = document.getElementById('gift-preview');
    preview.innerHTML = `
        <div class="gift-image">
            ${gift.animation ? `<div class="gift-animation" data-animation="${gift.animation}"></div>` : ''}
            <span>${gift.icon}</span>
        </div>
    `;
    
    // Настраиваем кнопки действий
    const actions = document.getElementById('gift-actions');
    let buttons = '';
    
    if (isOwned) {
        if (inventoryItem.is_selling) {
            buttons = `
                <button class="action-btn" disabled>💰 На продаже</button>
                <button class="action-btn secondary" id="cancel-sale-btn">❌ Снять с продажи</button>
            `;
        } else {
            buttons = `
                <button class="action-btn" id="sell-btn">💰 Продать</button>
                <button class="action-btn secondary" id="gift-btn">🎁 Подарить</button>
            `;
        }
    } else {
        const canBuy = gift.rarity !== 'golden' || (gift.current_owners < gift.max_owners);
        if (canBuy && !userInventory.some(item => item.gift_id === gift.id)) {
            buttons = `<button class="action-btn" id="buy-btn">🛒 Купить за ${gift.price}</button>`;
        } else if (gift.rarity === 'golden' && gift.current_owners >= gift.max_owners) {
            buttons = '<button class="action-btn" disabled>🛑 Распродан</button>';
        } else {
            buttons = '<button class="action-btn" disabled>✅ Уже куплен</button>';
        }
    }
    
    actions.innerHTML = buttons;
    
    // Добавляем обработчики
    if (isOwned) {
        if (canSell) {
            document.getElementById('sell-btn').addEventListener('click', () => openSellModal(gift, inventoryItem));
            document.getElementById('gift-btn').addEventListener('click', () => giftToFriend(gift));
        } else if (inventoryItem.is_selling) {
            document.getElementById('cancel-sale-btn').addEventListener('click', () => cancelSale(gift, inventoryItem));
        }
    } else {
        const buyBtn = document.getElementById('buy-btn');
        if (buyBtn && !buyBtn.disabled) {
            buyBtn.addEventListener('click', () => buyGift(gift.id));
        }
    }
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА ПРОДАЖИ
function openSellModal(gift, inventoryItem) {
    const modal = document.getElementById('sell-modal');
    
    // Заполняем список подарков для продажи
    const select = document.getElementById('sell-gift-select');
    select.innerHTML = `
        <option value="">Выберите подарок...</option>
        ${userInventory
            .filter(item => !item.is_selling && giftsData[item.gift_id])
            .map(item => {
                const gift = giftsData[item.gift_id];
                return `<option value="${item.gift_id}">${gift.name} (куплен за ${item.purchase_price})</option>`;
            })
            .join('')}
    `;
    
    // Если выбран конкретный подарок, выбираем его
    if (gift && inventoryItem) {
        select.value = gift.id;
        select.disabled = true;
    }
    
    // Сбрасываем цену
    document.getElementById('sell-price').value = Math.max(gift.price, 100);
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Скрываем модальное окно подарка
    document.getElementById('gift-modal').style.display = 'none';
}

// ПОДТВЕРЖДЕНИЕ ПРОДАЖИ
async function confirmSell() {
    const giftId = document.getElementById('sell-gift-select').value;
    const price = parseInt(document.getElementById('sell-price').value);
    const duration = parseInt(document.getElementById('auction-duration').value);
    
    if (!giftId) {
        showError('Выберите подарок для продажи');
        return;
    }
    
    if (!price || price < 10 || price > 100000) {
        showError('Цена должна быть от 10 до 100,000 очков');
        return;
    }
    
    const gift = giftsData[giftId];
    if (!gift) {
        showError('Подарок не найден');
        return;
    }
    
    try {
        // Создаем аукционный лот
        const lotId = 'lot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const endsAt = new Date(Date.now() + duration * 60 * 60 * 1000);
        
        const lotData = {
            id: lotId,
            gift_id: giftId,
            seller_id: userId,
            seller_name: userNickname,
            start_price: price,
            current_price: price,
            created_at: new Date().toISOString(),
            ends_at: endsAt.toISOString(),
            status: 'active'
        };
        
        // Помечаем подарок как продаваемый в инвентаре
        await database.ref().update({
            [`auction_lots/${lotId}`]: lotData,
            [`gift_inventory/${userId}/${giftId}/is_selling`]: true
        });
        
        // Обновляем локальные данные
        const itemIndex = userInventory.findIndex(item => item.gift_id === giftId);
        if (itemIndex !== -1) {
            userInventory[itemIndex].is_selling = true;
        }
        
        // Закрываем модальные окна
        closeAllModals();
        
        // Показываем успешное сообщение
        showNotification(`✅ Подарок "${gift.name}" выставлен на продажу за ${price} очков!`, 'success');
        
        // Обновляем аукцион
        await loadAuctionLots();
        displayInventory();
        
        // Переключаемся на вкладку аукциона
        switchTab('auction');
        
    } catch (error) {
        console.error('Ошибка выставления на продажу:', error);
        showError('Ошибка при выставлении на продажу');
    }
}

// ПОДАРИТЬ ПОДАРОК ДРУГУ
async function giftToFriend(gift) {
    const friendNickname = prompt('Введите никнейм друга, которому хотите подарить:');
    if (!friendNickname) return;
    
    // Ищем друга в базе
    try {
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val();
        let friendId = null;
        
        for (const [id, user] of Object.entries(users)) {
            if (user.nickname === friendNickname && id !== userId) {
                friendId = id;
                break;
            }
        }
        
        if (!friendId) {
            showError('Пользователь с таким никнеймом не найден');
            return;
        }
        
        if (!confirm(`Вы уверены, что хотите подарить "${gift.name}" пользователю ${friendNickname}?`)) {
            return;
        }
        
        // Удаляем подарок из своего инвентаря
        await database.ref(`gift_inventory/${userId}/${gift.id}`).remove();
        
        // Добавляем подарок в инвентарь друга
        const giftData = {
            gift_id: gift.id,
            purchased_at: new Date().toISOString(),
            purchase_price: 0,
            is_selling: false,
            gifted_from: userId,
            gifted_from_name: userNickname
        };
        
        await database.ref(`gift_inventory/${friendId}/${gift.id}`).set(giftData);
        
        // Обновляем локальные данные
        userInventory = userInventory.filter(item => item.gift_id !== gift.id);
        
        // Показываем успешное сообщение
        showNotification(`✅ Вы подарили "${gift.name}" пользователю ${friendNickname}!`, 'success');
        
        // Обновляем UI
        updateInventoryStats();
        closeAllModals();
        
    } catch (error) {
        console.error('Ошибка дарения подарка:', error);
        showError('Ошибка при дарении подарка');
    }
}

// ОТМЕНА ПРОДАЖИ
async function cancelSale(gift, inventoryItem) {
    if (!confirm(`Вы уверены, что хотите снять "${gift.name}" с продажи?`)) {
        return;
    }
    
    try {
        // Ищем активный лот для этого подарка
        const auctionSnapshot = await database.ref('auction_lots').once('value');
        let lotId = null;
        
        if (auctionSnapshot.exists()) {
            const lots = auctionSnapshot.val();
            for (const [id, lot] of Object.entries(lots)) {
                if (lot.gift_id === gift.id && lot.seller_id === userId && lot.status === 'active') {
                    lotId = id;
                    break;
                }
            }
        }
        
        // Удаляем лот и снимаем флаг продажи
        const updates = {};
        if (lotId) {
            updates[`auction_lots/${lotId}`] = null;
        }
        updates[`gift_inventory/${userId}/${gift.id}/is_selling`] = false;
        
        await database.ref().update(updates);
        
        // Обновляем локальные данные
        const itemIndex = userInventory.findIndex(item => item.gift_id === gift.id);
        if (itemIndex !== -1) {
            userInventory[itemIndex].is_selling = false;
        }
        
        // Показываем успешное сообщение
        showNotification(`✅ Подарок "${gift.name}" снят с продажи`, 'success');
        
        // Обновляем UI
        displayInventory();
        await loadAuctionLots();
        closeAllModals();
        
    } catch (error) {
        console.error('Ошибка отмены продажи:', error);
        showError('Ошибка при отмене продажи');
    }
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
function switchTab(tabName) {
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Активируем выбранную кнопку
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Активируем выбранную вкладку
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ЗАКРЫТИЕ ВСЕХ МОДАЛЬНЫХ ОКОН
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.style.display = 'none';
    });
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
    
    // Кнопка "Выставить на продажу"
    document.getElementById('sell-gift-btn').addEventListener('click', () => {
        document.getElementById('sell-modal').style.display = 'flex';
    });
    
    // Кнопка обновления аукциона
    document.getElementById('refresh-auction').addEventListener('click', async () => {
        await loadAuctionLots();
        showNotification('Аукцион обновлен', 'success');
    });
    
    // Фильтры аукциона
    document.getElementById('rarity-filter').addEventListener('change', displayAuctionLots);
    document.getElementById('sort-filter').addEventListener('change', displayAuctionLots);
    
    // Модальные окна
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });
    
    // Подтверждение продажи
    document.getElementById('confirm-sell').addEventListener('click', confirmSell);
    
    // Отмена продажи
    document.getElementById('cancel-sell').addEventListener('click', () => {
        document.getElementById('sell-modal').style.display = 'none';
    });
    
    // Делегирование событий для кнопок покупки
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('buy-btn')) {
            const giftId = e.target.dataset.giftId;
            buyGift(giftId);
        }
    });
}

// НАСТРОЙКА ОБНОВЛЕНИЙ В РЕАЛЬНОМ ВРЕМЕНИ
function setupRealtimeUpdates() {
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
            userInventory = Object.values(snapshot.val());
        } else {
            userInventory = [];
        }
        updateInventoryStats();
    });
    
    // Обновление аукциона
    database.ref('auction_lots').on('value', async (snapshot) => {
        if (snapshot.exists()) {
            const lots = snapshot.val();
            auctionLots = Object.entries(lots).map(([id, lot]) => ({
                id,
                ...lot
            }));
            
            // Фильтруем истекшие лоты
            const now = new Date();
            auctionLots = auctionLots.filter(lot => new Date(lot.ends_at) > now);
            
            displayAuctionLots();
            updateAuctionStats();
        } else {
            auctionLots = [];
        }
    });
    
    // Обновление подарков (особенно важно для золотых)
    database.ref('shop_gifts').on('value', (snapshot) => {
        if (snapshot.exists()) {
            giftsData = snapshot.val();
            displayAllGifts();
        }
    });
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

// Добавляем стили для анимаций
const animationStyles = document.createElement('style');
animationStyles.textContent = `
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
    
    @keyframes sparkle {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
    }
    
    @keyframes glow {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.3); }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    [data-animation="sparkle"]::before {
        content: '✨';
        position: absolute;
        animation: sparkle 1.5s infinite;
    }
    
    [data-animation="glow"] {
        animation: glow 2s infinite;
    }
    
    [data-animation="pulse"] {
        animation: pulse 2s infinite;
    }
    
    [data-animation="float"] {
        animation: float 3s infinite;
    }
`;
document.head.appendChild(animationStyles);
