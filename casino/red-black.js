// red-black.js - логика игры "Красное или Черное" с умной системой подкрутки

let userId = null;
let userNickname = null;
let pointsData = null;
let casinoData = null;

// Хранилище паттернов игроков
const playerPatterns = {};

// Состояние игры
let gameState = {
    selectedColor: null,
    betAmount: 10,
    balance: 0,
    isSpinning: false,
    canBet: true,
    cooldownEnd: null,
    lastResults: [],
    consecutiveWins: 0
};

// Режим отладки (поставить false в продакшене)
const DEBUG_MODE = false;

// Логи для админ-панели
let adminLogs = [];

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await loadUserData();
            setupEventListeners();
            updateUI();
            checkCooldown();
        }
    }, 400);
};

// СОЗДАНИЕ ЧАСТИЦ
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

// ДОБАВЛЕНИЕ ЛОГА ДЛЯ АДМИН-ПАНЕЛИ
function addAdminLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        userId,
        nickname: userNickname,
        message,
        type,
        betAmount: gameState.betAmount,
        balance: gameState.balance,
        selectedColor: gameState.selectedColor,
        consecutiveWins: gameState.consecutiveWins
    };
    
    adminLogs.unshift(logEntry);
    
    // Сохраняем в localStorage для доступа из админ-панели
    if (typeof localStorage !== 'undefined') {
        try {
            const existingLogs = JSON.parse(localStorage.getItem('jojoland_admin_logs') || '[]');
            const updatedLogs = [logEntry, ...existingLogs.slice(0, 99)]; // Храним последние 100 записей
            localStorage.setItem('jojoland_admin_logs', JSON.stringify(updatedLogs));
        } catch (e) {
            // Игнорируем ошибки localStorage
        }
    }
}

// ПРОВЕРКА АВТОРИЗАЦИИ
async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!userId || !userNickname) {
        showError('Для игры необходимо войти в аккаунт');
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
        // Загружаем баланс очков
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnapshot.exists()) {
            pointsData = pointsSnapshot.val();
            
            // Используем total_points
            gameState.balance = pointsData.total_points || 0;
            
            // Если есть available_points, мигрируем их
            if (pointsData.available_points !== undefined && pointsData.available_points !== null) {
                await migrateAvailablePointsToTotal();
            }
        } else {
            showError('У вас нет новогодних очков. Получите их в разделе "Новогодние очки"');
            gameState.balance = 0;
        }
        
        // Загружаем данные казино
        const casinoSnapshot = await database.ref('casino/' + userId).once('value');
        if (casinoSnapshot.exists()) {
            casinoData = casinoSnapshot.val();
            
            // Загружаем последние результаты (только для внутреннего анализа)
            if (casinoData.bet_history) {
                const redBlackResults = casinoData.bet_history
                    .filter(bet => bet.game === 'red_black')
                    .slice(0, 20)
                    .map(bet => ({
                        color: bet.result_color,
                        win: bet.result === 'win'
                    }));
                
                gameState.lastResults = redBlackResults;
                
                // Считаем подряд идущие выигрыши
                gameState.consecutiveWins = countConsecutiveWins();
            }
            
            // Проверяем кулдаун
            if (casinoData.cooldown_until) {
                const cooldownTime = new Date(casinoData.cooldown_until).getTime();
                const now = Date.now();
                
                if (cooldownTime > now) {
                    gameState.cooldownEnd = cooldownTime;
                    gameState.canBet = false;
                    startCooldownTimer();
                }
            }
        } else {
            // Создаем новую запись
            casinoData = {
                total_bets: 0,
                total_won: 0,
                total_lost: 0,
                bet_history: [],
                last_bet_time: null,
                cooldown_until: null
            };
            
            await database.ref('casino/' + userId).set(casinoData);
        }
        
        // Инициализируем паттерн игрока
        initializePlayerPattern(userId);
        
        // Логируем загрузку данных (только в админ-логи)
        addAdminLog('✅ Данные игры загружены', 'info');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных игры');
        addAdminLog('❌ Ошибка загрузки данных игры', 'error');
    }
}

