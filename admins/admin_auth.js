// =================================================================
// 🛡️ admin_auth.js - БЕЗОПАСНАЯ АУТЕНТИФИКАЦИЯ (FIREBASE AUTH)
// =================================================================

// Зависит от того, что firebase.auth() инициализировано в admin_common.js
if (typeof firebase === 'undefined' || !firebase.apps.length) {
    console.error("Firebase не инициализирован. Убедитесь, что admin_common.js загружен первым.");
}
window.auth = firebase.auth(); 

const ADMIN_CONFIG = {
    SESSION_KEY: 'jojoland_admin_session',
    SUPER_ADMIN_ID: 'limdo7572'
};

let currentAdmin = {
    uid: null,
    email: null,
    isAdmin: false,
    adminName: 'Гость'
};

/* ===============================
   ВХОД
================================ */
async function adminLogin(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 1. Проверка авторизации и роли (Проверка в базе данных 'admins/{uid}')
        // ВАЖНО: Вы должны настроить эту проверку (см. пункт 2 в инструкциях)
        const snapshot = await database.ref(`admins/${user.uid}`).once('value');
        
        if (!snapshot.exists() || snapshot.val() !== true) {
            await auth.signOut();
            return { success: false, message: 'Доступ запрещен. У вас нет прав администратора.' };
        }

        // 2. Успешная авторизация
        localStorage.setItem(ADMIN_CONFIG.SESSION_KEY, 'active');
        localStorage.setItem('jojoland_userId', user.uid);
        localStorage.setItem('adminEmail', user.email);
        
        currentAdmin.uid = user.uid;
        currentAdmin.email = user.email;
        currentAdmin.isAdmin = true;
        currentAdmin.adminName = user.email.split('@')[0] || 'Администратор';
        localStorage.setItem('adminName', currentAdmin.adminName);
        
        logAdminAction("Успешный вход в панель", 'N/A', currentAdmin.adminName);
        
        return {
            success: true,
            message: 'Вход выполнен',
            adminName: currentAdmin.adminName,
            isSuperAdmin: true 
        };

    } catch (error) {
        let message = 'Ошибка входа. Проверьте данные.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = "Неверный Email или пароль.";
        }
        return { success: false, message: message };
    }
}

/* ===============================
   ПРОВЕРКА ДОСТУПА
================================ */
async function checkAdminAuth() {
    return new Promise(resolve => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const snapshot = await database.ref(`admins/${user.uid}`).once('value');
                
                if (snapshot.exists() && snapshot.val() === true) {
                    currentAdmin.uid = user.uid;
                    currentAdmin.email = user.email;
                    currentAdmin.isAdmin = true;
                    currentAdmin.adminName = localStorage.getItem('adminName') || user.email.split('@')[0] || 'Администратор';
                    
                    resolve({
                        success: true,
                        adminName: currentAdmin.adminName,
                        isSuperAdmin: true
                    });
                } else {
                    auth.signOut();
                    resolve({ success: false });
                }
            } else {
                resolve({ success: false });
            }
        });
    });
}

/* ===============================
   ВЫХОД
================================ */
function adminLogout() {
    logAdminAction("Выход из панели", 'N/A', currentAdmin.adminName);
    auth.signOut();
    localStorage.removeItem(ADMIN_CONFIG.SESSION_KEY);
    localStorage.removeItem('jojoland_userId');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
    redirectToLogin();
    return { success: true, message: 'Выход выполнен' };
}

/* ===============================
   РЕДИРЕКТ НА ЛОГИН
================================ */
function redirectToLogin() {
    if (!location.href.includes('admin_main.html')) {
        location.href = 'admin_main.html';
    }
}

// Запускаем проверку при загрузке, если нет сессии
(async function() {
    if (!localStorage.getItem(ADMIN_CONFIG.SESSION_KEY)) {
        const authStatus = await checkAdminAuth();
        if (!authStatus.success) {
            redirectToLogin();
        }
    }
})();

window.currentAdmin = currentAdmin; // Экспорт
