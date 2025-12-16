// minesweeper.js - логика игры Сапер для казино (ИСПРАВЛЕННЫЙ)

let userId = null;
let userNickname = null;
let pointsData = null;
let casinoData = null;

// Состояние игры
let gameState = {
    balance: 0,
    betAmount: 50,
    isPlaying: false,
    canPlay: true,
    cooldownEnd: null,
    gameGrid: [],
    revealedCells: [],
    diamondsFound: 0,
    totalDiamonds: 5,
    bombsCount: 3,
    currentMultiplier: 1.0,
    gameOver: false,
    cashoutEnabled: false,
    autoCashoutMultiplier: 2.5,
    gridSize: '5x5',
    currentWin: 0,
    consecutiveGames: 0
};

// Настройки игры
const GAME_SETTINGS = {
    gridSizes: {
        '5x5': { rows: 5, cols: 5, total: 25 },
        '6x6': { rows: 6, cols: 6, total: 36 },
        '7x7': { rows: 7, cols: 7, total: 49 }
    },
    multipliers: [1.5, 2.2, 3.5, 6.0, 10.0],
    diamondProbability: 0.7,
    bombProbability: 0.15,
    houseEdge: 0.05,
    minBet: 50,
    maxBet: 1000,
    cooldown: 3000
};

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
            initializeGameBoard();
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
        diamondsFound: gameState.diamondsFound,
        multiplier: gameState.currentMultiplier,
        gridSize: gameState.gridSize
    };
    
    adminLogs.unshift(logEntry);
    
    if (typeof localStorage !== 'undefined') {
        try {
            const existingLogs = JSON.parse(localStorage.getItem('jojoland_admin_logs') || '[]');
            const updatedLogs = [logEntry, ...existingLogs.slice(0, 99)];
            localStorage.setItem('jojoland_admin_logs', JSON.stringify(updatedLogs));
        } catch (e) {}
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
            
            if (casinoData.cooldown_until) {
                const cooldownTime = new Date(casinoData.cooldown_until).getTime();
                const now = Date.now();
                
                if (cooldownTime > now) {
                    gameState.cooldownEnd = cooldownTime;
                    gameState.canPlay = false;
                    startCooldownTimer();
                }
            }
            
            updateRecentGames();
        } else {
            casinoData = {
                total_bets: 0,
                total_won: 0,
                total_lost: 0,
                bet_history: [],
                last_bet_time: null,
                cooldown_until: null,
                minesweeper_stats: {
                    games_played: 0,
                    total_wins: 0,
                    total_losses: 0,
                    total_diamonds: 0,
                    best_multiplier: 0,
                    total_wagered: 0
                }
            };
            
            await database.ref('casino/' + userId).set(casinoData);
        }
        
        addAdminLog('✅ Данные игры загружены', 'info');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных игры');
        addAdminLog('❌ Ошибка загрузки данных игры', 'error');
    }
}

// ИНИЦИАЛИЗАЦИЯ ИГРОВОГО ПОЛЯ
function initializeGameBoard() {
    const board = document.getElementById('game-board');
    if (!board) return;
    
    const gridSize = GAME_SETTINGS.gridSizes[gameState.gridSize];
    
    board.innerHTML = '';
    board.className = `game-board size-${gridSize.rows}x${gridSize.cols}`;
    
    for (let i = 0; i < gridSize.total; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        
        const cellContent = document.createElement('div');
        cellContent.className = 'cell-content';
        cellContent.innerHTML = '?';
        
        const cellNumber = document.createElement('div');
        cellNumber.className = 'cell-number';
        cellNumber.textContent = i + 1;
        
        cell.appendChild(cellContent);
        cell.appendChild(cellNumber);
        board.appendChild(cell);
    }
    
    resetGameState();
}

