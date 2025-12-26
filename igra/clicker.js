// ===========================================
// НОВОГОДНИЙ КЛИКЕР - ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД
// ===========================================

// Конфигурация игры
const CONFIG = {
    TOTAL_TIME: 120, // 2 минуты в секундах
    TIME_INTERVALS: {
        SLOW: 120, // 120-60 сек: нормальная скорость
        MEDIUM: 60, // 60-30 сек: быстрее
        FAST: 30   // 30-0 сек: максимальная скорость
    },
    
    // ИСПРАВЛЕНО: Увеличена скорость падения (пикселей в секунду)
    FALL_SPEEDS: {
        SLOW: 300,   // Было 100
        MEDIUM: 450, // Было 150
        FAST: 600    // Было 200
    },
    
    // ИСПРАВЛЕНО: Уменьшены интервалы спавна
    SPAWN_INTERVALS: {
        SLOW: 800,   // Было 1500
        MEDIUM: 500, // Было 1000
        FAST: 300    // Было 700
    },
    
    // Вероятности появления объектов (%)
    OBJECT_PROBABILITIES: {
        GIFT: 55,      // Подарок
        BOMB: 10,      // Бомба
        SNOWFLAKE: 20, // Заморозка
        STAR: 15       // Золотая звезда
    },
    
    // Очки за объекты - ИСПРАВЛЕНО для бомбы
    POINTS: {
        GIFT_MIN: 1,
        GIFT_MAX: 5,
        STAR_MIN: 10,
        STAR_MAX: 20,
        BOMB_PENALTY: 50, // Вычитается 50 очков вместо обнуления
        SNOWFLAKE_FREEZE: 3 // Заморозка на 3 секунды
    },
    
    // Система комбо
    COMBO: {
        MIN_CLICKS: 3,    // Минимум кликов для комбо
        MULTIPLIERS: {
            x1: { threshold: 0, multiplier: 1 },
            x2: { threshold: 5, multiplier: 2 },
            x3: { threshold: 10, multiplier: 3 },
            x5: { threshold: 15, multiplier: 5 }
        },
        DECAY_TIME: 2000  // Время удержания комбо (мс)
    }
};

// Глобальные переменные игры
let game = {
    isPlaying: false,
    isPaused: false,
    isFrozen: false,
    
    timeLeft: CONFIG.TOTAL_TIME,
    score: 0,
    combo: 0,
    comboMultiplier: 1,
    comboDecayTimer: null,
    
    // Статистика
    giftsCaught: 0,
    starsCaught: 0,
    bombsClicked: 0,
    bombsAvoided: 0,
    
    // Таймеры
    gameTimer: null,
    spawnTimer: null,
    freezeTimer: null,
    
    // Система билетов
    tickets: 0,
    lastTicketDate: null,
    nextTicketTimer: null,
    
    // Firebase
    userId: null,
    userNickname: null,
    database: null,
    
    // Статистика для сохранения
    maxCombo: 0,
    totalClicks: 0,
    startTime: null
};

// DOM элементы
const elements = {
    // Экран
    startScreen: null,
    gameScreen: null,
    pauseScreen: null,
    resultScreen: null,
    
    // Кнопки
    startBtn: null,
    pauseBtn: null,
    resumeBtn: null,
    restartBtn: null,
    quitBtn: null,
    playAgainBtn: null,
    shareBtn: null,
    backToMenuBtn: null,
    closeErrorBtn: null,
    
    // Статистика
    ticketsCount: null,
    nextTicketInfo: null,
    bestScorePreview: null,
    gamesPlayed: null,
    
    // Игровые элементы
    gameTimer: null,
    gameScore: null,
    comboMultiplier: null,
    freezeTimer: null,
    comboFill: null,
    comboCount: null,
    giftsCaught: null,
    starsCaught: null,
    bombsAvoided: null,
    
    // Элементы паузы
    pauseTime: null,
    pauseScore: null,
    pauseCombo: null,
    
    // Элементы результатов
    finalScore: null,
    finalTime: null,
    finalCombo: null,
    finalGifts: null,
    finalStars: null,
    newRecordBadge: null,
    rankingList: null,
    
    // Модалка ошибки
    errorModal: null,
    errorTimer: null,
    
    // Игровое поле
    gameField: null
};

// ===========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ===========================================