// ИНИЦИАЛИЗАЦИЯ ПАТТЕРНА ИГРОКА
function initializePlayerPattern(userId) {
    if (!playerPatterns[userId]) {
        playerPatterns[userId] = {
            totalGames: 0,
            wins: 0,
            lastChoices: [],
            patternHistory: [],
            colorStats: { red: 0, black: 0 },
            winRate: 0,
            currentPattern: 'random'
        };
    }
}

// АНАЛИЗ ПАТТЕРНА ИГРОКА
function analyzePlayerPattern(playerData) {
    if (playerData.lastChoices.length < 3) {
        return 'random';
    }
    
    // Проверяем, выбирает ли игрок один цвет
    const lastColor = playerData.lastChoices[0];
    const sameColorCount = playerData.lastChoices.filter(color => color === lastColor).length;
    
    if (sameColorCount >= playerData.lastChoices.length * 0.8) {
        return 'same_color'; // Игрок выбирает один цвет
    }
    
    // Проверяем чередование
    let alternating = true;
    for (let i = 1; i < playerData.lastChoices.length; i++) {
        if (playerData.lastChoices[i] === playerData.lastChoices[i - 1]) {
            alternating = false;
            break;
        }
    }
    
    if (alternating) {
        return 'alternating'; // Игрок чередует цвета
    }
    
    // Проверяем паттерны
    const patterns = detectPatterns(playerData.lastChoices);
    if (patterns.length > 0) {
        return 'pattern_' + patterns[0];
    }
    
    return 'random';
}

// ОБНОВЛЕНИЕ ПАТТЕРНА ИГРОКА
function updatePlayerPattern(isWin) {
    const playerData = playerPatterns[userId];
    
    if (!playerData) return;
    
    // Обновляем статистику
    playerData.totalGames++;
    if (isWin) {
        playerData.wins++;
    }
    
    // Сохраняем выбор цвета (ограниченная история для предотвращения анализа)
    if (gameState.selectedColor) {
        playerData.lastChoices.unshift(gameState.selectedColor);
        
        // ОГРАНИЧИВАЕМ ИСТОРИЮ ДО 5 ПОСЛЕДНИХ ХОДОВ
        if (playerData.lastChoices.length > 5) {
            playerData.lastChoices = playerData.lastChoices.slice(0, 5);
        }
        
        // Обновляем статистику по цветам
        playerData.colorStats[gameState.selectedColor] = (playerData.colorStats[gameState.selectedColor] || 0) + 1;
    }
    
    // ОБМАНЫВАЕМ ВИНРЕЙТ: всегда показываем около 45-50%
    const fakeWinRate = 0.45 + (Math.random() * 0.1);
    playerData.winRate = fakeWinRate;
    
    // РАНДОМИЗИРУЕМ паттерн чаще
    if (Math.random() < 0.3) {
        playerData.currentPattern = 'random';
    } else {
        playerData.currentPattern = analyzePlayerPattern(playerData);
    }
}

// ОПРЕДЕЛЕНИЕ ПАТТЕРНОВ
function detectPatterns(choices) {
    const patterns = [];
    
    if (choices.length < 3) return patterns;
    
    // Паттерн: два красных, затем черное
    if (choices.length >= 3 && 
        choices[0] === 'black' && 
        choices[1] === 'red' && 
        choices[2] === 'red') {
        patterns.push('two_reds_then_black');
    }
    
    // Паттерн: повторение цвета
    if (choices.length >= 2 && choices[0] === choices[1]) {
        patterns.push('color_repeat');
    }
    
    return patterns;
}

