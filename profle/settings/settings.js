// settings.js - Исправленная версия с рабочим EmailJS

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Проверка авторизации
function checkAuth() {
    const isLoggedIn = localStorage.getItem('jojoland_loggedIn') === 'true';
    const nickname = localStorage.getItem('jojoland_nickname');
    const userId = localStorage.getItem('jojoland_userId');
    
    if (!isLoggedIn || !nickname || !userId) {
        return false;
    }
    
    return true;
}

// Хэширование пароля
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// Проверка силы пароля
function checkPasswordStrength(password) {
    const strength = {
        level: 0,
        text: "Слабый",
        class: "strength-weak"
    };
    
    if (password.length >= 8) strength.level++;
    if (/[A-Z]/.test(password)) strength.level++;
    if (/[0-9]/.test(password)) strength.level++;
    if (/[^A-Za-z0-9]/.test(password)) strength.level++;
    
    if (strength.level >= 4) {
        strength.text = "Сильный";
        strength.class = "strength-strong";
    } else if (strength.level >= 2) {
        strength.text = "Средний";
        strength.class = "strength-medium";
    }
    
    return strength;
}

// Отображение уведомления
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
        font-family: 'Orbitron', sans-serif;
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
    }, 5000);
}

// ==================== ИЗМЕНЕНИЕ ПАРОЛЯ ====================

async function changePassword(currentPassword, newPassword, confirmPassword) {
    const userId = localStorage.getItem('jojoland_userId');
    const nickname = localStorage.getItem('jojoland_nickname');
    
    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Заполните все поля', 'error');
        return false;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Новые пароли не совпадают', 'error');
        return false;
    }
    
    if (newPassword.length < 6) {
        showNotification('Новый пароль должен быть не менее 6 символов', 'error');
        return false;
    }
    
    if (currentPassword === newPassword) {
        showNotification('Новый пароль должен отличаться от старого', 'error');
        return false;
    }
    
    try {
        // Получаем данные пользователя
        const snapshot = await database.ref('users/' + userId).once('value');
        if (!snapshot.exists()) {
            showNotification('Пользователь не найден', 'error');
            return false;
        }
        
        const userData = snapshot.val();
        
        // Проверяем текущий пароль
        const currentHash = hashPassword(currentPassword);
        if (userData.passwordHash !== currentHash) {
            showNotification('Неверный текущий пароль', 'error');
            return false;
        }
        
        // Хэшируем новый пароль
        const newHash = hashPassword(newPassword);
        
        // Обновляем пароль в Firebase
        await database.ref('users/' + userId).update({
            passwordHash: newHash,
            passwordChangedAt: new Date().toISOString()
        });
        
        // Записываем в историю смен паролей
        await database.ref('security_logs/' + userId).push({
            type: 'password_change',
            timestamp: new Date().toISOString(),
            ip: await getClientIP()
        });
        
        showNotification('Пароль успешно изменен!', 'success');
        
        // Отправляем уведомление на почту (если привязана)
        if (userData.email && userData.emailVerified) {
            await sendEmailNotification(userId, 'password_change', {
                nickname: nickname,
                email: userData.email
            });
        }
        
        return true;
        
    } catch (error) {
        console.error('Ошибка изменения пароля:', error);
        showNotification('Ошибка сервера', 'error');
        return false;
    }
}

// ==================== EMAILJS КОНФИГУРАЦИЯ ====================

const EMAILJS_CONFIG = {
    serviceId: 'jojo_server',
    templateId: 'template_elaqg7b',
    userId: 'IHvmQp5Ke1gev_kzt'
};

// ==================== ОТПРАВКА EMAIL ====================

