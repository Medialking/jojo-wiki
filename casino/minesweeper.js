// minesweeper.js - логика игры Сапер для казино

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
    diamondProbability: 0.7, // 70% шанс найти алмаз
    bombProbability: 0.15,   // 15% шанс на бомбу (регулируется)
    houseEdge: 0.05,         // 5% преимущество казино
    minBet: 50,
    maxBet: 1000,
    cooldown: 3000           // 3 секунды между играми
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
            
            // Проверяем кулдаун
            if (casinoData.cooldown_until) {
                const cooldownTime = new Date(casinoData.cooldown_until).getTime();
                const now = Date.now();
                
                if (cooldownTime > now) {
                    gameState.cooldownEnd = cooldownTime;
                    gameState.canPlay = false;
                    startCooldownTimer();
                }
            }
            
            // Загружаем последние игры
            updateRecentGames();
        } else {
            // Создаем новую запись
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
    const gridSize = GAME_SETTINGS.gridSizes[gameState.gridSize];
    
    // Очищаем поле
    board.innerHTML = '';
    board.className = `game-board size-${gridSize.rows}x${gridSize.cols}`;
    
    // Создаем ячейки
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
    
    // Сбрасываем состояние игры
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
    
    // Обновляем UI
    document.getElementById('diamonds-found').textContent = '0';
    document.getElementById('total-diamonds').textContent = gameState.totalDiamonds;
    document.getElementById('bombs-left').textContent = gameState.bombsCount;
    document.getElementById('current-multiplier').textContent = '1.00x';
    document.getElementById('current-win').textContent = '0';
    document.getElementById('multiplier-progress').style.width = '0%';
    document.getElementById('multiplier-text').textContent = '1.00x';
    document.getElementById('game-status').textContent = 'Готов к игре';
    
    // Сбрасываем ячейки
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.className = 'cell';
        cell.querySelector('.cell-content').innerHTML = '?';
        cell.style.cursor = 'pointer';
    });
    
    // Обновляем кнопки
    updateGameButtons();
}