// Инициализация DOM элементов
function initElements() {
    elements.startScreen = document.getElementById('start-screen');
    elements.gameScreen = document.getElementById('game-screen');
    elements.pauseScreen = document.getElementById('pause-screen');
    elements.resultScreen = document.getElementById('result-screen');
    
    elements.startBtn = document.getElementById('start-game-btn');
    elements.pauseBtn = document.getElementById('pause-btn');
    elements.resumeBtn = document.getElementById('resume-btn');
    elements.restartBtn = document.getElementById('restart-btn');
    elements.quitBtn = document.getElementById('quit-btn');
    elements.playAgainBtn = document.getElementById('play-again-btn');
    elements.shareBtn = document.getElementById('share-result-btn');
    elements.backToMenuBtn = document.getElementById('back-to-menu-btn');
    elements.closeErrorBtn = document.getElementById('close-error-btn');
    
    elements.ticketsCount = document.getElementById('tickets-count');
    elements.nextTicketInfo = document.getElementById('next-ticket-info');
    elements.bestScorePreview = document.getElementById('best-score-preview');
    elements.gamesPlayed = document.getElementById('games-played');
    
    elements.gameTimer = document.getElementById('game-timer');
    elements.gameScore = document.getElementById('game-score');
    elements.comboMultiplier = document.getElementById('combo-multiplier');
    elements.freezeTimer = document.getElementById('freeze-timer');
    elements.comboFill = document.getElementById('combo-fill');
    elements.comboCount = document.getElementById('combo-count');
    elements.giftsCaught = document.getElementById('gifts-caught');
    elements.starsCaught = document.getElementById('stars-caught');
    elements.bombsAvoided = document.getElementById('bombs-avoided');
    
    elements.pauseTime = document.getElementById('pause-time');
    elements.pauseScore = document.getElementById('pause-score');
    elements.pauseCombo = document.getElementById('pause-combo');
    
    elements.finalScore = document.getElementById('final-score');
    elements.finalTime = document.getElementById('final-time');
    elements.finalCombo = document.getElementById('final-combo');
    elements.finalGifts = document.getElementById('final-gifts');
    elements.finalStars = document.getElementById('final-stars');
    elements.newRecordBadge = document.getElementById('new-record-badge');
    elements.rankingList = document.getElementById('ranking-list');
    
    elements.errorModal = document.getElementById('error-modal');
    elements.errorTimer = document.getElementById('error-timer');
    
    elements.gameField = document.getElementById('game-field');
}

// Создание фоновых частиц
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

