// ==================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================
// Функции для работы с профилем (дополнение к существующему коду)

// Загрузка новогодних очков для профиля
async function loadProfileHolidayPoints(userId) {
    try {
        const snapshot = await database.ref('holiday_points/' + userId).once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            return data.total_points || data.totalPoints || 0;
        }
        return 0;
    } catch (error) {
        console.error('Ошибка загрузки очков:', error);
        return 0;
    }
}

// Обновление отображения очков в профиле
function updateProfilePointsDisplay(points) {
    const pointsElements = document.querySelectorAll('.holiday-points-display');
    pointsElements.forEach(element => {
        element.textContent = points;
        element.style.color = points > 0 ? '#00ff00' : '#ffcc00';
    });
    
    // Также обновляем в статистике
    const statsElement = document.getElementById('holiday-points');
    if (statsElement) {
        statsElement.textContent = points;
    }
}

// Инициализация профиля
async function initProfile() {
    // Загружаем очки
    const userId = localStorage.getItem('jojoland_userId');
    if (userId) {
        const points = await loadProfileHolidayPoints(userId);
        updateProfilePointsDisplay(points);
        
        // Подписываемся на обновления очков в реальном времени
        database.ref('holiday_points/' + userId).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const points = data.total_points || data.totalPoints || 0;
                updateProfilePointsDisplay(points);
            }
        });
    }
}

// Вызываем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, находимся ли мы на странице профиля
    if (window.location.pathname.includes('profile.html')) {
        setTimeout(initProfile, 1000);
    }
});

// Экспортируем функции для использования в других файлах
window.profileFunctions = {
    loadProfileHolidayPoints,
    updateProfilePointsDisplay
};
