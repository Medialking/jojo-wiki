// crash.js - логика игры Краш для казино

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
    currentMultiplier: 1.00,
    multiplierStep: 0.01,
    crashPoint: 1.00,
    cashoutMultiplier: 0.00,
    autoCashoutEnabled: false,
    autoCashoutValue: 2.00,
    roundNumber: 1,
    roundStartTime: null,
    roundDuration: 0,
    gameTimer: null,
    roundTimer: 5,
    graphData: [],
    activeBets: [],
    yourBet: null,
    crashSound: null,
    winSound: null
};

// Настройки игры
const GAME_SETTINGS = {
    minBet: 10,
    maxBet: 1000,
    houseEdge: 0.01, // 1% преимущество казино
    minMultiplier: 1.00,
    maxMultiplier: 1000.00,
    roundDurationMin: 3, // секунд
    roundDurationMax: 10,
    bettingTime: 5, // время на ставки
    maxPlayers: 100,
    maxHistory: 50,
    cooldown: 2000 // 2 секунды между ставками
};

// История раундов
let roundHistory = [
    { multiplier: 2.34, crashed: true },
    { multiplier: 1.56, crashed: true },
    { multiplier: 0.85, crashed: true },
    { multiplier: 5.78, crashed: true },
    { multiplier: 1.02, crashed: true }
];