// Форматирование времени
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Показ уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    
    const colors = {
        success: { bg: '#00cc66', border: '#00ff88' },
        error: { bg: '#ff4444', border: '#ff6b6b' },
        info: { bg: '#6200ff', border: '#ff00ff' }
    };
    
    const color = colors[type] || colors.info;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        max-width: 300px;
        font-family: 'Orbitron', sans-serif;
        border: 2px solid ${color.border};
    `;
    
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            ${type === 'success' ? 'Успешно!' : type === 'error' ? 'Ошибка!' : 'Информация'}
        </div>
        <div style="font-size: 14px;">
            ${message}
        </div>
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

// Переключение экранов
function switchScreen(screenName) {
    if (elements.startScreen) elements.startScreen.classList.remove('active');
    if (elements.gameScreen) elements.gameScreen.classList.remove('active');
    if (elements.pauseScreen) elements.pauseScreen.classList.remove('active');
    if (elements.resultScreen) elements.resultScreen.classList.remove('active');
    
    switch(screenName) {
        case 'start':
            if (elements.startScreen) elements.startScreen.classList.add('active');
            break;
        case 'game':
            if (elements.gameScreen) elements.gameScreen.classList.add('active');
            break;
        case 'pause':
            if (elements.pauseScreen) elements.pauseScreen.classList.add('active');
            break;
        case 'result':
            if (elements.resultScreen) elements.resultScreen.classList.add('active');
            break;
    }
}

// ===========================================
// СИСТЕМА БИЛЕТОВ И АВТОРИЗАЦИЯ
// ===========================================

// Проверка авторизации
async function checkAuth() {
    game.userId = localStorage.getItem('jojoland_userId');
    game.userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!game.userId || !game.userNickname) {
        showNotification('Для игры необходимо войти в аккаунт', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return false;
    }
    
    return true;
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const snapshot = await game.database.ref('clicker_tickets/' + game.userId).once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            game.tickets = data.tickets || 0;
            game.lastTicketDate = data.lastTicketDate ? new Date(data.lastTicketDate) : null;
        } else {
            game.tickets = 1;
            game.lastTicketDate = new Date();
            
            await game.database.ref('clicker_tickets/' + game.userId).set({
                tickets: game.tickets,
                lastTicketDate: game.lastTicketDate.toISOString(),
                createdAt: new Date().toISOString()
            });
        }
        
        updateTicketDisplay();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        game.tickets = 1;
        updateTicketDisplay();
    }
}

// Обновление информации о билетах
function updateTicketInfo() {
    if (game.nextTicketTimer) {
        clearInterval(game.nextTicketTimer);
    }
    
    game.nextTicketTimer = setInterval(() => {
        updateNextTicketTime();
    }, 1000);
    
    updateNextTicketTime();
}

function updateNextTicketTime() {
    if (!game.lastTicketDate) {
        if (elements.nextTicketInfo) elements.nextTicketInfo.textContent = 'Билет доступен!';
        return;
    }
    
    const now = new Date();
    const lastTicketTime = new Date(game.lastTicketDate);
    const nextTicketTime = new Date(lastTicketTime.getTime() + 24 * 60 * 60 * 1000);
    const timeDiff = nextTicketTime - now;
    
    if (timeDiff <= 0) {
        if (elements.nextTicketInfo) elements.nextTicketInfo.textContent = 'Билет доступен!';
        giveDailyTicket();
    } else {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (elements.nextTicketInfo) {
            elements.nextTicketInfo.textContent = `Следующий билет через: ${timeString}`;
        }
        
        if (elements.errorTimer) {
            elements.errorTimer.textContent = timeString;
        }
    }
}

// Выдача ежедневного билета
async function giveDailyTicket() {
    const now = new Date();
    const lastTicketTime = game.lastTicketDate ? new Date(game.lastTicketDate) : null;
    
    if (!lastTicketTime || (now - lastTicketTime) >= 24 * 60 * 60 * 1000) {
        game.tickets += 1;
        game.lastTicketDate = now;
        
        try {
            await game.database.ref('clicker_tickets/' + game.userId).update({
                tickets: game.tickets,
                lastTicketDate: game.lastTicketDate.toISOString()
            });
        } catch (error) {
            console.error('Ошибка сохранения билета:', error);
        }
        
        updateTicketDisplay();
        showNotification('🎫 Получен ежедневный билет!', 'success');
    }
}

// Обновление отображения билетов
function updateTicketDisplay() {
    if (elements.ticketsCount) {
        elements.ticketsCount.textContent = `${game.tickets} билетик(ов)`;
    }
}

// Загрузка статистики пользователя
async function loadUserStats() {
    try {
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        
        if (snapshot.exists()) {
            const stats = snapshot.val();
            if (elements.bestScorePreview) elements.bestScorePreview.textContent = stats.bestScore || 0;
            if (elements.gamesPlayed) elements.gamesPlayed.textContent = stats.gamesPlayed || 0;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Показать модалку ошибки
function showErrorModal() {
    updateNextTicketTime();
    if (elements.errorModal) {
        elements.errorModal.style.display = 'flex';
    }
}

// ===========================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ===========================================

function setupEventListeners() {
    if (elements.startBtn) {
        elements.startBtn.addEventListener('click', startGame);
    }
    
    if (elements.pauseBtn) {
        elements.pauseBtn.addEventListener('click', pauseGame);
    }
    
    if (elements.resumeBtn) {
        elements.resumeBtn.addEventListener('click', resumeGame);
    }
    
    if (elements.restartBtn) {
        elements.restartBtn.addEventListener('click', restartGame);
    }
    
    if (elements.quitBtn) {
        elements.quitBtn.addEventListener('click', quitToMenu);
    }
    
    if (elements.playAgainBtn) {
        elements.playAgainBtn.addEventListener('click', playAgain);
    }
    
    if (elements.shareBtn) {
        elements.shareBtn.addEventListener('click', shareResults);
    }
    
    if (elements.backToMenuBtn) {
        elements.backToMenuBtn.addEventListener('click', backToMenu);
    }
    
    if (elements.closeErrorBtn) {
        elements.closeErrorBtn.addEventListener('click', () => {
            if (elements.errorModal) elements.errorModal.style.display = 'none';
        });
    }
    
    if (elements.gameField) {
        elements.gameField.addEventListener('click', function(e) {
            if (e.target.classList.contains('falling-object')) {
                handleObjectClick(e.target);
            } else {
                handleFieldClick(e);
            }
        });
    }
}

// ===========================================
// УПРАВЛЕНИЕ ИГРОЙ
// ===========================================

// Начало игры
async function startGame() {
    if (game.tickets < 1) {
        showErrorModal();
        return;
    }
    
    game.tickets -= 1;
    try {
        await game.database.ref('clicker_tickets/' + game.userId).update({
            tickets: game.tickets
        });
    } catch (error) {
        console.error('Ошибка обновления билетов:', error);
    }
    
    updateTicketDisplay();
    resetGame();
    switchScreen('game');
    
    game.isPlaying = true;
    game.startTime = new Date();
    startGameTimer();
    startSpawningObjects();
}

// Пауза игры
function pauseGame() {
    if (!game.isPlaying || game.isPaused) return;
    
    game.isPaused = true;
    clearInterval(game.gameTimer);
    clearInterval(game.spawnTimer);
    
    if (elements.pauseTime) elements.pauseTime.textContent = formatTime(game.timeLeft);
    if (elements.pauseScore) elements.pauseScore.textContent = game.score;
    if (elements.pauseCombo) elements.pauseCombo.textContent = `x${game.comboMultiplier}`;
    
    switchScreen('pause');
}

// Продолжение игры
function resumeGame() {
    if (!game.isPlaying || !game.isPaused) return;
    
    game.isPaused = false;
    switchScreen('game');
    startGameTimer();
    startSpawningObjects();
}

// Перезапуск игры
function restartGame() {
    pauseGame();
    
    if (confirm('Начать игру заново? Будет использован ещё один билет.')) {
        if (game.tickets < 1) {
            showErrorModal();
            return;
        }
        
        game.tickets -= 1;
        try {
            game.database.ref('clicker_tickets/' + game.userId).update({
                tickets: game.tickets
            });
        } catch (error) {
            console.error('Ошибка обновления билетов:', error);
        }
        
        updateTicketDisplay();
        resetGame();
        switchScreen('game');
        game.isPlaying = true;
        game.isPaused = false;
        startGameTimer();
        startSpawningObjects();
    }
}

// Выход в меню
function quitToMenu() {
    pauseGame();
    
    if (confirm('Выйти в меню? Текущая игра будет потеряна.')) {
        resetGame();
        switchScreen('start');
        game.isPlaying = false;
        game.isPaused = false;
    }
}

// Играть снова
function playAgain() {
    if (game.tickets < 1) {
        showErrorModal();
        return;
    }
    
    startGame();
}

// Поделиться результатами
function shareResults() {
    const score = game.score;
    const text = `🎄 Я набрал ${score} очков в новогоднем кликере на JojoLand! Попробуй побить мой рекорд!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Мой результат в новогоднем кликере',
            text: text,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Результат скопирован в буфер обмена!', 'success');
        });
    }
}

// Назад в меню
function backToMenu() {
    switchScreen('start');
}

// ===========================================
// ИГРОВОЙ ПРОЦЕСС
// ===========================================

