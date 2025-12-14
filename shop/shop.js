// shop.js
const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

let userId = null;
let userBalance = 0;
let userInventory = [];
let shopItems = {};

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
        }
    }, 400);
};

async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    if (!userId) {
        showError('Для доступа к магазину необходимо войти в аккаунт');
        setTimeout(() => window.location.href = '../index.html', 3000);
        return false;
    }
    return true;
}

async function loadUserData() {
    try {
        // Загружаем баланс
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnapshot.exists()) {
            const pointsData = pointsSnapshot.val();
            userBalance = pointsData.total_points || 0;
            document.getElementById('user-balance').textContent = userBalance;
        }
        
        // Загружаем инвентарь
        const inventorySnapshot = await database.ref('user_inventory/' + userId).once('value');
        if (inventorySnapshot.exists()) {
            userInventory = inventorySnapshot.val() || [];
        } else {
            // Создаем пустой инвентарь
            await database.ref('user_inventory/' + userId).set([]);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных пользователя');
    }
}

async function loadShopItems() {
    // Загружаем товары из базы данных
    try {
        const snapshot = await database.ref('shop_items').once('value');
        if (snapshot.exists()) {
            shopItems = snapshot.val();
            displayShopItems();
        } else {
            // Создаем демо-товары
            await createDemoItems();
            await loadShopItems();
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showError('Ошибка загрузки каталога магазина');
    }
}

async function createDemoItems() {
    const demoItems = {
        themes: [
            {
                id: 'theme_1',
                name: 'Красный градиент',
                description: 'Яркая красная тема с огненным градиентом',
                price: 100,
                type: 'theme',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
                previewColor: '#ff6b6b'
            },
            // ... остальные темы
        ],
        decorations: [
            {
                id: 'badge_1',
                name: 'Золотой бейдж',
                description: 'Блестящий золотой бейдж рядом с вашим ником',
                price: 50,
                type: 'badge',
                rarity: 'rare',
                icon: '🥇'
            },
            // ... остальные украшения
        ],
        animated: [
            {
                id: 'effect_1',
                name: 'Сияние звезд',
                description: 'Анимированные звезды вокруг вашего аватара',
                price: 200,
                type: 'effect',
                rarity: 'epic',
                icon: '✨',
                animation: 'sparkle'
            }
        ]
    };
    
    await database.ref('shop_items').set(demoItems);
}

function displayShopItems() {
    // Отображаем темы профиля
    displayThemes();
    // Отображаем украшения
    displayDecorations();
    // Отображаем анимированные элементы
    displayAnimatedItems();
    // Отображаем купленные товары
    displayPurchasedItems();
}

function displayThemes() {
    const themesGrid = document.getElementById('themes-grid');
    const themes = shopItems.themes || [];
    
    themesGrid.innerHTML = themes.map(theme => {
        const isOwned = userInventory.some(item => item.id === theme.id);
        
        return `
            <div class="product-card ${isOwned ? 'owned' : ''}" data-id="${theme.id}">
                <div class="theme-preview" style="background: ${theme.gradient};">
                    ${theme.pattern ? `<div class="pattern-overlay pattern-${theme.pattern}"></div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-name">
                        ${theme.name}
                        <span class="rarity ${theme.rarity}">${theme.rarity}</span>
                    </div>
                    <div class="product-description">${theme.description}</div>
                    <div class="product-stats">
                        <div class="product-stat">
                            <i class="fas fa-paint-brush"></i> Тема профиля
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
                            `<button class="equip-btn" onclick="equipItem('${theme.id}')">
                                <i class="fas fa-check"></i> Применить
                            </button>` :
                            `<button class="preview-btn" onclick="previewTheme('${theme.id}')">
                                <i class="fas fa-eye"></i> Превью
                            </button>
                            <button class="buy-btn" onclick="showPurchaseModal('${theme.id}')" 
                                    ${userBalance < theme.price ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> Купить
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function showPurchaseModal(itemId) {
    // Находим товар
    const allItems = [...shopItems.themes, ...shopItems.decorations, ...shopItems.animated];
    const item = allItems.find(i => i.id === itemId);
    
    if (!item) return;
    
    const modal = document.getElementById('purchase-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = `Покупка: ${item.name}`;
    
    modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 60px; margin-bottom: 15px;">${item.icon || '🎁'}</div>
            <h3 style="color: white; margin-bottom: 10px;">${item.name}</h3>
            <p style="color: #aaaaff;">${item.description}</p>
        </div>
        <div style="background: rgba(255,255,255,0.05); border-radius: 15px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="color: #aaaaff;">Стоимость:</span>
                <span style="color: #ffcc00; font-size: 24px; font-family: Michroma;">${item.price} очков</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #aaaaff;">Ваш баланс:</span>
                <span style="color: ${userBalance >= item.price ? '#00ff00' : '#ff4444'}; 
                      font-size: 20px; font-family: Michroma;">
                    ${userBalance} очков
                </span>
            </div>
        </div>
        ${userBalance < item.price ? 
            `<div style="background: rgba(255,68,68,0.1); border: 2px solid #ff4444; 
                 border-radius: 10px; padding: 15px; text-align: center; color: #ffaaaa;">
                <i class="fas fa-exclamation-triangle"></i> Недостаточно очков!
                <p style="margin-top: 10px; font-size: 14px;">
                    <a href="../points/points.html" style="color: #00ff00;">Получить больше очков →</a>
                </p>
            </div>` : 
            `<div style="background: rgba(0,255,0,0.1); border: 2px solid #00ff00; 
                 border-radius: 10px; padding: 15px; text-align: center; color: #aaffaa;">
                <i class="fas fa-check-circle"></i> Достаточно очков для покупки!
            </div>`
        }
    `;
    
    document.getElementById('confirm-purchase').onclick = () => purchaseItem(itemId);
    
    modal.style.display = 'flex';
}

async function purchaseItem(itemId) {
    // Находим товар и проверяем баланс
    const allItems = [...shopItems.themes, ...shopItems.decorations, ...shopItems.animated];
    const item = allItems.find(i => i.id === itemId);
    
    if (!item || userBalance < item.price) {
        showError('Недостаточно очков для покупки');
        return;
    }
    
    try {
        // Вычитаем очки
        const newBalance = userBalance - item.price;
        
        // Обновляем баланс в базе данных
        await database.ref('holiday_points/' + userId).update({
            total_points: newBalance
        });
        
        // Добавляем товар в инвентарь
        userInventory.push({
            id: item.id,
            name: item.name,
            type: item.type,
            purchased: new Date().toISOString()
        });
        
        await database.ref('user_inventory/' + userId).set(userInventory);
        
        // Обновляем UI
        userBalance = newBalance;
        document.getElementById('user-balance').textContent = newBalance;
        
        // Показываем уведомление
        showNotification(`Вы успешно приобрели "${item.name}"!`, 'success');
        
        // Закрываем модальное окно
        document.getElementById('purchase-modal').style.display = 'none';
        
        // Перезагружаем товары
        displayShopItems();
        
    } catch (error) {
        console.error('Ошибка покупки:', error);
        showError('Ошибка при покупке товара');
    }
}

function setupEventListeners() {
    // Категории тем
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterThemes(this.dataset.category);
        });
    });
    
    // Табы украшений
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterDecorations(this.dataset.type);
        });
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Кастомный дизайн
    document.getElementById('preview-custom').addEventListener('click', previewCustomDesign);
    document.getElementById('buy-custom').addEventListener('click', buyCustomDesign);
    
    // Слушатели для input color
    document.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('input', updateCustomPreview);
    });
    
    // Узоры
    document.querySelectorAll('.pattern').forEach(pattern => {
        pattern.addEventListener('click', function() {
            document.querySelectorAll('.pattern').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            updateCustomPreview();
        });
    });
}

function showError(message) {
    // Функция показа ошибок
}

function showNotification(message, type) {
    // Функция показа уведомлений
}

function createParticles() {
    // Функция создания частиц
}

// Остальные функции для работы магазина...
