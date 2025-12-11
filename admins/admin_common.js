// ==================== ОБЩИЕ ФУНКЦИИ АДМИН-ПАНЕЛИ (С ИКОНКАМИ FA) ====================

// Инициализация Firebase (если еще не инициализировано)
function initFirebase() {
    if (!firebase.apps.length) {
        const firebaseConfig = {
            // ВАШИ СУЩЕСТВУЮЩИЕ НАСТРОЙКИ (не менять!)
            apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
            authDomain: "jojoland-chat.firebaseapp.com",
            databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
            projectId: "jojoland-chat",
            storageBucket: "jojoland-chat.firebasestorage.app",
            messagingSenderId: "602788305122",
            appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
        };
        
        firebase.initializeApp(firebaseConfig);
    }
    
    window.database = firebase.database();
    return window.database;
}

// Форматирование даты
function formatDate(timestamp) {
    if (!timestamp) return 'Неизвестно';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Неизвестно';
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (e) { return 'Ошибка формата'; }
}

// Форматирование времени
function formatTime(timestamp) {
    if (!timestamp) return 'Неизвестно';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Неизвестно';
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return 'Ошибка формата'; }
}

// ==================== УВЕДОМЛЕНИЯ (ТОСТЫ) ====================
/**
 * Создает и отображает неблокирующее Тост-уведомление.
 * @param {'success'|'error'|'info'|'warning'} type - Тип уведомления.
 * @param {string} title - Заголовок.
 * @param {string} message - Текст сообщения.
 */
function createNotification(type, title, message) {
    let container = document.getElementById('notification-container');
    if (!container) {
        // Если контейнера нет, создаем его (для файлов, где он не был добавлен)
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    let iconHtml = '';
    if (type === 'success') iconHtml = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') iconHtml = '<i class="fas fa-exclamation-circle"></i>';
    else if (type === 'warning') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
    else iconHtml = '<i class="fas fa-info-circle"></i>';

    notification.innerHTML = `${iconHtml}<div><div style="font-weight: bold; margin-bottom: 3px;">${title}</div><div style="font-size: 13px;">${message}</div></div>`;

    container.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300);
    }, 5000);
}


// ==================== ЛОГИРОВАНИЕ ДЕЙСТВИЙ АДМИНА ====================
/**
 * Логирует действие администратора.
 * @param {string} action - Тип действия ('login', 'ban', 'status_change').
 * @param {string} description - Детальное описание.
 * @param {string} adminName - Имя администратора.
 */
async function logAdminAction(action, description, adminName = window.currentAdmin?.adminName || 'Система') {
    if (!window.database) return; 

    let adminIp = 'N/A';
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        adminIp = data.ip;
    } catch (e) {
        console.warn("Не удалось получить IP для логирования.");
    }

    try {
        await window.database.ref('admin_actions').push({
            action: action,
            description: description,
            adminName: adminName,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            ip: adminIp,
            admin_uid: window.currentAdmin?.uid || 'N/A'
        });
    } catch (error) {
        console.error('Ошибка логирования в Firebase:', error);
    }
}

initFirebase();

window.formatDate = formatDate;
window.formatTime = formatTime;
window.createNotification = createNotification;
window.logAdminAction = logAdminAction;