// График
let graphCanvas = null;
let graphCtx = null;

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
            
            // Загружаем историю раундов
            if (casinoData.crash_history) {
                roundHistory = casinoData.crash_history.slice(0, GAME_SETTINGS.maxHistory);
            }
            
            // Загружаем статистику
            if (casinoData.crash_stats) {
                updateStatsUI(casinoData.crash_stats);
            }
        } else {
            casinoData = {
                total_bets: 0,
                total_won: 0,
                total_lost: 0,
                bet_history: [],
                crash_history: roundHistory,
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
        graphCanvas.width = graphCanvas.offsetWidth;
        graphCanvas.height = graphCanvas.offsetHeight;
    }
    
    // Обновление истории раундов
    updateRoundHistoryUI();
    
    // Обновление лучших игроков
    updateTopPlayers();
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

// ОБНОВЛЕНИЕ КНОПОК
function updateButtons() {
    const placeBetBtn = document.getElementById('place-bet-btn');
    const cashoutBtn = document.getElementById('cashout-btn');
    
    if (!placeBetBtn || !cashoutBtn) return;
    
    // Кнопка "Сделать ставку"
    if (gameState.canBet && !gameState.hasBet) {
        placeBetBtn.disabled = gameState.balance < gameState.betAmount || !gameState.roundActive;
        const costElement = placeBetBtn.querySelector('.action-cost');
        if (costElement) {
            costElement.innerHTML = `-<span id="bet-cost">${gameState.betAmount}</span>`;
        }
    } else {
        placeBetBtn.disabled = true;
        placeBetBtn.innerHTML = `
            <span class="action-icon"><i class="fas fa-clock"></i></span>
            <span class="action-text">Ожидание раунда</span>
        `;
    }
    
    // Кнопка "Забрать"
    cashoutBtn.disabled = !gameState.hasBet || !gameState.roundActive;
    
    if (gameState.hasBet && gameState.roundActive) {
        const profit = Math.floor(gameState.betAmount * gameState.currentMultiplier);
        const cashoutAmount = cashoutBtn.querySelector('#cashout-amount');
        if (cashoutAmount) cashoutAmount.textContent = profit;
    }
}

// БЕЗОПАСНОЕ ОБНОВЛЕНИЕ ЭЛЕМЕНТА
function safeUpdateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// ЗАПУСК ТАЙМЕРА РАУНДА
function startRoundTimer() {
    gameState.roundTimer = GAME_SETTINGS.bettingTime;
    
    const updateTimer = () => {
        if (gameState.roundActive) return;
        
        safeUpdateElement('round-timer', gameState.roundTimer.toString());
        safeUpdateElement('next-round-timer', gameState.roundTimer.toString());
        
        if (gameState.roundTimer <= 0) {
            startRound();
            return;
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
    gameState.multiplierStep = 0.01;
    gameState.roundDuration = 0;
    gameState.graphData = [{x: 0, y: 1}];
    gameState.crashPoint = calculateCrashPoint();
    
    // Сброс ставок игрока
    if (gameState.hasBet) {
        gameState.yourBet = {
            amount: gameState.betAmount,
            cashoutMultiplier: 0,
            profit: 0
        };
    }
    
    // Обновление UI
    safeUpdateElement('game-status', 'Раунд идет!');
    safeUpdateElement('next-round-info', 'Раунд идет');
    document.getElementById('game-status').style.color = '#00ff00';
    
    // Запуск игры
    startGameLoop();
    
    // Обновление кнопок
    updateButtons();
}

// РАСЧЕТ ТОЧКИ КРАХА
function calculateCrashPoint() {
    // Алгоритм как в реальных казино
    const houseEdge = GAME_SETTINGS.houseEdge;
    const r = Math.random();
    
    // Формула для расчета краха с преимуществом казино
    let multiplier = Math.max(GAME_SETTINGS.minMultiplier, 
        1 / (1 - (1 - houseEdge) * r));
    
    // Округление до 2 знаков
    multiplier = Math.floor(multiplier * 100) / 100;
    
    console.log(`Крах на: ${multiplier}x`);
    return multiplier;
}

// ИГРОВОЙ ЦИКЛ
function startGameLoop() {
    gameState.roundStartTime = Date.now();
    gameState.gameTimer = setInterval(updateGame, 50); // 20 FPS
}

// ОБНОВЛЕНИЕ ИГРЫ
function updateGame() {
    if (!gameState.roundActive) return;
    
    const elapsed = (Date.now() - gameState.roundStartTime) / 1000;
    gameState.roundDuration = elapsed;
    
    // Расчет множителя (экспоненциальный рост)
    const growthRate = 0.02;
    const newMultiplier = 1 + (Math.exp(growthRate * elapsed) - 1) * 0.5;
    
    gameState.currentMultiplier = Math.floor(newMultiplier * 100) / 100;
    
    // Добавление точки на график
    gameState.graphData.push({
        x: elapsed,
        y: gameState.currentMultiplier
    });
    
    // Отрисовка графика
    drawGraph();
    
    // Обновление UI
    safeUpdateElement('current-multiplier', gameState.currentMultiplier.toFixed(2) + 'x');
    
    // Проверка авто-вывода
    if (gameState.autoCashoutEnabled && 
        gameState.hasBet && 
        gameState.currentMultiplier >= gameState.autoCashoutValue &&
        gameState.cashoutMultiplier === 0) {
        cashout();
    }
    
    // Проверка краха
    if (gameState.currentMultiplier >= gameState.crashPoint) {
        crash();
    }
    
    // Обновление прибыли
    if (gameState.hasBet && gameState.cashoutMultiplier === 0) {
        const profit = Math.floor(gameState.betAmount * gameState.currentMultiplier);
        safeUpdateElement('your-profit', profit.toString());
        safeUpdateElement('cashout-amount', profit.toString());
        safeUpdateElement('your-cashout-multiplier', gameState.currentMultiplier.toFixed(2) + 'x');
    }
}

// ОТРИСОВКА ГРАФИКА
function drawGraph() {
    if (!graphCtx || gameState.graphData.length < 2) return;
    
    const canvas = graphCanvas;
    const ctx = graphCtx;
    const padding = 20;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Находим максимум для масштабирования
    const maxX = Math.max(...gameState.graphData.map(d => d.x));
    const maxY = Math.max(gameState.crashPoint, ...gameState.graphData.map(d => d.y));
    
    // Масштабирование
    const scaleX = width / maxX;
    const scaleY = height / maxY;
    
    // Градиент для линии
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(0.5, '#ffff00');
    gradient.addColorStop(1, '#ff0000');
    
    // Рисуем линию графика
    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    gameState.graphData.forEach((point, i) => {
        const x = padding + point.x * scaleX;
        const y = canvas.height - padding - point.y * scaleY;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Точка на конце графика
    const lastPoint = gameState.graphData[gameState.graphData.length - 1];
    const lastX = padding + lastPoint.x * scaleX;
    const lastY = canvas.height - padding - lastPoint.y * scaleY;
    
    // Окружность на конце
    ctx.beginPath();
    ctx.fillStyle = '#00ff00';
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Свечение
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.arc(lastX, lastY, 12, 0, Math.PI * 2);
    ctx.fill();
}

// КРАХ
function crash() {
    clearInterval(gameState.gameTimer);
    gameState.roundActive = false;
    
    // Показываем линию краха
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
    
    // Обработка проигрыша ставок
    if (gameState.hasBet && gameState.cashoutMultiplier === 0) {
        finishBet(false);
    }
    
    // Добавление в историю
    addToHistory(gameState.crashPoint);
    
    // Обновление статистики
    updateStats();
    
    // Задержка перед следующим раундом
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
    const profit = Math.floor(gameState.betAmount * gameState.cashoutMultiplier);
    
    // Добавляем в активные ставки как выигранную
    const betIndex = gameState.activeBets.findIndex(bet => bet.playerId === userId);
    if (betIndex !== -1) {
        gameState.activeBets[betIndex].cashedOut = true;
        gameState.activeBets[betIndex].cashoutMultiplier = gameState.cashoutMultiplier;
        gameState.activeBets[betIndex].profit = profit;
    }
    
    // Обновление UI
    safeUpdateElement('your-profit', profit.toString());
    safeUpdateElement('your-cashout-multiplier', gameState.cashoutMultiplier.toFixed(2) + 'x');
    
    // Обновление активных ставок
    updateActiveBetsUI();
}

// ЗАВЕРШЕНИЕ СТАВКИ
async function finishBet(isWin) {
    const cashoutMultiplier = gameState.cashoutMultiplier || gameState.crashPoint;
    const profit = isWin ? Math.floor(gameState.betAmount * cashoutMultiplier) : 0;
    const balanceChange = isWin ? profit - gameState.betAmount : -gameState.betAmount;
    
    try {
        await updatePointsBalance(balanceChange);
        await saveBetResult(isWin, profit, cashoutMultiplier);
        showResultModal(isWin, profit, cashoutMultiplier);
        
    } catch (error) {
        console.error('Ошибка при завершении ставки:', error);
        showError('Ошибка при завершении ставки');
    }
    
    // Сброс состояния ставки
    gameState.hasBet = false;
    gameState.cashoutMultiplier = 0;
    gameState.yourBet = null;
    
    // Обновление кнопок
    updateButtons();
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
            new_balance: gameState.balance
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
        timestamp: new Date().toISOString()
    };
    
    roundHistory.unshift(historyEntry);
    if (roundHistory.length > GAME_SETTINGS.maxHistory) {
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
        const color = round.multiplier >= 2 ? 'rgba(0, 204, 102, 0.2)' : 
                     round.multiplier >= 1.5 ? 'rgba(255, 153, 0, 0.2)' : 
                     'rgba(255, 68, 68, 0.2)';
        
        return `<div class="history-chip" style="background: ${color};">${round.multiplier.toFixed(2)}x</div>`;
    }).join('');
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ
function updateStats() {
    // Расчет шансов (упрощенный)
    const chance2x = Math.floor((1 / 2) * (1 - GAME_SETTINGS.houseEdge) * 1000) / 10;
    const chance5x = Math.floor((1 / 5) * (1 - GAME_SETTINGS.houseEdge) * 1000) / 10;
    const chance10x = Math.floor((1 / 10) * (1 - GAME_SETTINGS.houseEdge) * 1000) / 10;
    
    safeUpdateElement('chance-2x', `${chance2x}%`);
    safeUpdateElement('chance-5x', `${chance5x}%`);
    safeUpdateElement('chance-10x', `${chance10x}%`);
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ В UI
function updateStatsUI(stats) {
    if (!stats) return;
    
    safeUpdateElement('total-games', stats.games_played.toString());
    safeUpdateElement('average-multiplier', stats.average_multiplier ? stats.average_multiplier.toFixed(2) + 'x' : '0.00x');
    safeUpdateElement('max-multiplier', stats.biggest_multiplier ? stats.biggest_multiplier.toFixed(2) + 'x' : '0.00x');
}

// ОБНОВЛЕНИЕ ЛУЧШИХ ИГРОКОВ
function updateTopPlayers() {
    // В реальном приложении здесь была бы загрузка из Firebase
    // Для демо используем статические данные
    const topPlayers = [
        { name: 'JojoKing', multiplier: 15.67 },
        { name: 'CrashMaster', multiplier: 12.45 },
        { name: 'LuckyBoy', multiplier: 9.23 }
    ];
    
    const topList = document.getElementById('top-players-list');
    if (!topList) return;
    
    topList.innerHTML = topPlayers.map((player, index) => `
        <div class="top-player">
            <span class="player-rank">${index + 1}.</span>
            <span class="player-name">${player.name}</span>
            <span class="player-multiplier">${player.multiplier.toFixed(2)}x</span>
        </div>
    `).join('');
}

// ОБНОВЛЕНИЕ АКТИВНЫХ СТАВОК
function updateActiveBetsUI() {
    const betsList = document.getElementById('active-bets-list');
    if (!betsList) return;
    
    // Ваша ставка всегда наверху
    let betsHTML = '';
    
    if (gameState.yourBet) {
        betsHTML += `
            <div class="bet-row your-bet">
                <div class="player-info">
                    <div class="player-avatar">${userNickname.charAt(0)}</div>
                    <span class="player-name">${userNickname} (Вы)</span>
                </div>
                <span class="col-bet">${gameState.yourBet.amount}</span>
                <span class="col-multiplier">${gameState.cashoutMultiplier > 0 ? gameState.cashoutMultiplier.toFixed(2) + 'x' : gameState.currentMultiplier.toFixed(2) + 'x'}</span>
                <span class="col-profit ${gameState.cashoutMultiplier > 0 ? 'profit' : ''}">
                    ${gameState.cashoutMultiplier > 0 ? '+' : ''}${Math.floor(gameState.yourBet.amount * (gameState.cashoutMultiplier || gameState.currentMultiplier))}
                </span>
            </div>
        `;
    }
    
    // Другие активные ставки (демо)
    if (gameState.activeBets.length > 0) {
        gameState.activeBets.forEach(bet => {
            if (bet.playerId !== userId) {
                betsHTML += `
                    <div class="bet-row ${bet.cashedOut ? 'cashed-out' : ''}">
                        <div class="player-info">
                            <div class="player-avatar">${bet.playerName.charAt(0)}</div>
                            <span class="player-name">${bet.playerName}</span>
                        </div>
                        <span class="col-bet">${bet.amount}</span>
                        <span class="col-multiplier">${bet.cashoutMultiplier ? bet.cashoutMultiplier.toFixed(2) + 'x' : gameState.currentMultiplier.toFixed(2) + 'x'}</span>
                        <span class="col-profit ${bet.cashedOut ? 'profit' : ''}">
                            ${bet.cashedOut ? '+' : ''}${bet.profit || Math.floor(bet.amount * gameState.currentMultiplier)}
                        </span>
                    </div>
                `;
            }
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

// ЗАВЕРШЕНИЕ РАУНДА
function endRound() {
    gameState.roundNumber++;
    gameState.roundActive = false;
    gameState.currentMultiplier = 1.00;
    gameState.crashPoint = 1.00;
    gameState.graphData = [];
    gameState.activeBets = [];
    
    // Очистка графика
    if (graphCtx) {
        graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    }
    
    // Обновление UI
    safeUpdateElement('round-number', gameState.roundNumber.toString());
    safeUpdateElement('current-multiplier', '1.00x');
    safeUpdateElement('game-status', 'Ожидание начала раунда');
    document.getElementById('game-status').style.color = '#ffcc00';
    
    // Запуск таймера нового раунда
    gameState.roundTimer = GAME_SETTINGS.bettingTime;
    startRoundTimer();
    
    // Обновление кнопок
    gameState.canBet = true;
    updateButtons();
}

// СДЕЛАТЬ СТАВКУ
async function placeBet() {
    if (!gameState.canBet || gameState.hasBet || gameState.balance < gameState.betAmount || !gameState.roundActive) {
        return;
    }
    
    try {
        gameState.hasBet = true;
        gameState.canBet = false;
        
        await updatePointsBalance(-gameState.betAmount);
        
        // Создание ставки
        gameState.yourBet = {
            amount: gameState.betAmount,
            cashoutMultiplier: 0,
            profit: 0
        };
        
        // Добавление в активные ставки
        gameState.activeBets.push({
            playerId: userId,
            playerName: userNickname,
            amount: gameState.betAmount,
            cashedOut: false,
            cashoutMultiplier: 0,
            profit: 0
        });
        
        // Обновление UI
        safeUpdateElement('your-bet-amount', gameState.betAmount.toString());
        safeUpdateElement('your-profit', '0');
        safeUpdateElement('your-cashout-multiplier', '0.00x');
        
        updateButtons();
        updateActiveBetsUI();
        
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

// ПОКАЗ МОДАЛЬНОГО ОКНА С РЕЗУЛЬТАТОМ
function showResultModal(isWin, winAmount, multiplier) {
    const modal = document.getElementById('result-modal');
    const winConfetti = document.getElementById('win-confetti');
    
    if (!modal) return;
    
    safeUpdateElement('result-title', isWin ? '🎉 Вы выиграли!' : '😔 Вы проиграли');
    safeUpdateElement('result-subtitle', isWin ? 'Поздравляем!' : 'Повезет в следующий раз!');
    
    const resultIcon = document.getElementById('result-icon');
    if (resultIcon) {
        resultIcon.innerHTML = isWin ? 
            '<i class="fas fa-trophy" style="font-size: 80px; color: gold;"></i>' :
            '<i class="fas fa-times-circle" style="font-size: 80px; color: #ff4444;"></i>';
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
            if (multiplier >= 10) {
                message.textContent = 'Так близко! Вы могли выиграть огромную сумму!';
            } else if (multiplier >= 5) {
                message.textContent = 'Упс! Почти дождались большого множителя!';
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
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${['#00ff00', '#ffff00', '#ff9900', '#0088ff', '#ff00ff'][Math.floor(Math.random() * 5)]};
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
        cashoutBtn.addEventListener('click', function() {
            if (gameState.hasBet && gameState.roundActive) {
                cashout();
            }
        });
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
                showNotification(`Авто-вывод включен на ${gameState.autoCashoutValue}x`, 'info');
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
            showNotification('Сделайте ставку до начала раунда. Забирайте выигрыш до краха графика!', 'info');
        });
    }
    
    // Звук
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (icon.classList.contains('fa-volume-up')) {
                icon.className = 'fas fa-volume-mute';
                showNotification('Звук отключен', 'info');
            } else {
                icon.className = 'fas fa-volume-up';
                showNotification('Звук включен', 'info');
            }
        });
    }
    
    // Валидация ввода
    if (betInput) {
        betInput.addEventListener('keydown', function(e) {
            if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
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
    
    // Ресайз окна
    window.addEventListener('resize', function() {
        if (graphCanvas) {
            graphCanvas.width = graphCanvas.offsetWidth;
            graphCanvas.height = graphCanvas.offsetHeight;
            drawGraph();
        }
    });
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

// Добавляем CSS для анимаций
const gameStyle = document.createElement('style');
gameStyle.textContent = `
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
document.head.appendChild(gameStyle);
