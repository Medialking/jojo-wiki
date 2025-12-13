// wheel.js - логика Колеса Фортуны

let userId = null;
let userNickname = null;
let pointsData = null;
let casinoData = null;

// Конфигурация колеса
const WHEEL_CONFIG = {
    SPIN_COST: 150, // Стоимость одного вращения
    COOLDOWN: 3000, // Кулдаун между вращениями (3 секунды)
    AUTO_SPIN_COUNT: 3, // Количество авто-вращений
    SECTORS: [
    // Меньше шансов на выигрыш, больше на проигрыш
    { multiplier: 10, probability: 1, name: "ДЖЕКПОТ", color: "#ffcc00", class: "jackpot" },
    { multiplier: 5, probability: 3, name: "МЕГА ВЫИГРЫШ", color: "#ff0000", class: "big-win" },
    { multiplier: 3, probability: 5, name: "БОЛЬШОЙ ВЫИГРЫШ", color: "#ff6600", class: "big-win" },
    { multiplier: 2, probability: 7, name: "ХОРОШИЙ ВЫИГРЫШ", color: "#ff9900", class: "medium-win" },
    { multiplier: 1.5, probability: 10, name: "ВЫИГРЫШ", color: "#00ff00", class: "small-win" },
    { multiplier: 1, probability: 15, name: "ВОЗВРАТ", color: "#0088ff", class: "small-win" },
    { multiplier: 0.8, probability: 15, name: "МАЛЕНЬКИЙ ВЫИГРЫШ", color: "#8800ff", class: "small-win" },
    { multiplier: 0.5, probability: 15, name: "УТЕШИТЕЛЬНЫЙ", color: "#ff00ff", class: "small-win" },
    { multiplier: 0.2, probability: 15, name: "МАЛЕНЬКИЙ ПРИЗ", color: "#00ffff", class: "small-win" },
    { multiplier: 0, probability: 14, name: "ПУСТО", color: "#666666", class: "small-win" }
]
};

// Состояние игры
let gameState = {
    balance: 0,
    isSpinning: false,
    canSpin: true,
    cooldownEnd: null,
    spinCost: WHEEL_CONFIG.SPIN_COST,
    autoSpinCount: 0,
    isAutoSpinning: false,
    recentWins: [],
    spinHistory: []
};

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await loadUserData();
            initWheel();
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
        
        // Загружаем данные казино для колеса
        const casinoSnapshot = await database.ref('casino_wheel/' + userId).once('value');
        if (casinoSnapshot.exists()) {
            casinoData = casinoSnapshot.val();
            
            // Загружаем историю вращений
            if (casinoData.spin_history) {
                gameState.spinHistory = casinoData.spin_history.slice(0, 20);
            }
            
            // Загружаем последние выигрыши
            if (casinoData.recent_wins) {
                gameState.recentWins = casinoData.recent_wins.slice(0, 10);
            }
            
            // Проверяем кулдаун
            if (casinoData.cooldown_until) {
                const cooldownTime = new Date(casinoData.cooldown_until).getTime();
                const now = Date.now();
                
                if (cooldownTime > now) {
                    gameState.cooldownEnd = cooldownTime;
                    gameState.canSpin = false;
                    startCooldownTimer();
                }
            }
        } else {
            // Создаем новую запись для колеса
            casinoData = {
                total_spins: 0,
                total_won: 0,
                total_lost: 0,
                best_win: 0,
                spin_history: [],
                recent_wins: [],
                last_spin_time: null,
                cooldown_until: null
            };
            
            await database.ref('casino_wheel/' + userId).set(casinoData);
        }
        
        console.log('✅ Данные колеса загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных игры');
    }
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
        
        console.log(`✅ Миграция: available_points(${available}) → total_points(${newTotal})`);
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
    }
}

