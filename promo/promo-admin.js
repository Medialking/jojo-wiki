// Инициализация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

// Инициализируем только если еще не инициализировано
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Глобальные переменные
let userId = null;
let userNickname = null;
let allPromoCodes = {};
let currentEditCode = null;

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    createParticles();
    
    document.getElementById("loader").style.opacity = "0";
    setTimeout(async () => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("content").style.opacity = "1";
        
        if (await checkAuthAndAdmin()) {
            await loadPromoCodes();
            await loadActivationStats();
            setupEventListeners();
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

// ПРОВЕРКА АВТОРИЗАЦИИ И АДМИНКИ
async function checkAuthAndAdmin() {
    userId = localStorage.getItem('jojoland_userId');
    userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!userId || !userNickname) {
        showError('Доступ запрещен. Необходима авторизация');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return false;
    }
    
    // Проверяем, является ли пользователь администратором
    try {
        const userSnapshot = await database.ref('users/' + userId).once('value');
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            if (!userData.isAdmin) {
                showError('Доступ только для администраторов');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
                return false;
            }
        } else {
            showError('Пользователь не найден');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка проверки админки:', error);
        showError('Ошибка проверки прав доступа');
        return false;
    }
    
    return true;
}

// НАСТРОЙКА РЕАЛЬНОГО ВРЕМЕНИ
function setupRealtimeUpdates() {
    // Подписываемся на обновления промокодов
    database.ref('promocodes').on('value', (snapshot) => {
        if (snapshot.exists()) {
            allPromoCodes = snapshot.val();
            updatePromoList();
            updateStats();
        }
    });
    
    // Подписываемся на обновления активаций
    database.ref('promocode_activations').limitToLast(10).on('value', (snapshot) => {
        updateRecentActivations(snapshot.val());
    });
}

// ЗАГРУЗКА ВСЕХ ПРОМОКОДОВ
async function loadPromoCodes() {
    try {
        const snapshot = await database.ref('promocodes').once('value');
        
        if (snapshot.exists()) {
            allPromoCodes = snapshot.val();
            updatePromoList();
            updateStats();
        } else {
            allPromoCodes = {};
            updatePromoList();
        }
        
        console.log('✅ Промокоды загружены:', Object.keys(allPromoCodes).length);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки промокодов:', error);
        showError('Ошибка загрузки промокодов');
    }
}

// ОБНОВЛЕНИЕ СПИСКА ПРОМОКОДОВ
function updatePromoList() {
    const promoItems = document.getElementById('promo-items');
    const codes = Object.keys(allPromoCodes);
    
    if (codes.length === 0) {
        promoItems.innerHTML = `
            <div class="empty-history">
                <p>Нет созданных промокодов</p>
                <small>Создайте первый промокод</small>
            </div>
        `;
        return;
    }
    
    // Сортируем по дате создания (новые сверху)
    const sortedCodes = codes.sort((a, b) => {
        const dateA = new Date(allPromoCodes[a].created_at || 0);
        const dateB = new Date(allPromoCodes[b].created_at || 0);
        return dateB - dateA;
    });
    
    promoItems.innerHTML = sortedCodes.map(code => {
        const promo = allPromoCodes[code];
        const created = new Date(promo.created_at);
        const expires = promo.expires_at ? new Date(promo.expires_at) : null;
        
        const formattedDate = created.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        let expirationText = 'Бессрочный';
        if (expires) {
            expirationText = expires.toLocaleDateString('ru-RU');
            if (new Date() > expires) {
                expirationText += ' (Истек)';
            }
        }
        
        return `
            <div class="promo-item">
                <div class="promo-item-header">
                    <div class="promo-code">${code}</div>
                    <div class="promo-status ${promo.is_active ? 'active' : 'inactive'}">
                        ${promo.is_active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}
                    </div>
                </div>
                
                <div class="promo-item-details">
                    <div class="detail-item">
                        <strong>Название:</strong>
                        ${promo.name || 'Без названия'}
                    </div>
                    
                    <div class="detail-item">
                        <strong>Очки:</strong>
                        ${promo.points}
                    </div>
                    
                    <div class="detail-item">
                        <strong>Активаций:</strong>
                        ${promo.activations || 0} / ${promo.max_activations}
                    </div>
                    
                    <div class="detail-item">
                        <strong>Создан:</strong>
                        ${formattedDate}
                    </div>
                    
                    <div class="detail-item">
                        <strong>Действует до:</strong>
                        ${expirationText}
                    </div>
                </div>
                
                <div class="promo-actions">
                    <button class="action-btn edit-btn" onclick="editPromoCode('${code}')">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button class="action-btn delete-btn" onclick="deletePromoCode('${code}')">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ
function updateStats() {
    const codes = Object.keys(allPromoCodes);
    
    // Общая статистика
    document.getElementById('total-promos').textContent = codes.length;
    
    // Активные промокоды
    const activePromos = codes.filter(code => allPromoCodes[code].is_active).length;
    
    // Общее количество активаций и очков
    let totalActivations = 0;
    let totalPoints = 0;
    
    codes.forEach(code => {
        const promo = allPromoCodes[code];
        totalActivations += promo.activations || 0;
        totalPoints += (promo.points || 0) * (promo.activations || 0);
    });
    
    document.getElementById('total-activations').textContent = totalActivations;
    document.getElementById('total-points-given').textContent = totalPoints;
    
    // Обновляем бейдж
    document.getElementById('promo-stats').textContent = 
        `${activePromos} активных / ${codes.length} всего`;
}

// ЗАГРУЗКА СТАТИСТИКИ АКТИВАЦИЙ
async function loadActivationStats() {
    try {
        // Загружаем последние активации
        const snapshot = await database.ref('promocode_activations')
            .orderByChild('timestamp')
            .limitToLast(10)
            .once('value');
            
        updateRecentActivations(snapshot.val());
        
        // Подсчитываем уникальных игроков
        const usersSnapshot = await database.ref('user_promocodes').once('value');
        if (usersSnapshot.exists()) {
            const users = Object.keys(usersSnapshot.val());
            document.getElementById('unique-players').textContent = users.length;
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
    }
}

// ОБНОВЛЕНИЕ ПОСЛЕДНИХ АКТИВАЦИЙ
function updateRecentActivations(activations) {
    const container = document.getElementById('recent-activations');
    
    if (!activations || Object.keys(activations).length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                <p>Пока нет активаций</p>
                <small>Как только промокоды будут активированы, они появятся здесь</small>
            </div>
        `;
        return;
    }
    
    // Преобразуем объект в массив и сортируем по дате
    const activationsArray = Object.values(activations);
    activationsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = activationsArray.map(activation => {
        const date = new Date(activation.timestamp);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="history-item">
                <div class="history-code">${activation.code}</div>
                <div class="history-info">
                    <div>${activation.user_nickname || 'Игрок'}</div>
                    <div class="history-date">${formattedDate} ${time}</div>
                </div>
                <div class="history-points">+${activation.points}</div>
            </div>
        `;
    }).join('');
}

// СОЗДАНИЕ ПРОМОКОДА
async function createPromoCode() {
    const nameInput = document.getElementById('promo-name');
    const pointsInput = document.getElementById('promo-points');
    const maxInput = document.getElementById('max-activations');
    const descInput = document.getElementById('promo-description');
    const expirationToggle = document.getElementById('expiration-toggle');
    const dateInput = document.getElementById('expiration-date');
    const timeInput = document.getElementById('expiration-time');
    const activeToggle = document.getElementById('active-toggle');
    
    // Получаем значения
    const name = nameInput.value.trim().toUpperCase();
    const points = parseInt(pointsInput.value);
    const maxActivations = parseInt(maxInput.value);
    const description = descInput.value.trim();
    const hasExpiration = expirationToggle.checked;
    const isActive = activeToggle.checked;
    
    // Валидация
    if (!name) {
        showError('Введите название промокода');
        return;
    }
    
    if (name.length < 3) {
        showError('Название промокода должно содержать минимум 3 символа');
        return;
    }
    
    if (points < 1 || points > 1000) {
        showError('Количество очков должно быть от 1 до 1000');
        return;
    }
    
    if (maxActivations < 1) {
        showError('Максимальное количество активаций должно быть положительным');
        return;
    }
    
    // Проверяем, существует ли уже такой промокод
    if (allPromoCodes[name]) {
        showError('Промокод с таким названием уже существует');
        return;
    }
    
    // Формируем данные промокода
    const promoData = {
        name: name,
        points: points,
        max_activations: maxActivations,
        activations: 0,
        is_active: isActive,
        created_at: new Date().toISOString(),
        created_by: userId,
        created_by_name: userNickname,
        description: description || 'Новогодний промокод',
        activated_by: []
    };
    
    // Добавляем срок действия если включено
    if (hasExpiration) {
        const expirationDate = new Date(dateInput.value + 'T' + timeInput.value);
        // Добавляем 3 часа для перевода в UTC (МСК = UTC+3)
        expirationDate.setHours(expirationDate.getHours() - 3);
        promoData.expires_at = expirationDate.toISOString();
    }
    
    // Показываем загрузку
    const createBtn = document.getElementById('create-promo-btn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> СОЗДАНИЕ...';
    
    try {
        // Сохраняем в Firebase
        await database.ref('promocodes/' + name).set(promoData);
        
        // Очищаем форму
        nameInput.value = '';
        pointsInput.value = '50';
        maxInput.value = '100';
        descInput.value = 'Новогодний промокод 2026!';
        
        // Показываем уведомление
        showNotification(`Промокод "${name}" успешно создан!`, 'success');
        
        // Создаем эффект успеха
        createConfetti(name);
        
        console.log(`✅ Промокод создан: ${name}, очков: ${points}`);
        
    } catch (error) {
        console.error('❌ Ошибка создания промокода:', error);
        showError('Ошибка создания промокода');
    } finally {
        // Восстанавливаем кнопку
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-save"></i> СОЗДАТЬ ПРОМОКОД';
    }
}

// ГЕНЕРАЦИЯ РАНДОМНОГО ПРОМОКОДА
function generatePromoCode() {
    const prefixes = ['NEWYEAR', 'JOJOLAND', 'HOLIDAY', 'WINTER', 'GIFT', 'BONUS', 'FESTIVE'];
    const suffixes = ['2026', 'XMAS', 'CODE', 'REWARD', 'PROMO', 'BONUS'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const generatedCode = `${prefix}${suffix}${randomNum}`;
    
    // Вставляем в поле ввода
    document.getElementById('promo-name').value = generatedCode;
    
    // Показываем уведомление
    showNotification(`Сгенерирован промокод: ${generatedCode}`, 'info');
}

// РЕДАКТИРОВАНИЕ ПРОМОКОДА
function editPromoCode(code) {
    const promo = allPromoCodes[code];
    if (!promo) return;
    
    currentEditCode = code;
    
    // Создаем форму редактирования
    const modalContent = document.getElementById('edit-modal-content');
    const expiresAt = promo.expires_at ? new Date(promo.expires_at) : null;
    
    // Добавляем 3 часа для перевода в МСК
    if (expiresAt) {
        expiresAt.setHours(expiresAt.getHours() + 3);
    }
    
    modalContent.innerHTML = `
        <div class="form-grid">
            <div class="input-group">
                <label class="input-label">Код промокода</label>
                <input 
                    type="text" 
                    id="edit-code" 
                    class="code-input" 
                    value="${code}"
                    readonly
                    style="background: rgba(255,255,255,0.1);"
                >
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="edit-points">Очки</label>
                    <input 
                        type="number" 
                        id="edit-points" 
                        class="form-input" 
                        value="${promo.points}"
                        min="1" 
                        max="1000"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="edit-max">Макс. активаций</label>
                    <input 
                        type="number" 
                        id="edit-max" 
                        class="form-input" 
                        value="${promo.max_activations}"
                        min="${promo.activations || 0}"
                        max="100000"
                    >
                </div>
            </div>
            
            <div class="switch-group">
                <span class="switch-label">Срок действия</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="edit-expiration-toggle" ${promo.expires_at ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            
            <div id="edit-expiration-fields" style="display: ${promo.expires_at ? 'block' : 'none'};">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="edit-expiration-date">Дата окончания</label>
                        <input 
                            type="date" 
                            id="edit-expiration-date" 
                            class="form-input"
                            value="${expiresAt ? expiresAt.toISOString().split('T')[0] : '2025-12-31'}"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="edit-expiration-time">Время (МСК)</label>
                        <input 
                            type="time" 
                            id="edit-expiration-time" 
                            class="form-input"
                            value="${expiresAt ? expiresAt.toTimeString().substring(0,5) : '23:59'}"
                        >
                    </div>
                </div>
            </div>
            
            <div class="switch-group">
                <span class="switch-label">Активен</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="edit-active-toggle" ${promo.is_active ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            
            <div class="input-group">
                <label class="input-label" for="edit-description">Описание</label>
                <textarea 
                    id="edit-description" 
                    class="form-input" 
                    rows="3"
                >${promo.description || ''}</textarea>
            </div>
            
            <div class="detail-item">
                <strong>Создан:</strong> ${new Date(promo.created_at).toLocaleDateString('ru-RU')}
            </div>
            
            <div class="detail-item">
                <strong>Активаций:</strong> ${promo.activations || 0} из ${promo.max_activations}
            </div>
            
            ${promo.activations > 0 ? `
            <div class="detail-item">
                <strong>Последняя активация:</strong> 
                ${promo.last_activated ? new Date(promo.last_activated).toLocaleDateString('ru-RU') : 'Никогда'}
            </div>
            ` : ''}
        </div>
    `;
    
    // Показываем модальное окно
    document.getElementById('edit-modal').style.display = 'flex';
    
    // Настраиваем переключатель срока действия
    const expirationToggle = document.getElementById('edit-expiration-toggle');
    const expirationFields = document.getElementById('edit-expiration-fields');
    
    expirationToggle.addEventListener('change', function() {
        expirationFields.style.display = this.checked ? 'block' : 'none';
    });
}

// СОХРАНЕНИЕ ИЗМЕНЕНИЙ ПРОМОКОДА
async function savePromoEdit() {
    if (!currentEditCode) return;
    
    const points = parseInt(document.getElementById('edit-points').value);
    const maxActivations = parseInt(document.getElementById('edit-max').value);
    const description = document.getElementById('edit-description').value.trim();
    const hasExpiration = document.getElementById('edit-expiration-toggle').checked;
    const isActive = document.getElementById('edit-active-toggle').checked;
    
    // Валидация
    if (points < 1 || points > 1000) {
        showError('Количество очков должно быть от 1 до 1000');
        return;
    }
    
    if (maxActivations < (allPromoCodes[currentEditCode].activations || 0)) {
        showError('Максимальное количество активаций не может быть меньше текущего');
        return;
    }
    
    // Формируем обновленные данные
    const updates = {
        points: points,
        max_activations: maxActivations,
        is_active: isActive,
        description: description || 'Промокод',
        updated_at: new Date().toISOString(),
        updated_by: userId
    };
    
    // Добавляем срок действия если включено
    if (hasExpiration) {
        const dateInput = document.getElementById('edit-expiration-date').value;
        const timeInput = document.getElementById('edit-expiration-time').value;
        
        if (dateInput && timeInput) {
            const expirationDate = new Date(dateInput + 'T' + timeInput);
            // Добавляем 3 часа для перевода в UTC (МСК = UTC+3)
            expirationDate.setHours(expirationDate.getHours() - 3);
            updates.expires_at = expirationDate.toISOString();
        }
    } else {
        updates.expires_at = null;
    }
    
    try {
        // Сохраняем изменения
        await database.ref('promocodes/' + currentEditCode).update(updates);
        
        // Закрываем модальное окно
        closeEditModal();
        
        // Показываем уведомление
        showNotification(`Промокод "${currentEditCode}" обновлен!`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения промокода:', error);
        showError('Ошибка сохранения изменений');
    }
}

// УДАЛЕНИЕ ПРОМОКОДА
async function deletePromoCode(code) {
    if (!confirm(`Вы уверены, что хотите удалить промокод "${code}"?`)) {
        return;
    }
    
    try {
        await database.ref('promocodes/' + code).remove();
        showNotification(`Промокод "${code}" удален`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка удаления промокода:', error);
        showError('Ошибка удаления промокода');
    }
}

// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    currentEditCode = null;
}

// СОЗДАНИЕ КОНФЕТТИ
function createConfetti(code) {
    const container = document.querySelector('.create-form');
    
    for (let i = 0; i < 15; i++) {
        const confetti = document.createElement('div');
        confetti.innerHTML = '🎉';
        confetti.style.position = 'absolute';
        confetti.style.fontSize = Math.random() * 20 + 15 + 'px';
        confetti.style.color = ['#9400d3', '#8a2be2', '#9370db', '#ff00ff'][Math.floor(Math.random() * 4)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-50px';
        confetti.style.zIndex = '1000';
        confetti.style.opacity = '0';
        confetti.style.pointerEvents = 'none';
        
        container.appendChild(confetti);
        
        // Анимация падения
        confetti.animate([
            { 
                opacity: 0, 
                transform: 'translateY(0) rotate(0deg)',
                offset: 0 
            },
            { 
                opacity: 1, 
                transform: `translateY(${Math.random() * 200 + 100}px) rotate(${Math.random() * 360}deg)`,
                offset: 0.3 
            },
            { 
                opacity: 0, 
                transform: `translateY(${Math.random() * 400 + 200}px) rotate(${Math.random() * 720}deg)`,
                offset: 1 
            }
        ], {
            duration: 2000 + Math.random() * 2000,
            easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
        });
        
        // Удаление после анимации
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 4000);
    }
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Кнопка создания промокода
    document.getElementById('create-promo-btn').addEventListener('click', createPromoCode);
    
    // Кнопка генерации промокода
    document.getElementById('generate-promo-btn').addEventListener('click', generatePromoCode);
    
    // Переключатель срока действия
    const expirationToggle = document.getElementById('expiration-toggle');
    const expirationFields = document.getElementById('expiration-fields');
    
    expirationToggle.addEventListener('change', function() {
        expirationFields.style.display = this.checked ? 'block' : 'none';
    });
    
    // Кнопки модального окна
    document.getElementById('save-edit-btn').addEventListener('click', savePromoEdit);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    
    // Закрытие модального окна по клику на фон
    document.getElementById('edit-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
    
    // Автоматический ввод заглавными буквами
    document.getElementById('promo-name').addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
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

// Экспортируем функции для использования в HTML
window.editPromoCode = editPromoCode;
window.deletePromoCode = deletePromoCode;
