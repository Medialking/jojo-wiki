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
const database = firebase.database();

let currentPage = 1;
const playersPerPage = 9;
let allPlayers = [];
let filteredPlayers = [];
let playersData = {};
let currentUser = null;

async function getCurrentUserData() {
    try {
        const nickname = localStorage.getItem('jojoland_nickname');
        const userId = localStorage.getItem('jojoland_userId');
        const isLoggedIn = localStorage.getItem('jojoland_loggedIn') === 'true';
        
        if (isLoggedIn && nickname && userId) {
            return {
                nickname: nickname,
                userId: userId,
                isLoggedIn: true
            };
        }
        return null;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
}

async function getBatchData() {
    try {
        const [usersSnapshot, pointsSnapshot, reputationSnapshot] = await Promise.all([
            database.ref('users').once('value'),
            database.ref('holiday_points').once('value'),
            database.ref('reputation').once('value')
        ]);
        
        return {
            users: usersSnapshot.exists() ? usersSnapshot.val() : {},
            points: pointsSnapshot.exists() ? pointsSnapshot.val() : {},
            reputation: reputationSnapshot.exists() ? reputationSnapshot.val() : {}
        };
    } catch (error) {
        console.error('Ошибка пакетной загрузки данных:', error);
        return { users: {}, points: {}, reputation: {} };
    }
}

async function getUserRank(userData, userId, adminsCache = {}) {
    if (adminsCache[userId]) return 'admin';
    if (userData.rank === 'admin') return 'admin';
    if (userData.rank === 'moderator') return 'moderator';
    if (userData.rank === 'vip') return 'vip';
    return 'player';
}

function getOnlineStatus(userData) {
    if (!userData.lastVisit) return 'offline';
    const lastVisit = new Date(userData.lastVisit);
    const now = new Date();
    const diffMinutes = (now - lastVisit) / (1000 * 60);
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 15) return 'ingame';
    return 'offline';
}

function getLastSeenText(userData) {
    if (!userData.lastVisit) return 'Никогда не был';
    const lastVisit = new Date(userData.lastVisit);
    const now = new Date();
    const diffMs = now - lastVisit;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 5) return 'Только что';
    if (diffHours < 1) return `${diffMinutes} мин назад`;
    if (diffDays < 1) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн назад`;
    return `${Math.floor(diffDays / 7)} нед назад`;
}

function formatDate(dateString) {
    if (!dateString) return 'Неизвестно';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return 'Неизвестно';
    }
}

function highlightSearchText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function getAchievementBadge(points, index) {
    if (index < 3) {
        return ['🥇', '🥈', '🥉'][index];
    }
    if (points >= 10000) return '🏆';
    if (points >= 5000) return '⭐';
    if (points >= 1000) return '✨';
    return '';
}

function getAvatarFromCache(userId) {
    try {
        const cacheKey = `jojoland_avatar_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        if (Date.now() - cacheData.timestamp > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        return cacheData.avatar;
    } catch (error) {
        return null;
    }
}

