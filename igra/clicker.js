// ===========================================
// НОВОГОДНИЙ КЛИКЕР - ОСНОВНОЙ КОД
// ===========================================

// Конфигурация игры
const CONFIG = {
    TOTAL_TIME: 120, // 2 минуты в секундах
    TIME_INTERVALS: {
        SLOW: 120, // 120-60 сек: нормальная скорость
        MEDIUM: 60, // 60-30 сек: быстрее
        FAST: 30   // 30-0 сек: максимальная скорость
    },
    
    // Скорость падения (пикселей в секунду)
    FALL_SPEEDS: {
        SLOW: 100,
        MEDIUM: 150,
        FAST: 200
    },
    
    // Интервалы спавна объектов (мс)
    SPAWN_INTERVALS: {
        SLOW: 1500,
        MEDIUM: 1000,
        FAST: 700
    },
    
    // Вероятности появления объектов (%)
    OBJECT_PROBABILITIES: {
        GIFT: 60,      // 60% - подарок
        BOMB: 10,      // 10% - бомба
        SNOWFLAKE: 15, // 15% - заморозка
        STAR: 15       // 15% - золотая звезда
    },
    
    // Очки за объекты
    POINTS: {
        GIFT_MIN: 1,
        GIFT_MAX: 5,
        STAR_MIN: 10,
        STAR_MAX: 20,
        BOMB: -999, // Обнуляет очки
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
    database: null
};

// DOM элементы
const elements = {
    // Экран
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    resultScreen: document.getElementById('result-screen'),
    
    // Кнопки
    startBtn: document.getElementById('start-game-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resumeBtn: document.getElementById('resume-btn'),
    restartBtn: document.getElementById('restart-btn'),
    quitBtn: document.getElementById('quit-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    shareBtn: document.getElementById('share-result-btn'),
    backToMenuBtn: document.getElementById('back-to-menu-btn'),
    closeErrorBtn: document.getElementById('close-error-btn'),
    
    // Статистика
    ticketsCount: document.getElementById('tickets-count'),
    nextTicketInfo: document.getElementById('next-ticket-info'),
    bestScorePreview: document.getElementById('best-score-preview'),
    gamesPlayed: document.getElementById('games-played'),
    
    // Игровые элементы
    gameTimer: document.getElementById('game-timer'),
    gameScore: document.getElementById('game-score'),
    comboMultiplier: document.getElementById('combo-multiplier'),
    freezeTimer: document.getElementById('freeze-timer'),
    comboFill: document.getElementById('combo-fill'),
    comboCount: document.getElementById('combo-count'),
    giftsCaught: document.getElementById('gifts-caught'),
    starsCaught: document.getElementById('stars-caught'),
    bombsAvoided: document.getElementById('bombs-avoided'),
    
    // Элементы паузы
    pauseTime: document.getElementById('pause-time'),
    pauseScore: document.getElementById('pause-score'),
    pauseCombo: document.getElementById('pause-combo'),
    
    // Элементы результатов
    finalScore: document.getElementById('final-score'),
    finalTime: document.getElementById('final-time'),
    finalCombo: document.getElementById('final-combo'),
    finalGifts: document.getElementById('final-gifts'),
    finalStars: document.getElementById('final-stars'),
    newRecordBadge: document.getElementById('new-record-badge'),
    rankingList: document.getElementById('ranking-list'),
    
    // Модалка ошибки
    errorModal: document.getElementById('error-modal'),
    errorTimer: document.getElementById('error-timer'),
    
    // Игровое поле
    gameField: document.getElementById('game-field')
};

// ===========================================
// ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ===========================================

window.onload = async function() {
    // Создаем фоновые частицы
    createParticles();
    
    // Показываем анимацию загрузки
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        // Инициализируем Firebase
        game.database = firebase.database();
        
        // Проверяем авторизацию
        await checkAuth();
        
        // Загружаем данные пользователя
        await loadUserData();
        
        // Обновляем информацию о билетах
        updateTicketInfo();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Загружаем статистику
        await loadUserStats();
    }, 400);
};

// Создание фоновых частиц
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

// Проверка авторизации
async function checkAuth() {
    game.userId = localStorage.getItem('jojoland_userId');
    game.userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!game.userId || !game.userNickname) {
        // Если не авторизован, перенаправляем на главную
        showNotification('Для игры необходимо войти в аккаунт', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }
    
    return true;
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        // Загружаем данные о билетах
        const snapshot = await game.database.ref('clicker_tickets/' + game.userId).once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            game.tickets = data.tickets || 0;
            game.lastTicketDate = data.lastTicketDate ? new Date(data.lastTicketDate) : null;
        } else {
            // Создаем запись для нового пользователя
            game.tickets = 1; // Первый бесплатный билет
            game.lastTicketDate = new Date();
            
            await game.database.ref('clicker_tickets/' + game.userId).set({
                tickets: game.tickets,
                lastTicketDate: game.lastTicketDate.toISOString(),
                createdAt: new Date().toISOString()
            });
        }
        
        // Обновляем отображение билетов
        updateTicketDisplay();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // В случае ошибки даем тестовый билет
        game.tickets = 1;
        updateTicketDisplay();
    }
}

