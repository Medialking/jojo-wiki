// settings.js - Полная версия с EmailJS шаблонами

// ==================== КОНФИГУРАЦИЯ ====================

// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

// EmailJS конфигурация
const EMAILJS_CONFIG = {
    serviceId: 'jojo_server',
    userId: 'A8kpGOp5ovcEi40iA',
    
    // Все шаблоны
    templates: {
        verification: 'template_elaqg7b',           // Для подтверждения email
        login: 'template_z6q3aqf',              // Для кодов входа через email
        // password_change: 'template_password_change', // Для смены пароля
        // email_change: 'template_email_change',       // Для изменения email
        // security: 'template_security'               // Для предупреждений безопасности
    }
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

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

// ==================== EMAILJS ФУНКЦИИ ====================

/**
 * Универсальная функция отправки email через EmailJS
 * @param {string} email - Email получателя
 * @param {string} code - Код для подтверждения
 * @param {string} nickname - Никнейм пользователя
 * @param {string} templateType - Тип шаблона ('verification' или 'login')
 * @returns {Promise<boolean>} - Успешность отправки
 */
async function sendEmailCode(email, code, nickname, templateType = 'verification') {
    console.log(`📧 Отправка email (${templateType})...`);
    console.log('Получатель:', email);
    console.log('Код:', code);
    console.log('Имя:', nickname);
    
    // Проверка EmailJS
    if (typeof emailjs === 'undefined') {
        console.log('⚠️ EmailJS не загружен, тестовый режим');
        return false;
    }
    
    // Проверка наличия шаблона
    const templateId = EMAILJS_CONFIG.templates[templateType];
    if (!templateId) {
        console.error(`❌ Шаблон ${templateType} не найден в конфигурации`);
        return false;
    }
    
    try {
        // Инициализация EmailJS
        emailjs.init(EMAILJS_CONFIG.userId);
        
        // Обновите templateParams в функции sendEmailCode:
const templateParams = {
    nickname: nickname || 'Игрок',
    email: email,
    code: code,
    site_url: window.location.origin || 'https://jojoland.ru',
    timestamp: new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
};
        
        console.log(`📤 Отправка с шаблоном ${templateType}:`, templateParams);
        
        // Отправка email
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            templateId,
            templateParams
        );
        
        console.log(`✅ Email (${templateType}) успешно отправлен! Статус:`, response.status);
        
        // Сообщение об успехе
        const messages = {
            verification: '📧 Код подтверждения отправлен на ваш email',
            login: '📧 Код для входа отправлен на ваш email'
        };
        
        showNotification(messages[templateType] || '📧 Email отправлен', 'success');
        return true;
        
    } catch (error) {
        console.error(`❌ Ошибка отправки email (${templateType}):`, {
            status: error.status,
            text: error.text,
            fullError: error
        });
        
        // Тестовый режим - показываем код в уведомлении
        return sendEmailTestMode(email, code, nickname, templateType);
    }
}

/**
 * Режим тестирования (когда EmailJS не работает)
 */
function sendEmailTestMode(email, code, nickname, templateType) {
    const templates = {
        verification: {
            title: 'Код подтверждения email',
            color: '#6200ff',
            gradient: 'linear-gradient(90deg, #6200ff, #ff00ff)',
            purpose: `Для подтверждения email: <strong>${email}</strong>`
        },
        login: {
            title: 'Код для входа через email',
            color: '#00b4d8',
            gradient: 'linear-gradient(90deg, #00b4d8, #0096c7)',
            purpose: `Для входа в аккаунт <strong>${nickname || 'Игрок'}</strong>`
        }
    };
    
    const template = templates[templateType] || templates.verification;
    
    const notificationHTML = `
        <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; 
                color: ${template.color};">
                🧪 Тестовый режим
            </div>
            <div style="margin-bottom: 15px;">
                ${template.purpose}
            </div>
            <div style="background: ${template.gradient}; 
                color: white; 
                padding: 15px; 
                border-radius: 10px; 
                margin: 15px 0;
                font-family: 'Courier New', monospace;">
                <div style="font-size: 14px; margin-bottom: 5px;">${template.title}:</div>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 3px;">
                    ${code}
                </div>
            </div>
            <div style="font-size: 12px; color: #666;">
                В реальном приложении этот код был бы отправлен на email
            </div>
        </div>
    `;
    
    showNotification(notificationHTML, 'info');
    return false;
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
        
        // Отправляем уведомление на почту (если привязана и подтверждена)
        if (userData.email && userData.emailVerified) {
            // Здесь можно добавить отправку уведомления о смене пароля
            // await sendEmailNotification(userData.email, 'password_change', { nickname: nickname });
        }
        
        return true;
        
    } catch (error) {
        console.error('Ошибка изменения пароля:', error);
        showNotification('Ошибка сервера', 'error');
        return false;
    }
}

// ==================== ПРИВЯЗКА И ПОДТВЕРЖДЕНИЕ EMAIL ====================

