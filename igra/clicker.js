// ===========================================
// НОВОГОДНИЙ КЛИКЕР - ИСПРАВЛЕННЫЙ КОД
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
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        game.database = firebase.database();
        
        await checkAuth();
        await loadUserData();
        updateTicketInfo();
        setupEventListeners();
        await loadUserStats();
        
        // Адаптация для мобильных
        if ('ontouchstart' in window) {
            setupTouchEvents();
        }
    }, 400);
};

// ... (предыдущие функции остаются такими же до функции spawnObject)

// ===========================================
// ИСПРАВЛЕННЫЕ ФУНКЦИИ ИГРОВОГО ПРОЦЕССА
// ===========================================

// Создание объекта - ИСПРАВЛЕНО для лучшей видимости
function spawnObject() {
    const objectType = getRandomObjectType();
    const object = createGameObject(objectType);
    
    // Случайная позиция по горизонтали
    const fieldWidth = elements.gameField.clientWidth;
    const objectSize = getObjectSize(); // Адаптивный размер
    const maxLeft = fieldWidth - objectSize;
    const left = Math.random() * maxLeft;
    
    object.style.left = `${left}px`;
    object.style.top = `-${objectSize}px`;
    
    // Анимация падения - ИСПРАВЛЕНО: скорость теперь заметная
    const fallSpeed = getFallSpeed();
    const fieldHeight = elements.gameField.clientHeight;
    const animationDuration = (fieldHeight + objectSize) / fallSpeed;
    
    object.style.animation = `floatDown ${animationDuration}s linear forwards`;
    
    // Удаление объекта после падения
    setTimeout(() => {
        if (object.parentNode && !object.dataset.caught) {
            object.remove();
            
            // Если это бомба, которая упала - считаем что её избежали
            if (object.classList.contains('bomb')) {
                game.bombsAvoided++;
                updateGameUI();
                
                // Показываем уведомление об избежании бомбы
                showFloatingText(object, 'Избежано!', '#00ff00', true);
            }
        }
    }, animationDuration * 1000);
    
    return object;
}

// Получение размера объекта в зависимости от устройства
function getObjectSize() {
    const isMobile = window.innerWidth <= 768;
    return isMobile ? 50 : 60; // Меньше на мобильных
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

// Создание игрового объекта - ИСПРАВЛЕНО для лучшей видимости
function createGameObject(type) {
    const object = document.createElement('div');
    object.className = `falling-object ${type}`;
    object.dataset.type = type;
    
    // Добавляем тень для лучшей видимости
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
            object.style.animation = 'pulse 1s infinite alternate'; // Добавляем пульсацию
            break;
    }
    
    // Увеличиваем шрифт
    const isMobile = window.innerWidth <= 768;
    object.style.fontSize = isMobile ? '28px' : '32px';
    
    elements.gameField.appendChild(object);
    return object;
}

// Обработка клика по объекту - ИСПРАВЛЕНО для бомбы
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

// Обработка объекта - ИСПРАВЛЕНО для бомбы
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
            // ИСПРАВЛЕНО: Бомба теперь вычитает очки, а не обнуляет
            points = -CONFIG.POINTS.BOMB_PENALTY;
            game.score = Math.max(0, game.score + points); // Не уходим в минус
            game.bombsClicked++;
            
            // Сбрасываем комбо при бомбе
            game.combo = 0;
            game.comboMultiplier = 1;
            updateComboBar();
            
            displayText = `-${CONFIG.POINTS.BOMB_PENALTY}`;
            color = '#ff0000';
            
            // Эффект взрыва
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
    
    // Обновляем счёт (кроме снежинки)
    if (type !== 'snowflake') {
        game.score = Math.max(0, game.score + points); // Не уходим в минус
    }
    
    // Показываем текст
    if (displayText) {
        showFloatingText(object, displayText, color);
    }
    
    return points;
}