// ГЕНЕРАЦИЯ РЕЗУЛЬТАТА С УМНОЙ СИСТЕМОЙ ПОДКРУТКИ
function generateResult() {
    // Устанавливаем кулдаун в зависимости от ставки
    if (gameState.betAmount < 50) {
        setCooldown(5000); // 5 секунд для мелких ставок
    }

    // Инициализируем данные игрока
    initializePlayerPattern(userId);
    const playerData = playerPatterns[userId];
    
    // НАСТРОЙКИ КАЗИНО (БАЛАНСИРОВАННЫЕ)
    const CASINO_SETTINGS = {
        minProbability: 0.35,    // Минимальный шанс выигрыша
        maxProbability: 0.65,    // Максимальный шанс выигрыша
        baseProbability: 0.48,   // Базовая вероятность 48%
        consecutiveLossBoost: 0.15, // Помощь после проигрышей
        smallBetPenalty: 0.05,   // Небольшой штраф за мелкие ставки
        patternPenalty: 0.08     // Штраф за обнаружение паттерна
    };
    
    let winProbability = CASINO_SETTINGS.baseProbability;
    
    addAdminLog("🎰 Умная система активирована", "system");
    
    // 1. ФАКТОР ПАТТЕРНА ИГРОКА
    const playerPattern = playerData.currentPattern;
    
    if (playerPattern !== 'random') {
        winProbability -= CASINO_SETTINGS.patternPenalty;
        addAdminLog(`🎯 Обнаружен паттерн: ${playerPattern} (-${CASINO_SETTINGS.patternPenalty*100}%)`, "pattern");
    }
    
    // 2. ФАКТОР РАЗМЕРА СТАВКИ (БАЛАНСИРОВАННЫЙ)
    if (gameState.betAmount < 50) {
        // Небольшой штраф для мелких ставок
        winProbability -= CASINO_SETTINGS.smallBetPenalty;
        addAdminLog(`🎯 Мелкая ставка: ${gameState.betAmount} (-${CASINO_SETTINGS.smallBetPenalty*100}%)`, "penalty");
    } else if (gameState.betAmount > 200) {
        // Крупные ставки имеют немного меньший шанс
        winProbability -= 0.05;
        addAdminLog(`🎯 Крупная ставка: ${gameState.betAmount} (-5%)`, "penalty");
    } else if (gameState.betAmount >= 50 && gameState.betAmount <= 100) {
        // Средние ставки получают небольшой бонус
        winProbability += 0.03;
        addAdminLog(`🎯 Оптимальная ставка: ${gameState.betAmount} (+3%)`, "bonus");
    }
    
    // 3. ФАКТОР БАЛАНСА ИГРОКА
    const balanceFactor = gameState.balance / 2000;
    if (balanceFactor > 1) {
        // Для очень больших балансов
        winProbability -= Math.min(0.10, balanceFactor * 0.03);
        addAdminLog(`🎯 Высокий баланс: ${gameState.balance}`, "balance");
    } else if (balanceFactor < 0.5) {
        // Маленький баланс - небольшой бонус
        winProbability += 0.02;
        addAdminLog(`🎯 Низкий баланс: ${gameState.balance} (+2%)`, "balance");
    }
    
    // 4. ФАКТОР ПОДРЯД ИДУЩИХ ПРОИГРЫШЕЙ (ПОМОЩЬ)
    const recentLosses = countRecentLosses();
    if (recentLosses >= 3) {
        // После 3 проигрышей подряд - увеличиваем шанс
        winProbability += CASINO_SETTINGS.consecutiveLossBoost;
        addAdminLog(`🎯 ${recentLosses} проигрыша подряд (+${CASINO_SETTINGS.consecutiveLossBoost*100}%)`, "help");
    }
    
    // 5. ГАРАНТИРОВАННЫЙ ПРОИГРЫШ ПОСЛЕ 2+ ВЫИГРЫШЕЙ (БАЛАНСИРОВАННЫЙ)
    if (gameState.consecutiveWins >= 2) {
        // После 2 выигрышей подряд - 60% шанс проигрыша
        addAdminLog("🎰 Активация коррекции (2+ выигрыша подряд)", "correction");
        return Math.random() < 0.60 ? 
               (gameState.selectedColor === 'red' ? 'black' : 'red') :
               gameState.selectedColor;
    }
    
    // 6. ПСЕВДОСЛУЧАЙНЫЕ ВСПЛЕСКИ УДАЧИ
    const pseudoRandomFactor = Math.sin(Date.now() / 10000) * 0.1;
    winProbability += pseudoRandomFactor;
    
    // Ограничиваем вероятности
    winProbability = Math.max(CASINO_SETTINGS.minProbability, 
                              Math.min(CASINO_SETTINGS.maxProbability, winProbability));
    
    // СЛУЧАЙНЫЙ ШУМ для предотвращения анализа
    const noise = (Math.random() - 0.5) * 0.1;
    winProbability += noise;
    
    // Логируем финальную вероятность
    const finalChance = Math.round(winProbability * 100);
    addAdminLog(`🎲 Финальный шанс выигрыша: ${finalChance}%`, "probability");
    addAdminLog(`📊 Баланс: ${gameState.balance}, Ставка: ${gameState.betAmount}`, "stats");
    
    // Генерируем результат на основе вероятности
    const random = Math.random();
    let isWin = random < winProbability;
    
    return isWin ? gameState.selectedColor : 
                  (gameState.selectedColor === 'red' ? 'black' : 'red');
}