// СОЗДАНИЕ НОВОЙ ИГРЫ
function createNewGame() {
    const gridSize = GAME_SETTINGS.gridSizes[gameState.gridSize];
    const totalCells = gridSize.total;
    
    // Очищаем поле
    gameState.gameGrid.fill(null);
    
    // УМНАЯ СИСТЕМА РАСПРЕДЕЛЕНИЯ
    addAdminLog('🎮 Создание новой игры', 'game');
    
    // 1. Распределяем алмазы
    let diamondsPlaced = 0;
    while (diamondsPlaced < gameState.totalDiamonds) {
        const randomIndex = Math.floor(Math.random() * totalCells);
        
        // Проверяем, не находится ли ячейка в начале игры (первые 3-5 ходов)
        const isEarlyGame = randomIndex < Math.min(8, Math.floor(totalCells * 0.15));
        
        if (!gameState.gameGrid[randomIndex]) {
            // УМНАЯ СИСТЕМА: Первые алмазы чаще, чтобы игрок заинтересовался
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
            // УМНАЯ СИСТЕМА: Бомбы реже в начале, чаще после нескольких алмазов
            const isEarlyCell = randomIndex < Math.floor(totalCells * 0.3);
            const bombProbability = isEarlyCell ? 
                GAME_SETTINGS.bombProbability * 0.5 : // 50% реже в начале
                GAME_SETTINGS.bombProbability * 1.5;  // 50% чаще позже
            
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
    
    // Логируем распределение
    addAdminLog(`🎲 Игра создана: ${diamondsPlaced} алмазов, ${bombsPlaced} бомб`, 'game');
    addAdminLog(`📊 Всего ячеек: ${totalCells}, Вероятность алмаза: ${Math.round((diamondsPlaced/totalCells)*100)}%`, 'stats');
}

// ОБРАБОТКА КЛИКА ПО ЯЧЕЙКЕ
function handleCellClick(index) {
    if (gameState.gameOver || !gameState.isPlaying || gameState.revealedCells.includes(index)) {
        return;
    }
    
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    const cellType = gameState.gameGrid[index];
    
    gameState.revealedCells.push(index);
    cell.classList.add('revealed');
    
    // Добавляем задержку для анимации
    setTimeout(() => {
        if (cellType === 'diamond') {
            // Найден алмаз
            handleDiamondFound(index);
        } else if (cellType === 'bomb') {
            // Найдена бомба
            handleBombFound(index);
        } else {
            // Пустая ячейка
            handleEmptyCell(index);
        }
        
        // Проверяем, можно ли забрать выигрыш
        updateCashoutButton();
        
    }, 300);
}

// ОБРАБОТКА НАЙДЕННОГО АЛМАЗА
function handleDiamondFound(index) {
    gameState.diamondsFound++;
    
    // Рассчитываем новый множитель
    updateMultiplier();
    
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.classList.add('diamond');
    cell.querySelector('.cell-content').innerHTML = '<i class="fas fa-gem"></i>';
    cell.style.cursor = 'default';
    
    // Обновляем UI
    document.getElementById('diamonds-found').textContent = gameState.diamondsFound;
    document.getElementById('game-status').textContent = `Найден алмаз! (${gameState.diamondsFound}/${gameState.totalDiamonds})`;
    document.getElementById('game-status').style.color = '#00ff00';
    
    // Звуковой эффект (если есть)
    playSound('diamond');
    
    // Проверяем, собраны ли все алмазы
    if (gameState.diamondsFound === gameState.totalDiamonds) {
        handleJackpot();
    }
    
    addAdminLog(`💎 Найден алмаз в ячейке ${index + 1}`, 'diamond');
}

// ОБНОВЛЕНИЕ МНОЖИТЕЛЯ
function updateMultiplier() {
    if (gameState.diamondsFound > 0 && gameState.diamondsFound <= GAME_SETTINGS.multipliers.length) {
        // Базовый множитель
        let newMultiplier = GAME_SETTINGS.multipliers[gameState.diamondsFound - 1];
        
        // УМНАЯ СИСТЕМА: Регулируем множитель в пользу казино
        const houseAdjustment = 1 - GAME_SETTINGS.houseEdge;
        newMultiplier *= houseAdjustment;
        
        // Добавляем небольшую случайность
        const randomFactor = 0.95 + Math.random() * 0.1; // 0.95-1.05
        newMultiplier *= randomFactor;
        
        gameState.currentMultiplier = parseFloat(newMultiplier.toFixed(2));
        
        // Рассчитываем текущий выигрыш
        gameState.currentWin = Math.floor(gameState.betAmount * gameState.currentMultiplier);
        
        // Обновляем прогресс
        const progressPercent = (gameState.diamondsFound / gameState.totalDiamonds) * 100;
        document.getElementById('multiplier-progress').style.width = `${progressPercent}%`;
        document.getElementById('multiplier-text').textContent = `${gameState.currentMultiplier.toFixed(2)}x`;
        
        // Обновляем UI
        document.getElementById('current-multiplier').textContent = `${gameState.currentMultiplier.toFixed(2)}x`;
        document.getElementById('current-win').textContent = gameState.currentWin;
        
        addAdminLog(`📈 Множитель обновлен: ${gameState.currentMultiplier.toFixed(2)}x`, 'multiplier');
    }
}

// ОБРАБОТКА НАЙДЕННОЙ БОМБЫ
function handleBombFound(index) {
    gameState.gameOver = true;
    gameState.isPlaying = false;
    
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.classList.add('bomb');
    cell.querySelector('.cell-content').innerHTML = '<i class="fas fa-bomb"></i>';
    cell.style.cursor = 'default';
    
    // Показываем все бомбы
    revealAllBombs();
    
    // Обновляем UI
    document.getElementById('game-status').textContent = '💣 БОМБА! Вы проиграли';
    document.getElementById('game-status').style.color = '#ff0000';
    
    // Звуковой эффект
    playSound('bomb');
    
    // Завершаем игру с проигрышем
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
            cell.classList.add('revealed', 'bomb');
            cell.querySelector('.cell-content').innerHTML = '<i class="fas fa-bomb"></i>';
            cell.style.cursor = 'default';
        }
    }
}

// ОБРАБОТКА ПУСТОЙ ЯЧЕЙКИ
function handleEmptyCell(index) {
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.classList.add('empty');
    cell.querySelector('.cell-content').innerHTML = '<i class="fas fa-circle"></i>';
    cell.style.cursor = 'default';
    
    document.getElementById('game-status').textContent = 'Пустая ячейка';
    document.getElementById('game-status').style.color = '#aaaaff';
    
    addAdminLog(`⬜ Пустая ячейка ${index + 1}`, 'empty');
}

