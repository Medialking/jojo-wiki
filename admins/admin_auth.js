// ==================== ОБЩИЕ НАСТРОЙКИ ====================
const ADMIN_CONFIG = {
    PASSWORD: "74568921mm",
    SUPER_ADMIN_ID: "limdo7572",
    SESSION_KEY: "admin_session_active"
};

// ==================== ПРОВЕРКА АВТОРИЗАЦИИ ====================
async function checkAdminAuth() {
    try {
        const adminSession = localStorage.getItem(ADMIN_CONFIG.SESSION_KEY);
        const adminPassword = localStorage.getItem('adminPassword');
        const currentUserId = localStorage.getItem('jojoland_userId');
        
        if (!currentUserId) {
            return { success: false, message: 'Пользователь не авторизован' };
        }
        
        // Проверяем пароль
        if (adminSession !== 'active' || adminPassword !== ADMIN_CONFIG.PASSWORD) {
            return { success: false, message: 'Неверный пароль или сессия истекла' };
        }
        
        // Проверяем права (админ или супер-админ)
        if (currentUserId === ADMIN_CONFIG.SUPER_ADMIN_ID) {
            return { 
                success: true, 
                message: 'Доступ разрешен как супер-администратор',
                adminName: 'Супер-Администратор',
                isSuperAdmin: true
            };
        }
        
        // Проверяем в базе данных
        const adminSnapshot = await database.ref('admins/' + currentUserId).once('value');
        const userSnapshot = await database.ref('users/' + currentUserId).once('value');
        
        let isAdmin = false;
        let adminName = 'Администратор';
        
        if (adminSnapshot.exists() && adminSnapshot.val() === true) {
            isAdmin = true;
        }
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            if (userData.rank === 'admin') {
                isAdmin = true;
            }
            if (userData.nickname) {
                adminName = userData.nickname;
            }
        }
        
        if (isAdmin) {
            return { 
                success: true, 
                message: 'Доступ разрешен как администратор',
                adminName: adminName,
                isSuperAdmin: false
            };
        }
        
        return { success: false, message: 'У вас недостаточно прав' };
        
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return { success: false, message: 'Ошибка проверки доступа' };
    }
}

// ==================== ВХОД В АДМИН-ПАНЕЛЬ ====================
async function adminLogin(password) {
    try {
        if (password !== ADMIN_CONFIG.PASSWORD) {
            return { success: false, message: 'Неверный пароль' };
        }
        
        const currentUserId = localStorage.getItem('jojoland_userId');
        if (!currentUserId) {
            return { success: false, message: 'Сначала войдите в аккаунт' };
        }
        
        // Проверяем права
        const authResult = await checkAdminAuth();
        if (!authResult.success) {
            return authResult;
        }
        
        // Сохраняем сессию
        localStorage.setItem(ADMIN_CONFIG.SESSION_KEY, 'active');
        localStorage.setItem('adminPassword', ADMIN_CONFIG.PASSWORD);
        localStorage.setItem('adminName', authResult.adminName);
        
        // Логируем вход
        await logAdminAction('login', 'Вход в админ-панель');
        
        return { 
            success: true, 
            message: 'Вход выполнен успешно',
            adminName: authResult.adminName,
            isSuperAdmin: authResult.isSuperAdmin
        };
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        return { success: false, message: 'Ошибка входа в систему' };
    }
}

// ==================== ВЫХОД ИЗ АДМИН-ПАНЕЛИ ====================
function adminLogout() {
    const adminName = localStorage.getItem('adminName') || 'Администратор';
    
    // Логируем выход
    logAdminAction('logout', 'Выход из админ-панели');
    
    localStorage.removeItem(ADMIN_CONFIG.SESSION_KEY);
    localStorage.removeItem('adminPassword');
    localStorage.removeItem('adminName');
    
    return { success: true, message: `Выход выполнен (${adminName})` };
}

// ==================== ЛОГИРОВАНИЕ ДЕЙСТВИЙ ====================
async function logAdminAction(action, description, targetId = null) {
    try {
        const adminId = localStorage.getItem('jojoland_userId') || 'system';
        const adminName = localStorage.getItem('adminName') || 'Администратор';
        
        // Получаем IP
        let ip = 'unknown';
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ip = data.ip;
        } catch (e) {}
        
        const logEntry = {
            action: action,
            description: description,
            adminId: adminId,
            adminName: adminName,
            adminIP: ip,
            targetId: targetId,
            timestamp: Date.now()
        };
        
        await database.ref('admin_logs').push(logEntry);
        
    } catch (error) {
        console.error('Ошибка логирования:', error);
    }
}

// Экспортируем функции
window.ADMIN_CONFIG = ADMIN_CONFIG;
window.checkAdminAuth = checkAdminAuth;
window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.logAdminAction = logAdminAction;