// Обновление информации о билетах
function updateTicketInfo() {
    // Останавливаем предыдущий таймер, если есть
    if (game.nextTicketTimer) {
        clearInterval(game.nextTicketTimer);
    }
    
    // Обновляем каждую секунду
    game.nextTicketTimer = setInterval(() => {
        updateNextTicketTime();
    }, 1000);
    
    updateNextTicketTime();
}

function updateNextTicketTime() {
    if (!game.lastTicketDate) {
        elements.nextTicketInfo.textContent = 'Билет доступен!';
        return;
    }
    
    const now = new Date();
    const lastTicketTime = new Date(game.lastTicketDate);
    const nextTicketTime = new Date(lastTicketTime.getTime() + 24 * 60 * 60 * 1000); // +24 часа
    const timeDiff = nextTicketTime - now;
    
    if (timeDiff <= 0) {
        // Можно получить новый билет
        elements.nextTicketInfo.textContent = 'Билет доступен!';
        giveDailyTicket();
    } else {
        // Показываем время до следующего билета
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        elements.nextTicketInfo.textContent = 
            `Следующий билет через: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Обновляем также в модалке ошибки
        if (elements.errorTimer) {
            elements.errorTimer.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

// Выдача ежедневного билета
async function giveDailyTicket() {
    const now = new Date();
    const lastTicketTime = game.lastTicketDate ? new Date(game.lastTicketDate) : null;
    
    // Если прошло больше 24 часов с последнего билета
    if (!lastTicketTime || (now - lastTicketTime) >= 24 * 60 * 60 * 1000) {
        game.tickets += 1;
        game.lastTicketDate = now;
        
        // Сохраняем в Firebase
        try {
            await game.database.ref('clicker_tickets/' + game.userId).update({
                tickets: game.tickets,
                lastTicketDate: game.lastTicketDate.toISOString()
            });
        } catch (error) {
            console.error('Ошибка сохранения билета:', error);
        }
        
        // Обновляем отображение
        updateTicketDisplay();
        showNotification('🎫 Получен ежедневный билет!', 'success');
    }
}

// Обновление отображения билетов
function updateTicketDisplay() {
    elements.ticketsCount.textContent = `${game.tickets} билетик(ов)`;
}

// Загрузка статистики пользователя
async function loadUserStats() {
    try {
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        
        if (snapshot.exists()) {
            const stats = snapshot.val();
            elements.bestScorePreview.textContent = stats.bestScore || 0;
            elements.gamesPlayed.textContent = stats.gamesPlayed || 0;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ===========================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===========================================

function setupEventListeners() {
    // Кнопка старта игры
    elements.startBtn.addEventListener('click', startGame);
    
    // Управление игрой
    elements.pauseBtn.addEventListener('click', pauseGame);
    elements.resumeBtn.addEventListener('click', resumeGame);
    elements.restartBtn.addEventListener('click', restartGame);
    elements.quitBtn.addEventListener('click', quitToMenu);
    
    // Экран результатов
    elements.playAgainBtn.addEventListener('click', playAgain);
    elements.shareBtn.addEventListener('click', shareResults);
    elements.backToMenuBtn.addEventListener('click', backToMenu);
    
    // Модалка ошибки
    elements.closeErrorBtn.addEventListener('click', () => {
        elements.errorModal.style.display = 'none';
    });
    
    // Обработка кликов по игровому полю
    elements.gameField.addEventListener('click', handleFieldClick);
    
    // Обработка кликов по падающим объектам (делегирование)
    elements.gameField.addEventListener('click', function(e) {
        if (e.target.classList.contains('falling-object')) {
            handleObjectClick(e.target);
        }
    });
}

// ===========================================
// УПРАВЛЕНИЕ ИГРОЙ
// ===========================================

// Начало игры
async function startGame() {
    // Проверяем наличие билетов
    if (game.tickets < 1) {
        showErrorModal();
        return;
    }
    
    // Снимаем билет
    game.tickets -= 1;
    await game.database.ref('clicker_tickets/' + game.userId).update({
        tickets: game.tickets
    });
    updateTicketDisplay();
    
    // Сбрасываем состояние игры
    resetGame();
    
    // Переключаем экран
    switchScreen('game');
    
    // Начинаем игру
    game.isPlaying = true;
    startGameTimer();
    startSpawningObjects();
}

// Пауза игры
function pauseGame() {
    if (!game.isPlaying || game.isPaused) return;
    
    game.isPaused = true;
    clearInterval(game.gameTimer);
    clearInterval(game.spawnTimer);
    
    // Обновляем статистику на экране паузы
    elements.pauseTime.textContent = formatTime(game.timeLeft);
    elements.pauseScore.textContent = game.score;
    elements.pauseCombo.textContent = `x${game.comboMultiplier}`;
    
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
        // Проверяем билеты
        if (game.tickets < 1) {
            showErrorModal();
            return;
        }
        
        // Снимаем билет
        game.tickets -= 1;
        game.database.ref('clicker_tickets/' + game.userId).update({
            tickets: game.tickets
        });
        updateTicketDisplay();
        
        // Сбрасываем и начинаем заново
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
    game.bombsAvoided = 0;
    
    // Очищаем таймеры
    clearInterval(game.gameTimer);
    clearInterval(game.spawnTimer);
    clearTimeout(game.freezeTimer);
    clearTimeout(game.comboDecayTimer);
    
    // Очищаем игровое поле
    elements.gameField.innerHTML = '<div class="field-background"></div>';
    
    // Обновляем интерфейс
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
    const minutes = Math.floor(game.timeLeft / 60);
    const seconds = game.timeLeft % 60;
    elements.gameTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Обновляем скорость игры в зависимости от времени
    updateGameSpeed();
}

// Обновление скорости игры
function updateGameSpeed() {
    // Скорость будет учтена при создании новых объектов
}

// Спавн объектов
function startSpawningObjects() {
    spawnObject(); // Первый объект сразу
    
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
    const objectType = getRandomObjectType();
    const object = createGameObject(objectType);
    
    // Случайная позиция по горизонтали
    const fieldWidth = elements.gameField.clientWidth;
    const objectSize = 60;
    const maxLeft = fieldWidth - objectSize;
    const left = Math.random() * maxLeft;
    
    object.style.left = `${left}px`;
    object.style.top = `-${objectSize}px`;
    
    // Анимация падения
    const fallSpeed = getFallSpeed();
    const animationDuration = (elements.gameField.clientHeight + objectSize) / fallSpeed;
    
    object.style.animation = `floatDown ${animationDuration}s linear forwards`;
    
    // Удаление объекта после падения
    setTimeout(() => {
        if (object.parentNode && !object.dataset.caught) {
            object.remove();
            
            // Если это бомба, которая упала - считаем что её избежали
            if (object.classList.contains('bomb')) {
                game.bombsAvoided++;
                updateGameUI();
            }
        }
    }, animationDuration * 1000);
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
    
    return 'gift'; // По умолчанию
}

// Создание игрового объекта
function createGameObject(type) {
    const object = document.createElement('div');
    object.className = `falling-object ${type}`;
    object.dataset.type = type;
    
    switch(type) {
        case 'gift':
            object.textContent = '🎁';
            break;
        case 'bomb':
            object.textContent = '💣';
            break;
        case 'snowflake':
            object.textContent = '❄️';
            break;
        case 'star':
            object.textContent = '⭐';
            break;
    }
    
    elements.gameField.appendChild(object);
    return object;
}

// Обработка клика по объекту
function handleObjectClick(object) {
    if (game.isFrozen || game.isPaused || !game.isPlaying) return;
    
    // Помечаем объект как пойманный
    object.dataset.caught = 'true';
    
    const type = object.dataset.type;
    const points = processObjectClick(type, object);
    
    // Эффект при клике
    createClickEffect(object);
    
    // Обновляем комбо
    updateCombo();
    
    // Обновляем статистику
    updateGameUI();
    
    // Удаляем объект
    object.remove();
    
    return points;
}

// Обработка объекта в зависимости от типа
function processObjectClick(type, object) {
    let points = 0;
    
    switch(type) {
        case 'gift':
            points = getRandomPoints(CONFIG.POINTS.GIFT_MIN, CONFIG.POINTS.GIFT_MAX);
            game.giftsCaught++;
            showFloatingText(object, `+${points}`, '#ff3366');
            break;
            
        case 'bomb':
            points = CONFIG.POINTS.BOMB;
            game.score = 0;
            game.combo = 0;
            game.comboMultiplier = 1;
            showFloatingText(object, 'БОМБА!', '#333');
            break;
            
        case 'snowflake':
            freezeGame();
            showFloatingText(object, 'ЗАМОРОЗКА!', '#00ccff');
            break;
            
        case 'star':
            const rewardType = Math.random() > 0.5 ? 'points' : 'time';
            
            if (rewardType === 'points') {
                points = getRandomPoints(CONFIG.POINTS.STAR_MIN, CONFIG.POINTS.STAR_MAX);
                game.starsCaught++;
                showFloatingText(object, `+${points}`, '#ffcc00');
            } else {
                game.timeLeft += 5;
                updateTimerDisplay();
                showFloatingText(object, '+5сек', '#ffcc00');
            }
            break;
    }
    
    // Применяем множитель комбо (кроме бомбы)
    if (type !== 'bomb' && points > 0) {
        points *= game.comboMultiplier;
    }
    
    // Обновляем счёт
    if (type !== 'snowflake') {
        game.score += points;
    }
    
    return points;
}

// Случайные очки в диапазоне
function getRandomPoints(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Создание эффекта клика
function createClickEffect(object) {
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
    `;
    
    elements.gameField.appendChild(effect);
    
    setTimeout(() => {
        effect.remove();
    }, 500);
}

// Показать всплывающий текст
function showFloatingText(object, text, color) {
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
        font-size: 18px;
        font-weight: bold;
        text-shadow: 0 0 5px rgba(0,0,0,0.5);
        z-index: 20;
        animation: floatUp 1s ease-out forwards;
    `;
    
    elements.gameField.appendChild(floatingText);
    
    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatUp {
            0% {
                opacity: 1;
                transform: translateY(0);
            }
            100% {
                opacity: 0;
                transform: translateY(-50px);
            }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        floatingText.remove();
        style.remove();
    }, 1000);
}

// Заморозка игры
function freezeGame() {
    if (game.isFrozen) return;
    
    game.isFrozen = true;
    elements.freezeTimer.textContent = `${CONFIG.POINTS.SNOWFLAKE_FREEZE}с`;
    elements.freezeTimer.style.color = '#00ccff';
    
    let freezeTime = CONFIG.POINTS.SNOWFLAKE_FREEZE;
    
    game.freezeTimer = setInterval(() => {
        freezeTime--;
        elements.freezeTimer.textContent = `${freezeTime}с`;
        
        if (freezeTime <= 0) {
            clearInterval(game.freezeTimer);
            game.isFrozen = false;
            elements.freezeTimer.textContent = '0с';
            elements.freezeTimer.style.color = '#00ccff';
        }
    }, 1000);
}

// Обновление комбо
function updateCombo() {
    game.combo++;
    
    // Сбрасываем таймер убывания комбо
    clearTimeout(game.comboDecayTimer);
    
    // Проверяем множитель
    let newMultiplier = 1;
    for (const [key, data] of Object.entries(CONFIG.COMBO.MULTIPLIERS)) {
        if (game.combo >= data.threshold) {
            newMultiplier = data.multiplier;
        }
    }
    
    // Если множитель изменился
    if (newMultiplier !== game.comboMultiplier) {
        game.comboMultiplier = newMultiplier;
        showComboEffect();
    }
    
    // Обновляем прогресс комбо
    updateComboBar();
    
    // Запускаем таймер убывания комбо
    game.comboDecayTimer = setTimeout(() => {
        resetCombo();
    }, CONFIG.COMBO.DECAY_TIME);
}

// Сброс комбо
function resetCombo() {
    game.combo = 0;
    game.comboMultiplier = 1;
    updateComboBar();
}

// Обновление полосы комбо
function updateComboBar() {
    const maxCombo = Math.max(...Object.values(CONFIG.COMBO.MULTIPLIERS).map(m => m.threshold));
    const percentage = Math.min((game.combo / maxCombo) * 100, 100);
    
    elements.comboFill.style.width = `${percentage}%`;
    elements.comboCount.textContent = game.combo;
    elements.comboMultiplier.textContent = `x${game.comboMultiplier}`;
    
    // Цвет полосы в зависимости от множителя
    let color;
    switch(game.comboMultiplier) {
        case 1: color = '#ff3366'; break;
        case 2: color = '#ff9966'; break;
        case 3: color = '#ffcc00'; break;
        case 5: color = '#00ff00'; break;
        default: color = '#ff3366';
    }
    elements.comboFill.style.background = `linear-gradient(90deg, ${color}, ${color}dd)`;
}

// Эффект при изменении комбо
function showComboEffect() {
    const comboText = document.createElement('div');
    comboText.textContent = `КОМБО x${game.comboMultiplier}!`;
    comboText.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Michroma', monospace;
        font-size: 48px;
        font-weight: bold;
        color: #ffcc00;
        text-shadow: 0 0 20px rgba(255, 204, 0, 0.8);
        z-index: 100;
        animation: comboPop 1s ease-out forwards;
        pointer-events: none;
    `;
    
    document.body.appendChild(comboText);
    
    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes comboPop {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
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
    }, 1000);
}