function saveAvatarToCache(userId, avatar) {
    try {
        const cacheKey = `jojoland_avatar_${userId}`;
        const cacheData = {
            avatar: avatar,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        
        const keys = Object.keys(localStorage)
            .filter(key => key.startsWith('jojoland_avatar_'));
        
        if (keys.length > 100) {
            keys.slice(0, 20).forEach(key => localStorage.removeItem(key));
        }
    } catch (error) {
        console.warn('Ошибка кэширования аватара:', error);
    }
}

async function getAvatar(userData, userId) {
    const cached = getAvatarFromCache(userId);
    if (cached) return cached;
    
    if (userData.avatar && userData.avatar.startsWith('data:image')) {
        saveAvatarToCache(userId, userData.avatar);
        return userData.avatar;
    }
    
    return null;
}

function createSkeletonCards(count) {
    let skeletonHTML = '';
    for (let i = 0; i < count; i++) {
        skeletonHTML += `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-name"></div>
                        <div class="skeleton-id"></div>
                    </div>
                </div>
                <div class="skeleton-stats">
                    <div class="skeleton-stat"></div>
                    <div class="skeleton-stat"></div>
                    <div class="skeleton-stat"></div>
                </div>
                <div class="skeleton-button"></div>
            </div>
        `;
    }
    return skeletonHTML;
}

async function createPlayerCard(player, index = -1) {
    const userId = player.userId || player.id;
    const rank = player.rank || 'player';
    const onlineStatus = getOnlineStatus(player);
    const lastSeen = getLastSeenText(player);
    const createdAt = formatDate(player.createdAt || player.registeredAt);
    const visits = player.visitsCount || 1;
    const points = player.points || 0;
    const reputation = player.reputation || 0;
    const avatar = await getAvatar(player, userId);
    const trophy = getAchievementBadge(points, index);
    
    const statusText = {
        'online': 'Онлайн',
        'ingame': 'В игре',
        'offline': lastSeen
    };
    
    const rankText = {
        'admin': 'Админ',
        'moderator': 'Модератор',
        'vip': 'VIP',
        'player': 'Игрок'
    };
    
    let avatarHTML = '';
    if (avatar) {
        avatarHTML = `<img src="${avatar}" alt="${player.nickname}" 
                         loading="lazy"
                         onerror="this.style.display='none'; 
                                  this.nextElementSibling.style.display='flex';">`;
    }
    
    const fallbackLetter = player.nickname?.charAt(0).toUpperCase() || '?';
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const highlightedName = highlightSearchText(player.nickname || 'Неизвестно', searchTerm);
    
    const isCurrentUser = currentUser && currentUser.userId === userId;
    const canLike = currentUser && currentUser.isLoggedIn && !isCurrentUser;
    const userLiked = player.userLiked || false;
    
    return `
        <div class="player-card ${rank}" data-user-id="${userId}" data-index="${index}">
            ${trophy ? `<div class="achievement-badge">${trophy}</div>` : ''}
            
            <div class="player-header">
                <div class="player-avatar ${rank}">
                    ${avatarHTML}
                    <div class="avatar-fallback" ${avatar ? 'style="display: none"' : ''}>
                        ${fallbackLetter}
                    </div>
                    <div class="online-indicator ${onlineStatus}"></div>
                </div>
                <div class="player-info">
                    <div class="player-name-row">
                        ${trophy && index < 3 ? `<span class="player-trophy">${trophy}</span>` : ''}
                        <div class="player-name">${highlightedName}</div>
                        <div class="player-rank ${rank}">${rankText[rank]}</div>
                    </div>
                    <div class="player-id">ID: ${userId.substring(0, 8)}...</div>
                    <div class="player-status">
                        <span>${statusText[onlineStatus]}</span>
                        •
                        <span>${visits} визит${visits === 1 ? '' : 'ов'}</span>
                    </div>
                </div>
            </div>
            
            <div class="player-stats">
                <div class="stat-item">
                    <span class="stat-value">${points.toLocaleString()}</span>
                    <span class="stat-label">🎄 Очков</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${createdAt}</span>
                    <span class="stat-label">📅 Регистрация</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${reputation}</span>
                    <span class="stat-label">❤️ Репутация</span>
                </div>
            </div>
            
            <div class="card-footer">
                <button class="like-btn ${userLiked ? 'liked' : ''}" 
                        onclick="toggleLike('${userId}')" 
                        data-user-id="${userId}"
                        ${!canLike ? 'disabled' : ''}
                        style="${!canLike ? 'opacity: 0.7; cursor: not-allowed;' : ''}">
                    <span>❤️</span>
                    <span class="like-count">${reputation}</span>
                    ${!canLike ? '<div style="font-size: 10px; margin-top: 2px;">Войдите в систему</div>' : ''}
                </button>
                <button class="view-profile-btn" onclick="viewPlayerProfile('${userId}')">
                    <span>👁️</span>
                    Профиль
                </button>
            </div>
        </div>
    `;
}

async function toggleLike(userId) {
    if (!currentUser || !currentUser.isLoggedIn) {
        showNotification('Войдите в систему, чтобы ставить лайки', 'error');
        return;
    }
    
    if (userId === currentUser.userId) {
        showNotification('Нельзя ставить лайк самому себе', 'error');
        return;
    }
    
    const likeBtn = document.querySelector(`.like-btn[data-user-id="${userId}"]`);
    const likeCountSpan = likeBtn?.querySelector('.like-count');
    
    if (!likeBtn || !likeCountSpan) return;
    
    const currentLikes = parseInt(likeCountSpan.textContent) || 0;
    const userLiked = likeBtn.classList.contains('liked');
    
    try {
        const userLikesRef = database.ref(`user_likes/${currentUser.userId}/${userId}`);
        
        if (userLiked) {
            await userLikesRef.remove();
            likeBtn.classList.remove('liked');
            likeCountSpan.textContent = currentLikes - 1;
            
            const reputationRef = database.ref(`reputation/${userId}`);
            const snapshot = await reputationRef.once('value');
            const currentRep = snapshot.val() || 0;
            await reputationRef.set(Math.max(0, currentRep - 1));
            
            showNotification('Лайк убран', 'success');
        } else {
            await userLikesRef.set(true);
            likeBtn.classList.add('liked');
            likeCountSpan.textContent = currentLikes + 1;
            
            const reputationRef = database.ref(`reputation/${userId}`);
            const snapshot = await reputationRef.once('value');
            const currentRep = snapshot.val() || 0;
            await reputationRef.set(currentRep + 1);
            
            showNotification('Лайк поставлен!', 'success');
        }
        
        const playerIndex = allPlayers.findIndex(p => (p.userId || p.id) === userId);
        if (playerIndex !== -1) {
            allPlayers[playerIndex].reputation = parseInt(likeCountSpan.textContent);
            allPlayers[playerIndex].userLiked = !userLiked;
        }
        
    } catch (error) {
        console.error('Ошибка при лайке:', error);
        showNotification('Ошибка при обновлении лайка', 'error');
    }
}

function viewPlayerProfile(userId) {
    window.location.href = `profle/profile.html?view=${userId}`;
}

async function loadAllPlayers() {
    showSkeleton('players-grid');
    
    try {
        const batchData = await getBatchData();
        const users = batchData.users;
        const pointsData = batchData.points;
        const reputationData = batchData.reputation;
        
        currentUser = await getCurrentUserData();
        
        let userLikes = {};
        if (currentUser && currentUser.isLoggedIn) {
            const likesSnapshot = await database.ref(`user_likes/${currentUser.userId}`).once('value');
            userLikes = likesSnapshot.exists() ? likesSnapshot.val() : {};
        }
        
        const adminsSnapshot = await database.ref('admins').once('value');
        const admins = adminsSnapshot.exists() ? adminsSnapshot.val() : {};
        
        const players = [];
        
        for (const userId in users) {
            const userData = users[userId];
            if (userData.nickname) {
                const rank = await getUserRank(userData, userId, admins);
                const points = pointsData[userId]?.total_points || 
                             pointsData[userId]?.totalPoints || 0;
                const reputation = reputationData[userId] || 0;
                
                players.push({
                    ...userData,
                    userId: userId,
                    id: userId,
                    rank: rank,
                    points: points,
                    reputation: reputation,
                    userLiked: userLikes[userId] || false
                });
            }
        }
        
        playersData = { users, points: pointsData, reputation: reputationData };
        return players;
        
    } catch (error) {
        console.error('Ошибка загрузки игроков:', error);
        showNoResults('players-grid', 'Ошибка загрузки данных');
        return [];
    }
}

function sortPlayers(players, sortBy) {
    const sorted = [...players];
    
    switch (sortBy) {
        case 'points':
            sorted.sort((a, b) => b.points - a.points);
            break;
        case 'newest':
            sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            break;
        case 'alphabetical':
            sorted.sort((a, b) => (a.nickname || '').localeCompare(b.nickname || ''));
            break;
        case 'reputation':
            sorted.sort((a, b) => b.reputation - a.reputation);
            break;
        case 'activity':
        default:
            sorted.sort((a, b) => {
                const aOnline = getOnlineStatus(a) === 'online' ? 2 : getOnlineStatus(a) === 'ingame' ? 1 : 0;
                const bOnline = getOnlineStatus(b) === 'online' ? 2 : getOnlineStatus(b) === 'ingame' ? 1 : 0;
                if (aOnline !== bOnline) return bOnline - aOnline;
                
                const rankOrder = { 'admin': 4, 'moderator': 3, 'vip': 2, 'player': 1 };
                if (rankOrder[a.rank] !== rankOrder[b.rank]) {
                    return rankOrder[b.rank] - rankOrder[a.rank];
                }
                
                const aVisits = a.visitsCount || 0;
                const bVisits = b.visitsCount || 0;
                return bVisits - aVisits;
            });
            break;
    }
    
    return sorted;
}

async function displayPlayers(players, containerId) {
    const container = document.getElementById(containerId);
    
    if (!players || players.length === 0) {
        showNoResults(containerId, 'Игроки не найдены');
        return;
    }
    
    const totalPages = Math.ceil(players.length / playersPerPage);
    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    const pagePlayers = players.slice(startIndex, endIndex);
    
    container.innerHTML = '';
    
    const cardsHTML = await Promise.all(
        pagePlayers.map((player, index) => createPlayerCard(player, startIndex + index))
    );
    
    container.innerHTML = cardsHTML.join('');
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    html += `
        <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            ←
        </button>
    `;
    
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    html += `<span class="page-info">Страница ${currentPage} из ${totalPages}</span>`;
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    html += `
        <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            →
        </button>
    `;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredPlayers.length / playersPerPage)) return;
    
    showSkeleton('players-grid');
    setTimeout(async () => {
        currentPage = page;
        await displayPlayers(filteredPlayers, 'players-grid');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
}

function filterPlayers(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    let filtered = [];
    
    switch (filter) {
        case 'online':
            filtered = allPlayers.filter(player => getOnlineStatus(player) === 'online');
            break;
        case 'admin':
            filtered = allPlayers.filter(player => player.rank === 'admin');
            break;
        case 'moderator':
            filtered = allPlayers.filter(player => player.rank === 'moderator');
            break;
        case 'all':
        default:
            filtered = [...allPlayers];
            break;
    }
    
    const sortSelect = document.getElementById('sort-select');
    const sortBy = sortSelect ? sortSelect.value : 'activity';
    filtered = sortPlayers(filtered, sortBy);
    
    filteredPlayers = filtered;
    currentPage = 1;
    displayPlayers(filteredPlayers, 'players-grid');
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTimeout = 300;
    
    let timeoutId;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm.length === 0) {
                const sortSelect = document.getElementById('sort-select');
                const sortBy = sortSelect ? sortSelect.value : 'activity';
                filteredPlayers = sortPlayers([...allPlayers], sortBy);
                currentPage = 1;
                displayPlayers(filteredPlayers, 'players-grid');
                return;
            }
            
            const searchResults = allPlayers.filter(player => {
                const nickname = (player.nickname || '').toLowerCase();
                const userId = (player.userId || '').toLowerCase();
                const rank = (player.rank || '').toLowerCase();
                
                return nickname.includes(searchTerm) || 
                       userId.includes(searchTerm) || 
                       rank.includes(searchTerm);
            });
            
            const sortSelect = document.getElementById('sort-select');
            const sortBy = sortSelect ? sortSelect.value : 'activity';
            filteredPlayers = sortPlayers(searchResults, sortBy);
            currentPage = 1;
            displayPlayers(filteredPlayers, 'players-grid');
        }, searchTimeout);
    });
}