// СБРОС СОСТОЯНИЯ ИГРЫ
function resetGameState() {
    const gridSize = GAME_SETTINGS.gridSizes[gameState.gridSize];
    
    gameState.gameGrid = new Array(gridSize.total).fill(null);
    gameState.revealedCells = [];
    gameState.diamondsFound = 0;
    gameState.currentMultiplier = 1.0;
    gameState.gameOver = false;
    gameState.cashoutEnabled = false;
    gameState.currentWin = 0;
    
    // Обновляем UI если элементы существуют
    safeUpdateElement('diamonds-found', '0');
    safeUpdateElement('total-diamonds', gameState.totalDiamonds.toString());
    safeUpdateElement('bombs-left', gameState.bombsCount.toString());
    safeUpdateElement('current-multiplier', '1.00x');
    safeUpdateElement('current-win', '0');
    
    const progressBar = document.getElementById('multiplier-progress');
    if (progressBar) progressBar.style.width = '0%';
    
    safeUpdateElement('multiplier-text', '1.00x');
    safeUpdateElement('game-status', 'Готов к игре');
    
    // Сбрасываем ячейки
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.className = 'cell';
        const content = cell.querySelector('.cell-content');
        if (content) content.innerHTML = '?';
        cell.style.cursor = 'pointer';
    });
    
    updateGameButtons();
}

// БЕЗОПАСНОЕ ОБНОВЛЕНИЕ ЭЛЕМЕНТА
function safeUpdateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// СОЗДАНИЕ НОВОЙ ИГРЫ
function createNewGame() {
    const gridSize = GAME_SETTINGS.gridSizes[gameState.gridSize];
    const totalCells = gridSize.total;
    
    gameState.gameGrid.fill(null);
    
    addAdminLog('🎮 Создание новой игры', 'game');
    
    // 1. Распределяем алмазы
    let diamondsPlaced = 0;
    while (diamondsPlaced < gameState.totalDiamonds) {
        const randomIndex = Math.floor(Math.random() * totalCells);
        const isEarlyGame = randomIndex < Math.min(8, Math.floor(totalCells * 0.15));
        
        if (!gameState.gameGrid[randomIndex]) {
            if (diamondsPlaced < 2 || Math.random() < GAME_SETTINGS.diamondProbability) {
                gameState.gameGrid[randomIndex] = 'diamond';
                diamondsPlaced++;
                
                if (isEarlyGame) {
                    addAdminLog(`💎 Алмаз размещен в ранней ячейке ${randomIndex + 1}`, 'placement');
                }
            }
        }
    }
    
    // 2. Распределяем бомбы
    let bombsPlaced = 0;
    while (bombsPlaced < gameState.bombsCount) {
        const randomIndex = Math.floor(Math.random() * totalCells);
        
        if (!gameState.gameGrid[randomIndex]) {
            const isEarlyCell = randomIndex < Math.floor(totalCells * 0.3);
            const bombProbability = isEarlyCell ? 
                GAME_SETTINGS.bombProbability * 0.5 :
                GAME_SETTINGS.bombProbability * 1.5;
            
            if (Math.random() < bombProbability) {
                gameState.gameGrid[randomIndex] = 'bomb';
                bombsPlaced++;
                
                addAdminLog(`💣 Бомба размещена в ячейке ${randomIndex + 1} (ранняя: ${isEarlyCell})`, 'placement');
            }
        }
    }
    
    // 3. Остальные ячейки - пустые
    for (let i = 0; i < totalCells; i++) {
        if (!gameState.gameGrid[i]) {
            gameState.gameGrid[i] = 'empty';
        }
    }
    
    addAdminLog(`🎲 Игра создана: ${diamondsPlaced} алмазов, ${bombsPlaced} бомб`, 'game');
    addAdminLog(`📊 Всего ячеек: ${totalCells}, Вероятность алмаза: ${Math.round((diamondsPlaced/totalCells)*100)}%`, 'stats');
}

// ОБРАБОТКА КЛИКА ПО ЯЧЕЙКЕ
function handleCellClick(index) {
    if (gameState.gameOver || !gameState.isPlaying || gameState.revealedCells.includes(index)) {
        return;
    }
    
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    if (!cell) return;
    
    const cellType = gameState.gameGrid[index];
    
    gameState.revealedCells.push(index);
    cell.classList.add('revealed');
    
    setTimeout(() => {
        if (cellType === 'diamond') {
            handleDiamondFound(index);
        } else if (cellType === 'bomb') {
            handleBombFound(index);
        } else {
            handleEmptyCell(index);
        }
        
        updateCashoutButton();
    }, 300);
}

