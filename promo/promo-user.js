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
let userPromoHistory = [];

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await loadUserData();
            await loadPromoHistory();
            setupEventListeners();
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
        showError('Для активации промокодов необходимо войти в аккаунт');
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
        // Проверяем, есть ли запись о промокодах у пользователя
        const snapshot = await database.ref('user_promocodes/' + userId).once('value');
        
        if (snapshot.exists()) {
            userPromoHistory = snapshot.val().history || [];
        } else {
            // Создаем новую запись
            userPromoHistory = [];
            await database.ref('user_promocodes/' + userId).set({
                history: [],
                total_points_from_promos: 0
            });
        }
        
        console.log('✅ Данные промокодов загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных');
    }
}

// ЗАГРУЗКА ИСТОРИИ АКТИВАЦИЙ
async function loadPromoHistory() {
    if (userPromoHistory.length === 0) {
        document.getElementById('history-list').innerHTML = `
            <div class="empty-history">
                <p>Пока нет активированных промокодов</p>
                <small>Активируйте первый промокод и он появится здесь</small>
            </div>
        `;
        return;
    }
    
    // Сортируем по дате (новые сверху)
    const sortedHistory = [...userPromoHistory].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = sortedHistory.map(promo => {
        const date = new Date(promo.timestamp);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="history-item">
                <div class="history-code">${promo.code}</div>
                <div class="history-info">
                    <div>${promo.name || 'Промокод'}</div>
                    <div class="history-date">${formattedDate} ${time}</div>
                </div>
                <div class="history-points">+${promo.points}</div>
            </div>
        `;
    }).join('');
}

// АКТИВАЦИЯ ПРОМОКОДА
async function activatePromoCode() {
    const codeInput = document.getElementById('promo-code');
    const activateBtn = document.getElementById('activate-btn');
    const code = codeInput.value.trim().toUpperCase();
    
    // Проверка ввода
    if (!code) {
        showStatus('error', 'Введите промокод', 'Поле не может быть пустым');
        return;
    }
    
    if (code.length < 3) {
        showStatus('error', 'Слишком короткий код', 'Промокод должен содержать минимум 3 символа');
        return;
    }
    
    // Отключаем кнопку и показываем загрузку
    activateBtn.disabled = true;
    activateBtn.innerHTML = '🔄 ПРОВЕРКА...';
    
    try {
        console.log('🔍 Проверка промокода:', code);
        
        // 1. Проверяем существование промокода
        const promoSnapshot = await database.ref('promocodes/' + code).once('value');
        
        if (!promoSnapshot.exists()) {
            showStatus('error', 'Промокод не найден', 'Проверьте правильность ввода');
            resetButton();
            return;
        }
        
        const promoData = promoSnapshot.val();
        console.log('📊 Данные промокода:', promoData);
        
        // 2. Проверяем активность промокода
        if (!promoData.is_active) {
            showStatus('error', 'Промокод отключен', 'Этот промокод больше не активен');
            resetButton();
            return;
        }
        
        // 3. Проверяем срок действия
        const now = new Date();
        if (promoData.expires_at) {
            const expiresAt = new Date(promoData.expires_at);
            if (now > expiresAt) {
                showStatus('error', 'Промокод истек', 'Срок действия промокода истек');
                resetButton();
                return;
            }
        }
        
        // 4. Проверяем лимит активаций
        if (promoData.activations >= promoData.max_activations) {
            showStatus('error', 'Лимит исчерпан', 'Этот промокод уже активировали максимальное количество раз');
            resetButton();
            return;
        }
        
        // 5. Проверяем, активировал ли пользователь уже этот промокод
        if (userPromoHistory.some(p => p.code === code)) {
            showStatus('error', 'Уже активирован', 'Вы уже активировали этот промокод ранее');
            resetButton();
            return;
        }
        
        // 6. Все проверки пройдены - активируем промокод
        await processPromoActivation(code, promoData);
        
    } catch (error) {
        console.error('❌ Ошибка активации:', error);
        showStatus('error', 'Ошибка активации', 'Произошла ошибка при обработке промокода');
        resetButton();
    }
}

// ОБРАБОТКА АКТИВАЦИИ ПРОМОКОДА
async function processPromoActivation(code, promoData) {
    const activateBtn = document.getElementById('activate-btn');
    const points = parseInt(promoData.points) || 0;
    
    try {
        // Текущее время
        const now = new Date();
        
        // 1. Обновляем данные промокода
        await database.ref('promocodes/' + code).update({
            activations: (promoData.activations || 0) + 1,
            last_activated: now.toISOString(),
            activated_by: [...(promoData.activated_by || []), userId]
        });
        
        // 2. Добавляем запись в историю активаций промокода
        await database.ref('promocode_activations').push().set({
            code: code,
            user_id: userId,
            user_nickname: userNickname,
            points: points,
            timestamp: now.toISOString()
        });
        
        // 3. Обновляем историю пользователя
        const promoRecord = {
            code: code,
            name: promoData.name || 'Промокод',
            points: points,
            timestamp: now.toISOString(),
            description: promoData.description || ''
        };
        
        userPromoHistory.push(promoRecord);
        await database.ref('user_promocodes/' + userId + '/history').set(userPromoHistory);
        
        // 4. Начисляем очки пользователю
        await addPointsToUser(points, code);
        
        // 5. Показываем успешный статус
        showStatus('success', 'Промокод активирован!', `Вы получили ${points} новогодних очков!`);
        
        // 6. Обновляем историю
        await loadPromoHistory();
        
        // 7. Очищаем поле ввода
        document.getElementById('promo-code').value = '';
        
        // 8. Анимация успеха
        activateBtn.innerHTML = '✅ УСПЕХ!';
        setTimeout(() => {
            resetButton();
        }, 2000);
        
        // 9. Создаем эффект конфетти
        createConfetti();
        
        console.log(`✅ Промокод активирован: ${code}, очков: ${points}`);
        
    } catch (error) {
        console.error('❌ Ошибка обработки активации:', error);
        showStatus('error', 'Ошибка обработки', 'Не удалось начислить очки');
        resetButton();
    }
}

// НАЧИСЛЕНИЕ ОЧКОВ ПОЛЬЗОВАТЕЛЮ
async function addPointsToUser(points, promoCode) {
    try {
        // Получаем текущие данные очков
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        let pointsData = {};
        
        if (pointsSnapshot.exists()) {
            pointsData = pointsSnapshot.val();
        }
        
        // Обновляем общее количество очков
        const currentTotal = pointsData.total_points || 0;
        const newTotal = currentTotal + points;
        
        // Создаем запись в истории наград
        const reward = {
            date: new Date().toISOString(),
            points: points,
            type: 'promocode',
            code: promoCode,
            description: 'Активация промокода'
        };
        
        // Обновляем данные
        await database.ref('holiday_points/' + userId).update({
            total_points: newTotal,
            rewards_history: [
                reward,
                ...(pointsData.rewards_history || [])
            ].slice(0, 50) // Ограничиваем историю 50 записями
        });
        
        // Обновляем статистику промокодов
        const userPromoSnapshot = await database.ref('user_promocodes/' + userId).once('value');
        const userPromoData = userPromoSnapshot.exists() ? userPromoSnapshot.val() : {};
        
        await database.ref('user_promocodes/' + userId).update({
            total_points_from_promos: (userPromoData.total_points_from_promos || 0) + points
        });
        
    } catch (error) {
        console.error('❌ Ошибка начисления очков:', error);
        throw error;
    }
}

// ПОКАЗ СТАТУСА АКТИВАЦИИ
function showStatus(type, title, message) {
    const statusElement = document.getElementById('activation-status');
    
    let icon = '❌';
    let statusClass = 'error';
    
    if (type === 'success') {
        icon = '✅';
        statusClass = 'success';
    } else if (type === 'info') {
        icon = 'ℹ️';
        statusClass = 'info';
    }
    
    statusElement.className = `activation-status ${statusClass}`;
    statusElement.innerHTML = `
        <div class="status-icon">${icon}</div>
        <div class="status-title">${title}</div>
        <div class="status-message">${message}</div>
    `;
    
    statusElement.style.display = 'block';
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        statusElement.style.opacity = '0';
        statusElement.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            statusElement.style.display = 'none';
            statusElement.style.opacity = '1';
            statusElement.style.transform = 'translateY(0)';
        }, 300);
    }, 5000);
}

// СБРОС КНОПКИ
function resetButton() {
    const activateBtn = document.getElementById('activate-btn');
    activateBtn.disabled = false;
    activateBtn.innerHTML = '🎯 АКТИВИРОВАТЬ';
}

// СОЗДАНИЕ КОНФЕТТИ
function createConfetti() {
    const container = document.querySelector('.promo-card');
    
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.innerHTML = '✨';
        confetti.style.position = 'absolute';
        confetti.style.fontSize = Math.random() * 20 + 10 + 'px';
        confetti.style.color = ['#ff0000', '#ffff00', '#00ff00', '#0088ff', '#ff00ff'][Math.floor(Math.random() * 5)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-50px';
        confetti.style.zIndex = '1000';
        confetti.style.opacity = '0';
        confetti.style.pointerEvents = 'none';
        
        container.appendChild(confetti);
        
        // Анимация падения
        confetti.animate([
            { 
                opacity: 0, 
                transform: 'translateY(0) rotate(0deg)',
                offset: 0 
            },
            { 
                opacity: 1, 
                transform: `translateY(${Math.random() * 200 + 100}px) rotate(${Math.random() * 360}deg)`,
                offset: 0.3 
            },
            { 
                opacity: 0, 
                transform: `translateY(${Math.random() * 400 + 200}px) rotate(${Math.random() * 720}deg)`,
                offset: 1 
            }
        ], {
            duration: 2000 + Math.random() * 2000,
            easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
        });
        
        // Удаление после анимации
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 4000);
    }
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Кнопка активации
    document.getElementById('activate-btn').addEventListener('click', activatePromoCode);
    
    // Активация по Enter
    document.getElementById('promo-code').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            activatePromoCode();
        }
    });
    
    // Автоматический ввод заглавными буквами
    document.getElementById('promo-code').addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });
}

// ПОКАЗ УВЕДОМЛЕНИЯ
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

// ПОКАЗ ОШИБКИ
function showError(message) {
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
