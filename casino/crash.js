// crash.js - ИСПРАВЛЕННАЯ логика игры Краш

let userId = null;
let userNickname = null;
let pointsData = null;
let casinoData = null;

// Состояние игры
let gameState = {
    balance: 0,
    betAmount: 50,
    isPlaying: false,
    canBet: true,
    hasBet: false,
    roundActive: false,
    roundStarting: false,
    currentMultiplier: 1.00,
    crashPoint: 1.00,
    cashoutMultiplier: 0.00,
    autoCashoutEnabled: false,
    autoCashoutValue: 2.00,
    roundNumber: 1,
    roundStartTime: null,
    roundDuration: 0,
    gameTimer: null,
    roundTimer: 5,
    bettingTime: 5,
    graphData: [],
    maxMultiplier: 1.00,
    gameSpeed: 0.02,
    isCrashed: false,
    soundEnabled: true,
    yourBet: null,
    profit: 0
};

// Настройки игры
const GAME_SETTINGS = {
    minBet: 10,
    maxBet: 1000,
    houseEdge: 0.02, // 2% преимущество казино
    minCrash: 1.00,
    maxCrash: 100.00,
    maxRounds: 1000,
    bettingTime: 5,
    cooldown: 1000
};

// История раундов
let roundHistory = [];

// График
let graphCanvas = null;
let graphCtx = null;
let animationFrame = null;

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
            initializeGame();
            updateUI();
            startRoundTimer();
        }
    }, 400);
};

// СОЗДАНИЕ ЧАСТИЦ
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
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
            gameState.balance = pointsData.total_points || 0;
        } else {
            showError('У вас нет новогодних очков. Получите их в разделе "Новогодние очки"');
            gameState.balance = 0;
        }
        
        // Загружаем данные казино
        const casinoSnapshot = await database.ref('casino/' + userId).once('value');
        if (casinoSnapshot.exists()) {
            casinoData = casinoSnapshot.val();
            
            if (casinoData.crash_history) {
                roundHistory = casinoData.crash_history.slice(0, 10);
            }
            
            if (casinoData.crash_stats) {
                updateStatsUI(casinoData.crash_stats);
            }
        } else {
            casinoData = {
                total_bets: 0,
                total_won: 0,
                total_lost: 0,
                bet_history: [],
                crash_history: [],
                crash_stats: {
                    games_played: 0,
                    total_wagered: 0,
                    total_won: 0,
                    biggest_win: 0,
                    biggest_multiplier: 0,
                    average_multiplier: 0
                }
            };
            
            await database.ref('casino/' + userId).set(casinoData);
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных игры');
    }
}

// ИНИЦИАЛИЗАЦИЯ ИГРЫ
function initializeGame() {
    // Инициализация графика
    graphCanvas = document.getElementById('crash-graph');
    if (graphCanvas) {
        graphCtx = graphCanvas.getContext('2d');
        resizeCanvas();
    }
    
    // Инициализация истории
    initRoundHistory();
    
    // Обновление статистики
    updateStats();
}

// РАЗМЕР ХОЛСТА
function resizeCanvas() {
    if (!graphCanvas) return;
    
    graphCanvas.width = graphCanvas.offsetWidth;
    graphCanvas.height = graphCanvas.offsetHeight;
    drawGrid();
}

// ОТРИСОВКА СЕТКИ ГРАФИКА
function drawGrid() {
    if (!graphCtx) return;
    
    const ctx = graphCtx;
    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 40;
    
    // Очистка
    ctx.clearRect(0, 0, width, height);
    
    // Фон
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Горизонтальные линии
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (i * (height - padding * 2) / gridLines);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Подписи
        const multiplier = (gridLines - i) * 2 + 1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px Michroma';
        ctx.fillText(`${multiplier}x`, 10, y + 4);
    }
    
    // Оси
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    // Ось Y
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Ось X
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
}

// ИНИЦИАЛИЗАЦИЯ ИСТОРИИ РАУНДОВ
function initRoundHistory() {
    // Если история пустая, создаем демо данные
    if (roundHistory.length === 0) {
        for (let i = 0; i < 5; i++) {
            const multiplier = 1 + Math.random() * 4;
            roundHistory.push({
                multiplier: parseFloat(multiplier.toFixed(2)),
                crashed: true,
                timestamp: new Date(Date.now() - i * 60000).toISOString()
            });
        }
    }
    updateRoundHistoryUI();
}