// ИНИЦИАЛИЗАЦИЯ КОЛЕСА
function initWheel() {
    const wheel = document.getElementById('fortune-wheel');
    const sectorsGrid = document.getElementById('sectors-grid');
    
    wheel.innerHTML = '';
    sectorsGrid.innerHTML = '';
    
    const totalSectors = WHEEL_CONFIG.SECTORS.length;
    const sectorAngle = 360 / totalSectors;
    
    // Создаем секторы на колесе
    WHEEL_CONFIG.SECTORS.forEach((sector, index) => {
        // Создаем сектор на колесе
        const sectorElement = document.createElement('div');
        sectorElement.className = `wheel-sector ${sector.class}`;
        sectorElement.dataset.index = index;
        sectorElement.dataset.multiplier = sector.multiplier;
        
        // Рассчитываем угол поворота
        const rotation = index * sectorAngle;
        sectorElement.style.transform = `rotate(${rotation}deg) skew(${90 - sectorAngle}deg)`;
        sectorElement.style.background = sector.color;
        
        // Добавляем контент в сектор
        sectorElement.innerHTML = `
            <div class="wheel-sector-content">
                <div class="wheel-sector-multiplier">×${sector.multiplier}</div>
                <div class="wheel-sector-name">${sector.name}</div>
            </div>
        `;
        
        wheel.appendChild(sectorElement);
        
        // Создаем карточку сектора для отображения
        const sectorCard = document.createElement('div');
        sectorCard.className = `sector-card ${sector.class}`;
        
        const winAmount = Math.floor(gameState.spinCost * sector.multiplier);
        
        sectorCard.innerHTML = `
            <div class="sector-multiplier">×${sector.multiplier}</div>
            <div class="sector-name">${sector.name}</div>
            <div class="sector-probability">Вероятность: ${sector.probability}%</div>
            <div class="sector-prize">${winAmount} очков</div>
        `;
        
        sectorsGrid.appendChild(sectorCard);
    });
    
    // Обновляем стоимость вращения в UI
    document.getElementById('spin-cost').textContent = gameState.spinCost;
}

// ПРОВЕРКА ВОЗМОЖНОСТИ ВРАЩЕНИЯ
function canSpin() {
    // Проверка 1: Достаточно ли баланса
    if (gameState.balance < gameState.spinCost) {
        showError(`Недостаточно очков для вращения. Нужно ${gameState.spinCost} очков`);
        return false;
    }
    
    // Проверка 2: Активен ли кулдаун
    if (!gameState.canSpin) {
        showError('Подождите перед следующим вращением');
        return false;
    }
    
    // Проверка 3: Не вращается ли уже колесо
    if (gameState.isSpinning) {
        showError('Дождитесь окончания текущего вращения');
        return false;
    }
    
    return true;
}

// ВРАЩЕНИЕ КОЛЕСА
async function spinWheel() {
    console.log('🎡 Попытка вращения колеса');
    
    if (!canSpin()) {
        return;
    }
    
    try {
        // Блокируем кнопку для защиты от двойного нажатия
        gameState.isSpinning = true;
        gameState.canSpin = false;
        
        const spinBtn = document.getElementById('spin-btn');
        spinBtn.disabled = true;
        
        // Вычитаем стоимость вращения
        await updatePointsBalance(-gameState.spinCost);
        
        // Генерируем результат
        const resultIndex = generateWheelResult();
        const sector = WHEEL_CONFIG.SECTORS[resultIndex];
        const winAmount = Math.floor(gameState.spinCost * sector.multiplier);
        const isWin = sector.multiplier > 0;
        
        // Если выигрыш - добавляем очки
        if (isWin && winAmount > 0) {
            await updatePointsBalance(winAmount);
        }
        
        // Запускаем анимацию вращения
        await animateWheelSpin(resultIndex);
        
        // Записываем результат в историю
        await saveSpinResult(sector, winAmount, isWin);
        
        // Показываем модальное окно с результатом
        showWheelResultModal(sector, winAmount, isWin);
        
        // Обновляем последние выигрыши
        updateRecentWins(sector, winAmount, isWin);
        
        // Устанавливаем кулдаун
        setCooldown(WHEEL_CONFIG.COOLDOWN);
        
        console.log(`✅ Вращение завершено: ${isWin ? 'Выигрыш' : 'Проигрыш'} ${winAmount || 0} очков`);
        
    } catch (error) {
        console.error('❌ Ошибка вращения:', error);
        showError('Ошибка при вращении колеса');
    } finally {
        // Снимаем блокировку
        gameState.isSpinning = false;
        
        const spinBtn = document.getElementById('spin-btn');
        spinBtn.disabled = !gameState.canSpin;
    }
}

// ГЕНЕРАЦИЯ РЕЗУЛЬТАТА КОЛЕСА
function generateWheelResult() {
    // Создаем массив с учетом вероятностей
    const probabilityArray = [];
    
    WHEEL_CONFIG.SECTORS.forEach((sector, index) => {
        // Добавляем индекс в массив столько раз, сколько составляет вероятность
        for (let i = 0; i < sector.probability; i++) {
            probabilityArray.push(index);
        }
    });
    
    // Выбираем случайный индекс из массива
    const randomIndex = Math.floor(Math.random() * probabilityArray.length);
    return probabilityArray[randomIndex];
}

