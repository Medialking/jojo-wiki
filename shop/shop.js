// ===========================================
// НОВОГОДНИЙ МАГАЗИН - ПОЛНЫЙ ФАЙЛ
// ===========================================

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
// ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКОГО ИНТЕРФЕЙСА
// ===========================================
function updateUI() {
    // Обновляем баланс
    document.getElementById('user-balance').textContent = userBalance;
    
    // Отображаем товары
    displayThemes();
    displayDecorations();
    displayAnimatedItems();
    displayPurchasedItems();
    
    // Обновляем кнопки покупки
    updateBuyButtons();
}

// ===========================================
// ОТОБРАЖЕНИЕ ТЕМ ПРОФИЛЯ
// ===========================================
function displayThemes() {
    const themesGrid = document.getElementById('themes-grid');
    
    // Фильтруем темы по категории
    let filteredThemes = shopItems.themes || [];
    if (currentFilter === 'gradients') {
        filteredThemes = filteredThemes.filter(theme => theme.category === 'gradients');
    } else if (currentFilter === 'special') {
        filteredThemes = filteredThemes.filter(theme => theme.category === 'special');
    } else if (currentFilter === 'custom') {
        // Для кастомных тем показываем специальную карточку
        themesGrid.innerHTML = createCustomThemeCard();
        return;
    }
    
    if (filteredThemes.length === 0) {
        themesGrid.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <p>Товары не найдены</p>
                <small>Попробуйте другую категорию</small>
            </div>
        `;
        return;
    }
    
    themesGrid.innerHTML = filteredThemes.map(theme => createThemeCard(theme)).join('');
}

function createThemeCard(theme) {
    const isOwned = isItemOwned(theme.id);
    const canAfford = userBalance >= theme.price;
    
    return `
        <div class="product-card ${isOwned ? 'owned' : ''}" data-id="${theme.id}">
            <div class="theme-preview" style="background: ${theme.gradient};">
                ${theme.pattern && theme.pattern !== 'none' ? 
                    `<div class="pattern-overlay pattern-${theme.pattern}"></div>` : ''}
                <div class="theme-icon">${theme.icon}</div>
            </div>
            <div class="product-info">
                <div class="product-name">
                    ${theme.name}
                    <span class="rarity ${theme.rarity}">${getRarityText(theme.rarity)}</span>
                </div>
                <div class="product-description">${theme.description}</div>
                <div class="product-stats">
                    <div class="product-stat">
                        <i class="fas fa-paint-brush"></i> Тема профиля
                    </div>
                    <div class="product-stat">
                        <i class="fas ${getRarityIcon(theme.rarity)}"></i> ${getRarityText(theme.rarity)}
                    </div>
                </div>
            </div>
            <div class="product-price">
                <div class="price-tag">
                    <div class="price-icon">💰</div>
                    <div class="price-amount">${theme.price}</div>
                </div>
                <div class="product-actions">
                    ${isOwned ? 
                        `<button class="equip-btn" onclick="equipItem('${theme.id}')" title="Применить тему">
                            <i class="fas fa-check"></i> Применить
                        </button>` :
                        `<button class="preview-btn" onclick="previewTheme('${theme.id}')" title="Предпросмотр">
                            <i class="fas fa-eye"></i> Превью
                        </button>
                        <button class="buy-btn" onclick="showPurchaseModal('${theme.id}')" 
                                ${!canAfford ? 'disabled' : ''} title="${canAfford ? 'Купить' : 'Недостаточно очков'}">
                            <i class="fas fa-shopping-cart"></i> Купить
                        </button>`
                    }
                </div>
            </div>
        </div>
    `;
}

function createCustomThemeCard() {
    return `
        <div class="product-card custom-theme-card">
            <div class="theme-preview custom-preview">
                <div class="color-mixer">
                    <div class="color-circle" style="background: #ff0000;"></div>
                    <div class="color-circle" style="background: #00ff00;"></div>
                    <div class="color-circle" style="background: #0000ff;"></div>
                </div>
                <div class="custom-icon">🎨</div>
            </div>
            <div class="product-info">
                <div class="product-name">
                    ✨ Кастомный дизайн
                    <span class="rarity legendary">Эксклюзив</span>
                </div>
                <div class="product-description">
                    Создайте свою уникальную тему профиля! Выберите цвета, узоры и создайте неповторимый дизайн.
                </div>
                <div class="product-stats">
                    <div class="product-stat">
                        <i class="fas fa-palette"></i> Полная кастомизация
                    </div>
                    <div class="product-stat">
                        <i class="fas fa-star"></i> Уникальный дизайн
                    </div>
                </div>
            </div>
            <div class="product-price">
                <div class="price-tag">
                    <div class="price-icon">💰</div>
                    <div class="price-amount">500</div>
                </div>
                <div class="product-actions">
                    <button class="preview-btn" onclick="openCustomDesignModal()" title="Создать дизайн">
                        <i class="fas fa-magic"></i> Создать
                    </button>
                    <button class="buy-btn custom-buy-btn" onclick="showCustomDesignModal()" 
                            ${userBalance >= 500 ? '' : 'disabled'} title="${userBalance >= 500 ? 'Создать кастомный дизайн' : 'Недостаточно очков'}">
                        <i class="fas fa-wand-magic-sparkles"></i> Кастомный
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===========================================
// ОТОБРАЖЕНИЕ УКРАШЕНИЙ
// ===========================================
function displayDecorations() {
    const decorationsGrid = document.getElementById('decorations-grid');
    
    // Фильтруем украшения по типу
    let filteredDecorations = shopItems.decorations || [];
    if (currentDecorationType !== 'all') {
        filteredDecorations = filteredDecorations.filter(item => item.type === currentDecorationType);
    }
    
    if (filteredDecorations.length === 0) {
        decorationsGrid.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <p>Украшения не найдены</p>
                <small>Попробуйте другую категорию</small>
            </div>
        `;
        return;
    }
    
    decorationsGrid.innerHTML = filteredDecorations.map(item => createDecorationCard(item)).join('');
}

function createDecorationCard(item) {
    const isOwned = isItemOwned(item.id);
    const canAfford = userBalance >= item.price;
    
    return `
        <div class="decoration-card ${isOwned ? 'owned' : ''}" data-id="${item.id}">
            <div class="decoration-icon">
                ${item.icon}
                ${isOwned ? '<div class="owned-badge">✓</div>' : ''}
            </div>
            <div class="product-info">
                <div class="product-name">
                    ${item.name}
                    <span class="rarity ${item.rarity}">${getRarityText(item.rarity)}</span>
                </div>
                <div class="product-description">${item.description}</div>
                <div class="product-stats">
                    <div class="product-stat">
                        <i class="fas fa-${getTypeIcon(item.type)}"></i> ${getTypeText(item.type)}
                    </div>
                    <div class="product-stat">
                        <i class="fas ${getRarityIcon(item.rarity)}"></i> ${getRarityText(item.rarity)}
                    </div>
                </div>
            </div>
            <div class="product-price">
                <div class="price-tag">
                    <div class="price-icon">💰</div>
                    <div class="price-amount">${item.price}</div>
                </div>
                <div class="product-actions">
                    ${isOwned ? 
                        `<button class="equip-btn" onclick="equipDecoration('${item.id}')" title="Надеть украшение">
                            <i class="fas fa-check"></i> Надеть
                        </button>` :
                        `<button class="buy-btn" onclick="showPurchaseModal('${item.id}')" 
                                ${!canAfford ? 'disabled' : ''} title="${canAfford ? 'Купить' : 'Недостаточно очков'}">
                            <i class="fas fa-shopping-cart"></i> Купить
                        </button>`
                    }
                </div>
            </div>
        </div>
    `;
}

// ===========================================
// ОТОБРАЖЕНИЕ АНИМИРОВАННЫХ ЭЛЕМЕНТОВ
// ===========================================
function displayAnimatedItems() {
    const animatedGrid = document.getElementById('animated-grid');
    const animatedItems = shopItems.animated || [];
    
    if (animatedItems.length === 0) {
        animatedGrid.innerHTML = `
            <div class="empty-products">
                <i class="fas fa-box-open"></i>
                <p>Анимированные элементы не найдены</p>
                <small>Загляните сюда позже</small>
            </div>
        `;
        return;
    }
    
    animatedGrid.innerHTML = animatedItems.map(item => createAnimatedCard(item)).join('');
}

function createAnimatedCard(item) {
    const isOwned = isItemOwned(item.id);
    const canAfford = userBalance >= item.price;
    
    return `
        <div class="animated-card ${isOwned ? 'owned' : ''}" data-id="${item.id}">
            <div class="animated-icon">
                ${item.icon}
                ${isOwned ? '<div class="owned-badge">✓</div>' : ''}
            </div>
            <div class="product-info">
                <div class="product-name">
                    ${item.name}
                    <span class="rarity ${item.rarity}">${getRarityText(item.rarity)}</span>
                </div>
                <div class="product-description">${item.description}</div>
                <div class="product-stats">
                    <div class="product-stat">
                        <i class="fas fa-film"></i> Анимация
                    </div>
                    <div class="product-stat">
                        <i class="fas ${getRarityIcon(item.rarity)}"></i> ${getRarityText(item.rarity)}
                    </div>
                </div>
            </div>
            <div class="product-price">
                <div class="price-tag">
                    <div class="price-icon">💰</div>
                    <div class="price-amount">${item.price}</div>
                </div>
                <div class="product-actions">
                    ${isOwned ? 
                        `<button class="equip-btn" onclick="equipAnimation('${item.id}')" title="Активировать анимацию">
                            <i class="fas fa-play"></i> Включить
                        </button>` :
                        `<button class="preview-btn" onclick="previewAnimation('${item.id}')" title="Предпросмотр анимации">
                            <i class="fas fa-eye"></i> Превью
                        </button>
                        <button class="buy-btn" onclick="showPurchaseModal('${item.id}')" 
                                ${!canAfford ? 'disabled' : ''} title="${canAfford ? 'Купить' : 'Недостаточно очков'}">
                            <i class="fas fa-shopping-cart"></i> Купить
                        </button>`
                    }
                </div>
            </div>
        </div>
    `;
}

// ===========================================
// ОТОБРАЖЕНИЕ КУПЛЕННЫХ ТОВАРОВ
// ===========================================
function displayPurchasedItems() {
    const purchasesList = document.getElementById('purchases-list');
    
    if (!userInventory || userInventory.length === 0) {
        purchasesList.innerHTML = `
            <div class="empty-purchases">
                <i class="fas fa-gift"></i>
                <p>У вас пока нет покупок</p>
                <small>Выберите товары выше и приобретите их</small>
            </div>
        `;
        return;
    }
    
    // Группируем товары по типу для лучшего отображения
    const themes = userInventory.filter(item => {
        const shopItem = getAllItems().find(shopItem => shopItem.id === item.id);
        return shopItem && shopItem.type === 'theme';
    }).slice(0, 6);
    
    const decorations = userInventory.filter(item => {
        const shopItem = getAllItems().find(shopItem => shopItem.id === item.id);
        return shopItem && (shopItem.type === 'badge' || shopItem.type === 'frame' || 
                           shopItem.type === 'effect' || shopItem.type === 'title');
    }).slice(0, 6);
    
    const animated = userInventory.filter(item => {
        const shopItem = getAllItems().find(shopItem => shopItem.id === item.id);
        return shopItem && shopItem.type === 'animation';
    }).slice(0, 6);
    
    const allItems = [...themes, ...decorations, ...animated];
    
    if (allItems.length === 0) {
        purchasesList.innerHTML = `
            <div class="empty-purchases">
                <i class="fas fa-gift"></i>
                <p>У вас пока нет покупок</p>
                <small>Выберите товары выше и приобретите их</small>
            </div>
        `;
        return;
    }
    
    purchasesList.innerHTML = allItems.map(item => {
        const shopItem = getAllItems().find(shopItem => shopItem.id === item.id);
        if (!shopItem) return '';
        
        const purchaseDate = item.purchased ? new Date(item.purchased).toLocaleDateString('ru-RU') : 'Недавно';
        
        return `
            <div class="purchase-item">
                <div class="purchase-icon">${shopItem.icon || '🎁'}</div>
                <div class="purchase-info">
                    <div class="purchase-name">${shopItem.name}</div>
                    <div class="purchase-date">Куплено: ${purchaseDate}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ===========================================
// ПОКАЗ МОДАЛЬНОГО ОКНА ПОКУПКИ
// ===========================================
async function showPurchaseModal(itemId) {
    console.log('🛒 Показываю модальное окно покупки для:', itemId);
    
    const item = findItemById(itemId);
    if (!item) {
        showError('Товар не найден');
        return;
    }
    
    const isOwned = isItemOwned(itemId);
    if (isOwned) {
        showError('Вы уже владеете этим товаром');
        return;
    }
    
    const modal = document.getElementById('purchase-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = `Покупка: ${item.name}`;
    
    const canAfford = userBalance >= item.price;
    
    modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px;">
            <div style="font-size: 64px; margin-bottom: 15px; color: ${getRarityColor(item.rarity)};">
                ${item.icon || '🎁'}
            </div>
            <h3 style="color: white; margin-bottom: 10px; font-size: 22px;">${item.name}</h3>
            <p style="color: #aaaaff; font-size: 15px; line-height: 1.5;">${item.description}</p>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.05); border-radius: 15px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="color: #aaaaff; font-size: 15px;">
                    <i class="fas fa-tag"></i> Стоимость:
                </div>
                <div style="color: #ffcc00; font-size: 28px; font-family: 'Michroma', monospace; font-weight: bold;">
                    ${item.price} очков
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #aaaaff; font-size: 15px;">
                    <i class="fas fa-wallet"></i> Ваш баланс:
                </div>
                <div style="color: ${canAfford ? '#00ff00' : '#ff4444'}; 
                      font-size: 22px; font-family: 'Michroma', monospace; font-weight: bold;">
                    ${userBalance} очков
                </div>
            </div>
            
            ${!canAfford ? 
                `<div style="margin-top: 15px; padding: 12px; background: rgba(255, 68, 68, 0.1); 
                     border-radius: 10px; border-left: 4px solid #ff4444;">
                    <div style="color: #ffaaaa; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Недостаточно очков. Нужно еще <strong>${item.price - userBalance}</strong> очков</span>
                    </div>
                </div>` : 
                `<div style="margin-top: 15px; padding: 12px; background: rgba(0, 255, 0, 0.1); 
                     border-radius: 10px; border-left: 4px solid #00ff00;">
                    <div style="color: #aaffaa; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-check-circle"></i>
                        <span>Достаточно очков для покупки!</span>
                    </div>
                </div>`
            }
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 10px;">
            <div style="flex: 1; background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 15px; text-align: center;">
                <div style="color: #aaaaff; font-size: 12px; margin-bottom: 5px;">Редкость</div>
                <div style="color: ${getRarityColor(item.rarity)}; font-size: 14px; font-weight: bold;">
                    ${getRarityText(item.rarity)}
                </div>
            </div>
            <div style="flex: 1; background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 15px; text-align: center;">
                <div style="color: #aaaaff; font-size: 12px; margin-bottom: 5px;">Тип</div>
                <div style="color: #ffcc00; font-size: 14px; font-weight: bold;">
                    ${getTypeText(item.type)}
                </div>
            </div>
        </div>
    `;
    
    // Устанавливаем обработчик для кнопки подтверждения
    const confirmBtn = document.getElementById('confirm-purchase');
    confirmBtn.onclick = () => purchaseItem(itemId);
    confirmBtn.disabled = !canAfford;
    confirmBtn.innerHTML = canAfford ? 
        `<i class="fas fa-shopping-cart"></i> Купить за ${item.price} очков` :
        `<i class="fas fa-lock"></i> Недостаточно очков`;
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
}

// ===========================================
// ПОКУПКА ТОВАРА
// ===========================================
async function purchaseItem(itemId) {
    console.log('💰 Покупаю товар:', itemId);
    
    const item = findItemById(itemId);
    if (!item) {
        showError('Товар не найден');
        return;
    }
    
    // Проверяем, владеет ли пользователь уже этим товаром
    if (isItemOwned(itemId)) {
        showError('Вы уже владеете этим товаром');
        closeModal('purchase-modal');
        return;
    }
    
    // Проверяем баланс
    if (userBalance < item.price) {
        showError('Недостаточно новогодних очков для покупки');
        return;
    }
    
    try {
        // Показываем загрузку
        const confirmBtn = document.getElementById('confirm-purchase');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Покупка...';
        confirmBtn.disabled = true;
        
        // Вычитаем очки из баланса
        const newBalance = userBalance - item.price;
        
        // Обновляем баланс в базе данных
        await database.ref('holiday_points/' + userId).update({
            total_points: newBalance
        });
        
        // Добавляем товар в инвентарь
        const newInventoryItem = {
            id: item.id,
            name: item.name,
            type: item.type,
            purchased: new Date().toISOString(),
            icon: item.icon,
            rarity: item.rarity
        };
        
        // Если это тема, сохраняем ее конфигурацию
        if (item.type === 'theme') {
            newInventoryItem.configuration = {
                gradient: item.gradient,
                textColor: item.textColor,
                pattern: item.pattern,
                icon: item.icon
            };
        }
        
        userInventory.push(newInventoryItem);
        await database.ref('user_inventory/' + userId).set(userInventory);
        
        // Обновляем локальные данные
        userBalance = newBalance;
        
        // Показываем уведомление об успешной покупке
        showNotification(`🎉 Вы успешно приобрели "${item.name}"!`, 'success');
        
        // Закрываем модальное окно
        closeModal('purchase-modal');
        
        // Обновляем UI
        updateUI();
        
        console.log(`✅ Товар "${item.name}" успешно куплен за ${item.price} очков`);
        
    } catch (error) {
        console.error('❌ Ошибка покупки товара:', error);
        showError('Ошибка при покупке товара. Попробуйте позже.');
        
        // Восстанавливаем кнопку
        const confirmBtn = document.getElementById('confirm-purchase');
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// ===========================================
// ПРИМЕНЕНИЕ ТОВАРА (ТЕМЫ/УКРАШЕНИЯ)
// ===========================================
async function equipItem(itemId) {
    console.log('🎨 Применяю тему:', itemId);
    
    const item = findItemById(itemId);
    if (!item || item.type !== 'theme') {
        showError('Тема не найдена');
        return;
    }
    
    if (!isItemOwned(itemId)) {
        showError('Вы не владеете этой темой');
        return;
    }
    
    try {
        // Сохраняем выбранную тему в профиле пользователя
        await database.ref('users/' + userId).update({
            profile_theme: itemId,
            theme_applied: new Date().toISOString()
        });
        
        showNotification(`🎨 Тема "${item.name}" применена к вашему профилю!`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка применения темы:', error);
        showError('Ошибка применения темы');
    }
}

async function equipDecoration(decorationId) {
    console.log('✨ Применяю украшение:', decorationId);
    
    const item = findItemById(decorationId);
    if (!item || !['badge', 'frame', 'effect', 'title'].includes(item.type)) {
        showError('Украшение не найдено');
        return;
    }
    
    if (!isItemOwned(decorationId)) {
        showError('Вы не владеете этим украшением');
        return;
    }
    
    try {
        // Получаем текущие активные украшения
        const userSnapshot = await database.ref('users/' + userId).once('value');
        const userData = userSnapshot.val() || {};
        const activeDecorations = userData.active_decorations || {};
        
        // Добавляем/обновляем украшение
        activeDecorations[item.type] = {
            id: item.id,
            name: item.name,
            icon: item.icon,
            equipped: new Date().toISOString()
        };
        
        // Сохраняем в профиле
        await database.ref('users/' + userId).update({
            active_decorations: activeDecorations
        });
        
        showNotification(`✨ Украшение "${item.name}" надето!`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка применения украшения:', error);
        showError('Ошибка применения украшения');
    }
}

async function equipAnimation(animationId) {
    console.log('🎬 Активирую анимацию:', animationId);
    
    const item = findItemById(animationId);
    if (!item || item.type !== 'animation') {
        showError('Анимация не найдена');
        return;
    }
    
    if (!isItemOwned(animationId)) {
        showError('Вы не владеете этой анимацией');
        return;
    }
    
    try {
        // Сохраняем активную анимацию в профиле
        await database.ref('users/' + userId).update({
            active_animation: {
                id: item.id,
                name: item.name,
                animation: item.animation,
                activated: new Date().toISOString()
            }
        });
        
        showNotification(`🎬 Анимация "${item.name}" активирована!`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка активации анимации:', error);
        showError('Ошибка активации анимации');
    }
}

// ===========================================
// ПРЕДПРОСМОТР ТЕМЫ
// ===========================================
function previewTheme(themeId) {
    console.log('👁️ Предпросмотр темы:', themeId);
    
    const item = findItemById(themeId);
    if (!item || item.type !== 'theme') {
        showError('Тема не найдена');
        return;
    }
    
    // Открываем страницу предпросмотра с параметром темы
    const previewUrl = `preview.html?theme=${themeId}`;
    window.open(previewUrl, '_blank');
}

function previewAnimation(animationId) {
    console.log('👁️ Предпросмотр анимации:', animationId);
    
    const item = findItemById(animationId);
    if (!item || item.type !== 'animation') {
        showError('Анимация не найдена');
        return;
    }
    
    // Создаем мини-предпросмотр
    const previewDiv = document.createElement('div');
    previewDiv.className = 'animation-preview-overlay';
    previewDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
    `;
    
    let animationHTML = '';
    let animationStyle = '';
    
    // Создаем анимацию в зависимости от типа
    switch(item.animation) {
        case 'fly':
            animationHTML = `
                <div style="position: relative; width: 300px; height: 300px;">
                    <div class="flying-star" style="position: absolute; font-size: 30px;">⭐</div>
                    <div class="flying-star" style="position: absolute; font-size: 30px; animation-delay: 0.5s;">⭐</div>
                    <div class="flying-star" style="position: absolute; font-size: 30px; animation-delay: 1s;">⭐</div>
                </div>
            `;
            animationStyle = `
                @keyframes fly {
                    0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translate(200px, -200px) rotate(360deg); opacity: 0; }
                }
                .flying-star {
                    animation: fly 3s infinite ease-in-out;
                }
            `;
            break;
            
        case 'float':
            animationHTML = `
                <div style="position: relative; width: 300px; height: 300px;">
                    <div style="position: absolute; font-size: 40px; animation: float 2s infinite ease-in-out;">💖</div>
                    <div style="position: absolute; font-size: 40px; animation: float 2s infinite ease-in-out 0.5s;">💖</div>
                    <div style="position: absolute; font-size: 40px; animation: float 2s infinite ease-in-out 1s;">💖</div>
                </div>
            `;
            animationStyle = `
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-20px) scale(1.1); }
                }
            `;
            break;
            
        default:
            animationHTML = `
                <div style="font-size: 100px; margin-bottom: 30px;">
                    ${item.icon}
                </div>
            `;
    }
    
    previewDiv.innerHTML = `
        <style>${animationStyle}</style>
        <div style="background: rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 40px; text-align: center; max-width: 500px; border: 3px solid ${getRarityColor(item.rarity)};">
            <h3 style="color: white; margin-bottom: 10px;">${item.name}</h3>
            <p style="color: #aaaaff; margin-bottom: 30px;">${item.description}</p>
            
            ${animationHTML}
            
            <div style="margin-top: 30px; display: flex; gap: 15px;">
                <button id="close-preview" style="padding: 12px 30px; background: rgba(255, 255, 255, 0.1); border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 10px; color: white; font-family: 'Orbitron', sans-serif; cursor: pointer; transition: all 0.3s;">
                    Закрыть
                </button>
                <button onclick="showPurchaseModal('${item.id}')" style="padding: 12px 30px; background: linear-gradient(90deg, #00cc66, #00ff88); border: none; border-radius: 10px; color: white; font-family: 'Orbitron', sans-serif; font-weight: bold; cursor: pointer; transition: all 0.3s;">
                    Купить за ${item.price} очков
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(previewDiv);
    
    // Закрытие предпросмотра
    document.getElementById('close-preview').addEventListener('click', () => {
        document.body.removeChild(previewDiv);
    });
    
    // Закрытие по клику на фон
    previewDiv.addEventListener('click', (e) => {
        if (e.target === previewDiv) {
            document.body.removeChild(previewDiv);
        }
    });
}

// ===========================================
// КАСТОМНЫЙ ДИЗАЙН
// ===========================================
function openCustomDesignModal() {
    console.log('🎨 Открываю модальное окно кастомного дизайна');
    
    const modal = document.getElementById('custom-design-modal');
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
    
    // Инициализируем значения по умолчанию
    document.getElementById('primary-color').value = '#6200ff';
    document.getElementById('secondary-color').value = '#ff00ff';
    document.getElementById('text-color').value = '#ffffff';
    
    // Сбрасываем выбор узоров
    document.querySelectorAll('.pattern').forEach(p => p.classList.remove('active'));
    document.querySelector('.pattern[data-pattern="none"]').classList.add('active');
    
    // Обновляем предпросмотр
    updateCustomPreview();
}

function updateCustomPreview() {
    const primaryColor = document.getElementById('primary-color').value;
    const secondaryColor = document.getElementById('secondary-color').value;
    const textColor = document.getElementById('text-color').value;
    const selectedPattern = document.querySelector('.pattern.active')?.dataset.pattern || 'none';
    
    const gradientPreview = document.getElementById('gradient-preview');
    gradientPreview.style.background = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
    gradientPreview.style.color = textColor;
    
    // Обновляем цену в зависимости от сложности
    let price = 500; // Базовая цена
    
    // Если выбран сложный узор, увеличиваем цену
    if (selectedPattern === 'confetti' || selectedPattern === 'stars') {
        price = 600;
    }
    
    document.getElementById('custom-price').textContent = price + ' очков';
    document.getElementById('buy-custom').innerHTML = `<i class="fas fa-shopping-cart"></i> Купить за ${price} очков`;
}

function showCustomDesignModal() {
    openCustomDesignModal();
}

async function buyCustomDesign() {
    console.log('🎨 Покупаю кастомный дизайн');
    
    const primaryColor = document.getElementById('primary-color').value;
    const secondaryColor = document.getElementById('secondary-color').value;
    const textColor = document.getElementById('text-color').value;
    const pattern = document.querySelector('.pattern.active')?.dataset.pattern || 'none';
    
    const price = pattern === 'confetti' || pattern === 'stars' ? 600 : 500;
    
    // Проверяем баланс
    if (userBalance < price) {
        showError(`Недостаточно очков. Нужно ${price} очков, у вас ${userBalance}`);
        return;
    }
    
    try {
        // Создаем уникальный ID для кастомной темы
        const customId = 'custom_theme_' + Date.now();
        
        // Создаем объект темы
        const customTheme = {
            id: customId,
            name: 'Мой кастомный дизайн',
            description: 'Уникальный дизайн, созданный вами',
            price: price,
            type: 'theme',
            category: 'custom',
            rarity: 'legendary',
            gradient: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            textColor: textColor,
            pattern: pattern,
            icon: '🎨',
            created: new Date().toISOString(),
            is_custom: true
        };
        
        // Вычитаем очки
        const newBalance = userBalance - price;
        await database.ref('holiday_points/' + userId).update({
            total_points: newBalance
        });
        
        // Добавляем тему в инвентарь
        userInventory.push({
            id: customId,
            name: customTheme.name,
            type: 'theme',
            purchased: new Date().toISOString(),
            configuration: {
                gradient: customTheme.gradient,
                textColor: customTheme.textColor,
                pattern: customTheme.pattern,
                is_custom: true
            },
            custom_data: {
                primaryColor: primaryColor,
                secondaryColor: secondaryColor,
                textColor: textColor,
                pattern: pattern
            }
        });
        
        await database.ref('user_inventory/' + userId).set(userInventory);
        
        // Обновляем локальные данные
        userBalance = newBalance;
        
        // Закрываем модальное окно
        closeModal('custom-design-modal');
        
        // Показываем уведомление
        showNotification('🎨 Вы успешно создали кастомную тему!', 'success');
        
        // Обновляем UI
        updateUI();
        
        // Применяем тему сразу
        setTimeout(() => {
            equipItem(customId);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Ошибка создания кастомного дизайна:', error);
        showError('Ошибка создания дизайна');
    }
}

// ===========================================
// ОБНОВЛЕНИЕ КНОПОК ПОКУПКИ
// ===========================================
function updateBuyButtons() {
    // Обновляем все кнопки покупки на странице
    document.querySelectorAll('.buy-btn').forEach(btn => {
        const productCard = btn.closest('.product-card, .decoration-card, .animated-card');
        if (productCard) {
            const itemId = productCard.dataset.id;
            const item = findItemById(itemId);
            
            if (item) {
                const canAfford = userBalance >= item.price;
                const isOwned = isItemOwned(itemId);
                
                btn.disabled = !canAfford || isOwned;
                btn.title = isOwned ? 'Уже куплено' : 
                           canAfford ? 'Купить' : 'Недостаточно очков';
            }
        }
    });
}

// ===========================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ===========================================
function setupEventListeners() {
    console.log('⚙️ Настраиваю обработчики событий магазина');
    
    // Категории тем
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.category;
            console.log('🎯 Выбрана категория:', currentFilter);
            
            displayThemes();
        });
    });
    
    // Табы украшений
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentDecorationType = this.dataset.type;
            console.log('💎 Выбран тип украшений:', currentDecorationType);
            
            displayDecorations();
        });
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Клик по фону модального окна
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // Кастомный дизайн - обновление предпросмотра
    document.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('input', updateCustomPreview);
    });
    
    // Узоры для кастомного дизайна
    document.querySelectorAll('.pattern').forEach(pattern => {
        pattern.addEventListener('click', function() {
            document.querySelectorAll('.pattern').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            updateCustomPreview();
        });
    });
    
    // Кнопка предпросмотра кастомного дизайна
    document.getElementById('preview-custom').addEventListener('click', function() {
        const primaryColor = document.getElementById('primary-color').value;
        const secondaryColor = document.getElementById('secondary-color').value;
        const textColor = document.getElementById('text-color').value;
        const pattern = document.querySelector('.pattern.active')?.dataset.pattern || 'none';
        
        // Открываем предпросмотр в новом окне
        const themeData = {
            id: 'custom_preview',
            name: 'Кастомный дизайн',
            gradient: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            textColor: textColor,
            pattern: pattern,
            is_custom: true
        };
        
        const previewUrl = `preview.html?custom=${encodeURIComponent(JSON.stringify(themeData))}`;
        window.open(previewUrl, '_blank');
    });
    
    // Кнопка покупки кастомного дизайна
    document.getElementById('buy-custom').addEventListener('click', buyCustomDesign);
    
    // Кнопка инвентаря
    const inventoryBtn = document.getElementById('inventory-btn');
    if (inventoryBtn) {
        inventoryBtn.addEventListener('click', () => {
            // Прокручиваем к разделу с покупками
            document.getElementById('my-purchases').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
    }
    
    console.log('✅ Обработчики событий настроены');
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

// ===========================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ===========================================
// Убедимся, что все загрузилось правильно
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем стили для уведомлений если их нет
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
    
    console.log('🛍️ Магазин новогодних очков инициализирован');
});