// Эффект взрыва для бомбы
function createExplosionEffect(object) {
    const rect = object.getBoundingClientRect();
    const fieldRect = elements.gameField.getBoundingClientRect();
    
    // Создаем несколько частиц взрыва
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
        
        // Случайное направление
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
    
    // Звуковой эффект (если есть)
    playSound('explosion');
}

// Функция для звуковых эффектов (если добавите звуки)
function playSound(type) {
    // Здесь можно добавить воспроизведение звуков
    console.log(`Play ${type} sound`);
}

// Показать всплывающий текст - УЛУЧШЕНО
function showFloatingText(object, text, color, isSmall = false) {
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

// Заморозка игры - ИСПРАВЛЕНО
function freezeGame() {
    if (game.isFrozen) return;
    
    game.isFrozen = true;
    
    // Меняем цвет таймера
    elements.freezeTimer.style.color = '#00ccff';
    elements.freezeTimer.style.fontWeight = 'bold';
    
    let freezeTime = CONFIG.POINTS.SNOWFLAKE_FREEZE;
    elements.freezeTimer.textContent = `${freezeTime}с`;
    
    // Эффект заморозки на поле
    elements.gameField.style.filter = 'blur(2px) hue-rotate(180deg)';
    elements.gameField.style.transition = 'filter 0.5s';
    
    game.freezeTimer = setInterval(() => {
        freezeTime--;
        elements.freezeTimer.textContent = `${freezeTime}с`;
        
        if (freezeTime <= 0) {
            clearInterval(game.freezeTimer);
            game.isFrozen = false;
            
            // Возвращаем нормальный вид
            elements.gameField.style.filter = '';
            elements.freezeTimer.textContent = '0с';
            elements.freezeTimer.style.color = '#00ccff';
            elements.freezeTimer.style.fontWeight = 'normal';
        }
    }, 1000);
}

// Обновление комбо - ИСПРАВЛЕНО
function updateCombo() {
    game.combo++;
    
    // Обновляем максимальное комбо
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

// Сброс комбо - ИСПРАВЛЕНО
function resetCombo() {
    if (game.combo > 0) {
        // Показываем сообщение о потере комбо
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

// Обновление полосы комбо - ИСПРАВЛЕНО
function updateComboBar() {
    const maxCombo = Math.max(...Object.values(CONFIG.COMBO.MULTIPLIERS).map(m => m.threshold));
    const percentage = Math.min((game.combo / (maxCombo * 1.5)) * 100, 100); // Увеличили масштаб
    
    elements.comboFill.style.width = `${percentage}%`;
    elements.comboCount.textContent = game.combo;
    elements.comboMultiplier.textContent = `x${game.comboMultiplier}`;
    
    // Градиент в зависимости от уровня комбо
    let gradient;
    switch(game.comboMultiplier) {
        case 1: gradient = '#ff3366, #ff6699'; break;
        case 2: gradient = '#ff9900, #ffcc00'; break;
        case 3: gradient = '#00cc66, #00ff88'; break;
        case 5: gradient = '#6200ff, #ff00ff'; break;
        default: gradient = '#ff3366, #ff6699';
    }
    
    elements.comboFill.style.background = `linear-gradient(90deg, ${gradient})`;
    elements.comboMultiplier.style.color = getComboColor(game.comboMultiplier);
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

// Эффект комбо - УЛУЧШЕНО
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
    
    // Анимация
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
    
    elements.gameField.innerHTML = '<div class="field-background"></div>';
    
    saveGameResults();
    showResultsScreen();
}

// Сохранение результатов - ДОБАВЛЕНО больше статистики
async function saveGameResults() {
    try {
        const now = new Date();
        const gameDuration = Math.round((now - game.startTime) / 1000);
        
        // Загружаем текущую статистику
        const snapshot = await game.database.ref('clicker_stats/' + game.userId).once('value');
        let stats = snapshot.exists() ? snapshot.val() : {};
        
        // Обновляем статистику
        stats.bestScore = Math.max(stats.bestScore || 0, game.score);
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        stats.lastPlayed = now.toISOString();
        
        // Добавляем общую статистику
        stats.totalScore = (stats.totalScore || 0) + game.score;
        stats.totalGifts = (stats.totalGifts || 0) + game.giftsCaught;
        stats.totalStars = (stats.totalStars || 0) + game.starsCaught;
        stats.totalBombs = (stats.totalBombs || 0) + game.bombsClicked;
        stats.maxCombo = Math.max(stats.maxCombo || 0, game.maxCombo);
        
        // Сохраняем историю игры
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
        
        // Сохраняем в Firebase
        await game.database.ref('clicker_stats/' + game.userId).set(stats);
        await game.database.ref('clicker_history/' + game.userId).push(gameHistory);
        
        // Сохраняем в рейтинг
        await saveToLeaderboard();
        
    } catch (error) {
        console.error('Ошибка сохранения результатов:', error);
    }
}

// Сохранение в рейтинг - УЛУЧШЕНО
async function saveToLeaderboard() {
    try {
        await game.database.ref('clicker_leaderboard/' + game.userId).set({
            nickname: game.userNickname,
            score: game.score,
            maxCombo: game.maxCombo,
            gifts: game.giftsCaught,
            stars: game.starsCaught,
            lastPlayed: new Date().toISOString(),
            gamesPlayed: await getTotalGamesPlayed()
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

// Показ экрана результатов - ДОБАВЛЕНА статистика по бомбам
function showResultsScreen() {
    const gameDuration = CONFIG.TOTAL_TIME - game.timeLeft;
    
    elements.finalScore.textContent = game.score;
    elements.finalTime.textContent = formatTime(gameDuration);
    elements.finalCombo.textContent = `x${game.comboMultiplier}`;
    elements.finalGifts.textContent = game.giftsCaught;
    elements.finalStars.textContent = game.starsCaught;
    
    // Добавляем информацию о бомбах
    const bombsInfo = document.getElementById('final-bombs');
    if (!bombsInfo) {
        const detailRow = document.createElement('div');
        detailRow.className = 'detail-row';
        detailRow.id = 'final-bombs';
        detailRow.innerHTML = `
            <span class="detail-label">Нажато бомб:</span>
            <span class="detail-value">${game.bombsClicked}</span>
        `;
        document.querySelector('.result-details').appendChild(detailRow);
    } else {
        bombsInfo.querySelector('.detail-value').textContent = game.bombsClicked;
    }
    
    checkNewRecord();
    loadLeaderboard();
    switchScreen('result');
}

// Загрузка рейтинга - УЛУЧШЕНО
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
            
            // Рассчитываем рейтинг
            player.rating = calculatePlayerRating(player);
            players.push(player);
        });
        
        // Сортируем по рейтингу
        players.sort((a, b) => b.rating - a.rating);
        
        // Отображаем топ-15
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
    
    // Бонус за высокое комбо
    if (player.maxCombo >= 15) rating += 500;
    else if (player.maxCombo >= 10) rating += 300;
    else if (player.maxCombo >= 5) rating += 100;
    
    // Бонус за много подарков
    if (player.gifts >= 50) rating += 200;
    else if (player.gifts >= 30) rating += 100;
    
    // Бонус за активность (количество игр)
    if (player.gamesPlayed >= 10) rating += 150;
    else if (player.gamesPlayed >= 5) rating += 50;
    
    // Штраф за бомбы (если есть статистика)
    if (player.bombs) {
        rating -= player.bombs * 10;
    }
    
    return Math.max(0, rating);
}

// Отображение рейтинга - УЛУЧШЕНО с детальной статистикой
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
// НОВЫЕ ФУНКЦИИ ДЛЯ МОБИЛЬНЫХ
// ===========================================

// Настройка touch-событий
function setupTouchEvents() {
    let touchStartTime = 0;
    let touchStartElement = null;
    
    elements.gameField.addEventListener('touchstart', (e) => {
        if (!game.isPlaying || game.isPaused || game.isFrozen) return;
        
        const touch = e.touches[0];
        touchStartTime = Date.now();
        
        // Находим элемент под касанием
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('falling-object')) {
            touchStartElement = element;
            
            // Визуальная обратная связь
            element.style.transform = 'scale(0.95)';
            element.style.transition = 'transform 0.1s';
        }
        
        e.preventDefault();
    }, { passive: false });
    
    elements.gameField.addEventListener('touchend', (e) => {
        if (!game.isPlaying || game.isPaused || game.isFrozen) return;
        
        const touch = e.changedTouches[0];
        const touchDuration = Date.now() - touchStartTime;
        
        // Если это был короткий тап (не долгое нажатие)
        if (touchDuration < 300) {
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Если элемент найден и он объект
            if (element && element.classList.contains('falling-object')) {
                handleObjectClick(element);
            } else if (touchStartElement) {
                // Если элемент был в touchstart, но не в touchend (например, объект переместился)
                handleObjectClick(touchStartElement);
            } else {
                // Клик по пустому месту - сбрасываем комбо
                resetCombo();
            }
        }
        
        // Сбрасываем визуальный эффект
        if (touchStartElement) {
            touchStartElement.style.transform = '';
        }
        
        touchStartElement = null;
        e.preventDefault();
    }, { passive: false });
    
    // Предотвращаем масштабирование при двойном тапе
    document.addEventListener('touchmove', (e) => {
        if (game.isPlaying) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Адаптация под размер экрана
window.addEventListener('resize', () => {
    // Корректируем размер объектов при изменении размера окна
    const objects = document.querySelectorAll('.falling-object');
    const isMobile = window.innerWidth <= 768;
    
    objects.forEach(obj => {
        if (!obj.dataset.caught) {
            // Обновляем размер
            const newSize = isMobile ? 50 : 60;
            obj.style.width = `${newSize}px`;
            obj.style.height = `${newSize}px`;
            obj.style.fontSize = isMobile ? '28px' : '32px';
            
            // Корректируем позицию, если выходит за границы
            const fieldWidth = elements.gameField.clientWidth;
            const currentLeft = parseFloat(obj.style.left);
            
            if (currentLeft + newSize > fieldWidth) {
                obj.style.left = `${fieldWidth - newSize}px`;
            }
        }
    });
});

// ===========================================
// ДОПОЛНИТЕЛЬНЫЕ СТИЛИ ДЛЯ CSS
// ===========================================

function addAdditionalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Стили для рейтинга */
        .ranking-info {
            flex: 1;
            min-width: 0;
        }
        
        .ranking-stats {
            display: flex;
            gap: 8px;
            margin-top: 5px;
            flex-wrap: wrap;
        }
        
        .ranking-stats .stat {
            font-size: 11px;
            color: #aaaaff;
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 10px;
        }
        
        .ranking-rating {
            color: #ffcc00;
            font-family: 'Michroma', monospace;
            font-size: 18px;
            font-weight: bold;
            min-width: 80px;
            text-align: right;
        }
        
        .you-badge {
            color: #00ff00;
            font-size: 12px;
        }
        
        /* Адаптация для мобильных */
        @media (max-width: 768px) {
            .ranking-item {
                flex-wrap: wrap;
            }
            
            .ranking-rating {
                margin-top: 10px;
                text-align: left;
                min-width: auto;
                width: 100%;
            }
            
            .ranking-stats {
                font-size: 10px;
            }
            
            .stat {
                font-size: 10px;
                padding: 1px 4px;
            }
        }
        
        /* Анимации */
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes fadeOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Инициализация дополнительных стилей
addAdditionalStyles();

// ===========================================
// ИНИЦИАЛИЗАЦИЯ ИГРЫ ПРИ ЗАГРУЗКЕ
// ===========================================

console.log('🎮 Новогодний кликер загружен и готов к игре!');
