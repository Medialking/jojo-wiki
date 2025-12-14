// shop-core.js - Основная логика магазина

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

// Инициализируем только если еще не инициализировано
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Глобальные переменные
let userId = null;
let userNickname = null;
let userBalance = 0;
let userInventory = [];
let shopItems = {
    themes: [],
    decorations: [],
    animated: []
};
let currentFilter = 'gradients';
let currentDecorationType = 'badges';

// ===========================================
// ЗАГРУЗКА СТРАНИЦЫ
// ===========================================
window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await loadUserData();
            await loadShopItems();
            setupEventListeners();
            updateUI();
        }
    }, 400);
};

// ===========================================
// СОЗДАНИЕ ФОНОВЫХ ЧАСТИЦ
// ===========================================
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

// ===========================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ===========================================
async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    userNickname = localStorage.getItem('jojoland_nickname');
    
    console.log('🔐 Проверка авторизации для магазина:', { userId, userNickname });
    
    if (!userId || !userNickname) {
        showError('Для доступа к магазину необходимо войти в аккаунт');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 3000);
        return false;
    }
    
    return true;
}

// ===========================================
// ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
// ===========================================
async function loadUserData() {
    console.log('👤 Загружаю данные пользователя для магазина:', userId);
    
    try {
        // Загружаем баланс из holiday_points
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnapshot.exists()) {
            const pointsData = pointsSnapshot.val();
            userBalance = pointsData.total_points || 0;
            console.log('💰 Баланс пользователя:', userBalance);
        } else {
            console.log('⚠️ Данных очков не найдено, устанавливаю баланс 0');
            userBalance = 0;
        }
        
        // Загружаем инвентарь пользователя
        const inventorySnapshot = await database.ref('user_inventory/' + userId).once('value');
        if (inventorySnapshot.exists()) {
            userInventory = inventorySnapshot.val();
            console.log('🎒 Инвентарь пользователя загружен:', userInventory);
        } else {
            console.log('📦 Инвентарь не найден, создаю пустой');
            userInventory = [];
            await database.ref('user_inventory/' + userId).set([]);
        }
        
        // Обновляем отображение баланса
        document.getElementById('user-balance').textContent = userBalance;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        showError('Ошибка загрузки данных пользователя');
        userBalance = 0;
        userInventory = [];
    }
}