async function sendVerificationEmail(email, code, nickname) {
    console.log('Попытка отправки верификационного email...');
    console.log('Получатель:', email);
    console.log('Код:', code);
    console.log('Имя:', nickname);
    
    try {
        // Проверка email
        if (!email || !email.includes('@')) {
            console.error('Некорректный email:', email);
            return false;
        }
        
        // Проверка EmailJS
        if (typeof emailjs === 'undefined') {
            console.log('EmailJS не загружен, тестовый режим');
            return false;
        }
        
        // Инициализация EmailJS
        try {
            await emailjs.init(EMAILJS_CONFIG.userId);
            console.log('EmailJS инициализирован');
        } catch (initError) {
            console.log('EmailJS уже инициализирован или ошибка:', initError);
        }
        
        // ВАЖНО: EmailJS требует явно указать to_email
        // Ваш шаблон использует {{to_name}} и {{verification_code}}
        const templateParams = {
            to_email: email.trim(),           // ОБЯЗАТЕЛЬНОЕ поле для EmailJS
            to_name: nickname || 'Игрок',     // {{to_name}} в шаблоне
            verification_code: code           // {{verification_code}} в шаблоне
        };
        
        console.log('Отправка с параметрами:', templateParams);
        
        // Отправка через EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );
        
        console.log('✅ Email успешно отправлен! Статус:', response.status);
        console.log('Ответ:', response.text);
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка отправки email:', {
            status: error.status,
            text: error.text,
            details: error
        });
        
        // Попробуем альтернативный вариант параметров
        if (error.status === 422) {
            console.log('Пробуем альтернативный набор параметров...');
            
            try {
                // Альтернативный вариант
                const altTemplateParams = {
                    email: email.trim(),        // Возможно шаблон ожидает просто "email"
                    name: nickname || 'Игрок',
                    code: code
                };
                
                const altResponse = await emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.templateId,
                    altTemplateParams
                );
                
                console.log('✅ Email отправлен с альтернативными параметрами!');
                return true;
                
            } catch (altError) {
                console.error('❌ Альтернативный вариант тоже не сработал:', altError.text);
                return false;
            }
        }
        
        return false;
    }
}

// ==================== ПРИВЯЗКА И ПОДТВЕРЖДЕНИЕ EMAIL ====================

async function linkEmail(email) {
    const userId = localStorage.getItem('jojoland_userId');
    const nickname = localStorage.getItem('jojoland_nickname');
    
    console.log('Начало привязки email для пользователя:', userId, nickname);
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Введите корректный email', 'error');
        return false;
    }
    
    try {
        // Проверяем, не используется ли email другим пользователем
        const snapshot = await database.ref('users').once('value');
        let emailExists = false;
        
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData.email && 
                userData.email.toLowerCase() === email.toLowerCase() && 
                childSnapshot.key !== userId) {
                emailExists = true;
            }
        });
        
        if (emailExists) {
            showNotification('Этот email уже используется другим аккаунтом', 'error');
            return false;
        }
        
        // Генерируем код подтверждения
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Сгенерирован код:', verificationCode);
        
        // Сохраняем email с кодом подтверждения
        await database.ref('users/' + userId).update({
            email: email.toLowerCase(),
            emailVerified: false,
            emailVerificationCode: verificationCode,
            emailVerificationSentAt: new Date().toISOString()
        });
        
        console.log('Данные сохранены в Firebase, отправляем email...');
        
        // Отправляем email с кодом подтверждения
        const emailSent = await sendVerificationEmail(email, verificationCode, nickname);
        
        if (emailSent) {
            showNotification(`Код подтверждения отправлен на ${email}`, 'success');
            
            // Показываем поле для ввода кода
            document.getElementById('email-verification-section').style.display = 'block';
            document.getElementById('verification-code').focus();
            
            // Сохраняем email в localStorage
            localStorage.setItem('temp_email', email);
            
            // Запускаем таймер для кода
            startVerificationTimer();
        } else {
            // Режим тестирования - показываем код в уведомлении
            console.log('Режим тестирования - показываем код в уведомлении');
            showNotification(
                `<strong>Тестовый режим</strong><br>` +
                `Код подтверждения для ${email}:<br>` +
                `<div style="font-size: 24px; font-weight: bold; margin: 10px 0; color: #6200ff;">${verificationCode}</div>` +
                `В реальном приложении код будет отправлен на email.`,
                'info'
            );
            
            document.getElementById('email-verification-section').style.display = 'block';
            document.getElementById('verification-code').focus();
            localStorage.setItem('temp_email', email);
            startVerificationTimer();
        }
        
        return true;
        
    } catch (error) {
        console.error('Ошибка привязки email:', error);
        showNotification('Ошибка привязки email: ' + error.message, 'error');
        return false;
    }
}