// Сброс состояния игры
function resetGame() {
    game.timeLeft = CONFIG.TOTAL_TIME;
    game.score = 0;
    game.combo = 0;
    game.comboMultiplier = 1;
    game.isFrozen = false;
    
    game.giftsCaught = 0;
    game.starsCaught = 0;
    game.bombsClicked = 0;
    game.bombsAvoided = 0;
    game.maxCombo = 0;
    game.totalClicks = 0;
    game.startTime = null;
    
    clearInterval(game.gameTimer);
    clearInterval(game.spawnTimer);
    clearTimeout(game.freezeTimer);
    clearTimeout(game.comboDecayTimer);
    
    if (elements.gameField) {
        elements.gameField.innerHTML = '<div class="field-background"></div>';
    }
    
    updateGameUI();
}

// Запуск игрового таймера
function startGameTimer() {
    updateTimerDisplay();
    
    game.gameTimer = setInterval(() => {
        if (!game.isFrozen) {
            game.timeLeft--;
            
            if (game.timeLeft <= 0) {
                endGame();
                return;
            }
            
            updateTimerDisplay();
        }
    }, 1000);
}

// Обновление отображения таймера
function updateTimerDisplay() {
    if (elements.gameTimer) {
        elements.gameTimer.textContent = formatTime(game.timeLeft);
    }
}

// Спавн объектов
function startSpawningObjects() {
    spawnObject();
    
    game.spawnTimer = setInterval(() => {
        if (!game.isPaused && !game.isFrozen) {
            spawnObject();
        }
    }, getSpawnInterval());
}

// Получение интервала спавна
function getSpawnInterval() {
    if (game.timeLeft <= CONFIG.TIME_INTERVALS.FAST) {
        return CONFIG.SPAWN_INTERVALS.FAST;
    } else if (game.timeLeft <= CONFIG.TIME_INTERVALS.MEDIUM) {
        return CONFIG.SPAWN_INTERVALS.MEDIUM;
    } else {
        return CONFIG.SPAWN_INTERVALS.SLOW;
    }
}

// Получение скорости падения
function getFallSpeed() {
    if (game.timeLeft <= CONFIG.TIME_INTERVALS.FAST) {
        return CONFIG.FALL_SPEEDS.FAST;
    } else if (game.timeLeft <= CONFIG.TIME_INTERVALS.MEDIUM) {
        return CONFIG.FALL_SPEEDS.MEDIUM;
    } else {
        return CONFIG.FALL_SPEEDS.SLOW;
    }
}

// Создание объекта
function spawnObject() {
    if (!elements.gameField) return;
    
    const objectType = getRandomObjectType();
    const object = createGameObject(objectType);
    
    const fieldWidth = elements.gameField.clientWidth;
    const objectSize = getObjectSize();
    const maxLeft = fieldWidth - objectSize;
    const left = Math.random() * maxLeft;
    
    object.style.left = `${left}px`;
    object.style.top = `-${objectSize}px`;
    
    const fallSpeed = getFallSpeed();
    const fieldHeight = elements.gameField.clientHeight;
    const animationDuration = (fieldHeight + objectSize) / fallSpeed;
    
    object.style.animation = `floatDown ${animationDuration}s linear forwards`;
    
    setTimeout(() => {
        if (object.parentNode && !object.dataset.caught) {
            object.remove();
            
            if (object.classList.contains('bomb')) {
                game.bombsAvoided++;
                updateGameUI();
                showFloatingText(object, 'Избежано!', '#00ff00', true);
            }
        }
    }, animationDuration * 1000);
    
    return object;
}

// Получение размера объекта
function getObjectSize() {
    const isMobile = window.innerWidth <= 768;
    return isMobile ? 50 : 60;
}

// Получение случайного типа объекта
function getRandomObjectType() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (const [type, probability] of Object.entries(CONFIG.OBJECT_PROBABILITIES)) {
        cumulative += probability;
        if (rand <= cumulative) {
            return type.toLowerCase();
        }
    }
    
    return 'gift';
}

// Создание игрового объекта
function createGameObject(type) {
    if (!elements.gameField) return null;
    
    const object = document.createElement('div');
    object.className = `falling-object ${type}`;
    object.dataset.type = type;
    
    object.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.5)';
    
    switch(type) {
        case 'gift':
            object.textContent = '🎁';
            object.style.background = 'linear-gradient(135deg, #ff3366, #ff6699)';
            object.style.border = '3px solid #ffcc00';
            break;
        case 'bomb':
            object.textContent = '💣';
            object.style.background = 'linear-gradient(135deg, #333, #666)';
            object.style.border = '3px solid #ff0000';
            break;
        case 'snowflake':
            object.textContent = '❄️';
            object.style.background = 'linear-gradient(135deg, #00ccff, #0099ff)';
            object.style.border = '3px solid #ffffff';
            break;
        case 'star':
            object.textContent = '⭐';
            object.style.background = 'linear-gradient(135deg, #ffcc00, #ff9900)';
            object.style.border = '3px solid #ffff00';
            object.style.animation = 'pulse 1s infinite alternate';
            break;
    }
    
    const isMobile = window.innerWidth <= 768;
    object.style.fontSize = isMobile ? '28px' : '32px';
    
    elements.gameField.appendChild(object);
    return object;
}