// АНИМАЦИЯ ВРАЩЕНИЯ КОЛЕСА
async function animateWheelSpin(resultIndex) {
    const wheel = document.getElementById('fortune-wheel');
    const totalSectors = WHEEL_CONFIG.SECTORS.length;
    const sectorAngle = 360 / totalSectors;
    
    // Угол для остановки на выбранном секторе
    // Добавляем полные обороты для эффекта
    const fullRotations = 5; // 5 полных оборотов
    const targetRotation = fullRotations * 360 + (resultIndex * sectorAngle) - (sectorAngle / 2);
    
    // Устанавливаем CSS переменную для анимации
    wheel.style.setProperty('--rotation', `${targetRotation}deg`);
    
    // Добавляем класс для анимации
    wheel.classList.add('spinning');
    
    // Ждем окончания анимации
    await new Promise(resolve => {
        setTimeout(() => {
            wheel.classList.remove('spinning');
            wheel.style.transform = `rotate(${targetRotation % 360}deg)`;
            resolve();
        }, 3000);
    });
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
        
        console.log(`💰 Баланс обновлен: ${change > 0 ? '+' : ''}${change}, всего: ${newTotal}`);
        
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        throw error;
    }
}

// СОХРАНЕНИЕ РЕЗУЛЬТАТА ВРАЩЕНИЯ
async function saveSpinResult(sector, winAmount, isWin) {
    try {
        const spinRecord = {
            timestamp: new Date().toISOString(),
            spin_cost: gameState.spinCost,
            multiplier: sector.multiplier,
            sector_name: sector.name,
            win_amount: winAmount,
            is_win: isWin,
            balance_change: isWin ? winAmount - gameState.spinCost : -gameState.spinCost,
            new_balance: gameState.balance
        };
        
        // Обновляем статистику колеса
        const updates = {
            last_spin_time: new Date().toISOString(),
            cooldown_until: new Date(Date.now() + WHEEL_CONFIG.COOLDOWN).toISOString(),
            total_spins: (casinoData.total_spins || 0) + 1,
            spin_history: [spinRecord, ...(casinoData.spin_history || [])]
        };
        
        if (isWin) {
            updates.total_won = (casinoData.total_won || 0) + winAmount;
            
            // Обновляем лучший выигрыш
            if (winAmount > (casinoData.best_win || 0)) {
                updates.best_win = winAmount;
            }
        } else {
            updates.total_lost = (casinoData.total_lost || 0) + gameState.spinCost;
        }
        
        // Сохраняем в Firebase
        await database.ref('casino_wheel/' + userId).update(updates);
        
        // Обновляем локальные данные
        casinoData = { ...casinoData, ...updates };
        
        // Обновляем историю в состоянии игры
        gameState.spinHistory.unshift(spinRecord);
        if (gameState.spinHistory.length > 20) {
            gameState.spinHistory = gameState.spinHistory.slice(0, 20);
        }
        
    } catch (error) {
        console.error('❌ Ошибка сохранения результата:', error);
        throw error;
    }
}

// УСТАНОВКА КУЛДАУНА
function setCooldown(duration) {
    gameState.cooldownEnd = Date.now() + duration;
    gameState.canSpin = false;
    
    // Показываем таймер кулдауна
    const cooldownInfo = document.getElementById('wheel-cooldown');
    const cooldownTimer = document.getElementById('wheel-timer');
    cooldownInfo.style.display = 'block';
    
    startCooldownTimer();
}

// ЗАПУСК ТАЙМЕРА КУЛДАУНА
function startCooldownTimer() {
    const cooldownInfo = document.getElementById('wheel-cooldown');
    const cooldownTimer = document.getElementById('wheel-timer');
    const spinBtn = document.getElementById('spin-btn');
    const autoSpinBtn = document.getElementById('auto-spin-btn');
    
    const updateTimer = () => {
        if (!gameState.cooldownEnd) return;
        
        const now = Date.now();
        const timeLeft = gameState.cooldownEnd - now;
        
        if (timeLeft <= 0) {
            // Кулдаун закончился
            gameState.canSpin = true;
            gameState.cooldownEnd = null;
            
            cooldownInfo.style.display = 'none';
            spinBtn.disabled = false;
            autoSpinBtn.disabled = gameState.balance < gameState.spinCost * WHEEL_CONFIG.AUTO_SPIN_COUNT;
            
            // Обновляем кнопку
            updateSpinButtonState();
            
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
            gameState.canSpin = true;
            gameState.cooldownEnd = null;
            updateSpinButtonState();
        }
    }
}

