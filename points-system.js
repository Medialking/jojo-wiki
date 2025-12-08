// Точка входа - проверяем авторизацию при загрузке
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// Проверка авторизации
function checkAuth() {
    const username = localStorage.getItem('jojoland_username');
    const userData = JSON.parse(localStorage.getItem('jojoland_userdata') || '{}');
    
    if (!username || !userData.username) {
        // Показываем окно авторизации
        document.getElementById('authModal').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
    } else {
        // Показываем основной контент
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('currentUser').textContent = username;
        
        // Загружаем данные пользователя
        loadUserData();
        updateLeaderboardRank();
        checkDailyReward();
    }
}

// Сохранение имени пользователя
function saveUsername() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Пожалуйста, введите ваш ник Minecraft');
        return;
    }
    
    if (username.length < 3 || username.length > 16) {
        alert('Ник должен быть от 3 до 16 символов');
        return;
    }
    
    // Создаем данные пользователя
    const userData = {
        username: username,
        points: 0,
        lastClaim: null,
        totalClaims: 0,
        daysActive: 0,
        joinDate: new Date().toISOString()
    };
    
    // Сохраняем в localStorage
    localStorage.setItem('jojoland_username', username);
    localStorage.setItem('jojoland_userdata', JSON.stringify(userData));
    
    // Обновляем лидерборд
    updateLeaderboard();
    
    // Закрываем модальное окно и показываем контент
    checkAuth();
}

// Загрузка данных пользователя
function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('jojoland_userdata') || '{}');
    const username = localStorage.getItem('jojoland_username');
    
    if (userData && username) {
        // Обновляем отображение
        document.getElementById('userPoints').textContent = userData.points || 0;
        document.getElementById('statsPoints').textContent = userData.points || 0;
        document.getElementById('statsDays').textContent = userData.daysActive || 0;
        
        // Обновляем имя в интерфейсе
        document.getElementById('currentUser').textContent = username;
    }
}

// Проверка доступности ежедневной награды
function checkDailyReward() {
    const userData = JSON.parse(localStorage.getItem('jojoland_userdata') || '{}');
    const now = new Date();
    
    if (!userData.lastClaim) {
        // Первый заход - награда доступна
        showRewardAvailable();
        return;
    }
    
    const lastClaim = new Date(userData.lastClaim);
    const hoursDiff = (now - lastClaim) / (1000 * 60 * 60);
    
    if (hoursDiff >= 24) {
        // Прошло более 24 часов
        showRewardAvailable();
    } else {
        // Еще не прошло 24 часа
        showCountdown(lastClaim);
    }
}

// Показать, что награда доступна
function showRewardAvailable() {
    document.getElementById('dailyReward').style.display = 'flex';
    document.getElementById('timerContainer').style.display = 'none';
    document.getElementById('rewardStatus').textContent = 'Доступно для получения!';
    document.getElementById('claimBtn').disabled = false;
    document.getElementById('claimBtn').textContent = 'Забрать';
    document.getElementById('claimBtn').style.opacity = '1';
}

// Показать таймер обратного отсчета
function showCountdown(lastClaim) {
    document.getElementById('dailyReward').style.display = 'none';
    document.getElementById('timerContainer').style.display = 'flex';
    
    // Устанавливаем время следующей награды (lastClaim + 24 часа)
    const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
    startCountdown(nextClaim);
}