// СЧЕТЧИК ПОСЛЕДНИХ ПРОИГРЫШЕЙ
function countRecentLosses() {
    let count = 0;
    for (let result of gameState.lastResults) {
        if (!result.win) {
            count++;
        } else {
            break;
        }
    }
    return count;
}

// СЧЕТЧИК ПОДРЯД ИДУЩИХ ВЫИГРЫШЕЙ
function countConsecutiveWins() {
    let count = 0;
    for (let result of gameState.lastResults) {
        if (result.win) {
            count++;
        } else {
            break;
        }
    }
    return count;
}

// МИГРАЦИЯ available_points В total_points
async function migrateAvailablePointsToTotal() {
    try {
        const available = pointsData.available_points || 0;
        const total = pointsData.total_points || 0;
        
        // Используем максимальное значение из двух
        const newTotal = Math.max(available, total);
        
        // Обновляем в базе данных
        await database.ref('holiday_points/' + userId).update({
            total_points: newTotal,
            available_points: null // Удаляем старую переменную
        });
        
        // Обновляем локальные данные
        pointsData.total_points = newTotal;
        delete pointsData.available_points;
        
        gameState.balance = newTotal;
        
        addAdminLog(`✅ Миграция: ${available} → ${newTotal}`, "migration");
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
    }
}

// ПРОВЕРКА ВОЗМОЖНОСТИ СТАВКИ
function canPlaceBet() {
    // Проверка 1: Достаточно ли баланса
    if (gameState.balance < gameState.betAmount) {
        showError('Недостаточно очков для ставки');
        return false;
    }
    
    // Проверка 2: Минимальная ставка
    if (gameState.betAmount < 10) {
        showError('Минимальная ставка - 10 очков');
        return false;
    }
    
    // Проверка 3: Выбран ли цвет
    if (!gameState.selectedColor) {
        showError('Выберите цвет (красное или черное)');
        return false;
    }
    
    // Проверка 4: Активен ли кулдаун
    if (!gameState.canBet) {
        showError('Подождите перед следующей ставкой');
        return false;
    }
    
    // Проверка 5: Не идет ли уже игра
    if (gameState.isSpinning) {
        showError('Дождитесь окончания текущей игры');
        return false;
    }
    
    return true;
}

// ОБРАБОТКА СТАВКИ
async function placeBet() {
    addAdminLog('🎲 Попытка сделать ставку', 'bet');
    
    if (!canPlaceBet()) {
        return;
    }
    
    try {
        // Блокируем кнопку для защиты от двойного нажатия
        gameState.isSpinning = true;
        gameState.canBet = false;
        
        const placeBetBtn = document.getElementById('place-bet');
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = '<span class="bet-icon">🎲</span><span class="bet-text">Крутим...</span>';
        
        // Начинаем анимацию вращения
        const roulette = document.getElementById('roulette-wheel');
        roulette.classList.add('spinning');
        
        // Ждем анимацию вращения
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Генерируем результат с умной системой
        const result = generateResult();
        
        // Проверяем выигрыш
        const isWin = result === gameState.selectedColor;
        const winAmount = isWin ? Math.floor(gameState.betAmount * 1.8) : 0;
        const balanceChange = isWin ? winAmount : -gameState.betAmount;
        
        // Обновляем счетчик подряд идущих выигрышей
        if (isWin) {
            gameState.consecutiveWins++;
        } else {
            gameState.consecutiveWins = 0;
        }
        
        // Обновляем паттерн игрока
        updatePlayerPattern(isWin);
        
        // Обновляем баланс
        await updatePointsBalance(balanceChange);
        
        // Записываем результат в историю
        await saveBetResult(result, isWin, winAmount);
        
        // Обновляем UI с результатом
        updateResultUI(result, isWin, winAmount);
        
        // Показываем модальное окно с результатом
        showResultModal(result, isWin, winAmount);
        
        // Устанавливаем кулдаун
        setCooldown(5000);
        
        // Логируем результат ставки
        const resultType = isWin ? 'Выигрыш' : 'Проигрыш';
        addAdminLog(`✅ Ставка: ${resultType} ${winAmount || 0} очков`, isWin ? 'win' : 'loss');
        
        const playerData = playerPatterns[userId];
        if (playerData?.currentPattern) {
            addAdminLog(`📊 Паттерн: ${playerData.currentPattern}`, 'pattern');
        }
        
    } catch (error) {
        console.error('❌ Ошибка ставки:', error);
        showError('Ошибка при обработке ставки');
        addAdminLog('❌ Ошибка при обработке ставки', 'error');
    } finally {
        // Снимаем блокировку
        gameState.isSpinning = false;
        
        const placeBetBtn = document.getElementById('place-bet');
        placeBetBtn.disabled = !gameState.canBet;
        placeBetBtn.innerHTML = '<span class="bet-icon">🎲</span><span class="bet-text">Сделать ставку</span>';
        
        const roulette = document.getElementById('roulette-wheel');
        roulette.classList.remove('spinning');
    }
}

