// preview.js - логика страницы предпросмотра

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
let currentTheme = null;
let availableThemes = [];
let userInventory = [];

window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await loadUserData();
            await loadThemes();
            setupEventListeners();
            renderPreview();
        }
    }, 400);
};

async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    if (!userId) {
        showError('Для доступа к предпросмотру необходимо войти в аккаунт');
        setTimeout(() => window.location.href = '../index.html', 3000);
        return false;
    }
    return true;
}

async function loadUserData() {
    try {
        // Загружаем инвентарь пользователя
        const inventorySnapshot = await database.ref('user_inventory/' + userId).once('value');
        if (inventorySnapshot.exists()) {
            userInventory = inventorySnapshot.val() || [];
        }
        
        // Загружаем текущую тему пользователя
        const userSnapshot = await database.ref('users/' + userId).once('value');
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            currentTheme = userData.profile_theme || 'default';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных пользователя');
    }
}

async function loadThemes() {
    try {
        const snapshot = await database.ref('shop_items/themes').once('value');
        if (snapshot.exists()) {
            availableThemes = snapshot.val();
            populateThemeSelect();
        }
    } catch (error) {
        console.error('Ошибка загрузки тем:', error);
        showError('Ошибка загрузки тем профиля');
    }
}

function populateThemeSelect() {
    const select = document.getElementById('theme-select');
    
    // Добавляем стандартную тему
    select.innerHTML = `
        <option value="default">🎨 Стандартная тема</option>
        <option value="custom">✨ Кастомный дизайн</option>
    `;
    
    // Добавляем темы из магазина
    availableThemes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.id;
        option.textContent = `${theme.name} ${userInventory.some(item => item.id === theme.id) ? '✓' : ''}`;
        select.appendChild(option);
    });
    
    // Устанавливаем текущую тему
    if (currentTheme) {
        select.value = currentTheme;
    }
}

function renderPreview() {
    const previewContent = document.getElementById('preview-content');
    const themeInfo = document.getElementById('theme-info');
    const purchaseInfo = document.getElementById('purchase-info');
    
    // Получаем выбранную тему
    const selectedThemeId = document.getElementById('theme-select').value;
    let theme = null;
    
    if (selectedThemeId === 'default') {
        theme = {
            id: 'default',
            name: 'Стандартная тема',
            description: 'Базовая тема профиля с градиентом по рангу',
            price: 0,
            owned: true
        };
    } else if (selectedThemeId === 'custom') {
        theme = {
            id: 'custom',
            name: 'Кастомный дизайн',
            description: 'Ваш уникальный дизайн профиля',
            price: 500,
            owned: userInventory.some(item => item.id === 'custom_design')
        };
    } else {
        theme = availableThemes.find(t => t.id === selectedThemeId);
        if (theme) {
            theme.owned = userInventory.some(item => item.id === theme.id);
        }
    }
    
    if (!theme) return;
    
    // Обновляем информацию о теме
    themeInfo.innerHTML = `
        <h4 style="color: white; margin-bottom: 10px;">${theme.name}</h4>
        <p>${theme.description}</p>
        <div style="margin-top: 15px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <span style="color: #aaaaff;">Тип:</span>
                <span style="color: white;">Тема профиля</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <span style="color: #aaaaff;">Статус:</span>
                <span style="color: ${theme.owned ? '#00ff00' : '#ff4444'}; font-weight: bold;">
                    ${theme.owned ? 'Владеете' : 'Не приобретена'}
                </span>
            </div>
        </div>
    `;
    
    // Обновляем информацию о покупке
    if (theme.owned) {
        purchaseInfo.innerHTML = `
            <div class="owned-badge">
                <i class="fas fa-check-circle"></i>
                <p>Эта тема уже в вашем инвентаре</p>
                <button class="buy-theme-btn" onclick="applyTheme('${theme.id}')">
                    Применить тему
                </button>
            </div>
        `;
    } else {
        purchaseInfo.innerHTML = `
            <div class="price-display">
                <div class="price-label">Стоимость:</div>
                <div class="price-value">${theme.price} очков</div>
            </div>
            <button class="buy-theme-btn" onclick="buyTheme('${theme.id}')">
                <i class="fas fa-shopping-cart"></i> Купить в магазине
            </button>
        `;
    }
    
    // Рендерим предпросмотр профиля
    renderProfilePreview(theme);
}