// ОБРАБОТКА НАЙДЕННОГО АЛМАЗА
function handleDiamondFound(index) {
    gameState.diamondsFound++;
    updateMultiplier();
    
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('diamond');
        const content = cell.querySelector('.cell-content');
        if (content) content.innerHTML = '<i class="fas fa-gem"></i>';
        cell.style.cursor = 'default';
    }
    
    safeUpdateElement('diamonds-found', gameState.diamondsFound.toString());
    safeUpdateElement('game-status', `Найден алмаз! (${gameState.diamondsFound}/${gameState.totalDiamonds})`);
    
    const statusElement = document.getElementById('game-status');
    if (statusElement) statusElement.style.color = '#00ff00';
    
    if (gameState.diamondsFound === gameState.totalDiamonds) {
        handleJackpot();
    }
    
    addAdminLog(`💎 Найден алмаз в ячейке ${index + 1}`, 'diamond');
}

// ОБНОВЛЕНИЕ МНОЖИТЕЛЯ
function updateMultiplier() {
    if (gameState.diamondsFound > 0 && gameState.diamondsFound <= GAME_SETTINGS.multipliers.length) {
        let newMultiplier = GAME_SETTINGS.multipliers[gameState.diamondsFound - 1];
        const houseAdjustment = 1 - GAME_SETTINGS.houseEdge;
        newMultiplier *= houseAdjustment;
        
        const randomFactor = 0.95 + Math.random() * 0.1;
        newMultiplier *= randomFactor;
        
        gameState.currentMultiplier = parseFloat(newMultiplier.toFixed(2));
        gameState.currentWin = Math.floor(gameState.betAmount * gameState.currentMultiplier);
        
        const progressPercent = (gameState.diamondsFound / gameState.totalDiamonds) * 100;
        const progressBar = document.getElementById('multiplier-progress');
        if (progressBar) progressBar.style.width = `${progressPercent}%`;
        
        safeUpdateElement('multiplier-text', `${gameState.currentMultiplier.toFixed(2)}x`);
        safeUpdateElement('current-multiplier', `${gameState.currentMultiplier.toFixed(2)}x`);
        safeUpdateElement('current-win', gameState.currentWin.toString());
        
        addAdminLog(`📈 Множитель обновлен: ${gameState.currentMultiplier.toFixed(2)}x`, 'multiplier');
    }
}

// ОБРАБОТКА НАЙДЕННОЙ БОМБЫ
function handleBombFound(index) {
    gameState.gameOver = true;
    gameState.isPlaying = false;
    
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('bomb');
        const content = cell.querySelector('.cell-content');
        if (content) content.innerHTML = '<i class="fas fa-bomb"></i>';
        cell.style.cursor = 'default';
    }
    
    revealAllBombs();
    
    safeUpdateElement('game-status', '💣 БОМБА! Вы проиграли');
    const statusElement = document.getElementById('game-status');
    if (statusElement) statusElement.style.color = '#ff0000';
    
    setTimeout(() => {
        finishGame(false);
    }, 1500);
    
    addAdminLog(`💣 Найдена бомба в ячейке ${index + 1}`, 'bomb');
}

// ПОКАЗАТЬ ВСЕ БОМБЫ
function revealAllBombs() {
    for (let i = 0; i < gameState.gameGrid.length; i++) {
        if (gameState.gameGrid[i] === 'bomb' && !gameState.revealedCells.includes(i)) {
            const cell = document.querySelector(`.cell[data-index="${i}"]`);
            if (cell) {
                cell.classList.add('revealed', 'bomb');
                const content = cell.querySelector('.cell-content');
                if (content) content.innerHTML = '<i class="fas fa-bomb"></i>';
                cell.style.cursor = 'default';
            }
        }
    }
}

// ОБРАБОТКА ПУСТОЙ ЯЧЕЙКИ
function handleEmptyCell(index) {
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('empty');
        const content = cell.querySelector('.cell-content');
        if (content) content.innerHTML = '<i class="fas fa-circle"></i>';
        cell.style.cursor = 'default';
    }
    
    safeUpdateElement('game-status', 'Пустая ячейка');
    const statusElement = document.getElementById('game-status');
    if (statusElement) statusElement.style.color = '#aaaaff';
    
    addAdminLog(`⬜ Пустая ячейка ${index + 1}`, 'empty');
}