// ДЖЕКПОТ - ВСЕ АЛМАЗЫ НАЙДЕНЫ
function handleJackpot() {
    gameState.gameOver = true;
    gameState.isPlaying = false;
    
    document.getElementById('game-status').textContent = '🎉 ДЖЕКПОТ! Все алмазы найдены!';
    document.getElementById('game-status').style.color = '#ffcc00';
    
    // Автоматически забираем выигрыш
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
    const isWin = winAmount > gameState.betAmount;
    
    // Завершаем игру с выигрышем
    finishGame(true, winAmount);
    
    addAdminLog(`💰 Игрок забрал выигрыш: ${winAmount} (x${gameState.currentMultiplier})`, 'cashout');
}

// ЗАВЕРШЕНИЕ ИГРЫ
async function finishGame(isWin, winAmount = 0) {
    gameState.gameOver = true;
    gameState.isPlaying = false;
    
    // Рассчитываем финальный результат
    const finalWin = isWin ? winAmount : 0;
    const balanceChange = isWin ? winAmount - gameState.betAmount : -gameState.betAmount;
    
    // Обновляем баланс
    await updatePointsBalance(balanceChange);
    
    // Сохраняем результат
    await saveGameResult(isWin, finalWin);
    
    // Показываем результат
    showResultModal(isWin, finalWin);
    
    // Устанавливаем кулдаун
    setCooldown(GAME_SETTINGS.cooldown);
    
    // Обновляем список последних игр
    updateRecentGames();
    
    // Логируем
    const resultType = isWin ? 'Выигрыш' : 'Проигрыш';
    addAdminLog(`🎮 Игра завершена: ${resultType} ${finalWin || 0} очков`, isWin ? 'win' : 'loss');
}

// ОБНОВЛЕНИЕ КНОПКИ ЗАБРАТЬ
function updateCashoutButton() {
    const cashoutBtn = document.getElementById('cashout-btn');
    const cashoutAmount = document.getElementById('cashout-amount');
    
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
    
    if (gameState.isPlaying) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="bet-icon"><i class="fas fa-play"></i></span><span class="bet-text">Игра идет...</span>';
        
        nextCellBtn.disabled = false;
    } else {
        startBtn.disabled = !gameState.canPlay || gameState.balance < gameState.betAmount;
        startBtn.innerHTML = `<span class="bet-icon"><i class="fas fa-play"></i></span><span class="bet-text">Начать игру</span><span class="bet-cost">-<span id="start-bet-amount">${gameState.betAmount}</span></span>`;
        
        nextCellBtn.disabled = true;
    }
    
    cashoutBtn.disabled = !gameState.cashoutEnabled || gameState.gameOver;
}

// НАЧАТЬ НОВУЮ ИГРУ
async function startGame() {
    addAdminLog('🎮 Попытка начать игру', 'game');
    
    // Проверки
    if (!canStartGame()) {
        return;
    }
    
    try {
        // Блокируем кнопку
        gameState.isPlaying = true;
        gameState.canPlay = false;
        
        // Снимаем ставку с баланса
        await updatePointsBalance(-gameState.betAmount);
        
        // Сбрасываем поле
        resetGameState();
        
        // Создаем новую игру
        createNewGame();
        
        // Включаем кулдаун
        setCooldown(GAME_SETTINGS.cooldown);
        
        // Обновляем UI
        updateGameButtons();
        document.getElementById('game-status').textContent = 'Игра началась! Выбирайте клетки';
        document.getElementById('game-status').style.color = '#00ff00';
        
        // Увеличиваем счетчик игр
        gameState.consecutiveGames++;
        
        addAdminLog(`🎮 Игра начата, ставка: ${gameState.betAmount}`, 'game');
        
    } catch (error) {
        console.error('❌ Ошибка начала игры:', error);
        showError('Ошибка при начале игры');
        addAdminLog('❌ Ошибка при начале игры', 'error');
        
        // Разблокируем
        gameState.isPlaying = false;
        gameState.canPlay = true;
        updateGameButtons();
    }
}