// ОБНОВЛЕНИЕ UI
function updateUI() {
    // Обновляем баланс
    document.getElementById('wheel-balance').textContent = gameState.balance;
    
    // Обновляем статистику
    document.getElementById('total-spins').textContent = casinoData.total_spins || 0;
    document.getElementById('total-won').textContent = casinoData.total_won || 0;
    document.getElementById('best-win').textContent = casinoData.best_win || 0;
    
    // Обновляем кнопку вращения
    updateSpinButtonState();
    
    // Обновляем последние выигрыши
    updateRecentWinsDisplay();
    
    // Обновляем историю вращений
    updateSpinHistoryDisplay();
    
    // Обновляем кнопку авто-вращения
    const autoSpinBtn = document.getElementById('auto-spin-btn');
    const autoSpinCost = gameState.spinCost * WHEEL_CONFIG.AUTO_SPIN_COUNT;
    autoSpinBtn.disabled = gameState.balance < autoSpinCost || !gameState.canSpin;
    autoSpinBtn.textContent = `🔄 Авто-кручение (${WHEEL_CONFIG.AUTO_SPIN_COUNT}x) - ${autoSpinCost} очков`;
}

// ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПКИ ВРАЩЕНИЯ
function updateSpinButtonState() {
    const spinBtn = document.getElementById('spin-btn');
    const autoSpinBtn = document.getElementById('auto-spin-btn');
    
    if (gameState.isSpinning) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.spin-text').innerHTML = 'Колесо крутится...';
    } else if (!gameState.canSpin) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.spin-text').innerHTML = 'Подождите...';
    } else if (gameState.balance < gameState.spinCost) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.spin-text').innerHTML = `Недостаточно очков`;
    } else {
        spinBtn.disabled = false;
        spinBtn.querySelector('.spin-text').innerHTML = `Крутить за <span id="spin-cost">${gameState.spinCost}</span> очков`;
    }
    
    // Обновляем кнопку авто-вращения
    const autoSpinCost = gameState.spinCost * WHEEL_CONFIG.AUTO_SPIN_COUNT;
    autoSpinBtn.disabled = gameState.balance < autoSpinCost || !gameState.canSpin || gameState.isSpinning;
}

// ОБНОВЛЕНИЕ ПОСЛЕДНИХ ВЫИГРЫШЕЙ
function updateRecentWins(sector, winAmount, isWin) {
    if (!isWin || winAmount <= 0) return;
    
    // Добавляем новый выигрыш
    const winRecord = {
        timestamp: new Date().toISOString(),
        multiplier: sector.multiplier,
        amount: winAmount,
        sector: sector.name,
        class: sector.class
    };
    
    gameState.recentWins.unshift(winRecord);
    
    // Ограничиваем количество выигрышей
    if (gameState.recentWins.length > 10) {
        gameState.recentWins = gameState.recentWins.slice(0, 10);
    }
    
    // Обновляем отображение
    updateRecentWinsDisplay();
}

// ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ПОСЛЕДНИХ ВЫИГРЫШЕЙ
function updateRecentWinsDisplay() {
    const winsList = document.getElementById('recent-wins');
    
    if (gameState.recentWins.length === 0) {
        winsList.innerHTML = `
            <div class="empty-wins">
                <div class="empty-icon">🎲</div>
                <p>Еще нет сыгранных игр</p>
                <small>Сыграйте первую игру!</small>
            </div>
        `;
        return;
    }
    
    winsList.innerHTML = gameState.recentWins.map(win => {
        const date = new Date(win.timestamp);
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="win-item ${win.class}">
                <div class="win-info">
                    <div class="win-time">${time}</div>
                    <div class="win-sector">${win.sector}</div>
                </div>
                <div class="win-multiplier">×${win.multiplier}</div>
                <div class="win-amount">+${win.amount}</div>
            </div>
        `;
    }).join('');
}

// ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ИСТОРИИ ВРАЩЕНИЙ
function updateSpinHistoryDisplay() {
    const historyList = document.getElementById('spin-history');
    
    if (gameState.spinHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">📭</div>
                <p>История вращений пуста</p>
                <small>Сделайте первое вращение!</small>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = gameState.spinHistory.map(spin => {
        const date = new Date(spin.timestamp);
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isWin = spin.is_win;
        const resultClass = isWin ? 'win' : 'loss';
        
        return `
            <div class="spin-history-item ${resultClass}">
                <div class="spin-info">
                    <div class="spin-time">${time}</div>
                    <div class="spin-result">${spin.sector_name}</div>
                </div>
                <div class="spin-multiplier">×${spin.multiplier}</div>
                <div class="spin-win-amount">${isWin ? '+' : ''}${spin.win_amount || 0}</div>
            </div>
        `;
    }).join('');
}

// ПОКАЗ МОДАЛЬНОГО ОКНА С РЕЗУЛЬТАТОМ
function showWheelResultModal(sector, winAmount, isWin) {
    const modal = document.getElementById('wheel-result-modal');
    const confetti = document.getElementById('wheel-confetti');
    
    // Настраиваем заголовок
    document.getElementById('wheel-modal-title').textContent = isWin ? '🎉 Вы выиграли!' : '🎡 Результат';
    document.getElementById('wheel-modal-subtitle').textContent = isWin ? 'Поздравляем!' : 'Колесо остановилось!';
    
    // Настраиваем сектор
    document.getElementById('modal-sector-color').style.background = sector.color;
    document.getElementById('modal-sector-name').textContent = sector.name;
    document.getElementById('modal-sector-multiplier').textContent = `×${sector.multiplier}`;
    
    // Заполняем детали
    document.getElementById('modal-spin-cost').textContent = gameState.spinCost;
    document.getElementById('modal-multiplier').textContent = `×${sector.multiplier}`;
    document.getElementById('modal-probability').textContent = `${sector.probability}%`;
    
    // Настраиваем сумму
    const winLabel = document.getElementById('modal-win-label');
    const winAmountElement = document.getElementById('modal-win-amount');
    
    if (isWin && winAmount > 0) {
        winLabel.textContent = 'Вы выиграли:';
        winAmountElement.textContent = `+${winAmount}`;
        winAmountElement.style.color = '#00ff00';
        
        // Показываем конфетти для больших выигрышей
        if (sector.multiplier >= 2) {
            confetti.style.display = 'block';
            createWheelConfetti(sector.color);
        } else {
            confetti.style.display = 'none';
        }
    } else if (sector.multiplier === 0) {
        winLabel.textContent = 'Вы проиграли:';
        winAmountElement.textContent = `-${gameState.spinCost}`;
        winAmountElement.style.color = '#ff0000';
        confetti.style.display = 'none';
    } else {
        winLabel.textContent = 'Ваш результат:';
        winAmountElement.textContent = `-${Math.floor(gameState.spinCost - winAmount)}`;
        winAmountElement.style.color = '#ff9900';
        confetti.style.display = 'none';
    }
    
    // Добавляем сообщение
    const message = document.getElementById('wheel-modal-message');
    if (sector.multiplier >= 5) {
        message.textContent = 'Невероятно! Вы сорвали джекпот! 🎉';
    } else if (sector.multiplier >= 3) {
        message.textContent = 'Потрясающе! Огромный выигрыш! ✨';
    } else if (sector.multiplier >= 1.5) {
        message.textContent = 'Отличный результат! Так держать! 👍';
    } else if (sector.multiplier > 0) {
        message.textContent = 'Хорошая игра! Возвращайтесь за новыми победами! 🎯';
    } else {
        const messages = [
            'Не расстраивайтесь! Удача обязательно улыбнется!',
            'Повезет в следующий раз!',
            'Попробуйте еще раз - колесо фортуны переменчиво!'
        ];
        message.textContent = messages[Math.floor(Math.random() * messages.length)];
    }
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Настраиваем обработчики закрытия
    document.getElementById('close-wheel-result').onclick = function() {
        closeWheelResultModal();
    };
    
    document.getElementById('spin-again').onclick = function() {
        closeWheelResultModal();
        // Запускаем новое вращение через небольшую паузу
        setTimeout(() => {
            if (gameState.canSpin && gameState.balance >= gameState.spinCost) {
                spinWheel();
            }
        }, 500);
    };
}

// СОЗДАНИЕ КОНФЕТТИ ДЛЯ ВЫИГРЫША
function createWheelConfetti(color) {
    const container = document.getElementById('wheel-confetti');
    container.innerHTML = '';
    
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: ${Math.random() * 12 + 8}px;
            height: ${Math.random() * 12 + 8}px;
            background: ${color};
            left: ${Math.random() * 100}%;
            top: -30px;
            opacity: 0;
            animation: confettiFall 4s ease-in-out ${Math.random() * 3}s;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            transform: rotate(${Math.random() * 360}deg);
        `;
        
        container.appendChild(confetti);
    }
}

// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
function closeWheelResultModal() {
    const modal = document.getElementById('wheel-result-modal');
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
        
        // Скрываем конфетти
        document.getElementById('wheel-confetti').style.display = 'none';
        document.getElementById('wheel-confetti').innerHTML = '';
        
    }, 300);
}

