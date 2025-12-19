// settings.js - Версия с одним шаблоном для всех уведомлений

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

// ==================== EMAILJS КОНФИГУРАЦИЯ ====================

const EMAILJS_CONFIG = {
    serviceId: 'jojo_server',
    templateId: 'template_elaqg7b',  // Единственный шаблон
    userId: 'A8kpGOp5ovcEi40iA'
};

// ==================== ОТПРАВКА EMAIL ====================

// Отправка кода подтверждения email
async function sendVerificationEmail(email, code, nickname) {
    console.log('🚀 Отправка кода подтверждения...');
    console.log('📧 Получатель:', email);
    console.log('🔢 Код:', code);
    console.log('👤 Имя:', nickname);
    
    // Проверка email
    if (!email || typeof email !== 'string') {
        console.error('❌ Email пустой или не строка');
        return false;
    }
    
    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@')) {
        console.error('❌ Некорректный email:', cleanEmail);
        return false;
    }
    
    // Проверка EmailJS
    if (typeof emailjs === 'undefined') {
        console.log('⚠️ EmailJS не загружен, тестовый режим');
        return false;
    }
    
    try {
        // Инициализация EmailJS
        console.log('🔄 Инициализируем EmailJS...');
        emailjs.init(EMAILJS_CONFIG.userId);
        
        // Ждем инициализацию
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ EmailJS инициализирован');
        
        // Параметры для шаблона подтверждения
        const templateParams = {
            email: cleanEmail,                // Email получателя
            to_name: nickname || 'Игрок',     // Имя получателя
            verification_code: code,          // Код подтверждения
            email_type: 'verification',       // Тип письма
            subject: 'Подтверждение email - JojoLand',
            title: 'Подтверждение email адреса',
            message: `
                <p>Для завершения привязки email введите следующий код подтверждения:</p>
                <div style="text-align: center; margin: 25px 0;">
                    <div style="font-size: 36px; font-weight: bold; color: #6200ff; letter-spacing: 5px; font-family: monospace;">
                        ${code}
                    </div>
                    <div style="color: #666; font-size: 14px; margin-top: 10px;">
                        Код действителен 24 часа
                    </div>
                </div>
                <p>Если вы не запрашивали подтверждение email, просто проигнорируйте это письмо.</p>
            `,
            color: '#6200ff',
            icon: '🔐'
        };
        
        console.log('📤 Отправка с параметрами:', templateParams);
        
        // Отправка через EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );
        
        console.log('✅ Email успешно отправлен! Статус:', response.status);
        console.log('📨 Ответ сервера:', response.text);
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка отправки email:', {
            status: error.status,
            text: error.text,
            fullError: error
        });
        
        // Детальный анализ ошибки
        if (error.status === 422) {
            console.error('🔍 Диагностика ошибки 422:');
            console.error('1. Проверьте шаблон в EmailJS');
            console.error('2. Убедитесь что шаблон опубликован');
            console.error('3. Проверьте Email Service настройки');
        }
        
        return false;
    }
}