// Случайные очки
function getRandomPoints(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Обработка клика по объекту
function handleObjectClick(object) {
    if (game.isFrozen || game.isPaused || !game.isPlaying) return;
    
    game.totalClicks++;
    object.dataset.caught = 'true';
    const type = object.dataset.type;
    const points = processObjectClick(type, object);
    
    createClickEffect(object);
    updateCombo();
    updateGameUI();
    object.remove();
    
    return points;
}

// Обработка объекта
function processObjectClick(type, object) {
    let points = 0;
    let displayText = '';
    let color = '#ffffff';
    
    switch(type) {
        case 'gift':
            points = getRandomPoints(CONFIG.POINTS.GIFT_MIN, CONFIG.POINTS.GIFT_MAX) * game.comboMultiplier;
            game.giftsCaught++;
            displayText = `+${points}`;
            color = '#ff3366';
            break;
            
        case 'bomb':
            points = -CONFIG.POINTS.BOMB_PENALTY;
            game.score = Math.max(0, game.score + points);
            game.bombsClicked++;
            
            game.combo = 0;
            game.comboMultiplier = 1;
            updateComboBar();
            
            displayText = `-${CONFIG.POINTS.BOMB_PENALTY}`;
            color = '#ff0000';
            
            createExplosionEffect(object);
            break;
            
        case 'snowflake':
            freezeGame();
            displayText = 'ЗАМОРОЗКА!';
            color = '#00ccff';
            break;
            
        case 'star':
            const rewardType = Math.random() > 0.5 ? 'points' : 'time';
            
            if (rewardType === 'points') {
                points = getRandomPoints(CONFIG.POINTS.STAR_MIN, CONFIG.POINTS.STAR_MAX) * game.comboMultiplier;
                game.starsCaught++;
                displayText = `+${points}`;
            } else {
                game.timeLeft += 5;
                updateTimerDisplay();
                displayText = '+5сек';
            }
            color = '#ffcc00';
            break;
    }
    
    if (type !== 'snowflake') {
        game.score = Math.max(0, game.score + points);
    }
    
    if (displayText) {
        showFloatingText(object, displayText, color);
    }
    
    return points;
}

// Создание эффекта клика
function createClickEffect(object) {
    if (!elements.gameField) return;
    
    const rect = object.getBoundingClientRect();
    const fieldRect = elements.gameField.getBoundingClientRect();
    
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.style.cssText = `
        position: absolute;
        left: ${rect.left - fieldRect.left + 30}px;
        top: ${rect.top - fieldRect.top + 30}px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
        z-index: 5;
        animation: clickPop 0.5s forwards;
    `;
    
    elements.gameField.appendChild(effect);
    
    setTimeout(() => {
        effect.remove();
    }, 500);
}

// Эффект взрыва
function createExplosionEffect(object) {
    if (!elements.gameField) return;
    
    const rect = object.getBoundingClientRect();
    const fieldRect = elements.gameField.getBoundingClientRect();
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            left: ${rect.left - fieldRect.left + 30}px;
            top: ${rect.top - fieldRect.top + 30}px;
            width: 10px;
            height: 10px;
            background: ${i % 2 === 0 ? '#ff0000' : '#ff9900'};
            border-radius: 50%;
            z-index: 5;
            animation: explode 1s ease-out forwards;
        `;
        
        const angle = (Math.PI * 2 * i) / 8;
        const distance = 50 + Math.random() * 50;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes explode {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        elements.gameField.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
            style.remove();
        }, 1000);
    }
}

// Показать всплывающий текст
function showFloatingText(object, text, color, isSmall = false) {
    if (!elements.gameField) return;
    
    const rect = object.getBoundingClientRect();
    const fieldRect = elements.gameField.getBoundingClientRect();
    
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.cssText = `
        position: absolute;
        left: ${rect.left - fieldRect.left + 15}px;
        top: ${rect.top - fieldRect.top}px;
        color: ${color};
        font-family: 'Michroma', monospace;
        font-size: ${isSmall ? '14px' : '18px'};
        font-weight: bold;
        text-shadow: 0 0 8px ${color}80, 0 0 4px #000;
        z-index: 20;
        animation: floatUp 1s ease-out forwards;
        white-space: nowrap;
    `;
    
    elements.gameField.appendChild(floatingText);
    
    setTimeout(() => {
        floatingText.remove();
    }, 1000);
}

// Заморозка игры
function freezeGame() {
    if (game.isFrozen) return;
    
    game.isFrozen = true;
    
    if (elements.freezeTimer) {
        elements.freezeTimer.style.color = '#00ccff';
        elements.freezeTimer.style.fontWeight = 'bold';
    }
    
    let freezeTime = CONFIG.POINTS.SNOWFLAKE_FREEZE;
    if (elements.freezeTimer) elements.freezeTimer.textContent = `${freezeTime}с`;
    
    if (elements.gameField) {
        elements.gameField.style.filter = 'blur(2px) hue-rotate(180deg)';
        elements.gameField.style.transition = 'filter 0.5s';
    }
    
    game.freezeTimer = setInterval(() => {
        freezeTime--;
        if (elements.freezeTimer) elements.freezeTimer.textContent = `${freezeTime}с`;
        
        if (freezeTime <= 0) {
            clearInterval(game.freezeTimer);
            game.isFrozen = false;
            
            if (elements.gameField) {
                elements.gameField.style.filter = '';
            }
            
            if (elements.freezeTimer) {
                elements.freezeTimer.textContent = '0с';
                elements.freezeTimer.style.color = '#00ccff';
                elements.freezeTimer.style.fontWeight = 'normal';
            }
        }
    }, 1000);
}

// Обработка клика по пустому полю
function handleFieldClick(e) {
    if (!game.isPlaying || game.isPaused || game.isFrozen) return;
    
    if (!e.target.classList.contains('falling-object')) {
        resetCombo();
    }
}

// ===========================================
// СИСТЕМА КОМБО
// ===========================================

// Обновление комбо
function updateCombo() {
    game.combo++;
    
    if (game.combo > game.maxCombo) {
        game.maxCombo = game.combo;
    }
    
    clearTimeout(game.comboDecayTimer);
    
    let newMultiplier = 1;
    for (const [key, data] of Object.entries(CONFIG.COMBO.MULTIPLIERS)) {
        if (game.combo >= data.threshold) {
            newMultiplier = data.multiplier;
        }
    }
    
    if (newMultiplier !== game.comboMultiplier) {
        game.comboMultiplier = newMultiplier;
        showComboEffect();
    }
    
    updateComboBar();
    
    game.comboDecayTimer = setTimeout(() => {
        resetCombo();
    }, CONFIG.COMBO.DECAY_TIME);
}

// Сброс комбо
function resetCombo() {
    if (game.combo > 0) {
        const comboText = document.createElement('div');
        comboText.textContent = `Комбо потеряно! (было: ${game.combo})`;
        comboText.style.cssText = `
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Michroma', monospace;
            font-size: 20px;
            color: #ff6666;
            text-shadow: 0 0 10px rgba(255, 102, 102, 0.8);
            z-index: 100;
            animation: fadeOut 1s ease-out forwards;
            pointer-events: none;
        `;
        
        document.body.appendChild(comboText);
        
        setTimeout(() => {
            comboText.remove();
        }, 1000);
    }
    
    game.combo = 0;
    game.comboMultiplier = 1;
    updateComboBar();
}

// Обновление полосы комбо
function updateComboBar() {
    const maxCombo = Math.max(...Object.values(CONFIG.COMBO.MULTIPLIERS).map(m => m.threshold));
    const percentage = Math.min((game.combo / (maxCombo * 1.5)) * 100, 100);
    
    if (elements.comboFill) {
        elements.comboFill.style.width = `${percentage}%`;
        
        let gradient;
        switch(game.comboMultiplier) {
            case 1: gradient = '#ff3366, #ff6699'; break;
            case 2: gradient = '#ff9900, #ffcc00'; break;
            case 3: gradient = '#00cc66, #00ff88'; break;
            case 5: gradient = '#6200ff, #ff00ff'; break;
            default: gradient = '#ff3366, #ff6699';
        }
        
        elements.comboFill.style.background = `linear-gradient(90deg, ${gradient})`;
    }
    
    if (elements.comboCount) elements.comboCount.textContent = game.combo;
    if (elements.comboMultiplier) {
        elements.comboMultiplier.textContent = `x${game.comboMultiplier}`;
        elements.comboMultiplier.style.color = getComboColor(game.comboMultiplier);
    }
}

function getComboColor(multiplier) {
    switch(multiplier) {
        case 1: return '#ff3366';
        case 2: return '#ff9900';
        case 3: return '#00cc66';
        case 5: return '#6200ff';
        default: return '#ffffff';
    }
}

// Эффект комбо
function showComboEffect() {
    const comboText = document.createElement('div');
    comboText.textContent = `КОМБО x${game.comboMultiplier}!`;
    comboText.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Michroma', monospace;
        font-size: ${game.comboMultiplier === 5 ? '64px' : '48px'};
        font-weight: bold;
        color: ${getComboColor(game.comboMultiplier)};
        text-shadow: 0 0 30px ${getComboColor(game.comboMultiplier)}80;
        z-index: 100;
        animation: comboPop 1.5s ease-out forwards;
        pointer-events: none;
    `;
    
    document.body.appendChild(comboText);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes comboPop {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.3);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        comboText.remove();
        style.remove();
    }, 1500);
}

