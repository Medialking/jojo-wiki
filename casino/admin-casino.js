// admin-casino.js - Админ-панель для отслеживания статистики казино

let allPlayers = [];
let selectedPlayer = null;
let currentFilter = 'all';

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    // Проверяем авторизацию админа
    if (!await checkAdminAuth()) {
        return;
    }
    
    await loadAllPlayers();
    setupEventListeners();
};

// ПРОВЕРКА АВТОРИЗАЦИИ АДМИНА
async function checkAdminAuth() {
    const userId = localStorage.getItem('jojoland_userId');
    const userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!userId || !userNickname) {
        alert('Для доступа к админ-панели необходимо войти в аккаунт');
        window.location.href = '../index.html';
        return false;
    }
    
    // Проверяем, является ли пользователь админом
    // Здесь можно добавить проверку по списку админов
    const isAdmin = await checkIfAdmin(userId);
    
    if (!isAdmin) {
        alert('У вас нет доступа к админ-панели');
        window.location.href = '../index.html';
        return false;
    }
    
    return true;
}

// ПРОВЕРКА ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ АДМИНОМ
async function checkIfAdmin(userId) {
    try {
        // Можно хранить список админов в Firebase
        const adminSnapshot = await database.ref('admins/' + userId).once('value');
        
        if (adminSnapshot.exists()) {
            return true;
        }
        
        // Или проверить по нику (для теста)
        const nickname = localStorage.getItem('jojoland_nickname') || '';
        const adminNicks = ['admin', 'administrator', 'moderator', 'testadmin'];
        
        if (adminNicks.includes(nickname.toLowerCase())) {
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Ошибка проверки админа:', error);
        return false;
    }
}

// ЗАГРУЗКА ВСЕХ ИГРОКОВ
async function loadAllPlayers() {
    try {
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '<div class="loading">Загрузка игроков...</div>';
        
        // Загружаем данные казино всех игроков
        const casinoSnapshot = await database.ref('casino').once('value');
        const pointsSnapshot = await database.ref('holiday_points').once('value');
        const usersSnapshot = await database.ref('users').once('value');
        
        const casinoData = casinoSnapshot.val() || {};
        const pointsData = pointsSnapshot.val() || {};
        const usersData = usersSnapshot.val() || {};
        
        allPlayers = [];
        let totalBets = 0;
        let totalTurnover = 0;
        
        // Обрабатываем данные каждого игрока
        for (const userId in casinoData) {
            if (casinoData[userId]) {
                const playerCasinoData = casinoData[userId];
                const playerPointsData = pointsData[userId] || {};
                const userData = usersData[userId] || {};
                
                // Получаем ник игрока
                const nickname = userData.nickname || userData.displayName || `Игрок_${userId.substring(0, 6)}`;
                
                // Рассчитываем статистику
                const totalBetsPlayer = playerCasinoData.total_bets || 0;
                const totalWon = playerCasinoData.total_won || 0;
                const totalLost = playerCasinoData.total_lost || 0;
                const winRate = totalBetsPlayer > 0 ? (playerCasinoData.total_won ? 1 : 0) * 100 : 0;
                
                // Баланс игрока
                const balance = playerPointsData.total_points || playerPointsData.available_points || 0;
                
                // Определяем статус игрока
                let status = 'normal';
                if (totalBetsPlayer > 100) status = 'active';
                if (playerCasinoData.total_bets_amount > 1000) status = 'highroller';
                if (totalWon > totalLost) status = 'winner';
                if (totalLost > totalWon * 2) status = 'loser';
                
                const player = {
                    id: userId,
                    nickname: nickname,
                    totalBets: totalBetsPlayer,
                    totalWon: totalWon,
                    totalLost: totalLost,
                    winRate: winRate,
                    balance: balance,
                    status: status,
                    lastActivity: playerCasinoData.last_bet_time || null,
                    betHistory: playerCasinoData.bet_history || []
                };
                
                allPlayers.push(player);
                
                // Обновляем общую статистику
                totalBets += totalBetsPlayer;
                totalTurnover += totalWon + totalLost;
            }
        }
        
        // Сортируем игроков по активности
        allPlayers.sort((a, b) => b.totalBets - a.totalBets);
        
        // Обновляем общую статистику
        document.getElementById('total-players').textContent = allPlayers.length;
        document.getElementById('total-bets').textContent = totalBets;
        document.getElementById('total-turnover').textContent = totalTurnover.toLocaleString();
        
        // Отображаем список игроков
        displayPlayers(allPlayers);
        
        console.log(`✅ Загружено ${allPlayers.length} игроков`);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки игроков:', error);
        document.getElementById('players-list').innerHTML = 
            '<div class="no-data">Ошибка загрузки данных</div>';
    }
}

// ОТОБРАЖЕНИЕ СПИСКА ИГРОКОВ
function displayPlayers(players) {
    const playersList = document.getElementById('players-list');
    
    if (players.length === 0) {
        playersList.innerHTML = '<div class="no-data">Нет данных об игроках</div>';
        return;
    }
    
    playersList.innerHTML = players.map(player => `
        <div class="player-item ${selectedPlayer?.id === player.id ? 'selected' : ''}" 
             data-player-id="${player.id}"
             onclick="selectPlayer('${player.id}')">
            <div class="player-name">${escapeHtml(player.nickname)}</div>
            <div class="player-stats">
                <span title="Всего ставок">🎲 ${player.totalBets}</span>
                <span title="Баланс">💰 ${player.balance}</span>
                <span title="Статус">${getStatusIcon(player.status)}</span>
            </div>
        </div>
    `).join('');
}

// ВЫБОР ИГРОКА
async function selectPlayer(playerId) {
    selectedPlayer = allPlayers.find(p => p.id === playerId);
    
    if (!selectedPlayer) return;
    
    // Обновляем выделение в списке
    document.querySelectorAll('.player-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    document.querySelector(`[data-player-id="${playerId}"]`).classList.add('selected');
    
    // Обновляем информацию об игроке
    await updatePlayerDetails(selectedPlayer);
}

// ОБНОВЛЕНИЕ ДЕТАЛЕЙ ИГРОКА
async function updatePlayerDetails(player) {
    // Показываем блок с деталями
    document.getElementById('no-player-selected').style.display = 'none';
    document.getElementById('player-stats').style.display = 'grid';
    document.getElementById('games-history').style.display = 'block';
    document.getElementById('statistics-chart').style.display = 'block';
    document.getElementById('danger-zone').style.display = 'block';
    
    // Обновляем заголовок
    document.getElementById('selected-player-name').textContent = player.nickname;
    
    // Рассчитываем дополнительную статистику
    const winRate = player.totalBets > 0 ? 
        Math.round((player.totalWon / (player.totalWon + player.totalLost)) * 100) : 0;
    
    const avgBet = player.totalBets > 0 ? 
        Math.round((player.totalWon + player.totalLost) / player.totalBets) : 0;
    
    const netProfit = player.totalWon - player.totalLost;
    
    // Обновляем карточки статистики
    document.getElementById('player-balance').textContent = player.balance.toLocaleString();
    document.getElementById('player-won').textContent = player.totalWon.toLocaleString();
    document.getElementById('player-lost').textContent = player.totalLost.toLocaleString();
    document.getElementById('player-total-bets').textContent = player.totalBets.toLocaleString();
    document.getElementById('player-win-rate').textContent = `${winRate}%`;
    document.getElementById('player-avg-bet').textContent = avgBet.toLocaleString();
    
    // Обновляем историю ставок
    updateBetHistoryTable(player.betHistory);
    
    // Строим график статистики
    buildStatisticsChart(player.betHistory);
}

// ОБНОВЛЕНИЕ ТАБЛИЦЫ ИСТОРИИ СТАВОК
function updateBetHistoryTable(betHistory) {
    const tableBody = document.getElementById('games-table-body');
    
    if (!betHistory || betHistory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #8888ff;">
                    Нет данных о ставках
                </td>
            </tr>
        `;
        return;
    }
    
    // Сортируем по дате (новые сверху)
    const sortedHistory = [...betHistory].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 50); // Показываем только последние 50 записей
    
    tableBody.innerHTML = sortedHistory.map(bet => {
        const date = new Date(bet.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        const gameName = getGameName(bet.game);
        const resultClass = bet.result === 'win' ? 'win' : 'loss';
        const resultText = bet.result === 'win' ? 'Выигрыш' : 'Проигрыш';
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${gameName}</td>
                <td>${bet.bet_amount?.toLocaleString() || 0}</td>
                <td><span class="result-badge ${resultClass}">${resultText}</span></td>
                <td style="color: ${bet.result === 'win' ? '#00ff00' : '#ff4444'}">
                    ${bet.result === 'win' ? '+' : '-'}${Math.abs(bet.win_amount || bet.balance_change || 0).toLocaleString()}
                </td>
                <td>${bet.new_balance?.toLocaleString() || 0}</td>
            </tr>
        `;
    }).join('');
}

// ПОСТРОЕНИЕ ГРАФИКА СТАТИСТИКИ
function buildStatisticsChart(betHistory) {
    const chartContainer = document.getElementById('chart-container');
    
    if (!betHistory || betHistory.length === 0) {
        chartContainer.innerHTML = '<div class="no-data">Нет данных для графика</div>';
        return;
    }
    
    // Группируем ставки по дням
    const dailyStats = {};
    
    betHistory.forEach(bet => {
        const date = new Date(bet.timestamp);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!dailyStats[dayKey]) {
            dailyStats[dayKey] = {
                bets: 0,
                wins: 0,
                losses: 0,
                amount: 0
            };
        }
        
        dailyStats[dayKey].bets++;
        dailyStats[dayKey].amount += Math.abs(bet.bet_amount || 0);
        
        if (bet.result === 'win') {
            dailyStats[dayKey].wins++;
        } else {
            dailyStats[dayKey].losses++;
        }
    });
    
    // Получаем последние 7 дней
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        last7Days.push({
            date: dayKey,
            displayDate: date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
            stats: dailyStats[dayKey] || { bets: 0, wins: 0, losses: 0, amount: 0 }
        });
    }
    
    // Находим максимальное количество ставок для масштабирования
    const maxBets = Math.max(...last7Days.map(day => day.stats.bets), 1);
    
    // Строим график
    chartContainer.innerHTML = last7Days.map((day, index) => {
        const barHeight = (day.stats.bets / maxBets) * 150; // Макс высота 150px
        const leftPosition = 20 + (index * 60);
        
        return `
            <div class="chart-bar" style="left: ${leftPosition}px; height: ${barHeight}px;" 
                 title="Ставок: ${day.stats.bets}, Выигрышей: ${day.stats.wins}">
            </div>
            <div class="chart-label" style="left: ${leftPosition}px;">
                ${day.displayDate}
            </div>
        `;
    }).join('');
}