// ОБНОВЛЕНИЕ БАЛАНСА ОЧКОВ
async function updatePointsBalance(change) {
    try {
        if (!pointsData) return;
        
        // Используем total_points
        const currentPoints = pointsData.total_points || 0;
        const newTotal = currentPoints + change;
        
        // Обновляем локальные данные
        pointsData.total_points = newTotal;
        
        // Удаляем available_points если он существует
        const updates = {
            total_points: newTotal
        };
        
        if (pointsData.available_points !== undefined) {
            updates.available_points = null;
        }
        
        // Сохраняем в Firebase
        await database.ref('holiday_points/' + userId).update(updates);
        
        // Обновляем состояние игры
        gameState.balance = newTotal;
        
        addAdminLog(`💰 Баланс: ${change > 0 ? '+' : ''}${change}, всего: ${newTotal}`, 'balance');
        
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        throw error;
    }
}

// СОХРАНЕНИЕ РЕЗУЛЬТАТА СТАВКИ
async function saveBetResult(resultColor, isWin, winAmount) {
    try {
        const betRecord = {
            game: 'red_black',
            timestamp: new Date().toISOString(),
            bet_amount: gameState.betAmount,
            selected_color: gameState.selectedColor,
            result_color: resultColor,
            result: isWin ? 'win' : 'loss',
            win_amount: winAmount,
            balance_change: isWin ? winAmount : -gameState.betAmount,
            new_balance: gameState.balance
        };
        
        // Обновляем статистику казино
        const updates = {
            last_bet_time: new Date().toISOString(),
            cooldown_until: new Date(Date.now() + 5000).toISOString(),
            total_bets: (casinoData.total_bets || 0) + 1,
            bet_history: [betRecord, ...(casinoData.bet_history || [])]
        };
        
        if (isWin) {
            updates.total_won = (casinoData.total_won || 0) + winAmount;
        } else {
            updates.total_lost = (casinoData.total_lost || 0) + gameState.betAmount;
        }
        
        // Сохраняем в Firebase
        await database.ref('casino/' + userId).update(updates);
        
        // Обновляем локальные данные
        casinoData = { ...casinoData, ...updates };
        
    } catch (error) {
        console.error('❌ Ошибка сохранения результата:', error);
        throw error;
    }
}

// УСТАНОВКА КУЛДАУНА
function setCooldown(duration) {
    // Для мелких ставок НЕ увеличиваем кулдаун так сильно
    if (gameState.betAmount < 50) {
        duration = Math.max(duration, 5000); // Минимум 5 секунд
    }
    
    gameState.cooldownEnd = Date.now() + duration;
    gameState.canBet = false;
    
    // Показываем таймер кулдауна
    const cooldownInfo = document.getElementById('cooldown-info');
    const cooldownTimer = document.getElementById('cooldown-timer');
    cooldownInfo.style.display = 'flex';
    
    startCooldownTimer();
}