// ЗАПУСК ТАЙМЕРА РАУНДА
function startRoundTimer() {
    if (gameState.roundActive || gameState.roundStarting) return;
    
    gameState.roundStarting = true;
    gameState.roundTimer = GAME_SETTINGS.bettingTime;
    gameState.isCrashed = false;
    
    safeUpdateElement('game-status', 'Прием ставок...');
    document.getElementById('game-status').style.color = '#ffcc00';
    
    // ОБЪЯВЛЯЕМ timerElement ЗДЕСЬ, чтобы он был доступен в функции updateTimer
    const timerElement = document.getElementById('round-timer');
    const nextTimerElement = document.getElementById('next-round-timer');
    
    const updateTimer = () => {
        if (!gameState.roundStarting) return;
        
        if (gameState.roundTimer <= 0) {
            gameState.roundStarting = false;
            startRound();
            return;
        }
        
        // Обновление таймера
        if (timerElement) timerElement.textContent = gameState.roundTimer;
        if (nextTimerElement) nextTimerElement.textContent = gameState.roundTimer;
        
        // Анимация опасного времени
        if (gameState.roundTimer <= 3) {
            if (timerElement) timerElement.classList.add('timer-danger');
        }
        
        gameState.roundTimer--;
        setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
}

// НАЧАЛО РАУНДА
function startRound() {
    gameState.roundActive = true;
    gameState.currentMultiplier = 1.00;
    gameState.crashPoint = calculateCrashPoint();
    gameState.cashoutMultiplier = 0.00;
    gameState.profit = 0;
    gameState.graphData = [];
    gameState.maxMultiplier = 1.00;
    gameState.roundStartTime = Date.now();
    gameState.roundDuration = 0;
    
    // Расчет скорости игры (рандомная)
    gameState.gameSpeed = 0.01 + Math.random() * 0.03;
    
    // Обновление UI
    safeUpdateElement('game-status', 'Раунд идет!');
    document.getElementById('game-status').style.color = '#00ff00';
    
    // ВМЕСТО ЭТОГО ДОБАВЛЯЕМ:
    const timerElement = document.getElementById('round-timer');
    if (timerElement) timerElement.classList.remove('timer-danger');
    
    // Запуск игрового цикла
    cancelAnimationFrame(animationFrame);
    gameLoop();
    
    // Воспроизведение звука начала
    if (gameState.soundEnabled) {
        playSound('start');
    }
}

// РАСЧЕТ ТОЧКИ КРАХА (как в реальных казино)
function calculateCrashPoint() {
    const houseEdge = GAME_SETTINGS.houseEdge;
    const r = Math.random();
    
    // Формула для расчета краха
    let multiplier = 1 / (1 - (1 - houseEdge) * r);
    
    // Ограничение максимального множителя
    multiplier = Math.min(multiplier, GAME_SETTINGS.maxCrash);
    
    // Округление до 2 знаков
    multiplier = Math.floor(multiplier * 100) / 100;
    
    return Math.max(GAME_SETTINGS.minCrash, multiplier);
}

// ИГРОВОЙ ЦИКЛ
function gameLoop() {
    if (!gameState.roundActive) return;
    
    const currentTime = Date.now();
    const elapsed = (currentTime - gameState.roundStartTime) / 1000;
    gameState.roundDuration = elapsed;
    
    // Расчет множителя (экспоненциальный рост с шумом)
    const baseGrowth = Math.exp(gameState.gameSpeed * elapsed) - 1;
    const noise = 1 + (Math.random() - 0.5) * 0.001; // Небольшой шум
    const newMultiplier = 1 + baseGrowth * noise;
    
    gameState.currentMultiplier = parseFloat(newMultiplier.toFixed(2));
    gameState.maxMultiplier = Math.max(gameState.maxMultiplier, gameState.currentMultiplier);
    
    // Добавление точки на график
    gameState.graphData.push({
        x: elapsed,
        y: gameState.currentMultiplier
    });
    
    // Отрисовка графика
    drawGraph();
    
    // Обновление UI
    updateGameUI();
    
    // Проверка авто-вывода
    checkAutoCashout();
    
    // Проверка краха
    if (gameState.currentMultiplier >= gameState.crashPoint) {
        crash();
        return;
    }
    
    // Продолжение цикла
    animationFrame = requestAnimationFrame(gameLoop);
}

// ОТРИСОВКА ГРАФИКА
function drawGraph() {
    if (!graphCtx || gameState.graphData.length < 2) return;
    
    const ctx = graphCtx;
    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 40;
    
    // Очистка
    drawGrid();
    
    // Находим максимум для масштабирования
    const maxY = Math.max(gameState.crashPoint * 1.1, 10);
    const maxX = Math.max(10, gameState.roundDuration * 1.1);
    
    // Масштабирование
    const scaleX = (width - padding * 2) / maxX;
    const scaleY = (height - padding * 2) / maxY;
    
    // Градиент для линии
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(0.7, '#ffff00');
    gradient.addColorStop(1, '#ff0000');
    
    // Рисуем линию графика
    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    for (let i = 0; i < gameState.graphData.length; i++) {
        const point = gameState.graphData[i];
        const x = padding + point.x * scaleX;
        const y = height - padding - point.y * scaleY;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // Точка на конце графика
    if (gameState.graphData.length > 0) {
        const lastPoint = gameState.graphData[gameState.graphData.length - 1];
        const x = padding + lastPoint.x * scaleX;
        const y = height - padding - lastPoint.y * scaleY;
        
        // Свечение
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Точка
        ctx.beginPath();
        ctx.fillStyle = '#00ff00';
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Линия краха
    if (gameState.crashPoint > 0) {
        const crashY = height - padding - gameState.crashPoint * scaleY;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(padding, crashY);
        ctx.lineTo(width - padding, crashY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Подпись краха
        ctx.fillStyle = '#ff4444';
        ctx.font = '12px Michroma';
        ctx.fillText(`Крах: ${gameState.crashPoint.toFixed(2)}x`, width - 100, crashY - 5);
    }
}

// ОБНОВЛЕНИЕ ИГРОВОГО UI
function updateGameUI() {
    // Множитель
    safeUpdateElement('current-multiplier', gameState.currentMultiplier.toFixed(2) + 'x');
    
    // Прибыль для игрока
    if (gameState.hasBet && gameState.cashoutMultiplier === 0) {
        const currentProfit = Math.floor(gameState.betAmount * gameState.currentMultiplier);
        gameState.profit = currentProfit;
        
        safeUpdateElement('your-profit', currentProfit.toString());
        safeUpdateElement('cashout-amount', currentProfit.toString());
        safeUpdateElement('your-cashout-multiplier', gameState.currentMultiplier.toFixed(2) + 'x');
        
        // Анимация счета
        const profitElement = document.getElementById('your-profit');
        if (profitElement) {
            profitElement.style.animation = 'none';
            setTimeout(() => {
                profitElement.style.animation = 'countUp 0.3s';
            }, 10);
        }
    }
    
    // Обновление статуса
    if (gameState.currentMultiplier > gameState.crashPoint * 0.8) {
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.style.color = '#ff9900';
            statusElement.textContent = 'Внимание! Крах близко!';
        }
    }
}

// ПРОВЕРКА АВТО-ВЫВОДА
function checkAutoCashout() {
    if (gameState.autoCashoutEnabled && 
        gameState.hasBet && 
        gameState.cashoutMultiplier === 0 &&
        gameState.currentMultiplier >= gameState.autoCashoutValue) {
        cashout();
    }
}

// КРАХ
function crash() {
    if (gameState.isCrashed) return;
    
    gameState.isCrashed = true;
    gameState.roundActive = false;
    cancelAnimationFrame(animationFrame);
    
    // Анимация краха
    const multiplierElement = document.getElementById('current-multiplier');
    if (multiplierElement) {
        multiplierElement.style.color = '#ff4444';
        multiplierElement.style.animation = 'crashAnimation 0.5s';
    }
    
    // Показать линию краха
    const crashLine = document.getElementById('crash-line');
    if (crashLine) {
        crashLine.style.display = 'block';
        setTimeout(() => {
            crashLine.style.display = 'none';
        }, 1000);
    }
    
    // Обновление статуса
    safeUpdateElement('game-status', 'КРАХ!');
    document.getElementById('game-status').style.color = '#ff0000';
    
    // Воспроизведение звука
    if (gameState.soundEnabled) {
        playSound('crash');
    }
    
    // Обработка ставок игрока
    if (gameState.hasBet && gameState.cashoutMultiplier === 0) {
        // Игрок не успел забрать - проигрыш
        setTimeout(() => {
            finishBet(false);
        }, 1000);
    } else if (gameState.hasBet) {
        // Игрок успел забрать - показываем результат
        setTimeout(() => {
            finishBet(true);
        }, 1000);
    }
    
    // Добавление в историю
    addToHistory(gameState.crashPoint);
    
    // Обновление статистики
    updateStatsAfterRound();
    
    // Запуск нового раунда через 3 секунды
    setTimeout(() => {
        endRound();
    }, 3000);
}

// ЗАБРАТЬ ВЫИГРЫШ
function cashout() {
    if (!gameState.hasBet || !gameState.roundActive || gameState.cashoutMultiplier > 0) {
        return;
    }
    
    gameState.cashoutMultiplier = gameState.currentMultiplier;
    gameState.profit = Math.floor(gameState.betAmount * gameState.cashoutMultiplier);
    
    // Обновление UI
    safeUpdateElement('your-profit', gameState.profit.toString());
    safeUpdateElement('your-cashout-multiplier', gameState.cashoutMultiplier.toFixed(2) + 'x');
    
    // Анимация успешного вывода
    const cashoutBtn = document.getElementById('cashout-btn');
    if (cashoutBtn) {
        cashoutBtn.style.background = 'linear-gradient(135deg, #00cc66, #00ff88)';
        cashoutBtn.style.animation = 'pulse 0.5s 3';
    }
    
    // Воспроизведение звука
    if (gameState.soundEnabled) {
        playSound('cashout');
    }
    
    // Обновление активных ставок
    updateActiveBetsUI();
}

// ЗАВЕРШЕНИЕ СТАВКИ
async function finishBet(isWin) {
    const cashoutMultiplier = gameState.cashoutMultiplier || gameState.crashPoint;
    const profit = isWin ? gameState.profit : 0;
    const balanceChange = isWin ? profit - gameState.betAmount : -gameState.betAmount;
    
    try {
        // Обновление баланса
        await updatePointsBalance(balanceChange);
        
        // Сохранение результата
        await saveBetResult(isWin, profit, cashoutMultiplier);
        
        // Показ модального окна
        showResultModal(isWin, profit, cashoutMultiplier);
        
    } catch (error) {
        console.error('Ошибка при завершении ставки:', error);
        showError('Ошибка при завершении ставки');
    }
    
    // Сброс состояния ставки
    gameState.hasBet = false;
    gameState.cashoutMultiplier = 0;
    gameState.yourBet = null;
    gameState.profit = 0;
    
    // Обновление кнопок
    updateButtons();
}

// ОБНОВЛЕНИЕ БАЛАНСА ОЧКОВ
async function updatePointsBalance(change) {
    try {
        if (!pointsData) return;
        
        const currentPoints = pointsData.total_points || 0;
        const newTotal = Math.max(0, currentPoints + change);
        
        pointsData.total_points = newTotal;
        
        await database.ref('holiday_points/' + userId).update({
            total_points: newTotal
        });
        
        gameState.balance = newTotal;
        updateUI();
        
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        throw error;
    }
}

// СОХРАНЕНИЕ РЕЗУЛЬТАТА СТАВКИ
async function saveBetResult(isWin, winAmount, multiplier) {
    try {
        const betRecord = {
            game: 'crash',
            timestamp: new Date().toISOString(),
            bet_amount: gameState.betAmount,
            cashout_multiplier: multiplier,
            crash_multiplier: gameState.crashPoint,
            result: isWin ? 'win' : 'loss',
            win_amount: winAmount,
            balance_change: isWin ? winAmount - gameState.betAmount : -gameState.betAmount,
            new_balance: gameState.balance,
            round_number: gameState.roundNumber
        };
        
        const updates = {
            total_bets: (casinoData.total_bets || 0) + 1,
            bet_history: [betRecord, ...(casinoData.bet_history || [])]
        };
        
        if (isWin) {
            updates.total_won = (casinoData.total_won || 0) + winAmount;
        } else {
            updates.total_lost = (casinoData.total_lost || 0) + gameState.betAmount;
        }
        
        // Обновление статистики Краш
        const crashStats = casinoData.crash_stats || {
            games_played: 0,
            total_wagered: 0,
            total_won: 0,
            biggest_win: 0,
            biggest_multiplier: 0,
            average_multiplier: 0
        };
        
        crashStats.games_played++;
        crashStats.total_wagered += gameState.betAmount;
        
        if (isWin) {
            crashStats.total_won += winAmount;
            if (winAmount > crashStats.biggest_win) {
                crashStats.biggest_win = winAmount;
            }
            if (multiplier > crashStats.biggest_multiplier) {
                crashStats.biggest_multiplier = multiplier;
            }
        }
        
        // Обновление среднего множителя
        const totalMultiplier = crashStats.average_multiplier * (crashStats.games_played - 1) + multiplier;
        crashStats.average_multiplier = totalMultiplier / crashStats.games_played;
        
        updates.crash_stats = crashStats;
        
        await database.ref('casino/' + userId).update(updates);
        
        casinoData = { ...casinoData, ...updates };
        
        // Обновление UI статистики
        updateStatsUI(crashStats);
        
    } catch (error) {
        console.error('❌ Ошибка сохранения результата:', error);
        throw error;
    }
}

// ДОБАВЛЕНИЕ В ИСТОРИЮ РАУНДОВ
function addToHistory(multiplier) {
    const historyEntry = {
        multiplier: multiplier,
        crashed: true,
        timestamp: new Date().toISOString(),
        round_number: gameState.roundNumber
    };
    
    roundHistory.unshift(historyEntry);
    if (roundHistory.length > 10) {
        roundHistory.pop();
    }
    
    // Сохранение в Firebase
    database.ref('casino/' + userId).update({
        crash_history: roundHistory
    });
    
    // Обновление UI
    updateRoundHistoryUI();
}

// ОБНОВЛЕНИЕ ИСТОРИИ РАУНДОВ В UI
function updateRoundHistoryUI() {
    const historyList = document.getElementById('round-history-list');
    if (!historyList) return;
    
    historyList.innerHTML = roundHistory.map(round => {
        let color;
        if (round.multiplier >= 3) {
            color = 'rgba(0, 204, 102, 0.3)';
        } else if (round.multiplier >= 1.5) {
            color = 'rgba(255, 153, 0, 0.3)';
        } else {
            color = 'rgba(255, 68, 68, 0.3)';
        }
        
        return `<div class="history-chip" style="background: ${color}; border-color: ${color.replace('0.3', '0.6')}">
            ${round.multiplier.toFixed(2)}x
        </div>`;
    }).join('');
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ
function updateStats() {
    // Расчет шансов (формула как в реальных казино)
    const chance2x = Math.floor((1 / 2) * (1 - GAME_SETTINGS.houseEdge) * 1000) / 10;
    const chance5x = Math.floor((1 / 5) * (1 - GAME_SETTINGS.houseEdge) * 1000) / 10;
    const chance10x = Math.floor((1 / 10) * (1 - GAME_SETTINGS.houseEdge) * 1000) / 10;
    
    safeUpdateElement('chance-2x', `${chance2x}%`);
    safeUpdateElement('chance-5x', `${chance5x}%`);
    safeUpdateElement('chance-10x', `${chance10x}%`);
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ ПОСЛЕ РАУНДА
function updateStatsAfterRound() {
    const stats = casinoData.crash_stats || {
        games_played: 0,
        total_wagered: 0,
        total_won: 0,
        biggest_win: 0,
        biggest_multiplier: 0,
        average_multiplier: 0
    };
    
    safeUpdateElement('total-games', stats.games_played.toString());
    safeUpdateElement('average-multiplier', stats.average_multiplier ? stats.average_multiplier.toFixed(2) + 'x' : '0.00x');
    safeUpdateElement('max-multiplier', stats.biggest_multiplier ? stats.biggest_multiplier.toFixed(2) + 'x' : '0.00x');
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ В UI
function updateStatsUI(stats) {
    if (!stats) return;
    
    safeUpdateElement('total-games', stats.games_played.toString());
    safeUpdateElement('average-multiplier', stats.average_multiplier ? stats.average_multiplier.toFixed(2) + 'x' : '0.00x');
    safeUpdateElement('max-multiplier', stats.biggest_multiplier ? stats.biggest_multiplier.toFixed(2) + 'x' : '0.00x');
}

// ЗАВЕРШЕНИЕ РАУНДА
function endRound() {
    gameState.roundNumber++;
    gameState.roundActive = false;
    gameState.roundStarting = false;
    gameState.isCrashed = false;
    gameState.currentMultiplier = 1.00;
    gameState.crashPoint = 1.00;
    gameState.graphData = [];
    
    // Обновление UI
    safeUpdateElement('round-number', gameState.roundNumber.toString());
    safeUpdateElement('current-multiplier', '1.00x');
    safeUpdateElement('game-status', 'Ожидание начала раунда');
    document.getElementById('game-status').style.color = '#ffcc00';
    
    // Сброс цвета множителя
    const multiplierElement = document.getElementById('current-multiplier');
    if (multiplierElement) {
        multiplierElement.style.color = '#00ff00';
        multiplierElement.style.animation = '';
    }
    
    // Очистка графика
    drawGrid();
    
    // Запуск таймера нового раунда
    setTimeout(() => {
        startRoundTimer();
    }, 1000);
    
    // Обновление кнопок
    gameState.canBet = true;
    updateButtons();
}

// СДЕЛАТЬ СТАВКУ
async function placeBet() {
    if (!gameState.canBet || gameState.hasBet || gameState.balance < gameState.betAmount || 
        !gameState.roundStarting || gameState.roundActive) {
        showError('Невозможно сделать ставку в данный момент');
        return;
    }
    
    try {
        gameState.hasBet = true;
        gameState.canBet = false;
        
        // Вычитаем ставку
        await updatePointsBalance(-gameState.betAmount);
        
        // Создание ставки
        gameState.yourBet = {
            amount: gameState.betAmount,
            cashoutMultiplier: 0,
            profit: 0
        };
        
        // Обновление UI
        safeUpdateElement('your-bet-amount', gameState.betAmount.toString());
        safeUpdateElement('your-profit', '0');
        safeUpdateElement('your-cashout-multiplier', '0.00x');
        
        updateButtons();
        updateActiveBetsUI();
        
        // Воспроизведение звука
        if (gameState.soundEnabled) {
            playSound('bet');
        }
        
        // Кулдаун на следующую ставку
        setTimeout(() => {
            gameState.canBet = true;
            updateButtons();
        }, GAME_SETTINGS.cooldown);
        
    } catch (error) {
        console.error('❌ Ошибка размещения ставки:', error);
        showError('Ошибка при размещении ставки');
        gameState.hasBet = false;
        gameState.canBet = true;
        updateButtons();
    }
}

// ОБНОВЛЕНИЕ КНОПОК
function updateButtons() {
    const placeBetBtn = document.getElementById('place-bet-btn');
    const cashoutBtn = document.getElementById('cashout-btn');
    
    if (!placeBetBtn || !cashoutBtn) return;
    
    // Кнопка "Сделать ставку"
    if (gameState.canBet && !gameState.hasBet && gameState.roundStarting) {
        placeBetBtn.disabled = gameState.balance < gameState.betAmount;
        placeBetBtn.innerHTML = `
            <span class="action-icon"><i class="fas fa-play"></i></span>
            <span class="action-text">Сделать ставку</span>
            <span class="action-cost">-<span id="bet-cost">${gameState.betAmount}</span></span>
        `;
    } else if (gameState.hasBet) {
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = `
            <span class="action-icon"><i class="fas fa-check"></i></span>
            <span class="action-text">Ставка сделана</span>
            <span class="action-cost">-${gameState.betAmount}</span>
        `;
    } else {
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = `
            <span class="action-icon"><i class="fas fa-clock"></i></span>
            <span class="action-text">Ожидание раунда</span>
        `;
    }
    
    // Кнопка "Забрать"
    cashoutBtn.disabled = !gameState.hasBet || !gameState.roundActive || gameState.cashoutMultiplier > 0;
    
    if (!cashoutBtn.disabled) {
        cashoutBtn.style.background = 'linear-gradient(135deg, #00cc66, #00ff88)';
        cashoutBtn.style.animation = 'pulse 2s infinite';
    } else {
        cashoutBtn.style.background = 'linear-gradient(135deg, #6200ff, #ff00ff)';
        cashoutBtn.style.animation = 'none';
    }
}

// ОБНОВЛЕНИЕ АКТИВНЫХ СТАВОК
function updateActiveBetsUI() {
    const betsList = document.getElementById('active-bets-list');
    if (!betsList) return;
    
    let betsHTML = '';
    
    if (gameState.yourBet) {
        const profit = gameState.cashoutMultiplier > 0 ? 
            Math.floor(gameState.betAmount * gameState.cashoutMultiplier) :
            Math.floor(gameState.betAmount * gameState.currentMultiplier);
        
        betsHTML += `
            <div class="bet-row your-bet ${gameState.cashoutMultiplier > 0 ? 'cashed-out' : ''}">
                <div class="player-info">
                    <div class="player-avatar">${userNickname.charAt(0)}</div>
                    <span class="player-name">${userNickname} (Вы)</span>
                </div>
                <span class="col-bet">${gameState.yourBet.amount}</span>
                <span class="col-multiplier">${(gameState.cashoutMultiplier || gameState.currentMultiplier).toFixed(2)}x</span>
                <span class="col-profit ${gameState.cashoutMultiplier > 0 ? 'profit' : ''}">
                    ${gameState.cashoutMultiplier > 0 ? '+' : ''}${profit}
                </span>
            </div>
        `;
    }
    
    // Демо-ставки других игроков
    if (gameState.roundActive || gameState.roundStarting) {
        const demoBets = [
            { name: 'CrashPro', amount: 100, multiplier: gameState.currentMultiplier * 0.8 },
            { name: 'LuckyGuy', amount: 50, multiplier: gameState.currentMultiplier * 0.9 },
            { name: 'NewPlayer', amount: 25, multiplier: gameState.currentMultiplier * 0.7 }
        ];
        
        demoBets.forEach(bet => {
            betsHTML += `
                <div class="bet-row">
                    <div class="player-info">
                        <div class="player-avatar">${bet.name.charAt(0)}</div>
                        <span class="player-name">${bet.name}</span>
                    </div>
                    <span class="col-bet">${bet.amount}</span>
                    <span class="col-multiplier">${bet.multiplier.toFixed(2)}x</span>
                    <span class="col-profit">${Math.floor(bet.amount * bet.multiplier)}</span>
                </div>
            `;
        });
    }
    
    if (!betsHTML) {
        betsHTML = `
            <div class="empty-bets">
                <div class="empty-icon"><i class="fas fa-user-slash"></i></div>
                <p>Нет активных ставок</p>
                <small>Сделайте ставку чтобы начать!</small>
            </div>
        `;
    }
    
    betsList.innerHTML = betsHTML;
}

// ОБНОВЛЕНИЕ UI
function updateUI() {
    try {
        // Баланс
        safeUpdateElement('user-balance', gameState.balance.toString());
        safeUpdateElement('current-balance', gameState.balance.toString());
        
        // Сумма ставки
        const betInput = document.getElementById('bet-amount-input');
        if (betInput) betInput.value = gameState.betAmount;
        
        safeUpdateElement('bet-cost', gameState.betAmount.toString());
        
        // Авто-вывод
        const autoInput = document.getElementById('auto-multiplier-input');
        if (autoInput) autoInput.value = gameState.autoCashoutValue.toFixed(2);
        
        // Обновление кнопок
        updateButtons();
        
        // Обновление активных ставок
        updateActiveBetsUI();
        
    } catch (error) {
        console.error('Ошибка в updateUI:', error);
    }
}

// ВОСПРОИЗВЕДЕНИЕ ЗВУКА
function playSound(type) {
    if (!gameState.soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
        if (type === 'bet') {
            // Звук ставки
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 523.25; // Нота C5
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
        } else if (type === 'cashout') {
            // Звук успешного вывода
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
            oscillator.frequency.exponentialRampToValueAtTime(1318.51, audioContext.currentTime + 0.3); // E6
            
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
        } else if (type === 'crash') {
            // Звук краха
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
            oscillator.frequency.exponentialRampToValueAtTime(55, audioContext.currentTime + 0.5); // A1
            
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
        } else if (type === 'start') {
            // Звук начала раунда
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(329.63, audioContext.currentTime); // E4
            oscillator.frequency.exponentialRampToValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
            
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    } catch (error) {
        console.warn('Ошибка воспроизведения звука:', error);
    }
}

// ПОКАЗ МОДАЛЬНОГО ОКНА С РЕЗУЛЬТАТОМ
function showResultModal(isWin, winAmount, multiplier) {
    const modal = document.getElementById('result-modal');
    const winConfetti = document.getElementById('win-confetti');
    
    if (!modal) return;
    
    safeUpdateElement('result-title', isWin ? '🎉 Вы выиграли!' : '💥 Вы проиграли');
    safeUpdateElement('result-subtitle', isWin ? 'Поздравляем!' : 'Повезет в следующий раз!');
    
    const resultIcon = document.getElementById('result-icon');
    if (resultIcon) {
        resultIcon.innerHTML = isWin ? 
            '<i class="fas fa-trophy" style="font-size: 80px; color: gold;"></i>' :
            '<i class="fas fa-bomb" style="font-size: 80px; color: #ff4444;"></i>';
    }
    
    safeUpdateElement('result-multiplier', multiplier.toFixed(2) + 'x');
    safeUpdateElement('result-bet-amount', gameState.betAmount.toString());
    safeUpdateElement('result-cashout-multiplier', isWin ? multiplier.toFixed(2) + 'x' : '0.00x');
    safeUpdateElement('result-crash-multiplier', gameState.crashPoint.toFixed(2) + 'x');
    
    const profitLabel = document.getElementById('result-profit-label');
    const profitValue = document.getElementById('result-profit-value');
    
    if (profitLabel && profitValue) {
        if (isWin) {
            profitLabel.textContent = 'Ваш выигрыш:';
            profitValue.textContent = `+${winAmount}`;
            profitValue.style.color = '#00ff00';
            
            if (winConfetti) {
                winConfetti.style.display = 'block';
                createWinConfetti();
            }
        } else {
            profitLabel.textContent = 'Ваша потеря:';
            profitValue.textContent = `-${gameState.betAmount}`;
            profitValue.style.color = '#ff0000';
            if (winConfetti) winConfetti.style.display = 'none';
        }
    }
    
    const message = document.getElementById('result-message');
    if (message) {
        if (isWin) {
            if (multiplier >= 10) {
                message.textContent = 'Невероятно! Вы поймали огромный множитель!';
            } else if (multiplier >= 5) {
                message.textContent = 'Отличный результат! Вы мастер игры Краш!';
            } else if (multiplier >= 2) {
                message.textContent = 'Хорошая игра! Вы успели забрать в нужный момент!';
            } else {
                message.textContent = 'Стабильная победа! Возвращайтесь за новыми выигрышами!';
            }
        } else {
            if (gameState.currentMultiplier >= 5) {
                message.textContent = 'Так близко! Вы могли выиграть большую сумму!';
            } else {
                const messages = [
                    'Удача обязательно улыбнется в следующий раз!',
                    'Повезет в следующем раунде!',
                    'Попробуйте еще раз - статистика на вашей стороне!'
                ];
                message.textContent = messages[Math.floor(Math.random() * messages.length)];
            }
        }
    }
    
    modal.style.display = 'flex';
    
    const closeResult = document.getElementById('close-result');
    const playAgain = document.getElementById('play-again');
    
    if (closeResult) {
        closeResult.onclick = function() {
            closeResultModal();
        };
    }
    
    if (playAgain) {
        playAgain.onclick = function() {
            closeResultModal();
        };
    }
}

// СОЗДАНИЕ КОНФЕТТИ
function createWinConfetti() {
    const container = document.getElementById('win-confetti');
    if (!container) return;
    
    container.innerHTML = '';
    
    const colors = ['#00ff00', '#ffff00', '#ff9900', '#0088ff', '#ff00ff', '#ff4444'];
    
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        
        const size = Math.random() * 10 + 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = Math.random() > 0.5 ? 'circle' : 'rect';
        
        confetti.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${shape === 'circle' ? size : size * 0.3}px;
            background: ${color};
            left: ${Math.random() * 100}%;
            top: -30px;
            opacity: ${Math.random() * 0.7 + 0.3};
            animation: confettiFall ${Math.random() * 3 + 2}s linear ${Math.random() * 1}s forwards;
            border-radius: ${shape === 'circle' ? '50%' : '2px'};
            transform: rotate(${Math.random() * 360}deg);
            z-index: 1000;
        `;
        
        container.appendChild(confetti);
    }
}

// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
function closeResultModal() {
    const modal = document.getElementById('result-modal');
    if (!modal) return;
    
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
        
        const winConfetti = document.getElementById('win-confetti');
        if (winConfetti) {
            winConfetti.style.display = 'none';
            winConfetti.innerHTML = '';
        }
    }, 300);
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Кнопка "Сделать ставку"
    const placeBetBtn = document.getElementById('place-bet-btn');
    if (placeBetBtn) {
        placeBetBtn.addEventListener('click', placeBet);
    }
    
    // Кнопка "Забрать"
    const cashoutBtn = document.getElementById('cashout-btn');
    if (cashoutBtn) {
        cashoutBtn.addEventListener('click', cashout);
    }
    
    // Управление суммой ставки
    const betInput = document.getElementById('bet-amount-input');
    if (betInput) {
        betInput.addEventListener('input', function() {
            let value = parseInt(this.value) || GAME_SETTINGS.minBet;
            
            if (value < GAME_SETTINGS.minBet) value = GAME_SETTINGS.minBet;
            if (value > GAME_SETTINGS.maxBet) value = GAME_SETTINGS.maxBet;
            if (value > gameState.balance) value = Math.min(gameState.balance, GAME_SETTINGS.maxBet);
            
            this.value = value;
            gameState.betAmount = value;
            
            updateUI();
        });
    }
    
    // Кнопки увеличения/уменьшения ставки
    const decreaseBtn = document.getElementById('decrease-bet');
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            if (gameState.betAmount > GAME_SETTINGS.minBet) {
                gameState.betAmount = Math.max(GAME_SETTINGS.minBet, gameState.betAmount - 10);
                if (betInput) betInput.value = gameState.betAmount;
                updateUI();
            }
        });
    }
    
    const increaseBtn = document.getElementById('increase-bet');
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function() {
            if (gameState.betAmount < GAME_SETTINGS.maxBet && gameState.betAmount < gameState.balance) {
                gameState.betAmount = Math.min(GAME_SETTINGS.maxBet, gameState.balance, gameState.betAmount + 10);
                if (betInput) betInput.value = gameState.betAmount;
                updateUI();
            }
        });
    }
    
    // Быстрые ставки
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (gameState.hasBet) return;
            
            const amount = parseInt(this.dataset.amount);
            
            if (amount <= gameState.balance) {
                gameState.betAmount = amount;
                if (betInput) betInput.value = amount;
                updateUI();
                
                document.querySelectorAll('.preset-btn').forEach(b => {
                    b.classList.remove('active');
                });
                this.classList.add('active');
            } else {
                showError('Недостаточно очков для этой ставки');
            }
        });
    });
    
    // Быстрые множители
    document.querySelectorAll('.multiplier-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const multiplier = parseFloat(this.dataset.multiplier);
            gameState.autoCashoutValue = multiplier;
            
            const autoInput = document.getElementById('auto-multiplier-input');
            if (autoInput) autoInput.value = multiplier.toFixed(2);
            
            document.querySelectorAll('.multiplier-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Авто-вывод
    const autoToggle = document.getElementById('auto-toggle');
    if (autoToggle) {
        autoToggle.addEventListener('click', function() {
            gameState.autoCashoutEnabled = !gameState.autoCashoutEnabled;
            this.classList.toggle('active');
            
            if (gameState.autoCashoutEnabled) {
                showNotification(`Авто-вывод включен на ${gameState.autoCashoutValue.toFixed(2)}x`, 'info');
            } else {
                showNotification('Авто-вывод отключен', 'info');
            }
        });
    }
    
    const autoMultiplierInput = document.getElementById('auto-multiplier-input');
    if (autoMultiplierInput) {
        autoMultiplierInput.addEventListener('input', function() {
            let value = parseFloat(this.value) || 2.00;
            
            if (value < 1.10) value = 1.10;
            if (value > 100.00) value = 100.00;
            
            this.value = value.toFixed(2);
            gameState.autoCashoutValue = value;
        });
    }
    
    // Помощь
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', function() {
            showNotification('Сделайте ставку до начала раунда. Забирайте выигрыш до краха графика! Чем выше множитель - тем больше выигрыш!', 'info');
        });
    }
    
    // Звук
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (icon.classList.contains('fa-volume-up')) {
                icon.className = 'fas fa-volume-mute';
                gameState.soundEnabled = false;
                showNotification('Звук отключен', 'info');
            } else {
                icon.className = 'fas fa-volume-up';
                gameState.soundEnabled = true;
                showNotification('Звук включен', 'info');
            }
        });
    }
    
    // Ресайз окна
    window.addEventListener('resize', function() {
        resizeCanvas();
        if (gameState.roundActive) {
            drawGraph();
        }
    });
    
    // Валидация ввода
    if (betInput) {
        betInput.addEventListener('keydown', function(e) {
            if ([46, 8, 9, 27, 13, 190].indexOf(e.keyCode) !== -1 ||
                (e.keyCode === 65 && e.ctrlKey === true) ||
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true) ||
                (e.keyCode >= 35 && e.keyCode <= 39)) {
                return;
            }
            
            if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    }
}

// ПОКАЗ УВЕДОМЛЕНИЯ
function showNotification(message, type = 'info') {
    if (!document.body) {
        console.log('Notification skipped - document.body not ready');
        return;
    }
    
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

// БЕЗОПАСНОЕ ОБНОВЛЕНИЕ ЭЛЕМЕНТА
function safeUpdateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// Добавляем CSS для анимаций
const gameStyle = document.createElement('style');
gameStyle.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(-30px) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(600px) rotate(720deg);
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
    
    @keyframes countUp {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes crashAnimation {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(gameStyle);
