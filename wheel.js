// Используем ту же конфигурацию Firebase
if (!firebase.apps.length) {
    const firebaseConfig = {
        apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
        authDomain: "jojoland-chat.firebasestorage.app",
        databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
        projectId: "jojoland-chat",
        storageBucket: "jojoland-chat.firebasestorage.app",
        messagingSenderId: "602788305122",
        appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
    };
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();

// Глобальные переменные
let userId = null;
let userNickname = null;
let wheelData = null;
let isSpinning = false;

// Настройки колеса
const WHEEL_SEGMENTS = 8;
const PRIZES = [
    { amount: 50, label: "ДЖЕКПОТ", chance: 0.05, color: "#ffd700" },
    { amount: 5, label: "Минимальный", chance: 0.10, color: "#ff4444" },
    { amount: 20, label: "Средний", chance: 0.15, color: "#ff8844" },
    { amount: 10, label: "Малый", chance: 0.20, color: "#ffcc44" },
    { amount: 30, label: "Большой", chance: 0.15, color: "#88ff44" },
    { amount: 15, label: "Средний", chance: 0.15, color: "#44ff88" },
    { amount: 40, label: "Огромный", chance: 0.10, color: "#44ccff" },
    { amount: 25, label: "Хороший", chance: 0.10, color: "#8844ff" }
];

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await TimeManager.syncWithServer(); // Синхронизируем время
            await loadWheelData();
            createWheelSegments();
            createPrizesGrid();
            setupEventListeners();
            updateWheelTimer();
            updatePlayerStats();
            
            // Подписываемся на обновления в реальном времени
            setupRealtimeUpdates();
        }
    }, 400);
};

// СОЗДАНИЕ ФОНОВЫХ ЧАСТИЦ
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
        showError('Для участия в колесе фортуны необходимо войти в аккаунт');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return false;
    }
    
    return true;
}

// ЗАГРУЗКА ДАННЫХ КОЛЕСА
async function loadWheelData() {
    try {
        const snapshot = await database.ref('holiday_points/' + userId).once('value');
        
        if (snapshot.exists()) {
            wheelData = snapshot.val();
            console.log('✅ Данные колеса загружены:', wheelData);
        } else {
            // Создаем новую запись с улучшенной структурой
            wheelData = {
                total_points: 0,
                available_points: 0,
                spent_points: 0,
                daily_gifts: {},
                wheel_spins: {},
                rewards_history: [],
                last_actions: {
                    daily_gift: null,
                    wheel_spin: null
                },
                current_streak: 0,
                max_streak: 0,
                max_win: 0
            };
            
            await database.ref('holiday_points/' + userId).set(wheelData);
            console.log('✅ Новая запись колеса создана');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных колеса:', error);
        showError('Ошибка загрузки данных');
        wheelData = null;
    }
}

// СОЗДАНИЕ СЕГМЕНТОВ КОЛЕСА
function createWheelSegments() {
    const wheel = document.getElementById('wheel');
    wheel.innerHTML = '';
    
    const segmentAngle = 360 / WHEEL_SEGMENTS;
    
    for (let i = 0; i < WHEEL_SEGMENTS; i++) {
        const segment = document.createElement('div');
        segment.className = 'wheel-segment';
        
        const prize = PRIZES[i];
        const isJackpot = prize.amount === 50;
        
        segment.style.cssText = `
            --i: ${i};
            --segment-color: ${prize.color};
            transform: rotate(${segmentAngle * i}deg);
        `;
        
        if (isJackpot) {
            segment.classList.add('jackpot');
        }
        
        segment.innerHTML = `<span>${prize.amount}</span>`;
        wheel.appendChild(segment);
    }
}

// СОЗДАНИЕ СЕТКИ ПРИЗОВ
function createPrizesGrid() {
    const grid = document.getElementById('prizes-grid');
    grid.innerHTML = '';
    
    PRIZES.forEach((prize, index) => {
        const isJackpot = prize.amount === 50;
        
        const prizeElement = document.createElement('div');
        prizeElement.className = `prize-item ${isJackpot ? 'jackpot' : ''}`;
        
        prizeElement.innerHTML = `
            <div class="prize-amount">${prize.amount}</div>
            <div class="prize-info">
                <div class="prize-label">${prize.label}</div>
                <div class="prize-chance">Шанс: ${Math.round(prize.chance * 100)}%</div>
            </div>
        `;
        
        grid.appendChild(prizeElement);
    });
}

// ПОДПИСКА НА ОБНОВЛЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ
function setupRealtimeUpdates() {
    database.ref('holiday_points/' + userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const newData = snapshot.val();
            
            // Обновляем данные и интерфейс
            wheelData = newData;
            updatePlayerStats();
        }
    });
}