// ДЖЕКПОТ - ВСЕ АЛМАЗЫ НАЙДЕНЫ
function handleJackpot() {
    gameState.gameOver = true;
    gameState.isPlaying = false;
    
    safeUpdateElement('game-status', '🎉 ДЖЕКПОТ! Все алмазы найдены!');
    const statusElement = document.getElementById('game-status');
    if (statusElement) statusElement.style.color = '#ffcc00';
    
    setTimeout(() => {
        cashout();
    }, 1000);
    
    addAdminLog(`🎰 ДЖЕКПОТ! Все ${gameState.totalDiamonds} алмазов найдены!`, 'jackpot');
}

// ЗАБРАТЬ ВЫИГРЫШ
async function cashout() {
    if (!gameState.cashoutEnabled || gameState.gameOver) {
        return;
    }
    
    const winAmount = gameState.currentWin;
    finishGame(true, winAmount);
    
    addAdminLog(`💰 Игрок забрал выигрыш: ${winAmount} (x${gameState.currentMultiplier})`, 'cashout');
}

// ЗАВЕРШЕНИЕ ИГРЫ
async function finishGame(isWin, winAmount = 0) {
    gameState.gameOver = true;
    gameState.isPlaying = false;
    
    const finalWin = isWin ? winAmount : 0;
    const balanceChange = isWin ? winAmount - gameState.betAmount : -gameState.betAmount;
    
    try {
        await updatePointsBalance(balanceChange);
        await saveGameResult(isWin, finalWin);
        showResultModal(isWin, finalWin);
        setCooldown(GAME_SETTINGS.cooldown);
        updateRecentGames();
        
        const resultType = isWin ? 'Выигрыш' : 'Проигрыш';
        addAdminLog(`🎮 Игра завершена: ${resultType} ${finalWin || 0} очков`, isWin ? 'win' : 'loss');
    } catch (error) {
        console.error('Ошибка при завершении игры:', error);
        showError('Ошибка при завершении игры');
    }
}

// ОБНОВЛЕНИЕ КНОПКИ ЗАБРАТЬ
function updateCashoutButton() {
    const cashoutBtn = document.getElementById('cashout-btn');
    const cashoutAmount = document.getElementById('cashout-amount');
    
    if (!cashoutBtn || !cashoutAmount) return;
    
    if (gameState.diamondsFound > 0 && !gameState.gameOver) {
        gameState.cashoutEnabled = true;
        cashoutBtn.disabled = false;
        cashoutBtn.classList.add('enabled');
        cashoutAmount.textContent = gameState.currentWin;
    } else {
        gameState.cashoutEnabled = false;
        cashoutBtn.disabled = true;
        cashoutBtn.classList.remove('enabled');
        cashoutAmount.textContent = '0';
    }
}

// ОБНОВЛЕНИЕ КНОПОК ИГРЫ
function updateGameButtons() {
    const startBtn = document.getElementById('start-game-btn');
    const cashoutBtn = document.getElementById('cashout-btn');
    const nextCellBtn = document.getElementById('next-cell-btn');
    
    if (!startBtn || !cashoutBtn || !nextCellBtn) return;
    
    if (gameState.isPlaying) {
        startBtn.disabled = true;
        const betIcon = startBtn.querySelector('.bet-icon');
        const betText = startBtn.querySelector('.bet-text');
        if (betIcon && betText) {
            betIcon.innerHTML = '<i class="fas fa-play"></i>';
            betText.textContent = 'Игра идет...';
        }
        
        nextCellBtn.disabled = false;
    } else {
        startBtn.disabled = !gameState.canPlay || gameState.balance < gameState.betAmount;
        const betIcon = startBtn.querySelector('.bet-icon');
        const betText = startBtn.querySelector('.bet-text');
        const betCost = startBtn.querySelector('.bet-cost');
        if (betIcon && betText && betCost) {
            betIcon.innerHTML = '<i class="fas fa-play"></i>';
            betText.textContent = 'Начать игру';
            betCost.innerHTML = `-<span id="start-bet-amount">${gameState.betAmount}</span>`;
        }
        
        nextCellBtn.disabled = true;
    }
    
    cashoutBtn.disabled = !gameState.cashoutEnabled || gameState.gameOver;
}