// Запуск таймера обратного отсчета
function startCountdown(targetDate) {
    function updateTimer() {
        const now = new Date();
        const diff = targetDate - now;
        
        if (diff <= 0) {
            // Время вышло
            clearInterval(timerInterval);
            showRewardAvailable();
            return;
        }
        
        // Вычисляем оставшееся время
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Обновляем отображение
        document.getElementById('countdownTimer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Обновляем статистику
        document.getElementById('statsNext').textContent = `${hours}ч ${minutes}м`;
    }
    
    // Обновляем сразу и запускаем интервал
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
}

// Получение ежедневной награды
function claimDailyReward() {
    const userData = JSON.parse(localStorage.getItem('jojoland_userdata') || '{}');
    const now = new Date();
    
    // Проверяем, прошло ли 24 часа с последнего получения
    if (userData.lastClaim) {
        const lastClaim = new Date(userData.lastClaim);
        const hoursDiff = (now - lastClaim) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            alert('Вы уже получали награду сегодня. Приходите через ' + Math.floor(24 - hoursDiff) + ' часов!');
            return;
        }
    }
    
    // Генерируем случайное количество очков (1-10)
    const pointsEarned = Math.floor(Math.random() * 10) + 1;
    
    // Обновляем данные пользователя
    userData.points = (userData.points || 0) + pointsEarned;
    userData.lastClaim = now.toISOString();
    userData.totalClaims = (userData.totalClaims || 0) + 1;
    userData.daysActive = (userData.daysActive || 0) + 1;
    
    // Сохраняем обновленные данные
    localStorage.setItem('jojoland_userdata', JSON.stringify(userData));
    
    // Обновляем лидерборд
    updateLeaderboard();
    
    // Показываем анимацию получения
    showRewardAnimation(pointsEarned);
    
    // Обновляем интерфейс
    loadUserData();
    checkDailyReward();
    updateLeaderboardRank();
    
    // Показываем сообщение об успехе
    setTimeout(() => {
        alert(`🎉 Поздравляем! Вы получили ${pointsEarned} новогодних очков!\nТеперь у вас ${userData.points} очков.`);
    }, 1000);
}

// Анимация получения награды
function showRewardAnimation(points) {
    const claimBtn = document.getElementById('claimBtn');
    const originalText = claimBtn.textContent;
    
    claimBtn.innerHTML = `🎁 +${points}`;
    claimBtn.style.background = 'linear-gradient(135deg, #00ff00, #00cc00)';
    claimBtn.disabled = true;
    
    setTimeout(() => {
        claimBtn.textContent = 'Получено!';
        claimBtn.style.opacity = '0.7';
    }, 1500);
}

// Обновление лидерборда
function updateLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('jojoland_leaderboard') || '[]');
    const userData = JSON.parse(localStorage.getItem('jojoland_userdata') || '{}');
    const username = localStorage.getItem('jojoland_username');
    
    if (!username || !userData.username) return;
    
    // Ищем пользователя в лидерборде
    const existingUserIndex = leaderboard.findIndex(user => user.username === username);
    
    if (existingUserIndex !== -1) {
        // Обновляем существующего пользователя
        leaderboard[existingUserIndex] = {
            username: username,
            points: userData.points || 0,
            lastClaim: userData.lastClaim,
            daysActive: userData.daysActive || 0
        };
    } else {
        // Добавляем нового пользователя
        leaderboard.push({
            username: username,
            points: userData.points || 0,
            lastClaim: userData.lastClaim,
            daysActive: userData.daysActive || 0
        });
    }
    
    // Сортируем по количеству очков (по убыванию)
    leaderboard.sort((a, b) => b.points - a.points);
    
    // Сохраняем обновленный лидерборд
    localStorage.setItem('jojoland_leaderboard', JSON.stringify(leaderboard));
}

// Обновление ранга пользователя
function updateLeaderboardRank() {
    const leaderboard = JSON.parse(localStorage.getItem('jojoland_leaderboard') || '[]');
    const username = localStorage.getItem('jojoland_username');
    
    if (!username || leaderboard.length === 0) {
        document.getElementById('userRank').textContent = '-';
        document.getElementById('statsRank').textContent = '-';
        return;
    }
    
    // Находим позицию пользователя
    const userIndex = leaderboard.findIndex(user => user.username === username);
    
    if (userIndex !== -1) {
        const rank = userIndex + 1;
        document.getElementById('userRank').textContent = `#${rank}`;
        document.getElementById('statsRank').textContent = `#${rank}`;
    } else {
        document.getElementById('userRank').textContent = '-';
        document.getElementById('statsRank').textContent = '-';
    }
}

// Выход/смена пользователя
function logout() {
    if (confirm('Вы уверены, что хотите сменить игрока? Ваши очки будут сохранены.')) {
        localStorage.removeItem('jojoland_username');
        checkAuth();
    }
}

// Автоматическая проверка при загрузке страницы — безопасно, не перезаписывает другие onload
window.addEventListener('load', function() {
    setTimeout(() => {
        if (localStorage.getItem('jojoland_username')) {
            const w = document.getElementById('pointsWidget');
            if (w) w.style.display = 'block';
        }
    }, 3000);
});
