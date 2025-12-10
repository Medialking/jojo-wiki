// ==================== ОБЩИЕ ФУНКЦИИ АДМИН-ПАНЕЛИ ====================

// Инициализация Firebase (если еще не инициализировано)
function initFirebase() {
    if (!firebase.apps.length) {
        const firebaseConfig = {
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
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Ошибка форматирования даты:', error);
        return 'Неизвестно';
    }
}

// Форматирование времени (только время)
function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '--:--';
        
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Ошибка форматирования времени:', error);
        return '--:--';
    }
}

// Получение IP пользователя
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Ошибка получения IP:', error);
        return 'unknown';
    }
}

// Получение информации о пользователе
async function getUserInfo(userId) {
    try {
        const snapshot = await database.ref('users/' + userId).once('value');
        
        if (!snapshot.exists()) {
            return null;
        }
        
        return {
            id: userId,
            ...snapshot.val()
        };
        
    } catch (error) {
        console.error('Ошибка получения информации о пользователе:', error);
        return null;
    }
}

// Создание элемента уведомления
function createNotification(type, title, message, duration = 5000) {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-icon">${getNotificationIcon(type)}</div>
            <div class="notification-title">${title}</div>
        </div>
        <div class="notification-message">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Показываем
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Автоматически скрываем
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    return notification;
}

// Создание контейнера для уведомлений, если его нет
function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;
    document.body.appendChild(container);
    
    // Добавляем стили для уведомлений
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            background: rgba(0,0,0,0.9);
            border-radius: 15px;
            padding: 20px;
            border-left: 5px solid;
            max-width: 400px;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            backdrop-filter: blur(10px);
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-success { border-color: #00cc66; }
        .notification-error { border-color: #ff3333; }
        .notification-warning { border-color: #ff9900; }
        .notification-info { border-color: #0066ff; }
        
        .notification-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .notification-icon {
            font-size: 20px;
        }
        
        .notification-title {
            font-weight: bold;
            color: white;
            font-size: 16px;
        }
        
        .notification-message {
            color: #ccccff;
            font-size: 14px;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);
    
    return container;
}

// Иконки для уведомлений
function getNotificationIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    
    return icons[type] || '📢';
}

// Создание загрузчика
function createLoader(text = 'Загрузка...') {
    const loader = document.createElement('div');
    loader.className = 'admin-loader';
    loader.innerHTML = `
        <div style="text-align: center;">
            <div class="admin-loader"></div>
            <p style="color: #6ab7ff; margin-top: 15px;">${text}</p>
        </div>
    `;
    
    return loader;
}

// Создание пустого состояния
function createEmptyState(icon = '📭', message = 'Данные не найдены') {
    const emptyState = document.createElement('div');
    emptyState.className = 'admin-empty-state';
    emptyState.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">${icon}</div>
        <div style="color: #aaa; font-size: 16px;">${message}</div>
    `;
    
    return emptyState;
}

// Проверка является ли пользователь админом
async function isUserAdmin(userId) {
    try {
        // Проверяем поле rank
        const userSnapshot = await database.ref('users/' + userId).once('value');
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            if (userData.rank === 'admin') {
                return true;
            }
        }
        
        // Проверяем в списке админов
        const adminSnapshot = await database.ref('admins/' + userId).once('value');
        if (adminSnapshot.exists() && adminSnapshot.val() === true) {
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
        return false;
    }
}

// Получение списка всех пользователей с рангом
async function getUsersWithRank(rank = null) {
    try {
        const snapshot = await database.ref('users').once('value');
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const users = [];
        
        snapshot.forEach(child => {
            const user = child.val();
            user.id = child.key;
            
            if (rank === null || user.rank === rank) {
                users.push(user);
            }
        });
        
        return users;
        
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        return [];
    }
}

// Экспорт данных в JSON
function exportToJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', filename || 'export.json');
    linkElement.click();
}

// Конвертация Base64 в Blob (для аватаров)
function base64ToBlob(base64, contentType = '') {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
}

// Обрезка текста
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
}

// Генерация случайного цвета
function getRandomColor() {
    const colors = [
        '#0066ff', '#00cc66', '#ff9900', '#ff3333', 
        '#9900ff', '#ff00ff', '#00ffff', '#ffff00'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
}

// Копирование текста в буфер обмена
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        createNotification('success', 'Скопировано', 'Текст скопирован в буфер обмена');
        return true;
    } catch (error) {
        console.error('Ошибка копирования:', error);
        
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        createNotification('success', 'Скопировано', 'Текст скопирован в буфер обмена');
        return true;
    }
}

// Экспортируем функции
window.initFirebase = initFirebase;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.getUserIP = getUserIP;
window.getUserInfo = getUserInfo;
window.createNotification = createNotification;
window.createLoader = createLoader;
window.createEmptyState = createEmptyState;
window.isUserAdmin = isUserAdmin;
window.getUsersWithRank = getUsersWithRank;
window.exportToJSON = exportToJSON;
window.base64ToBlob = base64ToBlob;
window.truncateText = truncateText;
window.getRandomColor = getRandomColor;
window.copyToClipboard = copyToClipboard;