// Обновление игрового интерфейса
function updateGameUI() {
    elements.gameScore.textContent = game.score;
    elements.giftsCaught.textContent = game.giftsCaught;
    elements.starsCaught.textContent = game.starsCaught;
    elements.bombsAvoided.textContent = game.bombsAvoided;
}

// ===========================================
// ЗАВЕРШЕНИЕ ИГРЫ
// ===========================================

// Завершение игры
function endGame() {
    game.isPlaying = false;
    
    // Останавливаем таймеры
    clearInterval(game.gameTimer);
    clearInterval(game.spawnTimer);
    clearTimeout(game.freezeTimer);
    clearTimeout(game.comboDecayTimer);
    
    // Очищаем игровое поле
    elements.gameField.innerHTML = '<div class="field-background"></div>';
    
    // Сохраняем результаты
    saveGameResults();
    
    // Показываем экран результатов
    showResultsScreen();
}

// Сохранение результатов
async function saveGameResults() {
    try {
        // Загружаем текущую статистику
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        let stats = snapshot.exists() ? snapshot.val() : {};
        
        // Обновляем статистику
        const now = new Date().toISOString();
        
        stats.bestScore = Math.max(stats.bestScore || 0, game.score);
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        stats.lastPlayed = now;
        
        // Сохраняем историю игры
        const gameHistory = {
            score: game.score,
            time: CONFIG.TOTAL_TIME - game.timeLeft,
            gifts: game.giftsCaught,
            stars: game.starsCaught,
            maxCombo: game.combo,
            timestamp: now
        };
        
        // Сохраняем в Firebase
        await game.database.ref('clicker_stats/' + game.userId).set(stats);
        await game.database.ref('clicker_history/' + game.userId).push(gameHistory);
        
        // Сохраняем в рейтинг
        await saveToLeaderboard();
        
    } catch (error) {
        console.error('Ошибка сохранения результатов:', error);
    }
}