// Таймер для кода подтверждения
function startVerificationTimer() {
    const timerElement = document.getElementById('verification-timer');
    const codeInput = document.getElementById('verification-code');
    const verifyBtn = document.getElementById('verify-email-btn');
    
    if (!timerElement) return;
    
    let seconds = 300; // 5 минут
    timerElement.style.display = 'block';
    
    const timer = setInterval(() => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerElement.textContent = `Код действителен: ${minutes}:${secs < 10 ? '0' : ''}${secs}`;
        
        if (seconds <= 0) {
            clearInterval(timer);
            timerElement.textContent = 'Код истек';
            timerElement.style.color = '#ff4444';
            codeInput.disabled = true;
            verifyBtn.disabled = true;
            
            // Очищаем код в Firebase через 5 минут
            setTimeout(async () => {
                const userId = localStorage.getItem('jojoland_userId');
                try {
                    await database.ref('users/' + userId).update({
                        emailVerificationCode: null
                    });
                    console.log('Код подтверждения очищен по истечении времени');
                } catch (error) {
                    console.error('Ошибка очистки кода:', error);
                }
            }, 300000); // 5 минут
        }
        
        seconds--;
    }, 1000);
}

async function verifyEmail(code) {
    const userId = localStorage.getItem('jojoland_userId');
    const email = localStorage.getItem('temp_email') || '';
    
    if (!code || code.length !== 6) {
        showNotification('Введите 6-значный код', 'error');
        return false;
    }
    
    try {
        const snapshot = await database.ref('users/' + userId).once('value');
        if (!snapshot.exists()) {
            showNotification('Пользователь не найден', 'error');
            return false;
        }
        
        const userData = snapshot.val();
        
        if (!userData.emailVerificationCode) {
            showNotification('Код подтверждения не найден или истек', 'error');
            return false;
        }
        
        if (userData.emailVerificationCode !== code) {
            showNotification('Неверный код подтверждения', 'error');
            return false;
        }
        
        // Проверяем время (код действителен 5 минут)
        const sentAt = new Date(userData.emailVerificationSentAt);
        const now = new Date();
        const minutesDiff = (now - sentAt) / (1000 * 60);
        
        if (minutesDiff > 5) {
            showNotification('Код подтверждения истек', 'error');
            return false;
        }
        
        // Подтверждаем email
        await database.ref('users/' + userId).update({
            emailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
            emailVerificationCode: null
        });
        
        showNotification('Email успешно подтвержден!', 'success');
        
        // Очищаем временный email
        localStorage.removeItem('temp_email');
        
        // Обновляем UI
        updateEmailUI(userData.email || email, true);
        
        // Скрываем таймер
        const timerElement = document.getElementById('verification-timer');
        if (timerElement) {
            timerElement.style.display = 'none';
        }
        
        return true;
        
    } catch (error) {
        console.error('Ошибка подтверждения email:', error);
        showNotification('Ошибка подтверждения email', 'error');
        return false;
    }
}

async function removeEmail() {
    if (!confirm('Вы уверены, что хотите отвязать email? Вы потеряете уведомления о безопасности.')) {
        return;
    }
    
    const userId = localStorage.getItem('jojoland_userId');
    
    try {
        await database.ref('users/' + userId).update({
            email: null,
            emailVerified: false,
            emailVerifiedAt: null,
            emailVerificationCode: null
        });
        
        showNotification('Email успешно отвязан', 'success');
        
        // Обновляем UI
        updateEmailUI('', false);
        
    } catch (error) {
        console.error('Ошибка отвязки email:', error);
        showNotification('Ошибка сервера', 'error');
    }
}

