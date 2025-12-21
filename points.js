const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

let userId = null;
let userNickname = null;
let pointsData = null;

window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuth()) {
            await TimeManager.syncWithServer();
            await loadPointsData();
            await updateUIWithTop();
            setupEventListeners();
            updateCountdown();
            updateDaysLeft();
            
            await checkReferralBonus();
            
            setupRealtimeUpdates();
        }
    }, 400);
};

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

function setupRealtimeUpdates() {
    database.ref('holiday_points/' + userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const newData = snapshot.val();
            
            pointsData = newData;
            updateUI();
        }
    });
}

async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!userId || !userNickname) {
        showError('Для участия в новогодней акции необходимо войти в аккаунт');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return false;
    }
    
    return true;
}

async function validateAndFixBalance() {
    try {
        const snapshot = await database.ref('holiday_points/' + userId).once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            if (data.total_points !== undefined) {
                const fixedTotal = Math.max(0, Math.round(data.total_points));
                
                if (fixedTotal !== data.total_points) {
                    await database.ref('holiday_points/' + userId).update({
                        total_points: fixedTotal
                    });
                    
                    console.log(`✅ Исправлен баланс: ${data.total_points} → ${fixedTotal}`);
                    
                    if (pointsData) {
                        pointsData.total_points = fixedTotal;
                    }
                }
            }
            
            const fieldsToFix = ['available_points', 'spent_points'];
            for (const field of fieldsToFix) {
                if (data[field] !== undefined) {
                    const fixedValue = Math.max(0, Math.round(data[field]));
                    
                    if (fixedValue !== data[field]) {
                        await database.ref('holiday_points/' + userId).update({
                            [field]: fixedValue
                        });
                        
                        console.log(`✅ Исправлено поле ${field}: ${data[field]} → ${fixedValue}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка проверки баланса:', error);
    }
}

async function loadPointsData() {
    try {
        await validateAndFixBalance();
        
        const snapshot = await database.ref('holiday_points/' + userId).once('value');
        
        if (snapshot.exists()) {
            pointsData = snapshot.val();
            console.log('✅ Данные очков загружены:', pointsData);
            
            if (pointsData.available_points !== undefined && pointsData.available_points !== null) {
                await migrateAvailablePointsToTotal();
            }
            
            if (pointsData.total_points !== undefined) {
                pointsData.total_points = Math.round(pointsData.total_points);
            }
        } else {
            const todayKey = TimeManager.getTodayKey();
            pointsData = {
                total_points: 0,
                spent_points: 0,
                daily_gifts: {},
                wheel_spins: {},
                rewards_history: [],
                last_actions: {
                    daily_gift: null,
                    wheel_spin: null
                },
                current_streak: 0,
                max_streak: 0
            };
            
            await database.ref('holiday_points/' + userId).set(pointsData);
            console.log('✅ Новая запись очков создана');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных очков:', error);
        showError('Ошибка загрузки данных');
        pointsData = null;
    }
}

async function migrateAvailablePointsToTotal() {
    try {
        const available = pointsData.available_points || 0;
        const total = pointsData.total_points || 0;
        
        const newTotal = Math.round(Math.max(available, total));
        
        await database.ref('holiday_points/' + userId).update({
            total_points: newTotal,
            available_points: null
        });
        
        pointsData.total_points = newTotal;
        delete pointsData.available_points;
        
        console.log(`✅ Миграция завершена: available_points(${available}) → total_points(${newTotal})`);
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
    }
}

async function checkReferralBonus() {
    try {
        console.log('🔍 Проверка реферальных бонусов для:', userId);
        
        const userSnapshot = await database.ref('users/' + userId).once('value');
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            
            if (userData.referral_bonus_received && !localStorage.getItem('referral_bonus_shown_' + userId)) {
                showNotification(
                    `🎁 Вы получили ${userData.referral_bonus_received} новогодних очков за регистрацию по реферальной ссылке!`,
                    'success'
                );
                localStorage.setItem('referral_bonus_shown_' + userId, 'true');
            }
        }
        
        const refSnapshot = await database.ref('referrals/' + userId).once('value');
        if (refSnapshot.exists()) {
            const refData = refSnapshot.val();
            
            if (refData.referrals_list && refData.referrals_list.length > 0) {
                const unshownRefs = refData.referrals_list.filter(ref => {
                    const storageKey = `ref_reward_shown_${userId}_${ref.user_id}`;
                    return !localStorage.getItem(storageKey);
                });
                
                unshownRefs.forEach(ref => {
                    const points = ref.inviter_points || ref.points_rewarded || 0;
                    if (points > 0) {
                        showNotification(
                            `🤝 Вы получили ${points} новогодних очков за приглашение друга ${ref.nickname}!`,
                            'success'
                        );
                        const storageKey = `ref_reward_shown_${userId}_${ref.user_id}`;
                        localStorage.setItem(storageKey, 'true');
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки реферального бонуса:', error);
    }
}

function getRandomPoints(streakBonus = 0) {
    let minPoints = 1;
    let maxPoints = 10;
    
    if (streakBonus > 0) {
        minPoints += Math.min(streakBonus, 3);
        maxPoints += Math.min(streakBonus, 5);
    }
    
    const points = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
    
    return Math.max(1, Math.min(points, 15));
}

function canClaimGift() {
    console.log('🎁 Проверка возможности получения подарка');
    
    const lastGiftTime = pointsData?.last_actions?.daily_gift;
    const canByTime = TimeManager.canPerformAction(lastGiftTime);
    
    const todayKey = TimeManager.getTodayKey();
    const hasToday = pointsData?.daily_gifts && pointsData.daily_gifts[todayKey];
    
    console.log(`🎁 Результаты проверки: по времени ${canByTime}, сегодня получен ${hasToday}`);
    
    return canByTime && !hasToday;
}

function getTimeToNextGift() {
    const lastGiftTime = pointsData?.last_actions?.daily_gift;
    return TimeManager.getTimeToNextAction(lastGiftTime);
}

async function openDailyGift() {
    console.log('🎁 Попытка открытия ежедневного подарка');
    
    if (!canClaimGift()) {
        const timeLeft = getTimeToNextGift();
        showError('Вы уже получили подарок сегодня. Возвращайтесь через ' + TimeManager.formatTime(timeLeft));
        return;
    }
    
    try {
        const streak = pointsData.current_streak || 0;
        const points = getRandomPoints(streak);
        
        const now = new Date(TimeManager.getCurrentTime());
        const todayKey = TimeManager.getTodayKey();
        
        let newStreak = 1;
        
        const dailyGifts = pointsData.daily_gifts || {};
        const giftDates = Object.keys(dailyGifts).sort();
        
        if (giftDates.length > 0) {
            const lastDate = new Date(giftDates[giftDates.length - 1] + 'T00:00:00');
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            
            if (lastDate.toDateString() === yesterday.toDateString()) {
                newStreak = streak + 1;
            }
        }
        
        const currentTotal = pointsData.total_points || 0;
        const newTotal = Math.round(currentTotal + points);
        
        const reward = {
            date: now.toISOString(),
            points: points,
            type: 'daily_gift',
            streak: newStreak
        };
        
        const newPointsData = {
            ...pointsData,
            total_points: newTotal,
            daily_gifts: {
                ...pointsData.daily_gifts,
                [todayKey]: {
                    points: points,
                    timestamp: now.toISOString(),
                    streak: newStreak
                }
            },
            rewards_history: [
                reward,
                ...(pointsData.rewards_history || [])
            ],
            last_actions: {
                ...pointsData.last_actions,
                daily_gift: now.toISOString()
            },
            current_streak: newStreak,
            max_streak: Math.max(newStreak, pointsData.max_streak || 0)
        };
        
        delete newPointsData.available_points;
        delete newPointsData.spent_points;
        
        await database.ref('holiday_points/' + userId).set(newPointsData);
        
        pointsData = newPointsData;
        
        showRewardModal(points, newStreak);
        
        updateUI();
        
        console.log(`✅ Подарок получен: ${points} очков, серия: ${newStreak} дней, всего: ${newTotal}`);
        
    } catch (error) {
        console.error('❌ Ошибка открытия подарка:', error);
        showError('Ошибка при открытии подарка');
    }
}

function showRewardModal(points, streak) {
    const modal = document.getElementById('reward-modal');
    const pointsElement = document.getElementById('reward-amount');
    const totalElement = document.getElementById('reward-total');
    const streakElement = document.getElementById('reward-streak');
    const messageElement = document.getElementById('reward-message');
    
    document.querySelector('.points-number').textContent = points;
    totalElement.textContent = pointsData.total_points || 0;
    streakElement.textContent = streak;
    
    let message = '';
    if (points <= 3) {
        message = 'Хорошее начало! Возвращайтесь завтра за большей наградой!';
    } else if (points <= 6) {
        message = 'Отличный результат! Продолжайте в том же духе!';
    } else if (points <= 9) {
        message = 'Великолепно! Вы сегодня очень удачливы!';
    } else {
        message = 'Потрясающе! Максимальная награда! Так держать!';
    }
    
    messageElement.textContent = message;
    
    createConfetti();
    
    modal.style.display = 'flex';
    
    document.getElementById('close-reward').addEventListener('click', function() {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.opacity = '1';
        }, 300);
    });
}

function createConfetti() {
    const container = document.querySelector('.confetti-container');
    container.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        confetti.style.left = `${Math.random() * 100}%`;
        
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        
        const size = Math.random() * 10 + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        const colors = ['#ff0000', '#ffff00', '#00ff00', '#0088ff', '#ff00ff'];
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        container.appendChild(confetti);
    }
}

function updateCountdown() {
    const timerElement = document.getElementById('countdown');
    const giftBox = document.getElementById('daily-gift');
    const statusElement = document.getElementById('gift-status');
    
    const updateTimer = () => {
        const timeToNext = getTimeToNextGift();
        
        if (timeToNext > 0 || TimeManager.wasActionTodayInObject(pointsData?.daily_gifts)) {
            giftBox.classList.add('disabled');
            giftBox.classList.remove('opened');
            timerElement.textContent = TimeManager.formatTime(timeToNext);
            statusElement.textContent = 'Доступно через:';
        } else {
            giftBox.classList.remove('disabled');
            const todayKey = TimeManager.getTodayKey();
            const hasToday = pointsData?.daily_gifts && pointsData.daily_gifts[todayKey];
            
            if (!hasToday) {
                giftBox.classList.remove('opened');
                statusElement.textContent = 'Нажмите, чтобы открыть';
                timerElement.textContent = 'Сейчас!';
            } else {
                giftBox.classList.add('opened');
                statusElement.textContent = 'Уже получено сегодня';
                timerElement.textContent = 'Завтра снова!';
            }
        }
    };
    
    updateTimer();
    
    setInterval(updateTimer, 1000);
}

function updateDaysLeft() {
    const daysElement = document.getElementById('days-left');
    const now = TimeManager.getCurrentTime();
    const endDate = new Date('2026-01-01').getTime();
    
    const timeDiff = endDate - now;
    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
        daysElement.innerHTML = `<strong>${daysLeft} дней</strong> до 1 января 2026`;
    } else {
        daysElement.innerHTML = '<strong>Акция завершена!</strong>';
    }
}

function updateStreakVisual() {
    const container = document.getElementById('streak-visual');
    const streak = pointsData.current_streak || 0;
    
    container.innerHTML = '';
    
    for (let i = 1; i <= 7; i++) {
        const day = document.createElement('div');
        day.className = 'streak-day';
        day.textContent = i;
        
        if (i <= streak) {
            day.classList.add('active');
            if (i === streak) {
                day.classList.add('today');
            }
        } else {
            day.classList.add('inactive');
        }
        
        container.appendChild(day);
    }
}

function updateRewardsHistory() {
    const container = document.getElementById('rewards-list');
    const rewards = pointsData.rewards_history || [];
    
    if (rewards.length === 0) {
        container.innerHTML = `
            <div class="empty-rewards">
                <div class="empty-icon">📭</div>
                <p>Пока нет полученных наград</p>
                <small>Откройте первый ежедневный подарок!</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = rewards.slice(0, 10).map(reward => {
        const date = new Date(reward.date);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let typeText = 'Ежедневный подарок';
        let icon = '🎁';
        
        if (reward.type === 'referral_bonus') {
            typeText = 'Реферальный бонус';
            icon = '🤝';
        } else if (reward.type === 'referral_reward') {
            typeText = 'Награда за приглашение';
            icon = '👥';
        } else if (reward.type === 'wheel_spin') {
            typeText = 'Колесо фортуны';
            icon = '🎡';
        }
        
        let desc = `Серия: ${reward.streak || 1} дней`;
        if (reward.type && reward.type.includes('referral')) {
            desc = reward.description || 'Реферальная награда';
        }
        
        return `
            <div class="reward-item">
                <div class="reward-date">
                    <div>${formattedDate}</div>
                    <small>${time}</small>
                </div>
                <div class="reward-info">
                    <div class="reward-type">${icon} ${typeText}</div>
                    <div class="reward-desc">${desc}</div>
                </div>
                <div class="reward-points">+${reward.points}</div>
            </div>
        `;
    }).join('');
}

function updateUI() {
    if (!pointsData) return;
    
    document.getElementById('total-points').textContent = Math.round(pointsData.total_points || 0);
    document.getElementById('gifts-opened').textContent = Object.keys(pointsData.daily_gifts || {}).length;
    document.getElementById('streak-days').textContent = pointsData.current_streak || 0;
    document.getElementById('max-streak').textContent = pointsData.max_streak || 0;
    
    updateStreakVisual();
    
    updateRewardsHistory();
}

async function loadTopPlayers() {
    try {
        const loadingElement = document.querySelector('.top-players-loading');
        const listElement = document.getElementById('top-players-list');
        const positionCard = document.getElementById('user-position-card');
        
        loadingElement.style.display = 'flex';
        listElement.innerHTML = '';
        positionCard.style.display = 'none';
        
        const snapshot = await database.ref('holiday_points').once('value');
        
        if (!snapshot.exists()) {
            showNoPlayersMessage();
            loadingElement.style.display = 'none';
            return;
        }
        
        const allPointsData = snapshot.val();
        const players = [];
        
        for (const playerId in allPointsData) {
            const playerData = allPointsData[playerId];
            
            const totalPoints = Math.round(playerData.total_points || 0);
            
            const userSnapshot = await database.ref('users/' + playerId).once('value');
            let nickname = 'Игрок';
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                nickname = userData.nickname || 'Игрок';
            }
            
            players.push({
                id: playerId,
                nickname: nickname,
                points: totalPoints,
                streak: playerData.current_streak || 0,
                gifts: Object.keys(playerData.daily_gifts || {}).length,
                isCurrentUser: playerId === userId
            });
        }
        
        players.sort((a, b) => b.points - a.points);
        
        const topPlayers = players.slice(0, 10);
        
        updateTopPlayersList(topPlayers);
        
        if (userId) {
            const userIndex = players.findIndex(p => p.id === userId);
            if (userIndex !== -1) {
                const userPlayer = players[userIndex];
                updateUserPosition(userPlayer, userIndex + 1);
                positionCard.style.display = 'block';
                
                const userInTop = topPlayers.some(p => p.id === userId);
                
                if (!userInTop && userIndex >= 10) {
                    showUserBelowTop(userPlayer, userIndex + 1);
                }
            }
        }
        
        loadingElement.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Ошибка загрузки топа:', error);
        document.querySelector('.top-players-loading').innerHTML = `
            <div style="color: #ff4444; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                <p>Ошибка загрузки рейтинга</p>
            </div>
        `;
    }
}

function updateTopPlayersList(players) {
    const listElement = document.getElementById('top-players-list');
    
    if (players.length === 0) {
        showNoPlayersMessage();
        return;
    }
    
    listElement.innerHTML = players.map((player, index) => {
        const rank = index + 1;
        let rankClass = 'other';
        let medalIcon = '🏅';
        
        if (rank === 1) {
            rankClass = 'gold';
            medalIcon = '🥇';
        } else if (rank === 2) {
            rankClass = 'silver';
            medalIcon = '🥈';
        } else if (rank === 3) {
            rankClass = 'bronze';
            medalIcon = '🥉';
        }
        
        return `
            <div class="player-card ${player.isCurrentUser ? 'current-user' : ''}">
                <div class="player-rank ${rankClass}">
                    ${rank}
                </div>
                <div class="player-info">
                    <div class="player-name">
                        ${medalIcon} ${player.nickname}
                        ${player.isCurrentUser ? ' <span style="color: #00ff00; font-size: 14px;">(Вы)</span>' : ''}
                    </div>
                    <div class="player-stats">
                        <div class="player-stat">
                            <span class="stat-icon">🔥</span>
                            <span>Серия: ${player.streak} дн.</span>
                        </div>
                        <div class="player-stat">
                            <span class="stat-icon">🎁</span>
                            <span>Подарков: ${player.gifts}</span>
                        </div>
                    </div>
                </div>
                <div class="player-points">
                    ${player.points}
                </div>
            </div>
        `;
    }).join('');
}

function showNoPlayersMessage() {
    const listElement = document.getElementById('top-players-list');
    listElement.innerHTML = `
        <div class="empty-rewards">
            <div class="empty-icon">👥</div>
            <p>Пока нет игроков в рейтинге</p>
            <small>Станьте первым, собрав новогодние очки!</small>
        </div>
    `;
}

function updateUserPosition(player, rank) {
    document.getElementById('user-rank').textContent = rank;
    document.getElementById('user-top-nickname').textContent = player.nickname;
    document.getElementById('user-top-points').textContent = Math.round(player.points);
}

function showUserBelowTop(player, rank) {
    const listElement = document.getElementById('top-players-list');
    
    const userCard = document.createElement('div');
    userCard.className = 'player-card current-user';
    userCard.style.background = 'linear-gradient(135deg, rgba(98, 0, 255, 0.15), rgba(255, 0, 255, 0.15))';
    userCard.style.borderColor = '#6200ff';
    userCard.style.marginTop = '20px';
    userCard.style.opacity = '0.8';
    
    userCard.innerHTML = `
        <div style="text-align: center; width: 100%; padding: 10px;">
            <div style="color: #aaaaff; font-size: 12px; margin-bottom: 5px;">Ваша позиция в общем рейтинге:</div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                <div style="background: linear-gradient(135deg, #6200ff, #ff00ff); 
                          color: white; 
                          width: 40px; 
                          height: 40px; 
                          border-radius: 50%; 
                          display: flex; 
                          align-items: center; 
                          justify-content: center;
                          font-weight: bold;
                          font-size: 18px;">
                    ${rank}
                </div>
                <div style="text-align: left;">
                    <div style="color: white; font-weight: bold;">${player.nickname}</div>
                    <div style="color: #00ff00; font-family: Michroma; font-size: 18px;">${Math.round(player.points)} очков</div>
                </div>
            </div>
        </div>
    `;
    
    listElement.appendChild(userCard);
}

async function updateUIWithTop() {
    if (!pointsData) return;
    
    document.getElementById('total-points').textContent = Math.round(pointsData.total_points || 0);
    document.getElementById('gifts-opened').textContent = Object.keys(pointsData.daily_gifts || {}).length;
    document.getElementById('streak-days').textContent = pointsData.current_streak || 0;
    document.getElementById('max-streak').textContent = pointsData.max_streak || 0;
    
    updateStreakVisual();
    
    updateRewardsHistory();
    
    await loadTopPlayers();
}

function setupEventListeners() {
    const giftBox = document.getElementById('daily-gift');
    giftBox.addEventListener('click', async function() {
        if (!this.classList.contains('disabled')) {
            await openDailyGift();
        }
    });
    
    const refreshBtn = document.getElementById('refresh-top-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '🔄 Загрузка...';
            
            await loadTopPlayers();
            
            this.disabled = false;
            this.innerHTML = '🔄 Обновить топ';
            
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }
    
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            const totalPoints = Math.round(pointsData.total_points || 0);
            const shareText = `🎄 Я собираю новогодние очки на сервере JojoLand! Уже ${totalPoints} очков! Присоединяйся: ${window.location.origin}`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'JojoLand Новогодние очки',
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
}

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