// Обновление игрового интерфейса
function updateGameUI() {
    if (elements.gameScore) elements.gameScore.textContent = game.score;
    if (elements.giftsCaught) elements.giftsCaught.textContent = game.giftsCaught;
    if (elements.starsCaught) elements.starsCaught.textContent = game.starsCaught;
    if (elements.bombsAvoided) elements.bombsAvoided.textContent = game.bombsAvoided;
}

// ===========================================
// ЗАВЕРШЕНИЕ ИГРЫ И СОХРАНЕНИЕ
// ===========================================

// Завершение игры
function endGame() {
    game.isPlaying = false;
    
    clearInterval(game.gameTimer);
    clearInterval(game.spawnTimer);
    clearTimeout(game.freezeTimer);
    clearTimeout(game.comboDecayTimer);
    
    if (elements.gameField) {
        elements.gameField.innerHTML = '<div class="field-background"></div>';
    }
    
    saveGameResults();
    showResultsScreen();
}

// Сохранение результатов
async function saveGameResults() {
    try {
        const now = new Date();
        const gameDuration = game.startTime ? Math.round((now - game.startTime) / 1000) : CONFIG.TOTAL_TIME - game.timeLeft;
        
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        let stats = snapshot.exists() ? snapshot.val() : {};
        
        stats.bestScore = Math.max(stats.bestScore || 0, game.score);
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        stats.lastPlayed = now.toISOString();
        stats.totalScore = (stats.totalScore || 0) + game.score;
        stats.totalGifts = (stats.totalGifts || 0) + game.giftsCaught;
        stats.totalStars = (stats.totalStars || 0) + game.starsCaught;
        stats.totalBombs = (stats.totalBombs || 0) + game.bombsClicked;
        stats.maxCombo = Math.max(stats.maxCombo || 0, game.maxCombo);
        
        const gameHistory = {
            score: game.score,
            time: gameDuration,
            gifts: game.giftsCaught,
            stars: game.starsCaught,
            bombsClicked: game.bombsClicked,
            bombsAvoided: game.bombsAvoided,
            maxCombo: game.maxCombo,
            totalClicks: game.totalClicks,
            timestamp: now.toISOString()
        };
        
        await game.database.ref('clicker_stats/' + game.userId).set(stats);
        await game.database.ref('clicker_history/' + game.userId).push(gameHistory);
        await saveToLeaderboard();
        
    } catch (error) {
        console.error('Ошибка сохранения результатов:', error);
    }
}