// ЗАПУСК ТАЙМЕРА КУЛДАУНА
function startCooldownTimer() {
    const cooldownInfo = document.getElementById('cooldown-info');
    const cooldownTimer = document.getElementById('cooldown-timer');
    const placeBetBtn = document.getElementById('place-bet');
    
    const updateTimer = () => {
        if (!gameState.cooldownEnd) return;
        
        const now = Date.now();
        const timeLeft = gameState.cooldownEnd - now;
        
        if (timeLeft <= 0) {
            // Кулдаун закончился
            gameState.canBet = true;
            gameState.cooldownEnd = null;
            
            cooldownInfo.style.display = 'none';
            placeBetBtn.disabled = false;
            
            // Обновляем кнопку
            updateBetButtonState();
            
            return;
        }
        
        // Обновляем таймер
        const seconds = Math.ceil(timeLeft / 1000);
        cooldownTimer.textContent = `${seconds}с`;
        
        // Проверяем каждую секунду
        setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
}

// ПРОВЕРКА КУЛДАУНА ПРИ ЗАГРУЗКЕ
function checkCooldown() {
    if (gameState.cooldownEnd) {
        const now = Date.now();
        if (gameState.cooldownEnd > now) {
            startCooldownTimer();
        } else {
            gameState.canBet = true;
            gameState.cooldownEnd = null;
            updateBetButtonState();
        }
    }
}

// ОБНОВЛЕНИЕ UI
function updateUI() {
    // Обновляем баланс
    document.getElementById('current-balance').textContent = gameState.balance;
    
    // Обновляем ставку
    const betInput = document.getElementById('bet-input');
    betInput.value = gameState.betAmount;
    
    // Обновляем информацию о ставке
    document.getElementById('current-bet').textContent = gameState.betAmount;
    document.getElementById('possible-win').textContent = Math.floor(gameState.betAmount * 1.8);
    
    // Обновляем кнопку ставки
    updateBetButtonState();
}

// ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПКИ СТАВКИ
function updateBetButtonState() {
    const placeBetBtn = document.getElementById('place-bet');
    
    if (gameState.isSpinning) {
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = '<span class="bet-icon">🎲</span><span class="bet-text">Крутим...</span>';
    } else if (!gameState.canBet) {
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = '<span class="bet-icon">⏰</span><span class="bet-text">Подождите</span>';
    } else if (gameState.balance < gameState.betAmount) {
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = '<span class="bet-icon">💰</span><span class="bet-text">Недостаточно</span>';
    } else if (!gameState.selectedColor) {
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = '<span class="bet-icon">🎨</span><span class="bet-text">Выберите цвет</span>';
    } else {
        placeBetBtn.disabled = false;
        placeBetBtn.innerHTML = '<span class="bet-icon">🎲</span><span class="bet-text">Сделать ставку</span>';
    }
}

// ОБНОВЛЕНИЕ UI С РЕЗУЛЬТАТОМ
function updateResultUI(result, isWin, winAmount) {
    const resultColor = document.getElementById('result-color');
    const resultAmount = document.getElementById('result-amount');
    
    // Устанавливаем цвет
    resultColor.textContent = result === 'red' ? 'КРАСНОЕ' : 'ЧЕРНОЕ';
    resultColor.className = `result-color ${result}`;
    
    // Устанавливаем сумму
    if (isWin) {
        resultAmount.textContent = `+${winAmount}`;
        resultAmount.style.color = '#00ff00';
    } else {
        resultAmount.textContent = `-${gameState.betAmount}`;
        resultAmount.style.color = '#ff0000';
    }
}

// ПОКАЗ МОДАЛЬНОГО ОКНА С РЕЗУЛЬТАТОМ
function showResultModal(result, isWin, winAmount) {
    const modal = document.getElementById('result-modal');
    const winConfetti = document.getElementById('win-confetti');
    
    // Настраиваем заголовок
    document.getElementById('modal-title').textContent = isWin ? '🎉 Вы выиграли!' : '😔 Вы проиграли';
    document.getElementById('modal-subtitle').textContent = isWin ? 'Поздравляем!' : 'Повезет в следующий раз!';
    
    // Настраиваем цвета
    const colorCircle = document.getElementById('modal-color-circle');
    const colorText = document.getElementById('modal-color-text');
    
    if (result === 'red') {
        colorCircle.className = 'color-circle large red';
        colorText.textContent = 'КРАСНОЕ';
        colorText.style.color = '#ff0000';
    } else {
        colorCircle.className = 'color-circle large black';
        colorText.textContent = 'ЧЕРНОЕ';
        colorText.style.color = 'white';
    }
    
    // Заполняем детали
    document.getElementById('modal-selected').textContent = 
        gameState.selectedColor === 'red' ? 'КРАСНОЕ' : 'ЧЕРНОЕ';
    document.getElementById('modal-result').textContent = 
        result === 'red' ? 'КРАСНОЕ' : 'ЧЕРНОЕ';
    document.getElementById('modal-bet').textContent = gameState.betAmount;
    
    // Настраиваем сумму
    const amountLabel = document.getElementById('modal-amount-label');
    const amountValue = document.getElementById('modal-amount-value');
    
    if (isWin) {
        amountLabel.textContent = 'Вы выиграли:';
        amountValue.textContent = `+${winAmount}`;
        amountValue.style.color = '#00ff00';
        
        // Показываем конфетти
        winConfetti.style.display = 'block';
        createWinConfetti();
    } else {
        amountLabel.textContent = 'Вы проиграли:';
        amountValue.textContent = `-${gameState.betAmount}`;
        amountValue.style.color = '#ff0000';
        winConfetti.style.display = 'none';
    }
    
    // Добавляем сообщение
    const message = document.getElementById('modal-message');
    if (isWin) {
        if (winAmount >= gameState.betAmount * 1.3) {
            message.textContent = 'Отличный результат! Так держать!';
        } else {
            message.textContent = 'Хорошая игра! Возвращайтесь за новыми победами!';
        }
    } else {
        // Сообщения учитывают паттерн игрока
        const playerData = playerPatterns[userId];
        if (playerData?.currentPattern === 'same_color') {
            message.textContent = 'Попробуйте сменить цвет! Удача любит разнообразие!';
        } else if (gameState.consecutiveWins >= 2) {
            message.textContent = 'Полоса удачи закончилась. Попробуйте снова!';
        } else {
            const messages = [
                'Не расстраивайтесь! Удача обязательно улыбнется!',
                'Повезет в следующий раз!',
                'Попробуйте еще раз - статистика на вашей стороне!'
            ];
            message.textContent = messages[Math.floor(Math.random() * messages.length)];
        }
    }
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Настраиваем обработчики закрытия
    document.getElementById('close-result').onclick = function() {
        closeResultModal();
    };
    
    document.getElementById('play-again').onclick = function() {
        closeResultModal();
        // Сбрасываем выбор цвета для следующей игры
        resetColorSelection();
    };
}

// СОЗДАНИЕ КОНФЕТТИ ДЛЯ ВЫИГРЫША
function createWinConfetti() {
    const container = document.getElementById('win-confetti');
    container.innerHTML = '';
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${['#ff0000', '#ffff00', '#00ff00', '#0088ff', '#ff00ff'][Math.floor(Math.random() * 5)]};
            left: ${Math.random() * 100}%;
            top: -20px;
            opacity: 0;
            animation: confettiFall 3s ease-in-out ${Math.random() * 2}s;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        `;
        
        container.appendChild(confetti);
    }
}

// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
function closeResultModal() {
    const modal = document.getElementById('result-modal');
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
        
        // Скрываем конфетти
        document.getElementById('win-confetti').style.display = 'none';
        document.getElementById('win-confetti').innerHTML = '';
        
        // Сбрасываем результат на экране
        document.getElementById('result-color').textContent = '-';
        document.getElementById('result-color').className = 'result-color';
        document.getElementById('result-amount').textContent = '0';
        document.getElementById('result-amount').style.color = '#ffcc00';
        
    }, 300);
}

// СБРОС ВЫБОРА ЦВЕТА
function resetColorSelection() {
    gameState.selectedColor = null;
    
    // Снимаем выделение с кнопок
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Обновляем кнопку ставки
    updateBetButtonState();
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Выбор цвета
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (gameState.isSpinning) return;
            
            // Снимаем выделение со всех кнопок
            document.querySelectorAll('.color-btn').forEach(b => {
                b.classList.remove('selected');
            });
            
            // Выделяем выбранную кнопку
            this.classList.add('selected');
            
            // Сохраняем выбор
            gameState.selectedColor = this.dataset.color;
            
            // Обновляем кнопку ставки
            updateBetButtonState();
            
            // Анимация нажатия
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
    
    // Изменение суммы ставки
    const betInput = document.getElementById('bet-input');
    
    betInput.addEventListener('input', function() {
        let value = parseInt(this.value) || 0;
        
        // Ограничения
        if (value < 10) value = 10;
        if (value > 1000) value = 1000;
        if (value > gameState.balance) value = Math.min(gameState.balance, 1000);
        
        this.value = value;
        gameState.betAmount = value;
        
        // Обновляем UI
        updateUI();
    });
    
    // Кнопки изменения ставки
    document.getElementById('decrease-bet').addEventListener('click', function() {
        if (gameState.betAmount > 10) {
            gameState.betAmount = Math.max(10, gameState.betAmount - 10);
            betInput.value = gameState.betAmount;
            updateUI();
        }
    });
    
    document.getElementById('increase-bet').addEventListener('click', function() {
        if (gameState.betAmount < 1000 && gameState.betAmount < gameState.balance) {
            gameState.betAmount = Math.min(1000, gameState.balance, gameState.betAmount + 10);
            betInput.value = gameState.betAmount;
            updateUI();
        }
    });
    
    // Быстрые ставки
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (gameState.isSpinning) return;
            
            const amount = parseInt(this.dataset.amount);
            
            if (amount <= gameState.balance) {
                gameState.betAmount = amount;
                betInput.value = amount;
                updateUI();
                
                // Подсветка активной кнопки
                document.querySelectorAll('.preset-btn').forEach(b => {
                    b.classList.remove('active');
                });
                this.classList.add('active');
            } else {
                showError('Недостаточно очков для этой ставки');
            }
        });
    });
    
    // Кнопка ставки
    document.getElementById('place-bet').addEventListener('click', placeBet);
    
    // Кнопка удвоения ставки
    document.getElementById('double-bet-btn').addEventListener('click', function() {
        if (gameState.isSpinning) return;
        
        const doubled = gameState.betAmount * 2;
        if (doubled <= gameState.balance && doubled <= 1000) {
            gameState.betAmount = doubled;
            betInput.value = doubled;
            updateUI();
            
            // Анимация
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        } else {
            showError('Недостаточно очков для удвоения ставки');
        }
    });
    
    // Кнопка очистки ставки
    document.getElementById('clear-bet-btn').addEventListener('click', function() {
        if (gameState.isSpinning) return;
        
        gameState.betAmount = 10;
        betInput.value = 10;
        
        // Сбрасываем выбор цвета
        resetColorSelection();
        
        // Сбрасываем быстрые ставки
        document.querySelectorAll('.preset-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        updateUI();
        
        // Анимация
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
    
    // Защита от ввода невалидных значений
    betInput.addEventListener('keydown', function(e) {
        // Разрешаем: backspace, delete, tab, escape, enter
        if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
            // Разрешаем: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Разрешаем: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        
        // Запрещаем все, кроме цифр
        if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
    
    // Обновление баланса при изменении поля ставки
    betInput.addEventListener('change', function() {
        updateUI();
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
        background: ${type === 'success' ? 'rgba(0, 204, 102, 0.9)' : 
                     type === 'warning' ? 'rgba(255, 153, 0, 0.9)' : 
                     type === 'error' ? 'rgba(255, 68, 68, 0.9)' :
                     'rgba(0, 136, 255, 0.9)'};
        border: 1px solid ${type === 'success' ? '#00cc66' : 
                           type === 'warning' ? '#ff9900' :
                           type === 'error' ? '#ff4444' :
                           '#0088ff'};
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
        font-size: 14px;
    `;
    
    let title = 'ℹ️ Информация';
    if (type === 'success') title = '✅ Успешно!';
    if (type === 'warning') title = '⚠️ Внимание';
    if (type === 'error') title = '❌ Ошибка';
    
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
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
    showNotification(message, 'error');
}

// Добавляем CSS для конфетти
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
        }
    }
    
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
document.head.appendChild(confettiStyle);