// ==================== ОТПРАВКА УВЕДОМЛЕНИЙ ====================

async function sendEmailNotification(userId, type, data = {}) {
    try {
        // Получаем email пользователя
        const snapshot = await database.ref('users/' + userId).once('value');
        if (!snapshot.exists()) return false;
        
        const userData = snapshot.val();
        if (!userData.email || !userData.emailVerified) return false;
        
        // Проверяем настройки уведомлений
        const notifications = userData.notifications || {};
        if (notifications[type] === false) return false;
        
        // Готовим письмо в зависимости от типа
        const templates = {
            'password_change': {
                subject: 'Смена пароля - JojoLand',
                message: `Пароль для вашего аккаунта ${userData.nickname} был изменен. Если это были не вы, немедленно свяжитесь с поддержкой.`
            },
            'email_change': {
                subject: 'Изменение email - JojoLand',
                message: `Email вашего аккаунта ${userData.nickname} был изменен.`
            }
        };
        
        const template = templates[type] || {
            subject: 'Уведомление - JojoLand',
            message: 'У вас новое уведомление.'
        };
        
        // Если EmailJS доступен, отправляем письмо
        if (typeof emailjs !== 'undefined') {
            try {
                await emailjs.init(EMAILJS_CONFIG.userId);
                
                await emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.templateId,
                    {
                        to_name: userData.nickname,
                        verification_code: 'УВЕДОМЛЕНИЕ',
                        subject: template.subject,
                        message: template.message
                    }
                );
                
                console.log(`Email уведомление отправлено на ${userData.email}`);
            } catch (emailError) {
                console.error('Ошибка отправки уведомления:', emailError);
            }
        }
        
        // Сохраняем в лог
        await database.ref('email_logs/' + userId).push({
            type: type,
            timestamp: new Date().toISOString(),
            sent: true,
            message: template.message
        });
        
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки уведомления:', error);
        return false;
    }
}

// ==================== НАСТРОЙКИ КОНФИДЕНЦИАЛЬНОСТИ ====================

async function updatePrivacySettings(settings) {
    const userId = localStorage.getItem('jojoland_userId');
    
    try {
        await database.ref('users/' + userId + '/privacy').update(settings);
        
        showNotification('Настройки конфиденциальности обновлены', 'success');
        return true;
        
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        showNotification('Ошибка сервера', 'error');
        return false;
    }
}

// ==================== НАСТРОЙКИ УВЕДОМЛЕНИЙ ====================

async function updateNotificationSettings(settings) {
    const userId = localStorage.getItem('jojoland_userId');
    
    try {
        await database.ref('users/' + userId + '/notifications').update(settings);
        
        showNotification('Настройки уведомлений обновлены', 'success');
        return true;
        
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        showNotification('Ошибка сервера', 'error');
        return false;
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Неизвестно';
    }
}

function updateEmailUI(email, verified) {
    const emailDisplay = document.getElementById('email-display');
    const emailStatus = document.getElementById('email-status');
    const linkEmailSection = document.getElementById('link-email-section');
    const verifiedEmailSection = document.getElementById('verified-email-section');
    const emailVerificationSection = document.getElementById('email-verification-section');
    const verificationTimer = document.getElementById('verification-timer');
    
    if (email && verified) {
        emailDisplay.textContent = email;
        emailStatus.textContent = 'Подтвержден';
        emailStatus.className = 'card-status verified';
        
        linkEmailSection.style.display = 'none';
        verifiedEmailSection.style.display = 'block';
        emailVerificationSection.style.display = 'none';
        if (verificationTimer) verificationTimer.style.display = 'none';
    } else if (email && !verified) {
        // Email есть, но не подтвержден
        emailDisplay.textContent = email;
        emailStatus.textContent = 'Ожидает подтверждения';
        emailStatus.className = 'card-status partial';
        
        linkEmailSection.style.display = 'none';
        verifiedEmailSection.style.display = 'block';
        emailVerificationSection.style.display = 'block';
        if (verificationTimer) verificationTimer.style.display = 'block';
    } else {
        // Нет email
        emailDisplay.textContent = 'Не указан';
        emailStatus.textContent = 'Не привязан';
        emailStatus.className = 'card-status disabled';
        
        linkEmailSection.style.display = 'block';
        verifiedEmailSection.style.display = 'none';
        emailVerificationSection.style.display = 'none';
        if (verificationTimer) verificationTimer.style.display = 'none';
    }
}