function renderProfilePreview(theme) {
    const previewProfile = document.querySelector('.preview-profile');
    
    // Определяем стили темы
    let headerStyle = '';
    let buttonStyle = '';
    let textColor = '#ffffff';
    
    if (theme.id === 'default') {
        headerStyle = 'background: linear-gradient(135deg, rgba(98, 0, 255, 0.2), rgba(255, 0, 255, 0.15));';
        buttonStyle = 'background: linear-gradient(135deg, #6200ff, #ff00ff);';
    } else if (theme.gradient) {
        headerStyle = `background: ${theme.gradient};`;
        buttonStyle = `background: ${theme.gradient};`;
        textColor = theme.textColor || '#ffffff';
    }
    
    // Получаем настройки украшений
    const showBadges = document.getElementById('toggle-badges').checked;
    const showEffects = document.getElementById('toggle-effects').checked;
    const showAnimations = document.getElementById('toggle-animations').checked;
    
    // Рендерим профиль
    previewProfile.innerHTML = `
        <div class="profile-header preview-header" style="${headerStyle}; border: 2px solid ${textColor}; color: ${textColor};">
            ${showEffects ? '<div class="sparkle-effect" style="top: 20px; left: 20px;">✨</div>' : ''}
            ${showEffects ? '<div class="sparkle-effect" style="top: 20px; right: 20px;">✨</div>' : ''}
            
            <div class="profile-avatar preview-avatar">
                👤
                ${showEffects ? '<div class="floating-badge" style="top: -10px; right: -10px;">⭐</div>' : ''}
            </div>
            <div class="profile-info">
                <h2 class="profile-name" style="color: ${textColor};">
                    ${localStorage.getItem('jojoland_nickname') || 'Игрок'}
                    ${showBadges ? '<span class="preview-badge">🏆</span>' : ''}
                    ${showBadges ? '<span class="preview-badge">⭐</span>' : ''}
                </h2>
                <div class="profile-id">ID: ${userId}</div>
                <div class="profile-badges">
                    ${showBadges ? '<div class="badge"><span>🎮</span><span>Игрок</span></div>' : ''}
                    ${showBadges ? '<div class="badge"><span>🎄</span><span>Новый год</span></div>' : ''}
                    ${showBadges ? '<div class="badge"><span>🔥</span><span>Активный</span></div>' : ''}
                </div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card" style="border-left-color: ${textColor};">
                <div class="stat-icon">📅</div>
                <div class="stat-title">Дата регистрации</div>
                <div class="stat-value">01.12.2025</div>
            </div>
            <div class="stat-card" style="border-left-color: ${textColor};">
                <div class="stat-icon">⏱️</div>
                <div class="stat-title">Последний визит</div>
                <div class="stat-value">18:30</div>
            </div>
            <div class="stat-card" style="border-left-color: ${textColor};">
                <div class="stat-icon">🎮</div>
                <div class="stat-title">Уровень активности</div>
                <div class="stat-value">Активный</div>
            </div>
        </div>
        
        <div class="action-buttons">
            <button class="action-btn" style="${buttonStyle}">🏠 На главную</button>
            <button class="action-btn" style="${buttonStyle}">👥 Все игроки</button>
            <button class="action-btn" style="${buttonStyle}">🎄 Новогодние очки</button>
        </div>
    `;
    
    // Добавляем анимации если включены
    if (showAnimations) {
        addAnimations();
    }
}

function addAnimations() {
    // Добавляем анимации к элементам
    const avatar = document.querySelector('.preview-avatar');
    const badges = document.querySelectorAll('.preview-badge');
    
    if (avatar) {
        avatar.style.animation = 'float 3s ease-in-out infinite';
    }
    
    badges.forEach((badge, index) => {
        badge.style.animation = `floatAround ${4 + index}s infinite ease-in-out`;
    });
}