// ПРОВЕРКА ВОЗМОЖНОСТИ НАЧАТЬ ИГРУ
function canStartGame() {
    // Проверка 1: Достаточно ли баланса
    if (gameState.balance < gameState.betAmount) {
        showError('Недостаточно очков для ставки');
        return false;
    }
    
    // Проверка 2: Минимальная ставка
    if (gameState.betAmount < GAME_SETTINGS.minBet) {
        showError(`Минимальная ставка - ${GAME_SETTINGS.minBet} очков`);
        return false;
    }
    
    // Проверка 3: Максимальная ставка
    if (gameState.betAmount > GAME_SETTINGS.maxBet) {
        showError(`Максимальная ставка - ${GAME_SETTINGS.maxBet} очков`);
        return false;
    }
    
    // Проверка 4: Активен ли кулдаун
    if (!gameState.canPlay) {
        showError('Подождите перед следующей игрой');
        return false;
    }
    
    // Проверка 5: Не идет ли уже игра
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
        
        // Обновляем UI
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
        
        // Обновляем статистику казино
        const updates = {
            last_bet_time: new Date().toISOString(),
            cooldown_until: new Date(Date.now() + GAME_SETTINGS.cooldown).toISOString(),
            total_bets: (casinoData.total_bets || 0) + 1,
            bet_history: [gameRecord, ...(casinoData.bet_history || [])]
        };
        
        // Обновляем статистику сапера
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
        
        // Сохраняем в Firebase
        await database.ref('casino/' + userId).update(updates);
        
        // Обновляем локальные данные
        casinoData = { ...casinoData, ...updates };
        
    } catch (error) {
        console.error('❌ Ошибка сохранения результата:', error);
        throw error;
    }
}

// ОБНОВЛЕНИЕ ПОСЛЕДНИХ ИГР
function updateRecentGames() {
    const recentGames = document.getElementById('recent-games');
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
    
    // Настраиваем заголовок
    document.getElementById('modal-title').textContent = isWin ? '🎉 Вы выиграли!' : '😔 Вы проиграли';
    document.getElementById('modal-subtitle').textContent = isWin ? 'Поздравляем!' : 'Повезет в следующий раз!';
    
    // Настраиваем иконку
    const modalIcon = document.getElementById('modal-icon');
    modalIcon.innerHTML = isWin ? 
        '<i class="fas fa-trophy" style="font-size: 80px; color: gold;"></i>' :
        '<i class="fas fa-bomb" style="font-size: 80px; color: #ff4444;"></i>';
    
    // Заполняем детали
    document.getElementById('modal-bet').textContent = gameState.betAmount;
    document.getElementById('modal-diamonds').textContent = `${gameState.diamondsFound}/${gameState.totalDiamonds}`;
    document.getElementById('modal-multiplier').textContent = `${gameState.currentMultiplier.toFixed(2)}x`;
    
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
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Настраиваем обработчики закрытия
    document.getElementById('close-result').onclick = function() {
        closeResultModal();
    };
    
    document.getElementById('play-again').onclick = function() {
        closeResultModal();
    };
}

// СОЗДАНИЕ КОНФЕТТИ
function createWinConfetti() {
    const container = document.getElementById('win-confetti');
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
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
        
        document.getElementById('win-confetti').style.display = 'none';
        document.getElementById('win-confetti').innerHTML = '';
        
        // Переинициализируем поле
        initializeGameBoard();
        
    }, 300);
}

// УСТАНОВКА КУЛДАУНА
function setCooldown(duration) {
    gameState.cooldownEnd = Date.now() + duration;
    gameState.canPlay = false;
    
    const cooldownInfo = document.getElementById('cooldown-info');
    const cooldownTimer = document.getElementById('cooldown-timer');
    cooldownInfo.style.display = 'flex';
    
    startCooldownTimer();
}