async function loadUserSettings() {
    const userId = localStorage.getItem('jojoland_userId');
    
    try {
        const snapshot = await database.ref('users/' + userId).once('value');
        if (!snapshot.exists()) {
            showNotification('Пользователь не найден', 'error');
            window.location.href = '../../index.html';
            return;
        }
        
        const userData = snapshot.val();
        
        // Обновляем email UI
        if (userData.email) {
            updateEmailUI(userData.email, userData.emailVerified || false);
        }
        
        // Загружаем настройки конфиденциальности
        if (userData.privacy) {
            document.getElementById('privacy-profile-view').checked = userData.privacy.profileView !== false;
            document.getElementById('privacy-online-status').checked = userData.privacy.onlineStatus !== false;
            document.getElementById('privacy-show-email').checked = userData.privacy.showEmail === true;
            document.getElementById('privacy-show-achievements').checked = userData.privacy.showAchievements !== false;
        }
        
        // Загружаем настройки уведомлений
        if (userData.notifications) {
            document.getElementById('notify-login').checked = userData.notifications.login !== false;
            document.getElementById('notify-password-change').checked = userData.notifications.passwordChange !== false;
            document.getElementById('notify-email-change').checked = userData.notifications.emailChange !== false;
            document.getElementById('notify-security-alerts').checked = userData.notifications.securityAlerts !== false;
        }
        
        // Загружаем историю входов
        await loadLoginHistory(userId);
        
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        showNotification('Ошибка загрузки настроек', 'error');
    }
}