function setupEventListeners() {
    // Изменение темы
    document.getElementById('theme-select').addEventListener('change', renderPreview);
    
    // Переключатели украшений
    document.getElementById('toggle-badges').addEventListener('change', renderPreview);
    document.getElementById('toggle-effects').addEventListener('change', renderPreview);
    document.getElementById('toggle-animations').addEventListener('change', renderPreview);
    
    // Выбор устройства
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const frame = document.getElementById('device-frame');
            frame.className = 'device-frame ' + this.dataset.device;
        });
    });
    
    // Кнопка случайной темы
    document.getElementById('random-theme').addEventListener('click', () => {
        const themes = ['default', 'custom', ...availableThemes.map(t => t.id)];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        document.getElementById('theme-select').value = randomTheme;
        renderPreview();
    });
    
    // Кнопки действий
    document.getElementById('save-preview').addEventListener('click', saveTheme);
    document.getElementById('share-preview').addEventListener('click', sharePreview);
    document.getElementById('reset-preview').addEventListener('click', () => {
        document.getElementById('theme-select').value = 'default';
        renderPreview();
    });
}

async function applyTheme(themeId) {
    try {
        await database.ref('users/' + userId).update({
            profile_theme: themeId,
            theme_applied: new Date().toISOString()
        });
        
        showNotification('Тема успешно применена к вашему профилю!', 'success');
        
    } catch (error) {
        console.error('Ошибка применения темы:', error);
        showError('Ошибка применения темы');
    }
}

async function buyTheme(themeId) {
    // Перенаправляем в магазин
    window.location.href = `shop.html#${themeId}`;
}

async function saveTheme() {
    // Сохраняем текущую конфигурацию как кастомную тему
    const themeName = prompt('Введите название для вашей темы:', 'Моя тема');
    if (!themeName) return;
    
    try {
        // Собираем конфигурацию темы
        const themeConfig = {
            id: 'custom_' + Date.now(),
            name: themeName,
            created: new Date().toISOString(),
            configuration: {
                colors: getCurrentColors(),
                decorations: getCurrentDecorations(),
                animations: getCurrentAnimations()
            }
        };
        
        // Сохраняем в инвентарь пользователя
        userInventory.push({
            id: themeConfig.id,
            name: themeConfig.name,
            type: 'custom_theme',
            configuration: themeConfig.configuration
        });
        
        await database.ref('user_inventory/' + userId).set(userInventory);
        
        showNotification(`Тема "${themeName}" сохранена в ваш инвентарь!`, 'success');
        
    } catch (error) {
        console.error('Ошибка сохранения темы:', error);
        showError('Ошибка сохранения темы');
    }
}

function sharePreview() {
    const themeName = document.getElementById('theme-select').selectedOptions[0].text;
    const shareText = `🎨 Посмотрите на мою тему профиля "${themeName}" в JojoLand!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Моя тема профиля JojoLand',
            text: shareText,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Ссылка скопирована в буфер обмена!', 'success');
        });
    }
}

// Вспомогательные функции
function getCurrentColors() {
    // Получаем текущие цвета из темы
    return {
        primary: '#6200ff',
        secondary: '#ff00ff',
        text: '#ffffff'
    };
}

function getCurrentDecorations() {
    const showBadges = document.getElementById('toggle-badges').checked;
    const showEffects = document.getElementById('toggle-effects').checked;
    
    return {
        badges: showBadges,
        effects: showEffects
    };
}

function getCurrentAnimations() {
    return document.getElementById('toggle-animations').checked;
}

function showError(message) {
    // Функция показа ошибок
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 68, 68, 0.9);
        border: 1px solid #ff4444;
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
    `;
    errorDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">⚠️ Ошибка</div>
        <div style="font-size: 14px;">${message}</div>
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 5000);
}

function showNotification(message, type) {
    // Функция показа уведомлений
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
        z-index: 1000;
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