// ===========================================
// ЗАГРУЗКА ТОВАРОВ МАГАЗИНА
// ===========================================
async function loadShopItems() {
    console.log('🛒 Загружаю товары магазина');
    
    try {
        const snapshot = await database.ref('shop_items').once('value');
        
        if (snapshot.exists()) {
            shopItems = snapshot.val();
            console.log('✅ Товары магазина загружены:', shopItems);
            
            // Проверяем, есть ли все необходимые категории
            if (!shopItems.themes) shopItems.themes = [];
            if (!shopItems.decorations) shopItems.decorations = [];
            if (!shopItems.animated) shopItems.animated = [];
            
        } else {
            console.log('🆕 Товары не найдены, создаю демо-товары');
            await createDemoItems();
            await loadShopItems(); // Перезагружаем после создания
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки товаров магазина:', error);
        showError('Ошибка загрузки каталога магазина');
        shopItems = { themes: [], decorations: [], animated: [] };
    }
}

// ===========================================
// СОЗДАНИЕ ДЕМО-ТОВАРОВ
// ===========================================
async function createDemoItems() {
    console.log('🎨 Создаю демо-товары для магазина');
    
    const demoItems = {
        themes: [
            {
                id: 'theme_red_fire',
                name: '🔥 Огненная тема',
                description: 'Горячая красная тема с огненным градиентом и эффектами пламени',
                price: 150,
                type: 'theme',
                category: 'gradients',
                rarity: 'rare',
                gradient: 'linear-gradient(135deg, #ff0000, #ff6b6b, #ff8e8e)',
                textColor: '#ffffff',
                icon: '🔥',
                pattern: 'none'
            },
            {
                id: 'theme_ocean_blue',
                name: '🌊 Океанская тема',
                description: 'Прохладная синяя тема с градиентом океанских волн',
                price: 120,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #0066cc, #0099ff, #00ccff)',
                textColor: '#ffffff',
                icon: '🌊',
                pattern: 'waves'
            },
            {
                id: 'theme_forest_green',
                name: '🌲 Лесная тема',
                description: 'Зеленая тема с градиентом лесной листвы',
                price: 100,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #228B22, #32CD32, #90EE90)',
                textColor: '#ffffff',
                icon: '🌲',
                pattern: 'leaves'
            },
            {
                id: 'theme_purple_magic',
                name: '🔮 Магическая тема',
                description: 'Мистическая фиолетовая тема с волшебным градиентом',
                price: 180,
                type: 'theme',
                category: 'gradients',
                rarity: 'rare',
                gradient: 'linear-gradient(135deg, #8A2BE2, #9370DB, #BA55D3)',
                textColor: '#ffffff',
                icon: '🔮',
                pattern: 'stars'
            },
            {
                id: 'theme_golden_royal',
                name: '👑 Золотая королевская',
                description: 'Роскошная золотая тема для настоящих королей',
                price: 250,
                type: 'theme',
                category: 'special',
                rarity: 'epic',
                gradient: 'linear-gradient(135deg, #FFD700, #FFEC8B, #FFFACD)',
                textColor: '#8B4513',
                icon: '👑',
                pattern: 'crowns'
            },
            {
                id: 'theme_galaxy',
                name: '🌌 Галактическая тема',
                description: 'Космическая тема с градиентом далеких галактик',
                price: 300,
                type: 'theme',
                category: 'special',
                rarity: 'legendary',
                gradient: 'linear-gradient(135deg, #000033, #330066, #6600cc)',
                textColor: '#ffffff',
                icon: '🌌',
                pattern: 'stars'
            },
            {
                id: 'theme_sunset',
                name: '🌅 Закатная тема',
                description: 'Тема с градиентом закатного неба',
                price: 130,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #FF4500, #FF8C00, #FFD700)',
                textColor: '#ffffff',
                icon: '🌅',
                pattern: 'none'
            },
            {
                id: 'theme_rainbow',
                name: '🌈 Радужная тема',
                description: 'Яркая радужная тема со всеми цветами',
                price: 200,
                type: 'theme',
                category: 'special',
                rarity: 'epic',
                gradient: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #8B00FF)',
                textColor: '#ffffff',
                icon: '🌈',
                pattern: 'confetti'
            },
            {
                id: 'theme_ice_cold',
                name: '❄️ Ледяная тема',
                description: 'Холодная тема с ледяным градиентом',
                price: 110,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #E0FFFF, #AFEEEE, #00CED1)',
                textColor: '#000080',
                icon: '❄️',
                pattern: 'snowflakes'
            },
            {
                id: 'theme_neon_pink',
                name: '💖 Неоновая тема',
                description: 'Яркая неоновая розовая тема',
                price: 170,
                type: 'theme',
                category: 'gradients',
                rarity: 'rare',
                gradient: 'linear-gradient(135deg, #FF00FF, #FF69B4, #FFB6C1)',
                textColor: '#ffffff',
                icon: '💖',
                pattern: 'neon'
            }
        ],
        decorations: [
            // Бейджи
            {
                id: 'badge_gold_star',
                name: '⭐ Золотая звезда',
                description: 'Блестящий золотой бейдж со звездой',
                price: 50,
                type: 'badge',
                rarity: 'common',
                icon: '⭐',
                slot: 'badge'
            },
            {
                id: 'badge_fire',
                name: '🔥 Бейдж огня',
                description: 'Горящий бейдж с анимацией огня',
                price: 75,
                type: 'badge',
                rarity: 'rare',
                icon: '🔥',
                slot: 'badge'
            },
            {
                id: 'badge_crown',
                name: '👑 Королевский бейдж',
                description: 'Бейдж в виде королевской короны',
                price: 100,
                type: 'badge',
                rarity: 'epic',
                icon: '👑',
                slot: 'badge'
            },
            {
                id: 'badge_dragon',
                name: '🐲 Бейдж дракона',
                description: 'Мифический бейдж с драконом',
                price: 150,
                type: 'badge',
                rarity: 'legendary',
                icon: '🐲',
                slot: 'badge'
            },
            
            // Рамки аватара
            {
                id: 'frame_gold',
                name: '🖼️ Золотая рамка',
                description: 'Элегантная золотая рамка для аватара',
                price: 80,
                type: 'frame',
                rarity: 'rare',
                icon: '🖼️',
                slot: 'avatar_frame'
            },
            {
                id: 'frame_hearts',
                name: '💕 Рамка с сердцами',
                description: 'Милая рамка с плавающими сердцами',
                price: 60,
                type: 'frame',
                rarity: 'common',
                icon: '💕',
                slot: 'avatar_frame'
            },
            {
                id: 'frame_galaxy',
                name: '🌠 Галактическая рамка',
                description: 'Космическая рамка с вращающимися звездами',
                price: 120,
                type: 'frame',
                rarity: 'epic',
                icon: '🌠',
                slot: 'avatar_frame'
            },
            
            // Эффекты
            {
                id: 'effect_sparkles',
                name: '✨ Эффект сияния',
                description: 'Мерцающие частицы вокруг профиля',
                price: 90,
                type: 'effect',
                rarity: 'rare',
                icon: '✨',
                slot: 'effect'
            },
            {
                id: 'effect_confetti',
                name: '🎉 Эффект конфетти',
                description: 'Праздничные конфетти вокруг профиля',
                price: 70,
                type: 'effect',
                rarity: 'common',
                icon: '🎉',
                slot: 'effect'
            },
            {
                id: 'effect_rainbow',
                name: '🌈 Радужный эффект',
                description: 'Плавная радужная анимация',
                price: 110,
                type: 'effect',
                rarity: 'epic',
                icon: '🌈',
                slot: 'effect'
            },
            
            // Титулы
            {
                id: 'title_legend',
                name: '🏆 Легенда',
                description: 'Эксклюзивный титул "Легенда"',
                price: 200,
                type: 'title',
                rarity: 'legendary',
                icon: '🏆',
                slot: 'title'
            },
            {
                id: 'title_champion',
                name: '🥇 Чемпион',
                description: 'Почетный титул "Чемпион"',
                price: 150,
                type: 'title',
                rarity: 'epic',
                icon: '🥇',
                slot: 'title'
            },
            {
                id: 'title_hero',
                name: '🦸 Герой',
                description: 'Титул "Герой" под вашим ником',
                price: 100,
                type: 'title',
                rarity: 'rare',
                icon: '🦸',
                slot: 'title'
            }
        ],
        animated: [
            {
                id: 'anim_flying_stars',
                name: '🌠 Летающие звезды',
                description: 'Анимированные звезды, летающие вокруг профиля',
                price: 150,
                type: 'animation',
                rarity: 'epic',
                icon: '🌠',
                animation: 'fly'
            },
            {
                id: 'anim_hearts',
                name: '💖 Парящие сердца',
                description: 'Анимированные сердца, поднимающиеся вверх',
                price: 120,
                type: 'animation',
                rarity: 'rare',
                icon: '💖',
                animation: 'float'
            },
            {
                id: 'anim_snow',
                name: '❄️ Падающий снег',
                description: 'Реалистичная анимация падающего снега',
                price: 100,
                type: 'animation',
                rarity: 'common',
                icon: '❄️',
                animation: 'snow'
            },
            {
                id: 'anim_fireworks',
                name: '🎆 Фейерверк',
                description: 'Праздничный фейерверк вокруг профиля',
                price: 180,
                type: 'animation',
                rarity: 'legendary',
                icon: '🎆',
                animation: 'fireworks'
            },
            {
                id: 'anim_bubbles',
                name: '🫧 Пузырьки',
                description: 'Плавно поднимающиеся пузырьки',
                price: 90,
                type: 'animation',
                rarity: 'common',
                icon: '🫧',
                animation: 'bubbles'
            },
            {
                id: 'anim_butterflies',
                name: '🦋 Бабочки',
                description: 'Порхающие анимированные бабочки',
                price: 130,
                type: 'animation',
                rarity: 'rare',
                icon: '🦋',
                animation: 'butterflies'
            }
        ]
    };
    
    try {
        await database.ref('shop_items').set(demoItems);
        console.log('✅ Демо-товары успешно созданы');
    } catch (error) {
        console.error('❌ Ошибка создания демо-товаров:', error);
        throw error;
    }
}

// ===========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ===========================================
function findItemById(itemId) {
    // Ищем товар во всех категориях
    const allItems = getAllItems();
    return allItems.find(item => item.id === itemId);
}

function getAllItems() {
    return [
        ...(shopItems.themes || []),
        ...(shopItems.decorations || []),
        ...(shopItems.animated || [])
    ];
}

function isItemOwned(itemId) {
    return userInventory.some(item => item.id === itemId);
}

function getRarityText(rarity) {
    const rarityMap = {
        'common': 'Обычная',
        'rare': 'Редкая',
        'epic': 'Эпическая',
        'legendary': 'Легендарная',
        'mythic': 'Мифическая'
    };
    return rarityMap[rarity] || rarity;
}

function getRarityIcon(rarity) {
    const iconMap = {
        'common': 'fa-circle',
        'rare': 'fa-gem',
        'epic': 'fa-crown',
        'legendary': 'fa-fire',
        'mythic': 'fa-star'
    };
    return iconMap[rarity] || 'fa-circle';
}

function getRarityColor(rarity) {
    const colorMap = {
        'common': '#666666',
        'rare': '#0088ff',
        'epic': '#aa00ff',
        'legendary': '#ffaa00',
        'mythic': '#ff0066'
    };
    return colorMap[rarity] || '#666666';
}

function getTypeText(type) {
    const typeMap = {
        'theme': 'Тема',
        'badge': 'Бейдж',
        'frame': 'Рамка',
        'effect': 'Эффект',
        'title': 'Титул',
        'animation': 'Анимация'
    };
    return typeMap[type] || type;
}

function getTypeIcon(type) {
    const iconMap = {
        'theme': 'palette',
        'badge': 'certificate',
        'frame': 'square',
        'effect': 'magic',
        'title': 'crown',
        'animation': 'film'
    };
    return iconMap[type] || 'question';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// ===========================================
// УВЕДОМЛЕНИЯ И ОШИБКИ
// ===========================================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'shop-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(0, 204, 102, 0.95)' : 'rgba(255, 68, 68, 0.95)'};
        border: 2px solid ${type === 'success' ? '#00cc66' : '#ff4444'};
        border-radius: 12px;
        padding: 18px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        max-width: 350px;
        font-size: 15px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 22px;">
            ${type === 'success' ? '✅' : '⚠️'}
        </div>
        <div>
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 16px;">
                ${type === 'success' ? 'Успешно!' : 'Ошибка'}
            </div>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Добавляем стили для анимации
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
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
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 5000);
}

function showError(message) {
    showNotification(message, 'error');
}