async function loadLoginHistory(userId) {
    try {
        const snapshot = await database.ref('login_history/' + userId).orderByChild('timestamp').limitToLast(10).once('value');
        const historyContainer = document.getElementById('login-history');
        
        if (!snapshot.exists()) {
            historyContainer.innerHTML = '<div style="text-align: center; color: #aaaaff; padding: 20px;">История входов пуста</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach((childSnapshot) => {
            const login = childSnapshot.val();
            const date = new Date(login.timestamp);
            const timeStr = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            html += `
                <div class="login-item">
                    <div>
                        <div style="color: white; margin-bottom: 5px; font-weight: bold;">${login.ip || 'Неизвестно'}</div>
                        <div class="login-time">${timeStr}</div>
                    </div>
                    <div class="login-status ${login.success === false ? 'failed' : ''}">
                        ${login.success === false ? 'Неудачно' : 'Успешно'}
                    </div>
                </div>
            `;
        });
        
        historyContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

function setupEventListeners() {
    // Изменение пароля
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            const success = await changePassword(currentPassword, newPassword, confirmPassword);
            if (success) {
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                
                const strengthContainer = document.getElementById('password-strength');
                strengthContainer.className = 'password-strength';
                strengthContainer.querySelector('.strength-fill').style.width = '0%';
                strengthContainer.querySelector('.strength-text').textContent = '';
            }
        });
    }
    
    // Индикатор силы пароля
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const strength = checkPasswordStrength(this.value);
            const strengthContainer = document.getElementById('password-strength');
            
            strengthContainer.className = `password-strength ${strength.class}`;
            strengthContainer.querySelector('.strength-fill').style.width = `${strength.level * 25}%`;
            strengthContainer.querySelector('.strength-text').textContent = strength.text;
        });
    }
    
    // Привязка email
    const linkEmailBtn = document.getElementById('link-email-btn');
    if (linkEmailBtn) {
        linkEmailBtn.addEventListener('click', async () => {
            const email = document.getElementById('email-input').value.trim();
            if (!email) {
                showNotification('Введите email адрес', 'error');
                return;
            }
            await linkEmail(email);
        });
    }
    
    // Подтверждение email
    const verifyEmailBtn = document.getElementById('verify-email-btn');
    if (verifyEmailBtn) {
        verifyEmailBtn.addEventListener('click', async () => {
            const code = document.getElementById('verification-code').value.trim();
            await verifyEmail(code);
        });
    }
    
    // Отвязка email
    const removeEmailBtn = document.getElementById('remove-email-btn');
    if (removeEmailBtn) {
        removeEmailBtn.addEventListener('click', removeEmail);
    }
    
    // Сохранение настроек конфиденциальности
    const savePrivacyBtn = document.getElementById('save-privacy-btn');
    if (savePrivacyBtn) {
        savePrivacyBtn.addEventListener('click', async () => {
            const settings = {
                profileView: document.getElementById('privacy-profile-view').checked,
                onlineStatus: document.getElementById('privacy-online-status').checked,
                showEmail: document.getElementById('privacy-show-email').checked,
                showAchievements: document.getElementById('privacy-show-achievements').checked
            };
            
            await updatePrivacySettings(settings);
        });
    }
    
    // Сохранение настроек уведомлений
    const saveNotificationsBtn = document.getElementById('save-notifications-btn');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', async () => {
            const settings = {
                login: document.getElementById('notify-login').checked,
                passwordChange: document.getElementById('notify-password-change').checked,
                emailChange: document.getElementById('notify-email-change').checked,
                securityAlerts: document.getElementById('notify-security-alerts').checked
            };
            
            await updateNotificationSettings(settings);
        });
    }
    
    // Переключение видимости пароля
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const inputId = this.getAttribute('data-target');
            const input = document.getElementById(inputId);
            
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '👁️‍🗨️';
            } else {
                input.type = 'password';
                this.textContent = '👁️';
            }
        });
    });
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                localStorage.removeItem('jojoland_nickname');
                localStorage.removeItem('jojoland_userId');
                localStorage.removeItem('jojoland_loggedIn');
                localStorage.removeItem('temp_email');
                window.location.href = '../../index.html';
            }
        });
    }
    
    // Тестирование EmailJS
    const testEmailBtn = document.getElementById('test-email-btn');
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', async () => {
            const email = prompt('Введите email для тестирования EmailJS:', 'test@example.com');
            if (email) {
                const code = '123456';
                const nickname = 'Тестовый пользователь';
                
                showNotification('Тестирование EmailJS...', 'info');
                const result = await sendVerificationEmail(email, code, nickname);
                
                if (result) {
                    showNotification('Тестовый email отправлен успешно!', 'success');
                } else {
                    showNotification('Не удалось отправить тестовый email', 'error');
                }
            }
        });
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    if (!checkAuth()) {
        showNotification('Для доступа к настройкам необходимо войти в аккаунт', 'error');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 2000);
        return;
    }
    
    // Добавляем анимации
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
        
        .card-status.verified {
            color: #00cc66;
            background: rgba(0, 204, 102, 0.1);
        }
        
        .card-status.partial {
            color: #ff9800;
            background: rgba(255, 152, 0, 0.1);
        }
        
        .card-status.disabled {
            color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
        }
        
        #verification-timer {
            color: #ff9800;
            font-size: 14px;
            margin-top: 5px;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
    
    // Подключаем EmailJS
    if (typeof emailjs === 'undefined') {
        console.log('Загружаем EmailJS...');
        const emailjsScript = document.createElement('script');
        emailjsScript.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        emailjsScript.onload = function() {
            console.log('EmailJS загружен, User ID:', EMAILJS_CONFIG.userId);
            // EmailJS инициализируется при первом вызове send
        };
        document.head.appendChild(emailjsScript);
    } else {
        console.log('EmailJS уже загружен');
    }
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Загружаем настройки пользователя
    loadUserSettings();
    
    // Показываем приветствие
    const nickname = localStorage.getItem('jojoland_nickname');
    showNotification(`Добро пожаловать в настройки, ${nickname}!`, 'success');
});