// Сохранение в рейтинг
async function saveToLeaderboard() {
    try {
        await game.database.ref('clicker_leaderboard/' + game.userId).set({
            nickname: game.userNickname,
            score: game.score,
            lastPlayed: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка сохранения в рейтинг:', error);
    }
}

// Показ экрана результатов
function showResultsScreen() {
    // Обновляем статистику
    elements.finalScore.textContent = game.score;
    elements.finalTime.textContent = formatTime(CONFIG.TOTAL_TIME - game.timeLeft);
    elements.finalCombo.textContent = `x${game.comboMultiplier}`;
    elements.finalGifts.textContent = game.giftsCaught;
    elements.finalStars.textContent = game.starsCaught;
    
    // Проверяем новый рекорд
    checkNewRecord();
    
    // Загружаем рейтинг
    loadLeaderboard();
    
    // Переключаем экран
    switchScreen('result');
}

// Проверка нового рекорда
async function checkNewRecord() {
    try {
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        if (snapshot.exists()) {
            const stats = snapshot.val();
            if (game.score > (stats.bestScore || 0)) {
                elements.newRecordBadge.style.display = 'flex';
            } else {
                elements.newRecordBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Ошибка проверки рекорда:', error);
    }
}

// Загрузка рейтинга
async function loadLeaderboard() {
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
            players.push(player);
        });
        
        // Сортируем по очкам
        players.sort((a, b) => b.score - a.score);
        
        // Отображаем топ-10
        const topPlayers = players.slice(0, 10);
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

// Отображение рейтинга
function displayLeaderboard(players) {
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
                <div class="ranking-name">
                    ${player.nickname || 'Игрок'}
                    ${isCurrentUser ? ' <span style="color: #00ff00;">(Вы)</span>' : ''}
                </div>
                <div class="ranking-score">
                    ${player.score}
                </div>
            </div>
        `;
    });
    
    elements.rankingList.innerHTML = html;
}

// ===========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ===========================================

// Переключение экранов
function switchScreen(screenName) {
    // Скрываем все экраны
    elements.startScreen.classList.remove('active');
    elements.gameScreen.classList.remove('active');
    elements.pauseScreen.classList.remove('active');
    elements.resultScreen.classList.remove('active');
    
    // Показываем нужный экран
    switch(screenName) {
        case 'start':
            elements.startScreen.classList.add('active');
            break;
        case 'game':
            elements.gameScreen.classList.add('active');
            break;
        case 'pause':
            elements.pauseScreen.classList.add('active');
            break;
        case 'result':
            elements.resultScreen.classList.add('active');
            break;
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
    notification.className = 'notification';
    
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

// Показ модалки ошибки
function showErrorModal() {
    updateNextTicketTime();
    elements.errorModal.style.display = 'flex';
}

// Обработка клика по игровому полю (на случай промаха)
function handleFieldClick(e) {
    if (!game.isPlaying || game.isPaused || game.isFrozen) return;
    
    // Если кликнули не по объекту - сбрасываем комбо
    if (!e.target.classList.contains('falling-object')) {
        resetCombo();
    }
}

// Добавляем стиль для анимации
const gameStyle = document.createElement('style');
gameStyle.textContent = `
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
document.head.appendChild(gameStyle);

// ===========================================
// АДАПТАЦИЯ ПОД МОБИЛЬНЫЕ УСТРОЙСТВА
// ===========================================

// Обработка сенсорных событий для мобильных
function setupTouchEvents() {
    let touchStartY = 0;
    let touchStartX = 0;
    
    elements.gameField.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        
        // Предотвращаем прокрутку страницы
        e.preventDefault();
    }, { passive: false });
    
    elements.gameField.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        const touchEndX = touch.clientX;
        const touchEndY = touch.clientY;
        
        // Если перемещение небольшое - считаем это кликом
        const diffX = Math.abs(touchEndX - touchStartX);
        const diffY = Math.abs(touchEndY - touchStartY);
        
        if (diffX < 10 && diffY < 10) {
            // Ищем объект под касанием
            const element = document.elementFromPoint(touchEndX, touchEndY);
            if (element && element.classList.contains('falling-object')) {
                handleObjectClick(element);
            } else {
                handleFieldClick(e);
            }
        }
        
        e.preventDefault();
    }, { passive: false });
}

// Инициализация сенсорных событий
if ('ontouchstart' in window) {
    setupTouchEvents();
}

// Адаптация под размер экрана
window.addEventListener('resize', () => {
    // При изменении размера окна пересчитываем позиции объектов
    const objects = document.querySelectorAll('.falling-object');
    objects.forEach(obj => {
        if (!obj.dataset.caught) {
            const fieldWidth = elements.gameField.clientWidth;
            const objectSize = 60;
            const currentLeft = parseFloat(obj.style.left);
            
            // Корректируем позицию, если объект выходит за границы
            if (currentLeft + objectSize > fieldWidth) {
                obj.style.left = `${fieldWidth - objectSize}px`;
            }
        }
    });
});

// Запускаем игру при полной загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Новогодний кликер загружен и готов к игре!');
});