// ФИЛЬТРАЦИЯ ИГРОКОВ
function filterPlayers(filter) {
    currentFilter = filter;
    
    let filteredPlayers = allPlayers;
    
    switch(filter) {
        case 'active':
            filteredPlayers = allPlayers.filter(p => p.totalBets > 10);
            break;
        case 'highroller':
            filteredPlayers = allPlayers.filter(p => p.totalBets > 100 || p.balance > 1000);
            break;
        case 'winner':
            filteredPlayers = allPlayers.filter(p => p.totalWon > p.totalLost);
            break;
        case 'loser':
            filteredPlayers = allPlayers.filter(p => p.totalLost > p.totalWon);
            break;
        case 'all':
        default:
            filteredPlayers = allPlayers;
    }
    
    displayPlayers(filteredPlayers);
}

// ЭКСПОРТ ДАННЫХ
function exportToCSV() {
    if (!selectedPlayer || !selectedPlayer.betHistory) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const headers = ['Дата', 'Игра', 'Ставка', 'Результат', 'Выигрыш', 'Баланс'];
    const rows = selectedPlayer.betHistory.map(bet => {
        const date = new Date(bet.timestamp);
        return [
            date.toLocaleString(),
            getGameName(bet.game),
            bet.bet_amount || 0,
            bet.result === 'win' ? 'Выигрыш' : 'Проигрыш',
            bet.win_amount || 0,
            bet.new_balance || 0
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedPlayer.nickname}_history_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToJSON() {
    if (!selectedPlayer) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const data = {
        player: selectedPlayer.nickname,
        playerId: selectedPlayer.id,
        exportDate: new Date().toISOString(),
        stats: {
            balance: selectedPlayer.balance,
            totalBets: selectedPlayer.totalBets,
            totalWon: selectedPlayer.totalWon,
            totalLost: selectedPlayer.totalLost
        },
        betHistory: selectedPlayer.betHistory || []
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedPlayer.nickname}_stats_${Date.now()}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ОПАСНЫЕ ДЕЙСТВИЯ
async function resetPlayerStats() {
    if (!selectedPlayer || !confirm(`Вы уверены, что хотите сбросить статистику игрока ${selectedPlayer.nickname}?`)) {
        return;
    }
    
    try {
        await database.ref(`casino/${selectedPlayer.id}`).update({
            total_bets: 0,
            total_won: 0,
            total_lost: 0,
            bet_history: []
        });
        
        alert('Статистика игрока сброшена');
        await loadAllPlayers();
        
    } catch (error) {
        console.error('Ошибка сброса статистики:', error);
        alert('Ошибка при сбросе статистики');
    }
}

async function banPlayer() {
    if (!selectedPlayer) return;
    
    const reason = prompt('Введите причину блокировки:');
    if (!reason) return;
    
    try {
        await database.ref(`banned_users/${selectedPlayer.id}`).set({
            nickname: selectedPlayer.nickname,
            reason: reason,
            bannedAt: new Date().toISOString(),
            bannedBy: localStorage.getItem('jojoland_nickname')
        });
        
        alert(`Игрок ${selectedPlayer.nickname} заблокирован`);
        
    } catch (error) {
        console.error('Ошибка блокировки:', error);
        alert('Ошибка при блокировке игрока');
    }
}

async function adjustBalance() {
    if (!selectedPlayer) return;
    
    const adjustment = prompt(`Введите изменение баланса для ${selectedPlayer.nickname} (например: +100 или -50):`);
    if (!adjustment) return;
    
    // Парсим ввод
    const match = adjustment.match(/^([+-]?)(\d+)$/);
    if (!match) {
        alert('Неверный формат. Используйте: +100 или -50');
        return;
    }
    
    const sign = match[1] || '+';
    const amount = parseInt(match[2]);
    const change = sign === '-' ? -amount : amount;
    
    try {
        // Получаем текущий баланс
        const pointsSnapshot = await database.ref(`holiday_points/${selectedPlayer.id}`).once('value');
        const pointsData = pointsSnapshot.val() || {};
        
        const currentBalance = pointsData.total_points || pointsData.available_points || 0;
        const newBalance = Math.max(0, currentBalance + change);
        
        // Обновляем баланс
        await database.ref(`holiday_points/${selectedPlayer.id}`).update({
            total_points: newBalance
        });
        
        // Записываем лог
        await database.ref(`admin_logs/${Date.now()}`).set({
            admin: localStorage.getItem('jojoland_nickname'),
            player: selectedPlayer.nickname,
            playerId: selectedPlayer.id,
            action: 'balance_adjustment',
            change: change,
            oldBalance: currentBalance,
            newBalance: newBalance,
            timestamp: new Date().toISOString()
        });
        
        alert(`Баланс обновлен: ${currentBalance} → ${newBalance} (${change > 0 ? '+' : ''}${change})`);
        await loadAllPlayers();
        
    } catch (error) {
        console.error('Ошибка изменения баланса:', error);
        alert('Ошибка при изменении баланса');
    }
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function getGameName(gameCode) {
    const games = {
        'red_black': 'Красное/Черное',
        'roulette': 'Рулетка',
        'slots': 'Слоты',
        'dice': 'Кости',
        'blackjack': 'Блекджек'
    };
    
    return games[gameCode] || gameCode;
}

function getStatusIcon(status) {
    const icons = {
        'active': '🔥',
        'highroller': '💰',
        'winner': '🏆',
        'loser': '😔',
        'normal': '👤'
    };
    
    return icons[status] || '👤';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Поиск игроков
    const searchInput = document.getElementById('search-player');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm === '') {
            displayPlayers(allPlayers);
            return;
        }
        
        const filteredPlayers = allPlayers.filter(player => 
            player.nickname.toLowerCase().includes(searchTerm)
        );
        
        displayPlayers(filteredPlayers);
    });
    
    // Фильтры игроков
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            // Обновляем активный фильтр
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            // Применяем фильтр
            filterPlayers(filter);
        });
    });
    
    // Фильтры истории ставок
    document.querySelectorAll('.filter-btn[data-history-filter]').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!selectedPlayer) return;
            
            const filter = this.dataset.historyFilter;
            
            // Обновляем активный фильтр
            document.querySelectorAll('[data-history-filter]').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            // Фильтруем историю
            let filteredHistory = selectedPlayer.betHistory || [];
            
            if (filter === 'red_black') {
                filteredHistory = filteredHistory.filter(bet => bet.game === 'red_black');
            } else if (filter === 'win') {
                filteredHistory = filteredHistory.filter(bet => bet.result === 'win');
            } else if (filter === 'loss') {
                filteredHistory = filteredHistory.filter(bet => bet.result === 'loss');
            }
            
            updateBetHistoryTable(filteredHistory);
        });
    });
}