// ПРОВЕРКА, МОЖНО ЛИ КРУТИТЬ КОЛЕСО
function canSpinWheel() {
    console.log('🎡 Проверка возможности вращения колеса');
    
    // Проверка 1: по дате последнего вращения
    const lastSpinTime = wheelData?.last_actions?.wheel_spin;
    const canByTime = TimeManager.canPerformAction(lastSpinTime);
    
    // Проверка 2: по данным сегодняшнего дня
    const todayKey = TimeManager.getTodayKey();
    const hasToday = wheelData?.wheel_spins && wheelData.wheel_spins[todayKey];
    
    console.log(`🎡 Результаты проверки: по времени ${canByTime}, сегодня вращал ${hasToday}`);
    
    return canByTime && !hasToday;
}

// ПОЛУЧЕНИЕ ВРЕМЕНИ ДО СЛЕДУЮЩЕГО ВРАЩЕНИЯ
function getTimeToNextSpin() {
    const lastSpinTime = wheelData?.last_actions?.wheel_spin;
    return TimeManager.getTimeToNextAction(lastSpinTime);
}

// ВРАЩЕНИЕ КОЛЕСА
async function spinWheel() {
    console.log('🎡 Начало вращения колеса');
    
    if (isSpinning) {
        console.log('⚠️ Колесо уже крутится');
        return;
    }
    
    // Проверяем, можно ли крутить
    if (!canSpinWheel()) {
        const timeLeft = getTimeToNextSpin();
        showError('Вы уже крутили колесо сегодня. Возвращайтесь через ' + TimeManager.formatTime(timeLeft));
        return;
    }
    
    try {
        isSpinning = true;
        const spinBtn = document.getElementById('spin-btn');
        spinBtn.disabled = true;
        spinBtn.innerHTML = `
            <div class="spin-btn-content">
                <span class="spin-icon">🌀</span>
                <span class="spin-text">КРУТИТСЯ...</span>
            </div>
            <div class="spin-timer">
                <span class="timer-icon">⏰</span>
                <span class="timer-text">Удачи!</span>
            </div>
        `;
        
        // Определяем выигрышный сегмент (взвешенная случайность)
        const prizeIndex = getWeightedPrizeIndex();
        const prize = PRIZES[prizeIndex];
        
        console.log(`🎡 Выигрышный приз: ${prize.amount} очков (индекс: ${prizeIndex})`);
        
        // Рассчитываем угол вращения
        const fullSpins = 5; // 5 полных оборотов
        const segmentAngle = 360 / WHEEL_SEGMENTS;
        const targetAngle = (fullSpins * 360) + (prizeIndex * segmentAngle) + Math.random() * segmentAngle - segmentAngle/2;
        
        // Анимация вращения
        const wheel = document.getElementById('wheel');
        wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.21, 0.99)';
        wheel.style.transform = `rotate(${targetAngle}deg)`;
        
        // Ждем окончания анимации
        await new Promise(resolve => setTimeout(resolve, 4500));
        
        // Обновляем данные
        await processWheelWin(prize, prizeIndex);
        
        // Сбрасываем анимацию
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${targetAngle % 360}deg)`;
        
        // Небольшая задержка перед показом модального окна
        setTimeout(() => {
            showWinModal(prize);
        }, 500);
        
    } catch (error) {
        console.error('❌ Ошибка вращения колеса:', error);
        showError('Ошибка при вращении колеса');
    } finally {
        isSpinning = false;
        updateWheelButton();
    }
}

// ВЗВЕШЕННЫЙ ВЫБОР ПРИЗА
function getWeightedPrizeIndex() {
    const weights = PRIZES.map(p => p.chance);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return i;
        }
    }
    
    return PRIZES.length - 1;
}

// ОБРАБОТКА ВЫИГРЫША
async function processWheelWin(prize, prizeIndex) {
    try {
        // Текущее время с серверной синхронизацией
        const now = new Date(TimeManager.getCurrentTime());
        const todayKey = TimeManager.getTodayKey();
        
        // Проверяем, не было ли сегодня вращения
        if (wheelData.wheel_spins && wheelData.wheel_spins[todayKey]) {
            throw new Error('Сегодня уже было вращение колеса');
        }
        
        // Обновляем максимальный выигрыш
        const maxWin = Math.max(prize.amount, wheelData.max_win || 0);
        
        // Создаем запись о награде
        const reward = {
            date: now.toISOString(),
            points: prize.amount,
            type: 'wheel_spin',
            streak: wheelData.current_streak || 0,
            prize_index: prizeIndex,
            prize_label: prize.label
        };
        
        // Обновляем данные с новой структурой
        const newWheelData = {
            ...wheelData,
            total_points: (wheelData.total_points || 0) + prize.amount,
            available_points: (wheelData.available_points || 0) + prize.amount,
            wheel_spins: {
                ...wheelData.wheel_spins,
                [todayKey]: {
                    points: prize.amount,
                    timestamp: now.toISOString(),
                    prize_label: prize.label
                }
            },
            rewards_history: [
                reward,
                ...(wheelData.rewards_history || [])
            ],
            last_actions: {
                ...wheelData.last_actions,
                wheel_spin: now.toISOString()
            },
            max_win: maxWin
        };
        
        // Сохраняем в Firebase
        await database.ref('holiday_points/' + userId).set(newWheelData);
        
        // Обновляем локальные данные
        wheelData = newWheelData;
        
        console.log(`✅ Вращение обработано: ${prize.amount} очков`);
        
    } catch (error) {
        console.error('❌ Ошибка обработки выигрыша:', error);
        throw error;
    }
}

// ОБНОВЛЕНИЕ КНОПКИ ВРАЩЕНИЯ
function updateWheelButton() {
    const spinBtn = document.getElementById('spin-btn');
    const timerText = document.getElementById('timer-text');
    
    const timeToNext = getTimeToNextSpin();
    
    if (timeToNext > 0 || TimeManager.wasActionTodayInObject(wheelData?.wheel_spins)) {
        // Нельзя крутить
        spinBtn.disabled = true;
        spinBtn.innerHTML = `
            <div class="spin-btn-content">
                <span class="spin-icon">⏰</span>
                <span class="spin-text">УЖЕ КРУТИЛИ</span>
            </div>
            <div class="spin-timer">
                <span class="timer-icon">⏰</span>
                <span class="timer-text">Доступно через: ${TimeManager.formatTime(timeToNext)}</span>
            </div>
        `;
    } else {
        // Можно крутить
        spinBtn.disabled = false;
        spinBtn.innerHTML = `
            <div class="spin-btn-content">
                <span class="spin-icon">🎯</span>
                <span class="spin-text">КРУТИТЬ КОЛЕСО</span>
            </div>
            <div class="spin-timer">
                <span class="timer-icon">⏰</span>
                <span class="timer-text">Бесплатно!</span>
            </div>
        `;
    }
}

// ОБНОВЛЕНИЕ ТАЙМЕРА
function updateWheelTimer() {
    const updateTimer = () => {
        const timeToNext = getTimeToNextSpin();
        const timerText = document.getElementById('timer-text');
        
        if (timeToNext > 0) {
            timerText.textContent = `Доступно через: ${TimeManager.formatTime(timeToNext)}`;
        } else {
            timerText.textContent = 'Бесплатно!';
        }
    };
    
    // Обновляем сразу
    updateTimer();
    
    // Обновляем каждую секунду
    setInterval(updateTimer, 1000);
    
    // Обновляем кнопку
    updateWheelButton();
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ ИГРОКА
function updatePlayerStats() {
    if (!wheelData) return;
    
    document.getElementById('total-points').textContent = wheelData.total_points || 0;
    document.getElementById('spins-count').textContent = Object.keys(wheelData.wheel_spins || {}).length;
    document.getElementById('streak-days').textContent = `${wheelData.current_streak || 0} дн.`;
    document.getElementById('max-win').textContent = wheelData.max_win || 0;
    
    // Обновляем историю вращений
    updateHistoryList();
}

// ОБНОВЛЕНИЕ ИСТОРИИ ВРАЩЕНИЙ
function updateHistoryList() {
    const historyList = document.getElementById('history-list');
    const wheelSpins = wheelData.rewards_history?.filter(r => r.type === 'wheel_spin') || [];
    
    if (wheelSpins.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">🎡</div>
                <p>Вы еще не крутили колесо</p>
                <small>Сделайте первое вращение!</small>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = wheelSpins.slice(0, 10).map(spin => {
        const date = new Date(spin.date);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isJackpot = spin.points === 50;
        
        return `
            <div class="history-item">
                <div class="history-date">
                    <div>${formattedDate}</div>
                    <small>${time}</small>
                </div>
                <div class="history-info">
                    <div class="history-type">
                        ${isJackpot ? '🏆' : '🎡'} ${spin.prize_label || 'Вращение колеса'}
                    </div>
                    <div class="history-desc">${spin.prize_label || 'Колесо фортуны'}</div>
                </div>
                <div class="history-points">+${spin.points}</div>
            </div>
        `;
    }).join('');
}

// ПОКАЗ МОДАЛЬНОГО ОКНА ВЫИГРЫША
function showWinModal(prize) {
    const modal = document.getElementById('win-modal');
    
    // Устанавливаем значения
    document.getElementById('win-number').textContent = prize.amount;
    document.getElementById('win-total').textContent = wheelData.total_points || 0;
    document.getElementById('win-spins').textContent = Object.keys(wheelData.wheel_spins || {}).length + 1;
    
    // Устанавливаем сообщение в зависимости от приза
    let message = '';
    if (prize.amount === 50) {
        message = '🎉 ДЖЕКПОТ! ВЫ ВЫИГРАЛИ МАКСИМАЛЬНЫЙ ПРИЗ! 🎉';
    } else if (prize.amount >= 40) {
        message = '🔥 ОГРОМНЫЙ ВЫИГРЫШ! ВЫ СЕГОДНЯ ВЕЗУНЧИК!';
    } else if (prize.amount >= 30) {
        message = '🎯 БОЛЬШОЙ ВЫИГРЫШ! ПРОСТО ПОТРЯСАЮЩЕ!';
    } else if (prize.amount >= 20) {
        message = '⭐ ОТЛИЧНЫЙ РЕЗУЛЬТАТ! ТАК ДЕРЖАТЬ!';
    } else if (prize.amount >= 10) {
        message = '👍 ХОРОШАЯ ПОПЫТКА! ВОЗВРАЩАЙТЕСЬ ЗАВТРА!';
    } else {
        message = '🎁 НЕПЛОХО! СЛЕДУЮЩИЙ РАЗ ПОВЕЗЁТ БОЛЬШЕ!';
    }
    
    document.getElementById('win-message').textContent = message;
    
    // Создаем конфетти
    createConfetti(prize.amount === 50 ? 100 : 50);
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Закрытие модального окна
    document.getElementById('close-win').addEventListener('click', function() {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.opacity = '1';
        }, 300);
    });
}

// СОЗДАНИЕ КОНФЕТТИ
function createConfetti(count = 50) {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    
    const colors = ['#ff0000', '#ffff00', '#00ff00', '#0088ff', '#ff00ff', '#ff8800', '#00ffff'];
    
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Случайная позиция
        confetti.style.left = `${Math.random() * 100}%`;
        
        // Случайная задержка
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        
        // Случайный размер
        const size = Math.random() * 12 + 6;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        // Случайный цвет
        confetti.style.setProperty('--confetti-color', colors[Math.floor(Math.random() * colors.length)]);
        
        // Случайная форма
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        
        container.appendChild(confetti);
    }
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Вращение колеса
    document.getElementById('spin-btn').addEventListener('click', spinWheel);
    
    // Кнопка "Поделиться"
    document.getElementById('share-btn').addEventListener('click', function() {
        const shareText = `🎡 Я крутил колесо фортуны на сервере JojoLand и выиграл ${wheelData.total_points || 0} новогодних очков! Попробуй и ты: ${window.location.origin}/wheel.html`;
        
        if (navigator.share) {
            navigator.share({
                title: 'JojoLand Колесо фортуны',
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                showNotification('Текст скопирован в буфер обмена! Поделитесь с друзьями!', 'success');
            });
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
        background: ${type === 'success' ? 'rgba(0, 204, 102, 0.9)' : 'rgba(255, 68, 68, 0.9)'};
        border: 1px solid ${type === 'success' ? '#00cc66' : '#ff4444'};
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
        font-size: 14px;
    `;
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">
            ${type === 'success' ? '✅ Успешно!' : '⚠️ Ошибка'}
        </div>
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
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 68, 68, 0.9);
        border: 1px solid #ff4444;
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
    `;
    errorDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">⚠️ Ошибка</div>
        <div style="font-size: 14px;">${message}</div>
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 5000);
}

// Добавляем анимацию для уведомления
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
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
document.head.appendChild(notificationStyle);
[file content end]