// Отправка email уведомлений разных типов через один шаблон
async function sendEmailNotification(userId, type, data = {}) {
    console.log(`📨 Отправка уведомления типа: ${type}`);
    
    try {
        // Получаем email пользователя
        const snapshot = await database.ref('users/' + userId).once('value');
        if (!snapshot.exists()) {
            console.log('❌ Пользователь не найден');
            return false;
        }
        
        const userData = snapshot.val();
        if (!userData.email || !userData.emailVerified) {
            console.log('❌ Email не подтвержден или отсутствует');
            return false;
        }
        
        // Проверяем настройки уведомлений
        const notifications = userData.notifications || {};
        if (notifications[type] === false) {
            console.log('🔕 Уведомления этого типа отключены пользователем');
            return false;
        }
        
        // Проверка EmailJS
        if (typeof emailjs === 'undefined') {
            console.log('⚠️ EmailJS не загружен');
            return false;
        }
        
        // Инициализация EmailJS
        emailjs.init(EMAILJS_CONFIG.userId);
        
        // Определяем контент в зависимости от типа уведомления
        let templateParams = {
            email: userData.email,
            to_name: userData.nickname
        };
        
        // Настраиваем параметры для каждого типа уведомления
        switch(type) {
            case 'password_change':
                Object.assign(templateParams, {
                    email_type: 'password_change',
                    subject: 'Смена пароля - JojoLand',
                    title: '🔐 Пароль вашего аккаунта был изменен',
                    color: '#ff416c',
                    icon: '🔐',
                    message: `
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <strong>⚠️ Если это были не вы, немедленно свяжитесь с поддержкой.</strong>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333; margin-bottom: 15px;">📋 Детали изменения:</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>Дата и время:</strong></div>
                                <div>${new Date().toLocaleString('ru-RU')}</div>
                                
                                <div><strong>IP адрес:</strong></div>
                                <div>${data.ip || await getClientIP()}</div>
                                
                                <div><strong>Тип действия:</strong></div>
                                <div style="color: #dc3545; font-weight: bold;">Смена пароля</div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 25px;">
                            <h4 style="color: #28a745;">✅ Рекомендуемые действия:</h4>
                            <ul style="padding-left: 20px;">
                                <li>Если вы меняли пароль - больше ничего делать не нужно</li>
                                <li>Если это были не вы - немедленно свяжитесь с поддержкой</li>
                                <li>Используйте сложные пароли с цифрами и символами</li>
                            </ul>
                        </div>
                    `
                });
                break;
                
            case 'email_change':
                Object.assign(templateParams, {
                    email_type: 'email_change',
                    subject: 'Изменение email - JojoLand',
                    title: '📧 Email адрес вашего аккаунта был обновлен',
                    color: '#6200ff',
                    icon: '📧',
                    message: `
                        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <strong>✅ Email адрес успешно обновлен!</strong>
                        </div>
                        
                        <div style="text-align: center; margin: 25px 0; padding: 20px; background: linear-gradient(90deg, #6200ff, #ff00ff); color: white; border-radius: 10px;">
                            <div style="font-size: 14px; margin-bottom: 5px;">Новый email адрес:</div>
                            <div style="font-size: 18px; font-weight: bold;">${data.newEmail || userData.email}</div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333; margin-bottom: 15px;">📋 Информация об изменении:</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>Дата изменения:</strong></div>
                                <div>${new Date().toLocaleString('ru-RU')}</div>
                                
                                <div><strong>Аккаунт:</strong></div>
                                <div>${userData.nickname}</div>
                            </div>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #856404;">⚠️ Важная информация:</h4>
                            <ul style="padding-left: 20px; color: #856404;">
                                <li>Все будущие уведомления будут приходить на новый email</li>
                                <li>Старый email адрес больше не будет получать уведомления</li>
                                <li>Если вы не меняли email - немедленно свяжитесь с поддержкой</li>
                            </ul>
                        </div>
                    `
                });
                break;
                
            case 'login':
                Object.assign(templateParams, {
                    email_type: 'login',
                    subject: 'Новый вход в аккаунт - JojoLand',
                    title: '🔑 Обнаружен новый вход в ваш аккаунт',
                    color: '#00b09b',
                    icon: '🔑',
                    message: `
                        <div style="text-align: center; margin: 20px 0; font-size: 48px;">
                            ${data.device && data.device.includes('mobile') ? '📱' : '💻'}
                        </div>
                        
                        <div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <h3 style="color: #0056b3; margin-bottom: 10px;">🔄 Информация о входе:</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>Время входа:</strong></div>
                                <div>${new Date().toLocaleString('ru-RU')}</div>
                                
                                <div><strong>IP адрес:</strong></div>
                                <div>${data.ip || await getClientIP()}</div>
                                
                                <div><strong>Устройство:</strong></div>
                                <div>${data.device || 'Неизвестное устройство'}</div>
                                
                                <div><strong>Местоположение:</strong></div>
                                <div>${data.location || 'Неизвестное местоположение'}</div>
                            </div>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #856404;">⚠️ Если это были не вы:</h4>
                            <ul style="padding-left: 20px; color: #856404;">
                                <li>Немедленно смените пароль вашего аккаунта</li>
                                <li>Включите двухфакторную аутентификацию</li>
                                <li>Проверьте историю входов в настройках аккаунта</li>
                                <li>Свяжитесь с поддержкой JojoLand</li>
                            </ul>
                        </div>
                        
                        <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #155724;">✅ Это были вы?</h4>
                            <p style="color: #155724;">Если вы узнаете это устройство и местоположение, больше ничего делать не нужно. Будьте уверены, мы продолжаем защищать ваш аккаунт.</p>
                        </div>
                    `
                });
                break;
                
            case 'security_alert':
                Object.assign(templateParams, {
                    email_type: 'security_alert',
                    subject: data.subject || 'Предупреждение безопасности - JojoLand',
                    title: `🚨 ${data.alertType || 'Предупреждение безопасности'}`,
                    color: '#dc3545',
                    icon: '🚨',
                    message: `
                        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <h3 style="color: #721c24; margin-bottom: 10px;">${data.alertType || 'Подозрительная активность'}</h3>
                            <p style="color: #721c24; font-size: 16px; line-height: 1.5;">
                                ${data.description || 'Обнаружена подозрительная активность в вашем аккаунте.'}
                            </p>
                            <div style="margin-top: 15px; color: #856404;">
                                <strong>Время обнаружения:</strong> ${new Date().toLocaleString('ru-RU')}
                            </div>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #856404;">🛡️ Необходимые действия:</h4>
                            <div style="color: #856404; padding-left: 20px;">
                                ${data.action || 'Проверьте активность вашего аккаунта и смените пароль при необходимости.'}
                            </div>
                        </div>
                        
                        <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #0056b3;">📋 Дополнительная информация:</h4>
                            <ul style="color: #333; padding-left: 20px;">
                                <li>Это уведомление отправлено системой мониторинга безопасности</li>
                                <li>Мы постоянно отслеживаем активность вашего аккаунта</li>
                                <li>Для вашей безопасности рекомендуем включить двухфакторную аутентификацию</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; border-radius: 25px; font-weight: bold; margin: 5px;">
                                🚨 Проверить активность аккаунта
                            </div>
                        </div>
                    `
                });
                break;
                
            default:
                // Общий шаблон
                Object.assign(templateParams, {
                    email_type: 'general',
                    subject: 'Уведомление - JojoLand',
                    title: '📢 Уведомление от JojoLand',
                    color: '#00b4d8',
                    icon: '📢',
                    message: `
                        <div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <p style="color: #333; font-size: 16px; line-height: 1.5;">
                                ${data.message || 'Новое уведомление от JojoLand.'}
                            </p>
                        </div>
                        
                        <div style="color: #666; font-size: 14px; margin-top: 20px;">
                            <strong>Дата отправки:</strong> ${new Date().toLocaleString('ru-RU')}
                        </div>
                    `
                });
        }
        
        console.log('📤 Отправка с параметрами:', templateParams);
        
        // Отправляем письмо
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );
        
        console.log(`✅ Уведомление типа "${type}" отправлено на ${userData.email}`);
        console.log('📊 Статус:', response.status);
        
        // Сохраняем в лог
        await database.ref('email_logs/' + userId).push({
            type: type,
            timestamp: new Date().toISOString(),
            sent: true,
            recipient: userData.email,
            status: response.status
        });
        
        return true;
        
    } catch (error) {
        console.error(`❌ Ошибка отправки уведомления типа "${type}":`, {
            status: error.status,
            text: error.text,
            details: error
        });
        
        return false;
    }
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
        const userIp = await getClientIP();
        await database.ref('security_logs/' + userId).push({
            type: 'password_change',
            timestamp: new Date().toISOString(),
            ip: userIp
        });
        
        showNotification('✅ Пароль успешно изменен!', 'success');
        
        // Отправляем уведомление на почту (если привязана)
        if (userData.email && userData.emailVerified) {
            await sendEmailNotification(userId, 'password_change', {
                nickname: nickname,
                email: userData.email,
                ip: userIp
            });
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка изменения пароля:', error);
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
        
        // Отправляем email с кодом подтверждения
        const emailSent = await sendVerificationEmail(email, verificationCode, nickname);
        
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
            // Режим тестирования - показываем код в уведомлении
            console.log('🧪 Режим тестирования - показываем код в уведомлении');
            
            // Красивое уведомление с кодом
            const notificationHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #6200ff;">
                        🧪 Тестовый режим
                    </div>
                    <div style="margin-bottom: 15px;">
                        Для: <strong>${email}</strong>
                    </div>
                    <div style="background: linear-gradient(90deg, #6200ff, #ff00ff); 
                                color: white; 
                                padding: 15px; 
                                border-radius: 10px; 
                                margin: 15px 0;
                                font-family: 'Courier New', monospace;">
                        <div style="font-size: 14px; margin-bottom: 5px;">Код подтверждения:</div>
                        <div style="font-size: 28px; font-weight: bold; letter-spacing: 3px;">
                            ${verificationCode}
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        В реальном приложении этот код был бы отправлен на email
                    </div>
                </div>
            `;
            
            showNotification(notificationHTML, 'info');
            
            document.getElementById('email-verification-section').style.display = 'block';
            document.getElementById('verification-code').focus();
            localStorage.setItem('temp_email', email);
            startVerificationTimer();
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка привязки email:', error);
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
        
        // Отправляем уведомление об успешной привязке email
        await sendEmailNotification(userId, 'email_change', {
            newEmail: userData.email || email
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка подтверждения email:', error);
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
        const snapshot = await database.ref('users/' + userId).once('value');
        const userData = snapshot.val();
        const currentEmail = userData.email;
        
        await database.ref('users/' + userId).update({
            email: null,
            emailVerified: false,
            emailVerifiedAt: null,
            emailVerificationCode: null
        });
        
        showNotification('✅ Email успешно отвязан', 'success');
        
        // Отправляем уведомление об отвязке email
        if (currentEmail && userData.emailVerified) {
            await sendEmailNotification(userId, 'email_change', {
                newEmail: 'Не привязан',
                description: 'Email адрес был отвязан от вашего аккаунта'
            });
        }
        
        // Обновляем UI
        updateEmailUI('', false);
        
    } catch (error) {
        console.error('❌ Ошибка отвязки email:', error);
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

// ==================== НАСТРОЙКИ УВЕДОМЛЕНИЙ ====================

async function updateNotificationSettings(settings) {
    const userId = localStorage.getItem('jojoland_userId');
    
    try {
        await database.ref('users/' + userId + '/notifications').update(settings);
        
        showNotification('✅ Настройки уведомлений обновлены', 'success');
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
        console.log('Не удалось получить IP:', error);
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
        console.error('❌ Ошибка загрузки настроек:', error);
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
        console.error('❌ Ошибка загрузки истории:', error);
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
    
    // Добавляем кнопку для тестирования уведомлений
    addTestButton();
}

// Добавление кнопки для тестирования
function addTestButton() {
    // Кнопка тестирования всех уведомлений
    const testBtn = document.createElement('button');
    testBtn.id = 'test-notifications-btn';
    testBtn.textContent = '🧪 Тест уведомлений';
    testBtn.style.cssText = `
        position: fixed;
        bottom: 120px;
        right: 20px;
        background: linear-gradient(90deg, #6200ff, #ff00ff);
        color: white;
        padding: 12px 20px;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        z-index: 9997;
        font-family: 'Orbitron', sans-serif;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(98, 0, 255, 0.3);
        transition: all 0.3s ease;
    `;
    testBtn.onmouseenter = () => {
        testBtn.style.transform = 'translateY(-2px)';
        testBtn.style.boxShadow = '0 6px 20px rgba(98, 0, 255, 0.4)';
    };
    testBtn.onmouseleave = () => {
        testBtn.style.transform = 'translateY(0)';
        testBtn.style.boxShadow = '0 4px 15px rgba(98, 0, 255, 0.3)';
    };
    testBtn.onclick = async () => {
        const userId = localStorage.getItem('jojoland_userId');
        const nickname = localStorage.getItem('jojoland_nickname');
        
        showNotification('🧪 Начинаем тестирование уведомлений...', 'info');
        
        try {
            // Тест смены пароля
            await sendEmailNotification(userId, 'password_change', {
                ip: await getClientIP()
            });
            
            // Тест изменения email
            await sendEmailNotification(userId, 'email_change', {
                newEmail: 'newemail@example.com'
            });
            
            // Тест нового входа
            await sendEmailNotification(userId, 'login', {
                ip: await getClientIP(),
                device: 'Chrome на Windows 10',
                location: 'Москва, Россия'
            });
            
            // Тест предупреждения безопасности
            await sendEmailNotification(userId, 'security_alert', {
                alertType: 'Необычная активность',
                description: 'Обнаружены попытки входа с незнакомого устройства',
                action: 'Проверьте историю входов и смените пароль при необходимости'
            });
            
            showNotification('✅ Все тестовые уведомления отправлены!', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка тестирования уведомлений:', error);
            showNotification('Ошибка при тестировании уведомлений', 'error');
        }
    };
    document.body.appendChild(testBtn);
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
        
        /* Стили для тестовой кнопки */
        #test-notifications-btn:hover {
            animation: pulse 0.5s ease;
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
            console.log('📁 Шаблон:', EMAILJS_CONFIG.templateId);
        };
        document.head.appendChild(emailjsScript);
    } else {
        console.log('✅ EmailJS уже загружен');
    }
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Загружаем настройки пользователя
    loadUserSettings();
    
    // Показываем приветствие
    const nickname = localStorage.getItem('jojoland_nickname');
    showNotification(`🎮 Добро пожаловать в настройки, ${nickname}!`, 'success');
});
