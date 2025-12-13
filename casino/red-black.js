// red-black.js - логика игры "Красное или Черное"

let userId = null;
let userNickname = null;
let pointsData = null;
let casinoData = null;

// Состояние игры
let gameState = {
    selectedColor: null,
    betAmount: 10,
    balance: 0,
    isSpinning: false,
    canBet: true,
    cooldownEnd: null,
    lastResults: []
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
            gameState.balance = pointsData.available_points || pointsData.total_points || 0;
        } else {
            showError('У вас нет новогодних очков. Получите их в разделе "Новогодние очки"');
            gameState.balance = 0;
        }
        
        // Загружаем данные казино
        const casinoSnapshot = await database.ref('casino/' + userId).once('value');
        if (casinoSnapshot.exists()) {
            casinoData = casinoSnapshot.val();
            
            // Загружаем последние результаты
            if (casinoData.bet_history) {
                const redBlackResults = casinoData.bet_history
                    .filter(bet => bet.game === 'red_black')
                    .slice(0, 20)
                    .map(bet => ({
                        color: bet.result_color,
                        win: bet.result === 'win'
                    }));
                
                gameState.lastResults = redBlackResults;
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
        
        console.log('✅ Данные игры загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных игры');
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
    console.log('🎲 Попытка сделать ставку');
    
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
        
        // Генерируем результат
        const result = generateResult();
        
        // Проверяем выигрыш
        const isWin = result === gameState.selectedColor;
        const winAmount = isWin ? Math.floor(gameState.betAmount * 1.5) : 0;
        const balanceChange = isWin ? winAmount : -gameState.betAmount;
        
        // Обновляем баланс
        await updatePointsBalance(balanceChange);
        
        // Записываем результат в историю
        await saveBetResult(result, isWin, winAmount);
        
        // Обновляем UI с результатом
        updateResultUI(result, isWin, winAmount);
        
        // Показываем модальное окно с результатом
        showResultModal(result, isWin, winAmount);
        
        // Обновляем последние результаты
        updateLastResults(result, isWin);
        
        // Устанавливаем кулдаун (5 секунд)
        setCooldown(5000);
        
        console.log(`✅ Ставка завершена: ${isWin ? 'Выигрыш' : 'Проигрыш'} ${winAmount || 0} очков`);
        
    } catch (error) {
        console.error('❌ Ошибка ставки:', error);
        showError('Ошибка при обработке ставки');
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

// ГЕНЕРАЦИЯ РЕЗУЛЬТАТА
function generateResult() {
    // Вероятность: 49% красное, 49% черное, 2% ноль (случайность)
    const random = Math.random();
    
    if (random < 0.49) {
        return 'red';
    } else if (random < 0.98) {
        return 'black';
    } else {
        // Ноль - автоматический проигрыш
        return Math.random() < 0.5 ? 'red' : 'black'; // Для простоты возвращаем случайный цвет
    }
}

// ОБНОВЛЕНИЕ БАЛАНСА ОЧКОВ
async function updatePointsBalance(change) {
    try {
        if (!pointsData) return;
        
        const newAvailable = (pointsData.available_points || pointsData.total_points || 0) + change;
        const newTotal = (pointsData.total_points || 0) + Math.max(0, change);
        
        // Обновляем локальные данные
        pointsData.available_points = newAvailable;
        pointsData.total_points = newTotal;
        
        // Сохраняем в Firebase
        await database.ref('holiday_points/' + userId).update({
            available_points: newAvailable,
            total_points: newTotal
        });
        
        // Обновляем состояние игры
        gameState.balance = newAvailable;
        
        console.log(`💰 Баланс обновлен: ${change > 0 ? '+' : ''}${change}`);
        
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
    document.getElementById('possible-win').textContent = Math.floor(gameState.betAmount * 1.5);
    
    // Обновляем кнопку ставки
    updateBetButtonState();
    
    // Обновляем последние результаты
    updateLastResultsDisplay();
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
        const messages = [
            'Не расстраивайтесь! Удача обязательно улыбнется!',
            'Повезет в следующий раз!',
            'Попробуйте еще раз - статистика на вашей стороне!'
        ];
        message.textContent = messages[Math.floor(Math.random() * messages.length)];
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

// ОБНОВЛЕНИЕ ПОСЛЕДНИХ РЕЗУЛЬТАТОВ
function updateLastResults(result, isWin) {
    // Добавляем новый результат
    gameState.lastResults.unshift({
        color: result,
        win: isWin
    });
    
    // Ограничиваем количество результатов
    if (gameState.lastResults.length > 20) {
        gameState.lastResults = gameState.lastResults.slice(0, 20);
    }
    
    // Обновляем отображение
    updateLastResultsDisplay();
}

// ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ПОСЛЕДНИХ РЕЗУЛЬТАТОВ
function updateLastResultsDisplay() {
    const resultsList = document.getElementById('results-list');
    
    if (gameState.lastResults.length === 0) {
        resultsList.innerHTML = '<div class="empty-results">Еще нет сыгранных игр</div>';
        return;
    }
    
    resultsList.innerHTML = gameState.lastResults.map((result, index) => {
        const chipClass = `result-chip ${result.color} ${result.win ? 'win' : 'loss'}`;
        const letter = result.color === 'red' ? 'К' : 'Ч';
        
        return `<div class="${chipClass}" title="${result.color === 'red' ? 'Красное' : 'Черное'} - ${result.win ? 'Выигрыш' : 'Проигрыш'}">${letter}</div>`;
    }).join('');
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