// ЗАПУСК ТАЙМЕРА КУЛДАУНА
function startCooldownTimer() {
    const cooldownInfo = document.getElementById('cooldown-info');
    const cooldownTimer = document.getElementById('cooldown-timer');
    const startBtn = document.getElementById('start-game-btn');
    
    const updateTimer = () => {
        if (!gameState.cooldownEnd) return;
        
        const now = Date.now();
        const timeLeft = gameState.cooldownEnd - now;
        
        if (timeLeft <= 0) {
            gameState.canPlay = true;
            gameState.cooldownEnd = null;
            
            cooldownInfo.style.display = 'none';
            
            updateGameButtons();
            return;
        }
        
        const seconds = Math.ceil(timeLeft / 1000);
        cooldownTimer.textContent = `${seconds}с`;
        
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
    document.getElementById('current-balance').textContent = gameState.balance;
    
    const betInput = document.getElementById('bet-input');
    betInput.value = gameState.betAmount;
    
    document.getElementById('current-bet').textContent = gameState.betAmount;
    document.getElementById('start-bet-amount').textContent = gameState.betAmount;
    
    // Рассчитываем максимальный выигрыш
    const maxMultiplier = GAME_SETTINGS.multipliers[GAME_SETTINGS.multipliers.length - 1];
    const maxWin = Math.floor(gameState.betAmount * maxMultiplier);
    document.getElementById('max-win').textContent = maxWin;
    
    updateGameButtons();
}

// ВОСПРОИЗВЕДЕНИЕ ЗВУКА
function playSound(type) {
    // Можно добавить звуковые эффекты позже
    if (type === 'diamond') {
        // Звук алмаза
    } else if (type === 'bomb') {
        // Звук бомбы
    }
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
    // Клик по ячейкам
    document.getElementById('game-board').addEventListener('click', function(e) {
        const cell = e.target.closest('.cell');
        if (cell && !cell.classList.contains('revealed')) {
            const index = parseInt(cell.dataset.index);
            handleCellClick(index);
        }
    });
    
    // Начать игру
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    
    // Забрать выигрыш
    document.getElementById('cashout-btn').addEventListener('click', cashout);
    
    // Следующая ячейка (рандомная)
    document.getElementById('next-cell-btn').addEventListener('click', function() {
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
    
    // Изменение суммы ставки
    const betInput = document.getElementById('bet-input');
    
    betInput.addEventListener('input', function() {
        let value = parseInt(this.value) || GAME_SETTINGS.minBet;
        
        if (value < GAME_SETTINGS.minBet) value = GAME_SETTINGS.minBet;
        if (value > GAME_SETTINGS.maxBet) value = GAME_SETTINGS.maxBet;
        if (value > gameState.balance) value = Math.min(gameState.balance, GAME_SETTINGS.maxBet);
        
        this.value = value;
        gameState.betAmount = value;
        
        updateUI();
    });
    
    // Кнопки изменения ставки
    document.getElementById('decrease-bet').addEventListener('click', function() {
        if (gameState.betAmount > GAME_SETTINGS.minBet) {
            gameState.betAmount = Math.max(GAME_SETTINGS.minBet, gameState.betAmount - 50);
            betInput.value = gameState.betAmount;
            updateUI();
        }
    });
    
    document.getElementById('increase-bet').addEventListener('click', function() {
        if (gameState.betAmount < GAME_SETTINGS.maxBet && gameState.betAmount < gameState.balance) {
            gameState.betAmount = Math.min(GAME_SETTINGS.maxBet, gameState.balance, gameState.betAmount + 50);
            betInput.value = gameState.betAmount;
            updateUI();
        }
    });
    
    // Быстрые ставки
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (gameState.isPlaying) return;
            
            const amount = parseInt(this.dataset.amount);
            
            if (amount <= gameState.balance) {
                gameState.betAmount = amount;
                betInput.value = amount;
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
    
    // Настройки игры
    document.getElementById('grid-size').addEventListener('change', function() {
        gameState.gridSize = this.value;
        initializeGameBoard();
    });
    
    document.getElementById('bomb-count').addEventListener('change', function() {
        gameState.bombsCount = parseInt(this.value);
        document.getElementById('bombs-left').textContent = gameState.bombsCount;
    });
    
    document.getElementById('diamond-count').addEventListener('change', function() {
        gameState.totalDiamonds = parseInt(this.value);
        document.getElementById('total-diamonds').textContent = gameState.totalDiamonds;
    });
    
    // Авто-вывод
    document.getElementById('auto-cashout-btn').addEventListener('click', function() {
        gameState.autoCashoutMultiplier += 0.5;
        if (gameState.autoCashoutMultiplier > 5) {
            gameState.autoCashoutMultiplier = 1.5;
        }
        document.getElementById('auto-cashout-value').textContent = `${gameState.autoCashoutMultiplier.toFixed(1)}x`;
    });
    
    // Повторить ставку
    document.getElementById('quick-bet-btn').addEventListener('click', function() {
        // Сохраняем текущую ставку для повторения
        const lastBet = gameState.betAmount;
        if (lastBet <= gameState.balance) {
            gameState.betAmount = lastBet;
            betInput.value = lastBet;
            updateUI();
        }
    });
    
    // Кнопка помощи
    document.getElementById('help-btn').addEventListener('click', function() {
        showNotification('Нажимайте на клетки чтобы найти алмазы. Забирайте выигрыш до того как наткнетесь на бомбу!', 'info');
    });
    
    // Кнопка звука
    document.getElementById('sound-toggle').addEventListener('click', function() {
        const icon = this.querySelector('i');
        if (icon.classList.contains('fa-volume-up')) {
            icon.className = 'fas fa-volume-mute';
            showNotification('Звук отключен', 'info');
        } else {
            icon.className = 'fas fa-volume-up';
            showNotification('Звук включен', 'info');
        }
    });
    
    // Защита от ввода
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