// НАЧАТЬ НОВУЮ ИГРУ
async function startGame() {
    addAdminLog('🎮 Попытка начать игру', 'game');
    
    if (!canStartGame()) {
        return;
    }
    
    try {
        gameState.isPlaying = true;
        gameState.canPlay = false;
        
        await updatePointsBalance(-gameState.betAmount);
        resetGameState();
        createNewGame();
        setCooldown(GAME_SETTINGS.cooldown);
        updateGameButtons();
        
        safeUpdateElement('game-status', 'Игра началась! Выбирайте клетки');
        const statusElement = document.getElementById('game-status');
        if (statusElement) statusElement.style.color = '#00ff00';
        
        gameState.consecutiveGames++;
        
        addAdminLog(`🎮 Игра начата, ставка: ${gameState.betAmount}`, 'game');
        
    } catch (error) {
        console.error('❌ Ошибка начала игры:', error);
        showError('Ошибка при начале игры');
        addAdminLog('❌ Ошибка при начале игры', 'error');
        
        gameState.isPlaying = false;
        gameState.canPlay = true;
        updateGameButtons();
    }
}

// ПРОВЕРКА ВОЗМОЖНОСТИ НАЧАТЬ ИГРУ
function canStartGame() {
    if (gameState.balance < gameState.betAmount) {
        showError('Недостаточно очков для ставки');
        return false;
    }
    
    if (gameState.betAmount < GAME_SETTINGS.minBet) {
        showError(`Минимальная ставка - ${GAME_SETTINGS.minBet} очков`);
        return false;
    }
    
    if (gameState.betAmount > GAME_SETTINGS.maxBet) {
        showError(`Максимальная ставка - ${GAME_SETTINGS.maxBet} очков`);
        return false;
    }
    
    if (!gameState.canPlay) {
        showError('Подождите перед следующей игрой');
        return false;
    }
    
    if (gameState.isPlaying) {
        showError('Дождитесь окончания текущей игры');
        return false;
    }
    
    return true;
}

// ОБНОВЛЕНИЕ БАЛАНСА ОЧКОВ
async function updatePointsBalance(change) {
    try {
        if (!pointsData) return;
        
        const currentPoints = pointsData.total_points || 0;
        const newTotal = currentPoints + change;
        
        pointsData.total_points = newTotal;
        
        const updates = {
            total_points: newTotal
        };
        
        if (pointsData.available_points !== undefined) {
            updates.available_points = null;
        }
        
        await database.ref('holiday_points/' + userId).update(updates);
        
        gameState.balance = newTotal;
        
        addAdminLog(`💰 Баланс: ${change > 0 ? '+' : ''}${change}, всего: ${newTotal}`, 'balance');
        
        updateUI();
        
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        throw error;
    }
}

// СОХРАНЕНИЕ РЕЗУЛЬТАТА ИГРЫ
async function saveGameResult(isWin, winAmount) {
    try {
        const gameRecord = {
            game: 'minesweeper',
            timestamp: new Date().toISOString(),
            bet_amount: gameState.betAmount,
            diamonds_found: gameState.diamondsFound,
            total_diamonds: gameState.totalDiamonds,
            bombs_count: gameState.bombsCount,
            final_multiplier: gameState.currentMultiplier,
            result: isWin ? 'win' : 'loss',
            win_amount: winAmount,
            balance_change: isWin ? winAmount - gameState.betAmount : -gameState.betAmount,
            new_balance: gameState.balance,
            grid_size: gameState.gridSize
        };
        
        const updates = {
            last_bet_time: new Date().toISOString(),
            cooldown_until: new Date(Date.now() + GAME_SETTINGS.cooldown).toISOString(),
            total_bets: (casinoData.total_bets || 0) + 1,
            bet_history: [gameRecord, ...(casinoData.bet_history || [])]
        };
        
        const minesweeperStats = casinoData.minesweeper_stats || {
            games_played: 0,
            total_wins: 0,
            total_losses: 0,
            total_diamonds: 0,
            best_multiplier: 0,
            total_wagered: 0
        };
        
        minesweeperStats.games_played++;
        minesweeperStats.total_wagered += gameState.betAmount;
        minesweeperStats.total_diamonds += gameState.diamondsFound;
        
        if (isWin) {
            updates.total_won = (casinoData.total_won || 0) + winAmount;
            minesweeperStats.total_wins++;
            
            if (gameState.currentMultiplier > minesweeperStats.best_multiplier) {
                minesweeperStats.best_multiplier = gameState.currentMultiplier;
            }
        } else {
            updates.total_lost = (casinoData.total_lost || 0) + gameState.betAmount;
            minesweeperStats.total_losses++;
        }
        
        updates.minesweeper_stats = minesweeperStats;
        
        await database.ref('casino/' + userId).update(updates);
        
        casinoData = { ...casinoData, ...updates };
        
    } catch (error) {
        console.error('❌ Ошибка сохранения результата:', error);
        throw error;
    }
}

