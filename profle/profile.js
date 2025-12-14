// ==================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================
// Функции для работы с профилем (дополнение к существующему коду)

// Создание HTML для карточки подарка в профиле
function createProfileGiftCard(gift, inventoryData) {
    const purchaseDate = new Date(inventoryData.purchased_at);
    const dateStr = purchaseDate.toLocaleDateString('ru-RU');
    
    return `
        <div class="profile-gift-card ${gift.rarity}" 
             data-gift-id="${gift.id}"
             onclick="window.location.href='shop.html'">
            
            ${inventoryData.is_selling ? 
                '<div class="selling-badge" title="На продаже">💰</div>' : ''}
            
            <div class="profile-gift-icon">
                ${gift.icon}
            </div>
            
            <div class="profile-gift-name">${gift.name}</div>
            
            <div class="profile-gift-rarity ${gift.rarity}">
                ${getRarityName(gift.rarity)}
            </div>
            
            <div class="profile-gift-date">
                ${dateStr}
            </div>
        </div>
    `;
}

// Обновление статистики подарков в профиле
function updateGiftsStats(userGifts) {
    const stats = {
        common: 0,
        rare: 0,
        mythical: 0,
        golden: 0,
        total: userGifts.length
    };
    
    userGifts.forEach(gift => {
        if (stats.hasOwnProperty(gift.rarity)) {
            stats[gift.rarity]++;
        }
    });
    
    // Обновляем статистику в профиле (если есть элементы)
    const statsContainer = document.getElementById('gift-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="gift-stat-item">
                <span class="stat-icon">🎁</span>
                <span class="stat-text">Всего: ${stats.total}</span>
            </div>
            <div class="gift-stat-item">
                <span class="stat-icon">👑</span>
                <span class="stat-text">Золотые: ${stats.golden}</span>
            </div>
            <div class="gift-stat-item">
                <span class="stat-icon">✨</span>
                <span class="stat-text">Мифические: ${stats.mythical}</span>
            </div>
        `;
    }
    
    return stats;
}

// Получение названия редкости подарка
function getRarityName(rarity) {
    const names = {
        'common': 'Обычный',
        'rare': 'Редкий',
        'mythical': 'Мифический',
        'golden': 'Золотой'
    };
    return names[rarity] || rarity;
}

// Показать подробную информацию о подарке
function showGiftDetails(gift, inventoryData) {
    const modal = document.createElement('div');
    modal.className = 'gift-details-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    `;
    
    const purchaseDate = new Date(inventoryData.purchased_at);
    const dateStr = purchaseDate.toLocaleDateString('ru-RU');
    const timeStr = purchaseDate.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    modal.innerHTML = `
        <div class="gift-details-content" style="
            background: rgba(30, 30, 50, 0.95);
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            border: 2px solid ${getRarityColor(gift.rarity)};
            box-shadow: 0 0 30px ${getRarityColor(gift.rarity, 0.3)};
            text-align: center;
        ">
            <h2 style="color: white; margin-bottom: 20px;">${gift.name}</h2>
            
            <div style="font-size: 64px; margin-bottom: 20px;">
                ${gift.icon}
            </div>
            
            <div style="
                background: ${getRarityColor(gift.rarity, 0.1)};
                color: ${getRarityColor(gift.rarity)};
                border: 1px solid ${getRarityColor(gift.rarity, 0.3)};
                border-radius: 20px;
                padding: 5px 15px;
                display: inline-block;
                margin-bottom: 20px;
                font-weight: bold;
            ">
                ${getRarityName(gift.rarity)}
            </div>
            
            <p style="color: #ccccff; margin-bottom: 25px; line-height: 1.6;">
                ${gift.description}
            </p>
            
            <div style="
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                padding: 15px;
                margin-bottom: 20px;
            ">
                <div style="display: flex; justify-content: space-around;">
                    <div>
                        <div style="color: #aaaaff; font-size: 12px;">Дата покупки</div>
                        <div style="color: white; font-weight: bold;">${dateStr}</div>
                        <div style="color: #aaaaff; font-size: 12px;">${timeStr}</div>
                    </div>
                    
                    <div>
                        <div style="color: #aaaaff; font-size: 12px;">Цена покупки</div>
                        <div style="color: #00ff00; font-weight: bold; font-size: 18px;">
                            ${inventoryData.purchase_price} 🎄
                        </div>
                    </div>
                </div>
            </div>
            
            ${inventoryData.is_selling ? 
                `<div style="
                    background: rgba(255, 153, 0, 0.1);
                    border: 1px solid rgba(255, 153, 0, 0.3);
                    border-radius: 10px;
                    padding: 10px;
                    color: #ffcc66;
                    margin-bottom: 20px;
                ">
                    ⚠️ Этот подарок выставлен на продажу
                </div>` : ''
            }
            
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: linear-gradient(135deg, #6200ff, #ff00ff);
                border: none;
                border-radius: 10px;
                padding: 12px 30px;
                color: white;
                font-family: 'Orbitron', sans-serif;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                width: 100%;
            ">
                Закрыть
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            document.body.removeChild(modal);
        }
    });
}

// Получение цвета для редкости
function getRarityColor(rarity, opacity = 1) {
    const colors = {
        'common': `rgba(0, 204, 102, ${opacity})`,
        'rare': `rgba(0, 180, 216, ${opacity})`,
        'mythical': `rgba(148, 0, 211, ${opacity})`,
        'golden': `rgba(255, 215, 0, ${opacity})`
    };
    return colors[rarity] || `rgba(255, 255, 255, ${opacity})`;
}

// Загрузка новогодних очков для профиля
async function loadProfileHolidayPoints(userId) {
    try {
        const snapshot = await database.ref('holiday_points/' + userId).once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            return data.total_points || data.totalPoints || 0;
        }
        return 0;
    } catch (error) {
        console.error('Ошибка загрузки очков:', error);
        return 0;
    }
}

// Обновление отображения очков в профиле
function updateProfilePointsDisplay(points) {
    const pointsElements = document.querySelectorAll('.holiday-points-display');
    pointsElements.forEach(element => {
        element.textContent = points;
        element.style.color = points > 0 ? '#00ff00' : '#ffcc00';
    });
    
    // Также обновляем в статистике
    const statsElement = document.getElementById('holiday-points');
    if (statsElement) {
        statsElement.textContent = points;
    }
}

// Добавление стилей для анимаций подарков
function addGiftAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes giftGlow {
            0%, 100% { box-shadow: 0 0 10px currentColor; }
            50% { box-shadow: 0 0 20px currentColor; }
        }
        
        @keyframes giftFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        .profile-gift-card.mythical {
            animation: giftGlow 2s infinite alternate;
        }
        
        .profile-gift-card.golden {
            animation: giftGlow 1.5s infinite alternate, giftFloat 3s infinite;
        }
        
        .profile-gift-card:hover {
            animation-play-state: paused;
        }
        
        .selling-badge {
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
    `;
    document.head.appendChild(style);
}

// Инициализация профиля с подарками
async function initProfileWithGifts() {
    // Добавляем анимации
    addGiftAnimations();
    
    // Загружаем очки
    const userId = localStorage.getItem('jojoland_userId');
    if (userId) {
        const points = await loadProfileHolidayPoints(userId);
        updateProfilePointsDisplay(points);
        
        // Подписываемся на обновления очков в реальном времени
        database.ref('holiday_points/' + userId).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const points = data.total_points || data.totalPoints || 0;
                updateProfilePointsDisplay(points);
            }
        });
        
        // Подписываемся на обновления подарков
        database.ref('gift_inventory/' + userId).on('value', async () => {
            await displayUserGifts(userId);
        });
    }
}

// Вызываем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, находимся ли мы на странице профиля
    if (window.location.pathname.includes('profile.html')) {
        setTimeout(initProfileWithGifts, 1000);
    }
});

// Экспортируем функции для использования в других файлах
window.profileFunctions = {
    createProfileGiftCard,
    updateGiftsStats,
    getRarityName,
    showGiftDetails,
    loadProfileHolidayPoints,
    updateProfilePointsDisplay
};