// Сохранение в рейтинг
async function saveToLeaderboard() {
    try {
        const totalGames = await getTotalGamesPlayed();
        
        await game.database.ref('clicker_leaderboard/' + game.userId).set({
            nickname: game.userNickname,
            score: game.score,
            maxCombo: game.maxCombo,
            gifts: game.giftsCaught,
            stars: game.starsCaught,
            lastPlayed: new Date().toISOString(),
            gamesPlayed: totalGames
        });
    } catch (error) {
        console.error('Ошибка сохранения в рейтинг:', error);
    }
}

async function getTotalGamesPlayed() {
    try {
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        if (snapshot.exists()) {
            return snapshot.val().gamesPlayed || 1;
        }
    } catch (error) {
        console.error('Ошибка получения количества игр:', error);
    }
    return 1;
}

// Показ экрана результатов
function showResultsScreen() {
    const gameDuration = CONFIG.TOTAL_TIME - game.timeLeft;
    
    if (elements.finalScore) elements.finalScore.textContent = game.score;
    if (elements.finalTime) elements.finalTime.textContent = formatTime(gameDuration);
    if (elements.finalCombo) elements.finalCombo.textContent = `x${game.comboMultiplier}`;
    if (elements.finalGifts) elements.finalGifts.textContent = game.giftsCaught;
    if (elements.finalStars) elements.finalStars.textContent = game.starsCaught;
    
    checkNewRecord();
    loadLeaderboard();
    switchScreen('result');
}