// ОБНОВЛЕНИЕ ПОСЛЕДНИХ ИГР
function updateRecentGames() {
    const recentGames = document.getElementById('recent-games');
    if (!recentGames) return;
    
    const bets = casinoData.bet_history || [];
    const minesweeperGames = bets.filter(bet => bet.game === 'minesweeper').slice(0, 6);
    
    if (minesweeperGames.length === 0) {
        recentGames.innerHTML = `
            <div class="empty-results">
                <div class="empty-icon"><i class="fas fa-gamepad"></i></div>
                <p>Здесь будут ваши результаты</p>
                <small>Сыграйте первую игру!</small>
            </div>
        `;
        return;
    }
    
    recentGames.innerHTML = minesweeperGames.map(game => {
        const isWin = game.result === 'win';
        const resultClass = isWin ? 'win' : 'loss';
        const resultIcon = isWin ? '<i class="fas fa-trophy"></i>' : '<i class="fas fa-bomb"></i>';
        
        return `
            <div class="result-chip ${resultClass}">
                <div class="result-icon">${resultIcon}</div>
                <div class="result-diamonds">${game.diamonds_found}/${game.total_diamonds}</div>
                <div class="result-multiplier">${game.final_multiplier}x</div>
                <div class="result-amount">${isWin ? '+' : ''}${game.win_amount || 0}</div>
            </div>
        `;
    }).join('');
}