async function linkEmail(email) {
    const userId = localStorage.getItem('jojoland_userId');
    const nickname = localStorage.getItem('jojoland_nickname');
    
    console.log('🔗 Начало привязки email для пользователя:', userId, nickname);
    
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
        console.log('🔑 Сгенерирован код:', verificationCode);
        
        // Сохраняем email с кодом подтверждения
        await database.ref('users/' + userId).update({
            email: email.toLowerCase(),
            emailVerified: false,
            emailVerificationCode: verificationCode,
            emailVerificationSentAt: new Date().toISOString()
        });
        
        console.log('💾 Данные сохранены в Firebase, отправляем email...');
        
        // Отправляем email с кодом подтверждения (используем шаблон 'verification')
        const emailSent = await sendEmailCode(email, verificationCode, nickname, 'verification');
        
        if (emailSent) {
            showNotification(`✅ Код подтверждения отправлен на ${email}`, 'success');
            
            // Показываем поле для ввода кода
            document.getElementById('email-verification-section').style.display = 'block';
            document.getElementById('verification-code').focus();
            
            // Сохраняем email в localStorage
            localStorage.setItem('temp_email', email);
            
            // Запускаем таймер для кода
            startVerificationTimer();
        } else {
            // В тестовом режиме все равно продолжаем
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
        timerElement.textContent = `⏳ Код действителен: ${minutes}:${secs < 10 ? '0' : ''}${secs}`;
        timerElement.style.color = seconds < 60 ? '#ff4444' : '#ff9800';
        
        if (seconds <= 0) {
            clearInterval(timer);
            timerElement.textContent = '❌ Код истек';
            timerElement.style.color = '#ff4444';
            if (codeInput) codeInput.disabled = true;
            if (verifyBtn) verifyBtn.disabled = true;
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
        
        showNotification('✅ Email успешно подтвержден!', 'success');
        
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
    if (!confirm('Вы уверены, что хотите отвязать email? Вы потеряете возможность входа через email.')) {
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
        
        showNotification('✅ Email успешно отвязан', 'success');
        
        // Обновляем UI
        updateEmailUI('', false);
        
    } catch (error) {
        console.error('Ошибка отвязки email:', error);
        showNotification('Ошибка сервера', 'error');
    }
}

// ==================== НАСТРОЙКИ КОНФИДЕНЦИАЛЬНОСТИ ====================

async function updatePrivacySettings(settings) {
    const userId = localStorage.getItem('jojoland_userId');
    
    try {
        await database.ref('users/' + userId + '/privacy').update(settings);
        
        showNotification('✅ Настройки конфиденциальности обновлены', 'success');
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
        emailStatus.textContent = '✅ Подтвержден';
        emailStatus.className = 'card-status verified';
        
        linkEmailSection.style.display = 'none';
        verifiedEmailSection.style.display = 'block';
        emailVerificationSection.style.display = 'none';
        if (verificationTimer) verificationTimer.style.display = 'none';
    } else if (email && !verified) {
        // Email есть, но не подтвержден
        emailDisplay.textContent = email;
        emailStatus.textContent = '⏳ Ожидает подтверждения';
        emailStatus.className = 'card-status partial';
        
        linkEmailSection.style.display = 'none';
        verifiedEmailSection.style.display = 'block';
        emailVerificationSection.style.display = 'block';
        if (verificationTimer) verificationTimer.style.display = 'block';
    } else {
        // Нет email
        emailDisplay.textContent = 'Не указан';
        emailStatus.textContent = '❌ Не привязан';
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
                        ${login.success === false ? '❌ Неудачно' : '✅ Успешно'}
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
    
    // Добавляем анимации и стили
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
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .card-status {
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            margin-left: 10px;
        }
        
        .card-status.verified {
            color: #00cc66;
            background: rgba(0, 204, 102, 0.1);
            border: 1px solid #00cc66;
        }
        
        .card-status.partial {
            color: #ff9800;
            background: rgba(255, 152, 0, 0.1);
            border: 1px solid #ff9800;
        }
        
        .card-status.disabled {
            color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
            border: 1px solid #ff4444;
        }
        
        #verification-timer {
            color: #ff9800;
            font-size: 14px;
            margin-top: 10px;
            font-weight: bold;
            background: rgba(255, 152, 0, 0.1);
            padding: 8px 12px;
            border-radius: 5px;
            border-left: 3px solid #ff9800;
        }
        
        .login-status {
            padding: 5px 10px;
            border-radius: 5px;
            font-weight: bold;
        }
        
        .login-status.failed {
            color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
        }
        
        .password-strength {
            height: 5px;
            background: #333;
            border-radius: 3px;
            margin-top: 5px;
            overflow: hidden;
        }
        
        .strength-fill {
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .strength-weak .strength-fill {
            background: #ff4444;
            width: 25%;
        }
        
        .strength-medium .strength-fill {
            background: #ff9800;
            width: 50%;
        }
        
        .strength-strong .strength-fill {
            background: #00cc66;
            width: 100%;
        }
        
        .strength-text {
            font-size: 12px;
            margin-top: 3px;
            text-align: right;
        }
    `;
    document.head.appendChild(style);
    
    // Подключаем EmailJS
    if (typeof emailjs === 'undefined') {
        console.log('📦 Загружаем EmailJS...');
        const emailjsScript = document.createElement('script');
        emailjsScript.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        emailjsScript.onload = function() {
            console.log('✅ EmailJS загружен');
            console.log('🔑 User ID:', EMAILJS_CONFIG.userId);
            console.log('📧 Доступные шаблоны:', EMAILJS_CONFIG.templates);
        };
        document.head.appendChild(emailjsScript);
    } else {
        console.log('✅ EmailJS уже загружен');
        console.log('📧 Доступные шаблоны:', EMAILJS_CONFIG.templates);
    }
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Загружаем настройки пользователя
    loadUserSettings();
    
    // Показываем приветствие
    const nickname = localStorage.getItem('jojoland_nickname');
    showNotification(`🎮 Добро пожаловать в настройки, ${nickname}!`, 'success');
});