function setupSorting() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', function() {
        filteredPlayers = sortPlayers(filteredPlayers, this.value);
        currentPage = 1;
        displayPlayers(filteredPlayers, 'players-grid');
    });
}

function showSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="skeleton-grid">
                ${createSkeletonCards(playersPerPage)}
            </div>
        `;
    }
}

function showNoResults(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">👤</div>
                <h3>${message}</h3>
                ${message.includes('ошибка') ? 
                    '<p>Попробуйте обновить страницу или проверьте подключение к интернету</p>' : 
                    '<p>Станьте первым игроком на сервере!</p>'
                }
            </div>
        `;
    }
}

function setupBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const colors = {
        success: { bg: '#00cc66', border: '#00ff88' },
        error: { bg: '#ff4444', border: '#ff6b6b' },
        warning: { bg: '#ff9800', border: '#ffb347' },
        info: { bg: '#00b4d8', border: '#48cae4' }
    };
    
    const color = colors[type] || colors.success;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(90deg, ${color.bg}, ${color.border});
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        max-width: 300px;
        font-family: 'Inter', sans-serif;
        border: 2px solid ${color.border};
    `;
    
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            ${type === 'success' ? 'Успешно!' : type === 'error' ? 'Ошибка!' : type === 'warning' ? 'Внимание!' : 'Информация'}
        </div>
        <div style="font-size: 14px;">
            ${message}
        </div>
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

async function initPlayersPage() {
    try {
        allPlayers = await loadAllPlayers();
        
        const sortSelect = document.getElementById('sort-select');
        const sortBy = sortSelect ? sortSelect.value : 'activity';
        filteredPlayers = sortPlayers([...allPlayers], sortBy);
        
        await displayPlayers(filteredPlayers, 'players-grid');
        
        setupSearch();
        setupSorting();
        setupBackToTop();
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => filterPlayers(btn.dataset.filter));
        });
        
    } catch (error) {
        console.error('Ошибка инициализации страницы:', error);
        showNoResults('players-grid', 'Произошла ошибка');
    }
}

window.onload = async function() {
    document.getElementById("loader").style.opacity = "0";
    setTimeout(() => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        initPlayersPage();
    }, 400);
};

const style = document.createElement('style');
style.textContent = `
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
document.head.appendChild(style);