// ПОКАЗ МОДАЛЬНОГО ОКНА С РЕЗУЛЬТАТОМ
function showResultModal(isWin, winAmount) {
    const modal = document.getElementById('result-modal');
    const winConfetti = document.getElementById('win-confetti');
    
    if (!modal) return;
    
    safeUpdateElement('modal-title', isWin ? '🎉 Вы выиграли!' : '😔 Вы проиграли');
    safeUpdateElement('modal-subtitle', isWin ? 'Поздравляем!' : 'Повезет в следующий раз!');
    
    const modalIcon = document.getElementById('modal-icon');
    if (modalIcon) {
        modalIcon.innerHTML = isWin ? 
            '<i class="fas fa-trophy" style="font-size: 80px; color: gold;"></i>' :
            '<i class="fas fa-bomb" style="font-size: 80px; color: #ff4444;"></i>';
    }
    
    safeUpdateElement('modal-bet', gameState.betAmount.toString());
    safeUpdateElement('modal-diamonds', `${gameState.diamondsFound}/${gameState.totalDiamonds}`);
    safeUpdateElement('modal-multiplier', `${gameState.currentMultiplier.toFixed(2)}x`);
    
    const amountLabel = document.getElementById('modal-amount-label');
    const amountValue = document.getElementById('modal-amount-value');
    
    if (amountLabel && amountValue) {
        if (isWin) {
            amountLabel.textContent = 'Вы выиграли:';
            amountValue.textContent = `+${winAmount}`;
            amountValue.style.color = '#00ff00';
            
            if (winConfetti) {
                winConfetti.style.display = 'block';
                createWinConfetti();
            }
        } else {
            amountLabel.textContent = 'Вы проиграли:';
            amountValue.textContent = `-${gameState.betAmount}`;
            amountValue.style.color = '#ff0000';
            if (winConfetti) winConfetti.style.display = 'none';
        }
    }
    
    const message = document.getElementById('modal-message');
    if (message) {
        if (isWin) {
            if (gameState.diamondsFound === gameState.totalDiamonds) {
                message.textContent = 'Невероятно! Вы нашли ВСЕ алмазы!';
            } else if (gameState.currentMultiplier >= 5) {
                message.textContent = 'Отличный результат! Вы настоящий искатель сокровищ!';
            } else {
                message.textContent = 'Хорошая игра! Возвращайтесь за новыми победами!';
            }
        } else {
            if (gameState.diamondsFound === 0) {
                message.textContent = 'Не повезло с первой же клеткой. Попробуйте еще раз!';
            } else if (gameState.diamondsFound >= 3) {
                message.textContent = 'Так близко! Вы нашли много алмазов, но бомба подвела.';
            } else {
                const messages = [
                    'Удача обязательно улыбнется в следующий раз!',
                    'Повезет в следующий раз!',
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
        
        initializeGameBoard();
    }, 300);
}

// УСТАНОВКА КУЛДАУНА
function setCooldown(duration) {
    gameState.cooldownEnd = Date.now() + duration;
    gameState.canPlay = false;
    
    const cooldownInfo = document.getElementById('cooldown-info');
    const cooldownTimer = document.getElementById('cooldown-timer');
    
    if (cooldownInfo) cooldownInfo.style.display = 'flex';
    
    startCooldownTimer();
}

// ЗАПУСК ТАЙМЕРА КУЛДАУНА
function startCooldownTimer() {
    const cooldownInfo = document.getElementById('cooldown-info');
    const cooldownTimer = document.getElementById('cooldown-timer');
    
    const updateTimer = () => {
        if (!gameState.cooldownEnd) return;
        
        const now = Date.now();
        const timeLeft = gameState.cooldownEnd - now;
        
        if (timeLeft <= 0) {
            gameState.canPlay = true;
            gameState.cooldownEnd = null;
            
            if (cooldownInfo) cooldownInfo.style.display = 'none';
            
            updateGameButtons();
            return;
        }
        
        const seconds = Math.ceil(timeLeft / 1000);
        if (cooldownTimer) cooldownTimer.textContent = `${seconds}с`;
        
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
            gameState.canPlay = true;
            gameState.cooldownEnd = null;
            updateGameButtons();
        }
    }
}

// ОБНОВЛЕНИЕ UI
function updateUI() {
    try {
        safeUpdateElement('current-balance', gameState.balance.toString());
        
        const betInput = document.getElementById('bet-input');
        if (betInput) betInput.value = gameState.betAmount;
        
        safeUpdateElement('current-bet', gameState.betAmount.toString());
        safeUpdateElement('start-bet-amount', gameState.betAmount.toString());
        
        const maxMultiplier = GAME_SETTINGS.multipliers[GAME_SETTINGS.multipliers.length - 1];
        const maxWin = Math.floor(gameState.betAmount * maxMultiplier);
        safeUpdateElement('max-win', maxWin.toString());
        
        updateGameButtons();
    } catch (error) {
        console.error('Ошибка в updateUI:', error);
    }
}

// ВОСПРОИЗВЕДЕНИЕ ЗВУКА
function playSound(type) {
    // Можно добавить звуковые эффекты позже
}

// МИГРАЦИЯ available_points
async function migrateAvailablePointsToTotal() {
    try {
        const available = pointsData.available_points || 0;
        const total = pointsData.total_points || 0;
        const newTotal = Math.max(available, total);
        
        await database.ref('holiday_points/' + userId).update({
            total_points: newTotal,
            available_points: null
        });
        
        pointsData.total_points = newTotal;
        delete pointsData.available_points;
        gameState.balance = newTotal;
        
        addAdminLog(`✅ Миграция: ${available} → ${newTotal}`, "migration");
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
    }
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    const gameBoard = document.getElementById('game-board');
    if (gameBoard) {
        gameBoard.addEventListener('click', function(e) {
            const cell = e.target.closest('.cell');
            if (cell && !cell.classList.contains('revealed')) {
                const index = parseInt(cell.dataset.index);
                handleCellClick(index);
            }
        });
    }
    
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }
    
    const cashoutBtn = document.getElementById('cashout-btn');
    if (cashoutBtn) {
        cashoutBtn.addEventListener('click', cashout);
    }
    
    const nextCellBtn = document.getElementById('next-cell-btn');
    if (nextCellBtn) {
        nextCellBtn.addEventListener('click', function() {
            if (!gameState.isPlaying || gameState.gameOver) return;
            
            const gridSize = GAME_SETTINGS.gridSizes[gameState.gridSize];
            const totalCells = gridSize.total;
            const unrevealedCells = [];
            
            for (let i = 0; i < totalCells; i++) {
                if (!gameState.revealedCells.includes(i)) {
                    unrevealedCells.push(i);
                }
            }
            
            if (unrevealedCells.length > 0) {
                const randomIndex = unrevealedCells[Math.floor(Math.random() * unrevealedCells.length)];
                handleCellClick(randomIndex);
            }
        });
    }
    
    const betInput = document.getElementById('bet-input');
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
    
    const decreaseBtn = document.getElementById('decrease-bet');
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            if (gameState.betAmount > GAME_SETTINGS.minBet) {
                gameState.betAmount = Math.max(GAME_SETTINGS.minBet, gameState.betAmount - 50);
                if (betInput) betInput.value = gameState.betAmount;
                updateUI();
            }
        });
    }
    
    const increaseBtn = document.getElementById('increase-bet');
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function() {
            if (gameState.betAmount < GAME_SETTINGS.maxBet && gameState.betAmount < gameState.balance) {
                gameState.betAmount = Math.min(GAME_SETTINGS.maxBet, gameState.balance, gameState.betAmount + 50);
                if (betInput) betInput.value = gameState.betAmount;
                updateUI();
            }
        });
    }
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (gameState.isPlaying) return;
            
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
    
    const gridSizeSelect = document.getElementById('grid-size');
    if (gridSizeSelect) {
        gridSizeSelect.addEventListener('change', function() {
            gameState.gridSize = this.value;
            initializeGameBoard();
        });
    }
    
    const bombCountSelect = document.getElementById('bomb-count');
    if (bombCountSelect) {
        bombCountSelect.addEventListener('change', function() {
            gameState.bombsCount = parseInt(this.value);
            safeUpdateElement('bombs-left', gameState.bombsCount.toString());
        });
    }
    
    const diamondCountSelect = document.getElementById('diamond-count');
    if (diamondCountSelect) {
        diamondCountSelect.addEventListener('change', function() {
            gameState.totalDiamonds = parseInt(this.value);
            safeUpdateElement('total-diamonds', gameState.totalDiamonds.toString());
        });
    }
    
    const autoCashoutBtn = document.getElementById('auto-cashout-btn');
    if (autoCashoutBtn) {
        autoCashoutBtn.addEventListener('click', function() {
            gameState.autoCashoutMultiplier += 0.5;
            if (gameState.autoCashoutMultiplier > 5) {
                gameState.autoCashoutMultiplier = 1.5;
            }
            const autoCashoutValue = document.getElementById('auto-cashout-value');
            if (autoCashoutValue) autoCashoutValue.textContent = `${gameState.autoCashoutMultiplier.toFixed(1)}x`;
        });
    }
    
    const quickBetBtn = document.getElementById('quick-bet-btn');
    if (quickBetBtn) {
        quickBetBtn.addEventListener('click', function() {
            const lastBet = gameState.betAmount;
            if (lastBet <= gameState.balance) {
                gameState.betAmount = lastBet;
                if (betInput) betInput.value = lastBet;
                updateUI();
            }
        });
    }
    
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', function() {
            showNotification('Нажимайте на клетки чтобы найти алмазы. Забирайте выигрыш до того как наткнетесь на бомбу!', 'info');
        });
    }
    
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
    
    @keyframes glow {
        0% { box-shadow: 0 0 10px rgba(255, 204, 0, 0.5); }
        50% { box-shadow: 0 0 25px rgba(255, 204, 0, 0.8); }
        100% { box-shadow: 0 0 10px rgba(255, 204, 0, 0.5); }
    }
`;
document.head.appendChild(gameStyle);
