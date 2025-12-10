/*********************************
 *  JOJOLAND ADMIN AUTH SYSTEM
 *  Работает без консоли
 *********************************/

const ADMIN_CONFIG = {
    PASSWORD: 'Jojoland2024!',
    SESSION_KEY: 'jojoland_admin_session',
    SUPER_ADMIN_ID: 'limdo7572'
};

/* ===============================
   АВТО-ПРОВЕРКА ПРИ ЗАГРУЗКЕ
================================ */
(function () {
    const session = localStorage.getItem(ADMIN_CONFIG.SESSION_KEY);
    const pass = localStorage.getItem('adminPassword');

    if (session === 'active' && pass === ADMIN_CONFIG.PASSWORD) {
        if (!localStorage.getItem('jojoland_userId')) {
            localStorage.setItem(
                'jojoland_userId',
                ADMIN_CONFIG.SUPER_ADMIN_ID
            );
        }
    } else {
        // если не главная страница — выкидываем
        if (!location.href.includes('admin_main.html')) {
            redirectToLogin();
        }
    }
})();

/* ===============================
   ВХОД В АДМИНКУ
================================ */
async function adminLogin(password) {
    try {
        if (password !== ADMIN_CONFIG.PASSWORD) {
            return { success: false, message: 'Неверный пароль' };
        }

        // создаём ID админа автоматически
        let userId = localStorage.getItem('jojoland_userId');
        if (!userId) {
            userId = ADMIN_CONFIG.SUPER_ADMIN_ID;
            localStorage.setItem('jojoland_userId', userId);
        }

        // создаём сессию
        localStorage.setItem(ADMIN_CONFIG.SESSION_KEY, 'active');
        localStorage.setItem('adminPassword', password);
        localStorage.setItem('adminName', 'Супер-Администратор');

        return {
            success: true,
            message: 'Вход выполнен',
            adminName: 'Супер-Администратор',
            isSuperAdmin: true
        };

    } catch (e) {
        console.error(e);
        return { success: false, message: 'Ошибка входа' };
    }
}

/* ===============================
   ПРОВЕРКА ДОСТУПА
================================ */
async function checkAdminAuth() {
    const session = localStorage.getItem(ADMIN_CONFIG.SESSION_KEY);
    const pass = localStorage.getItem('adminPassword');

    if (session !== 'active' || pass !== ADMIN_CONFIG.PASSWORD) {
        return { success: false };
    }

    if (!localStorage.getItem('jojoland_userId')) {
        localStorage.setItem(
            'jojoland_userId',
            ADMIN_CONFIG.SUPER_ADMIN_ID
        );
    }

    return {
        success: true,
        adminName: localStorage.getItem('adminName') || 'Администратор',
        isSuperAdmin: true
    };
}

/* ===============================
   ВЫХОД
================================ */
function adminLogout() {
    localStorage.removeItem(ADMIN_CONFIG.SESSION_KEY);
    localStorage.removeItem('adminPassword');
    localStorage.removeItem('adminName');
    redirectToLogin();
}

/* ===============================
   РЕДИРЕКТ НА ЛОГИН
================================ */
function redirectToLogin() {
    if (!location.href.includes('admin_main.html')) {
        location.href = 'admin_main.html';
    }
}