// Проверка нового рекорда
async function checkNewRecord() {
    try {
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        if (snapshot.exists()) {
            const stats = snapshot.val();
            if (game.score > (stats.bestScore || 0) && elements.newRecordBadge) {
                elements.newRecordBadge.style.display = 'flex';
            } else if (elements.newRecordBadge) {
                elements.newRecordBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Ошибка проверки рекорда:', error);
    }
}

// Загрузка рейтинга
async function loadLeaderboard() {
    if (!elements.rankingList) return;
    
    elements.rankingList.innerHTML = `
        <div class="ranking-loading">
            <div class="loading-spinner small"></div>
            <p>Загрузка рейтинга...</p>
        </div>
    `;
    
    try {
        const snapshot = await game.database.ref('clicker_leaderboard').once('value');
        
        if (!snapshot.exists()) {
            elements.rankingList.innerHTML = `
                <div class="empty-rewards">
                    <div class="empty-icon">👥</div>
                    <p>Пока нет игроков в рейтинге</p>
                    <small>Стань первым!</small>
                </div>
            `;
            return;
        }
        
        const players = [];
        snapshot.forEach((childSnapshot) => {
            const player = childSnapshot.val();
            player.id = childSnapshot.key;
            player.rating = calculatePlayerRating(player);
            players.push(player);
        });
        
        players.sort((a, b) => b.rating - a.rating);
        const topPlayers = players.slice(0, 15);
        displayLeaderboard(topPlayers);
        
    } catch (error) {
        console.error('Ошибка загрузки рейтинга:', error);
        elements.rankingList.innerHTML = `
            <div style="color: #ff4444; text-align: center; padding: 40px;">
                <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                <p>Ошибка загрузки рейтинга</p>
            </div>
        `;
    }
}

// Расчет рейтинга игрока
function calculatePlayerRating(player) {
    let rating = player.score || 0;
    
    if (player.maxCombo >= 15) rating += 500;
    else if (player.maxCombo >= 10) rating += 300;
    else if (player.maxCombo >= 5) rating += 100;
    
    if (player.gifts >= 50) rating += 200;
    else if (player.gifts >= 30) rating += 100;
    
    if (player.gamesPlayed >= 10) rating += 150;
    else if (player.gamesPlayed >= 5) rating += 50;
    
    if (player.bombs) {
        rating -= player.bombs * 10;
    }
    
    return Math.max(0, rating);
}

// Отображение рейтинга
function displayLeaderboard(players) {
    if (!elements.rankingList) return;
    
    if (players.length === 0) {
        elements.rankingList.innerHTML = `
            <div class="empty-rewards">
                <div class="empty-icon">👥</div>
                <p>Пока нет игроков в рейтинге</p>
                <small>Стань первым!</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    players.forEach((player, index) => {
        const rank = index + 1;
        const isCurrentUser = player.id === game.userId;
        
        html += `
            <div class="ranking-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank-number rank-${rank}">
                    ${rank}
                </div>
                <div class="ranking-info">
                    <div class="ranking-name">
                        ${player.nickname || 'Игрок'}
                        ${isCurrentUser ? ' <span class="you-badge">(Вы)</span>' : ''}
                    </div>
                    <div class="ranking-stats">
                        <span class="stat" title="Очки">🎯 ${player.score || 0}</span>
                        <span class="stat" title="Макс. комбо">⚡ x${player.maxCombo || 1}</span>
                        <span class="stat" title="Подарки">🎁 ${player.gifts || 0}</span>
                        <span class="stat" title="Звёзды">⭐ ${player.stars || 0}</span>
                    </div>
                </div>
                <div class="ranking-rating">
                    ${player.rating || player.score || 0}
                </div>
            </div>
        `;
    });
    
    elements.rankingList.innerHTML = html;
}

// ===========================================
// МОБИЛЬНАЯ АДАПТАЦИЯ
// ===========================================

// Настройка touch-событий
function setupTouchEvents() {
    let touchStartTime = 0;
    let touchStartElement = null;
    
    if (!elements.gameField) return;
    
    elements.gameField.addEventListener('touchstart', (e) => {
        if (!game.isPlaying || game.isPaused || game.isFrozen) return;
        
        const touch = e.touches[0];
        touchStartTime = Date.now();
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('falling-object')) {
            touchStartElement = element;
            element.style.transform = 'scale(0.95)';
            element.style.transition = 'transform 0.1s';
        }
        
        e.preventDefault();
    }, { passive: false });
    
    elements.gameField.addEventListener('touchend', (e) => {
        if (!game.isPlaying || game.isPaused || game.isFrozen) return;
        
        const touch = e.changedTouches[0];
        const touchDuration = Date.now() - touchStartTime;
        
        if (touchDuration < 300) {
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (element && element.classList.contains('falling-object')) {
                handleObjectClick(element);
            } else if (touchStartElement) {
                handleObjectClick(touchStartElement);
            } else {
                resetCombo();
            }
        }
        
        if (touchStartElement) {
            touchStartElement.style.transform = '';
        }
        
        touchStartElement = null;
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (game.isPlaying) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Адаптация под размер экрана
window.addEventListener('resize', () => {
    const objects = document.querySelectorAll('.falling-object');
    const isMobile = window.innerWidth <= 768;
    
    objects.forEach(obj => {
        if (!obj.dataset.caught) {
            const newSize = isMobile ? 50 : 60;
            obj.style.width = `${newSize}px`;
            obj.style.height = `${newSize}px`;
            obj.style.fontSize = isMobile ? '28px' : '32px';
            
            if (elements.gameField) {
                const fieldWidth = elements.gameField.clientWidth;
                const currentLeft = parseFloat(obj.style.left);
                
                if (currentLeft + newSize > fieldWidth) {
                    obj.style.left = `${fieldWidth - newSize}px`;
                }
            }
        }
    });
});

// ===========================================
// ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ===========================================

// Основная функция инициализации
async function initializeGame() {
    try {
        // Инициализируем DOM элементы
        initElements();
        
        // Проверяем необходимые элементы
        if (!elements.startScreen || !elements.gameField) {
            throw new Error('Не все необходимые элементы найдены');
        }
        
        // Создаем частицы
        createParticles();
        
        // Показываем анимацию загрузки
        const loader = document.getElementById("loader");
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(async () => {
                loader.style.display = "none";
                
                const content = document.getElementById("content");
                if (content) {
                    content.style.opacity = "1";
                }
                
                // Проверяем Firebase
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase не загружен');
                }
                
                // Настраиваем Firebase
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
                
                game.database = firebase.database();
                
                // Проверяем авторизацию
                await checkAuth();
                
                // Загружаем данные
                await loadUserData();
                updateTicketInfo();
                setupEventListeners();
                await loadUserStats();
                
                // Настраиваем мобильные события
                if ('ontouchstart' in window) {
                    setupTouchEvents();
                }
                
                console.log('🎮 Игра успешно инициализирована!');
                
            }, 400);
        }
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        
        // Показываем сообщение об ошибке
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 68, 68, 0.9);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 9999;
            max-width: 400px;
            width: 90%;
        `;
        errorDiv.innerHTML = `
            <h3 style="margin-bottom: 15px;">⚠️ Ошибка загрузки</h3>
            <p style="margin-bottom: 20px;">${error.message}</p>
            <button onclick="window.location.reload()" 
                    style="background: white; color: #ff4444; 
                           border: none; padding: 10px 25px; 
                           border-radius: 25px; cursor: pointer;
                           font-weight: bold; margin: 5px;">
                Обновить страницу
            </button>
            <button onclick="window.location.href='../index.html'"
                    style="background: #6200ff; color: white; 
                           border: none; padding: 10px 25px; 
                           border-radius: 25px; cursor: pointer;
                           font-weight: bold; margin: 5px;">
                На главную
            </button>
        `;
        document.body.appendChild(errorDiv);
        
        // Прячем лоадер
        const loader = document.getElementById("loader");
        if (loader) loader.style.display = "none";
        
        // Показываем контент
        const content = document.getElementById("content");
        if (content) content.style.opacity = "1";
    }
}

// Запуск при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Добавляем глобальные функции для отладки
window.debugGame = {
    getState: () => game,
    reset: () => resetGame(),
    addTickets: (count) => {
        game.tickets += count;
        updateTicketDisplay();
        showNotification(`Добавлено ${count} билетов!`, 'success');
    },
    setScore: (score) => {
        game.score = score;
        updateGameUI();
    }
};

console.log('🎮 clicker.js загружен!');
