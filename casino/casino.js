// casino.js - логика главной страницы казино

let userId = null;
let userNickname = null;
let casinoData = null;
let pointsData = null;

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
            setupRealtimeUpdates();
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
        showError('Для доступа к казино необходимо войти в аккаунт');
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
        // Загружаем данные казино
        const casinoSnapshot = await database.ref('casino/' + userId).once('value');
        
        if (casinoSnapshot.exists()) {
            casinoData = casinoSnapshot.val();
            console.log('✅ Данные казино загружены:', casinoData);
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
            console.log('✅ Новая запись казино создана');
        }
        
        // Загружаем баланс очков
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnapshot.exists()) {
            pointsData = pointsSnapshot.val();
            updateBalance();
        } else {
            pointsData = null;
            document.getElementById('user-balance').textContent = '0';
            showNotification('У вас нет новогодних очков. Получите их в разделе "Новогодние очки"', 'warning');
        }
        
        // Обновляем UI
        updateCasinoUI();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных');
    }
}

// ПОДПИСКА НА ОБНОВЛЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ
function setupRealtimeUpdates() {
    // Обновление баланса очков
    database.ref('holiday_points/' + userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            pointsData = snapshot.val();
            updateBalance();
        }
    });
    
    // Обновление данных казино
    database.ref('casino/' + userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            casinoData = snapshot.val();
            updateCasinoUI();
        }
    });
}

// ОБНОВЛЕНИЕ БАЛАНСА
function updateBalance() {
    if (pointsData) {
        const balance = pointsData.available_points || pointsData.total_points || 0;
        document.getElementById('user-balance').textContent = balance;
    } else {
        document.getElementById('user-balance').textContent = '0';
    }
}

// ОБНОВЛЕНИЕ UI КАЗИНО
function updateCasinoUI() {
    if (!casinoData) return;
    
    // Обновляем статистику
    document.getElementById('total-bets').textContent = casinoData.total_bets || 0;
    document.getElementById('total-won').textContent = casinoData.total_won || 0;
    
    // Рассчитываем процент побед
    const totalBets = casinoData.total_bets || 0;
    const wins = casinoData.total_won || 0;
    const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
    document.getElementById('win-rate').textContent = winRate + '%';
    
    // Обновляем историю ставок
    updateBetHistory();
}

// ОБНОВЛЕНИЕ ИСТОРИИ СТАВОК
function updateBetHistory() {
    const historyList = document.getElementById('bet-history');
    const bets = casinoData.bet_history || [];
    
    if (bets.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">📭</div>
                <p>История ставок пуста</p>
                <small>Сделайте первую ставку!</small>
            </div>
        `;
        return;
    }
    
    // Показываем последние 10 ставок
    const recentBets = bets.slice(0, 10);
    
    historyList.innerHTML = recentBets.map(bet => {
        const date = new Date(bet.timestamp);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isWin = bet.result === 'win';
        const resultClass = isWin ? 'win' : 'loss';
        const resultText = isWin ? `+${bet.win_amount}` : `-${bet.bet_amount}`;
        const resultColor = isWin ? 'result-win' : 'result-loss';
        
        return `
            <div class="bet-item ${resultClass}">
                <div class="bet-info">
                    <div class="bet-game">${bet.game}</div>
                    <div class="bet-details">
                        ${bet.details || ''} • ${formattedDate}
                    </div>
                </div>
                <div class="bet-amount">${bet.bet_amount}</div>
                <div class="bet-result">
                    <div class="${resultColor}">${resultText}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ОБНОВЛЕНИЕ БАЛАНСА
async function refreshBalance() {
    try {
        const pointsSnapshot = await database.ref('holiday_points/' + userId).once('value');
        if (pointsSnapshot.exists()) {
            pointsData = pointsSnapshot.val();
            updateBalance();
            showNotification('Баланс обновлен!', 'success');
        }
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        showError('Ошибка обновления баланса');
    }
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Кнопка обновления баланса
    const refreshBtn = document.getElementById('refresh-balance');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '🔄 Обновление...';
            
            await refreshBalance();
            
            this.disabled = false;
            this.innerHTML = '🔄 Обновить баланс';
            
            // Анимация
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }
    
    // Предупреждение для неактивных игр
    document.querySelectorAll('.play-btn.disabled').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Эта игра будет доступна в ближайшее время!', 'info');
        });
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

// Добавляем анимацию
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