// АВТО-ВРАЩЕНИЕ
async function autoSpin() {
    if (gameState.isAutoSpinning) return;
    
    const autoSpinCount = WHEEL_CONFIG.AUTO_SPIN_COUNT;
    const totalCost = gameState.spinCost * autoSpinCount;
    
    if (gameState.balance < totalCost) {
        showError(`Недостаточно очков для ${autoSpinCount} вращений. Нужно ${totalCost} очков`);
        return;
    }
    
    if (!gameState.canSpin) {
        showError('Подождите перед началом авто-вращений');
        return;
    }
    
    gameState.isAutoSpinning = true;
    gameState.autoSpinCount = autoSpinCount;
    
    const autoSpinBtn = document.getElementById('auto-spin-btn');
    autoSpinBtn.disabled = true;
    autoSpinBtn.textContent = `Авто-кручение: ${autoSpinCount}...`;
    
    // Выполняем вращения одно за другим
    for (let i = 0; i < autoSpinCount; i++) {
        if (gameState.balance < gameState.spinCost) {
            showError('Недостаточно очков для продолжения авто-вращений');
            break;
        }
        
        autoSpinBtn.textContent = `Авто-кручение: ${autoSpinCount - i}...`;
        
        try {
            await spinWheel();
            
            // Ждем между вращениями
            if (i < autoSpinCount - 1) {
                await new Promise(resolve => setTimeout(resolve, WHEEL_CONFIG.COOLDOWN + 1000));
            }
        } catch (error) {
            console.error('❌ Ошибка авто-вращения:', error);
            break;
        }
    }
    
    gameState.isAutoSpinning = false;
    gameState.autoSpinCount = 0;
    
    autoSpinBtn.disabled = gameState.balance < totalCost || !gameState.canSpin;
    autoSpinBtn.textContent = `🔄 Авто-кручение (${autoSpinCount}x) - ${totalCost} очков`;
    
    showNotification(`Авто-вращения завершены! Сыграно ${autoSpinCount} игр`, 'success');
}

// УДВОЕНИЕ СТАВКИ
function doubleSpinCost() {
    if (gameState.isSpinning || gameState.isAutoSpinning) return;
    
    const newCost = gameState.spinCost * 2;
    
    if (newCost > 500) {
        showError('Максимальная ставка - 500 очков');
        return;
    }
    
    if (gameState.balance < newCost) {
        showError('Недостаточно очков для удвоения ставки');
        return;
    }
    
    gameState.spinCost = newCost;
    
    // Обновляем UI
    document.getElementById('spin-cost').textContent = gameState.spinCost;
    updateUI();
    
    showNotification(`Ставка увеличена до ${newCost} очков`, 'success');
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Кнопка вращения
    const spinBtn = document.getElementById('spin-btn');
    spinBtn.addEventListener('click', spinWheel);
    
    // Кнопка авто-вращения
    const autoSpinBtn = document.getElementById('auto-spin-btn');
    autoSpinBtn.addEventListener('click', autoSpin);
    
    // Кнопка удвоения ставки
    const doubleSpinBtn = document.getElementById('double-spin-btn');
    doubleSpinBtn.addEventListener('click', doubleSpinCost);
    
    // Обновление UI при изменении баланса
    const updateBalance = () => {
        updateUI();
    };
    
    // Подписываемся на обновления баланса в реальном времени
    database.ref('holiday_points/' + userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            pointsData = snapshot.val();
            gameState.balance = pointsData.total_points || 0;
            updateBalance();
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

// Добавляем CSS для конфетти
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(-30px) rotate(0deg) scale(1);
            opacity: 1;
        }
        50% {
            opacity: 1;
        }
        100% {
            transform: translateY(600px) rotate(720deg) scale(0);
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
