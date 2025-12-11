// =================================================================
// 🛡️ admin_support.js - ЛОГИКА ПАНЕЛИ ПОДДЕРЖКИ (REALTIME)
// =================================================================

// Проверка наличия зависимостей (они должны быть загружены из admin_common.js)
if (typeof database === 'undefined' || typeof createNotification === 'undefined') {
    console.error("Не загружены admin_common.js или admin_auth.js. Работа панели поддержки невозможна.");
}

let allTickets = {};
let currentFilter = 'new';
let selectedTicketId = null;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
function initSupportPanel() {
    console.log('Панель поддержки инициализирована. Запуск Real-Time подписки.');
    
    // 1. Проверяем авторизацию (если admin_auth.js не сделал редирект)
    if (!window.currentAdmin || !window.currentAdmin.isAdmin) {
        // На всякий случай, если проверка из HTML не сработала
        redirectToLogin();
        return;
    }
    
    // 2. Устанавливаем обработчики событий
    setupEventListeners();
    
    // 3. Запускаем Real-Time подписку на тикеты
    listenForTickets();
}

// ==================== REAL-TIME ПОДПИСКА ====================
function listenForTickets() {
    // Получаем все тикеты и подписываемся на изменения
    database.ref('support_tickets').on('value', (snapshot) => {
        allTickets = {};
        let newCount = 0;
        let totalCount = 0;
        
        snapshot.forEach((childSnapshot) => {
            const ticket = childSnapshot.val();
            ticket.id = childSnapshot.key;
            
            // Если в тикете нет статуса, ставим 'new' (для обратной совместимости)
            if (!ticket.status) {
                ticket.status = 'new';
            }
            
            allTickets[ticket.id] = ticket;
            totalCount++;
            
            if (ticket.status === 'new') {
                newCount++;
            }
        });
        
        console.log(`Real-Time обновление: Всего ${totalCount} тикетов, ${newCount} новых.`);
        
        // Обновляем счетчики в шапке
        document.getElementById('totalTicketsCount').textContent = totalCount;
        document.getElementById('newTicketsCount').textContent = newCount;
        
        // Обновляем список тикетов с учетом текущего фильтра и поиска
        updateTicketsList();
        
        // Если выбранный тикет был изменен, обновляем панель деталей
        if (selectedTicketId && allTickets[selectedTicketId]) {
            showTicketDetails(selectedTicketId, false); 
        } else if (selectedTicketId) {
            // Если выбранный тикет был удален
            document.getElementById('detailsPanel').style.display = 'none';
            selectedTicketId = null;
        }
    }, (error) => {
        createNotification('error', 'Ошибка Real-Time', 'Не удалось загрузить данные поддержки: ' + error.message);
        console.error("Ошибка загрузки тикетов:", error);
    });
}

// ==================== ОБНОВЛЕНИЕ СПИСКА ТИКЕТОВ ====================
function updateTicketsList() {
    const ticketsList = document.getElementById('ticketsList');
    const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
    
    let filteredTickets = Object.values(allTickets);
    
    // 1. Фильтрация по статусу
    if (currentFilter !== 'all') {
        filteredTickets = filteredTickets.filter(t => t.status === currentFilter);
    }
    
    // 2. Фильтрация по поисковому запросу
    if (searchText) {
        filteredTickets = filteredTickets.filter(t => 
            t.id.toLowerCase().includes(searchText) ||
            (t.userId && t.userId.toLowerCase().includes(searchText)) ||
            (t.username && t.username.toLowerCase().includes(searchText)) ||
            (t.description && t.description.toLowerCase().includes(searchText)) ||
            (t.reason && t.reason.toLowerCase().includes(searchText))
        );
    }
    
    // 3. Сортировка (новые/открытые вверху)
    filteredTickets.sort((a, b) => {
        // Сначала сортируем по статусу (new, open, closed)
        const statusOrder = { 'new': 3, 'open': 2, 'closed': 1 };
        const statusDiff = statusOrder[b.status] - statusOrder[a.status];
        if (statusDiff !== 0) return statusDiff;
        
        // Затем по дате (самые свежие вверху)
        return b.timestamp - a.timestamp;
    });

    if (filteredTickets.length === 0) {
        ticketsList.innerHTML = `<div style="text-align: center; padding: 50px; color: #aaa;">
            <i class="fas fa-box-open" style="font-size: 30px; margin-bottom: 10px;"></i>
            <p>Нет обращений, соответствующих фильтрам.</p>
        </div>`;
        return;
    }

    ticketsList.innerHTML = filteredTickets.map(ticket => {
        const dateStr = formatDate(ticket.timestamp);
        const statusBadge = getStatusBadge(ticket.status);
        const isSelected = ticket.id === selectedTicketId ? 'selected' : '';
        const userDisplay = ticket.username || ticket.userId.substring(0, 8);
        
        return `
            <div class="ticket-item ${isSelected}" data-ticket-id="${ticket.id}" onclick="showTicketDetails('${ticket.id}')">
                <div class="ticket-id">${ticket.id.substring(0, 8)}...</div>
                <div class="ticket-content">
                    <h4>${truncateText(ticket.description, 40)}</h4>
                    <small style="color: #bbb;">Игрок: ${userDisplay}</small>
                </div>
                <div style="text-align: right;">
                    ${statusBadge}
                    <small style="display: block; color: #aaa; margin-top: 5px;">${formatTime(ticket.timestamp)}</small>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== ОТОБРАЖЕНИЕ ДЕТАЛЕЙ ТИКЕТА ====================
function showTicketDetails(ticketId, scrollToTop = true) {
    const ticket = allTickets[ticketId];
    if (!ticket) {
        createNotification('error', 'Ошибка', 'Тикет не найден или был удален.');
        return;
    }
    
    selectedTicketId = ticketId;
    
    // Обновляем выделение в списке
    document.querySelectorAll('.ticket-item').forEach(el => el.classList.remove('selected'));
    const selectedItem = document.querySelector(`.ticket-item[data-ticket-id="${ticketId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    // Обновляем данные на панели
    document.getElementById('ticketIdDisplay').textContent = ticket.id.substring(0, 8);
    document.getElementById('playerUsername').textContent = ticket.username || 'Неизвестно';
    document.getElementById('playerUid').textContent = ticket.userId;
    document.getElementById('ticketReason').textContent = ticket.reason || 'Общий вопрос';
    document.getElementById('ticketDate').textContent = formatDate(ticket.timestamp);
    document.getElementById('ticketDescription').innerHTML = formatLinks(ticket.description);
    document.getElementById('ticketProof').innerHTML = formatLinks(ticket.proof || 'Нет доказательств');
    
    // Статус
    const currentStatusEl = document.getElementById('currentStatus');
    currentStatusEl.className = 'admin-badge ' + getStatusClass(ticket.status);
    currentStatusEl.textContent = getStatusText(ticket.status);
    document.getElementById('statusSelect').value = ticket.status;

    // Отображаем панель
    const detailsPanel = document.getElementById('detailsPanel');
    detailsPanel.style.display = 'block';
    
    // Загрузка переписки
    loadTicketAnswers(ticketId);
    
    if (scrollToTop) {
        detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==================== ЗАГРУЗКА ИСТОРИИ ПЕРЕПИСКИ ====================
function loadTicketAnswers(ticketId) {
    const answersList = document.getElementById('answersList');
    answersList.innerHTML = '<div style="text-align: center; color: #aaa;"><i class="fas fa-spinner fa-spin"></i> Загрузка переписки...</div>';

    // Подписка на ответы (постоянное обновление)
    database.ref(`support_tickets/${ticketId}/answers`).on('value', (snapshot) => {
        const answers = [];
        snapshot.forEach(child => answers.push(child.val()));
        
        answersList.innerHTML = answers.map(answer => {
            const isUser = answer.senderId === allTickets[ticketId].userId;
            // Убеждаемся, что window.currentAdmin существует перед использованием
            const adminName = window.currentAdmin?.adminName || 'Администратор'; 
            const senderName = isUser ? allTickets[ticketId].username || 'Игрок' : adminName;
            const itemClass = isUser ? 'user' : 'admin';
            const dateStr = formatDate(answer.timestamp);
            
            return `
                <div class="answer-item ${itemClass}" style="margin-bottom: 10px; padding: 10px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                        <strong style="color: ${isUser ? '#ccc' : '#6ab7ff'};">${senderName}</strong>
                        <small style="color: #aaa;">${dateStr}</small>
                    </div>
                    <p style="white-space: pre-wrap; font-size: 14px;">${answer.text}</p>
                </div>
            `;
        }).join('');
        
        // Прокрутка вниз
        answersList.scrollTop = answersList.scrollHeight;
    }, (error) => {
        answersList.innerHTML = `<div style="color: var(--color-danger);">Ошибка загрузки переписки: ${error.message}</div>`;
    });
}

// ==================== ОТПРАВКА ОТВЕТА ====================
async function sendAdminAnswer() {
    const answerTextEl = document.getElementById('adminAnswerText');
    const text = answerTextEl.value.trim();
    
    if (!text || !selectedTicketId) {
        createNotification('warning', 'Внимание', 'Введите текст ответа и выберите тикет.');
        return;
    }
    
    const ticketRef = database.ref(`support_tickets/${selectedTicketId}`);
    
    try {
        // 1. Отправляем ответ в ветку answers
        await ticketRef.child('answers').push({
            text: text,
            senderId: window.currentAdmin.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // 2. Обновляем статус тикета на 'open' (если он был 'new') и lastAnswerTime
        const adminName = window.currentAdmin.adminName || 'Администратор';
        if (allTickets[selectedTicketId].status === 'new') {
            await ticketRef.update({
                status: 'open',
                lastAnswerTime: firebase.database.ServerValue.TIMESTAMP,
                lastAdmin: adminName
            });
            // Обновляем локально для корректного отображения
            allTickets[selectedTicketId].status = 'open';
        } else {
             await ticketRef.update({
                lastAnswerTime: firebase.database.ServerValue.TIMESTAMP,
                lastAdmin: adminName
            });
        }
        
        // 3. Логирование
        logAdminAction('support_answer', `Ответил на тикет #${selectedTicketId.substring(0, 8)}`);
        
        // 4. Очистка и уведомление
        answerTextEl.value = '';
        createNotification('success', 'Ответ отправлен', `Сообщение добавлено в тикет #${selectedTicketId.substring(0, 8)}`);
        
    } catch (error) {
        createNotification('error', 'Ошибка отправки', 'Не удалось отправить ответ: ' + error.message);
        console.error('Ошибка отправки ответа:', error);
    }
}

// ==================== ОБНОВЛЕНИЕ СТАТУСА ====================
async function updateTicketStatus() {
    const newStatus = document.getElementById('statusSelect').value;
    
    if (!selectedTicketId) {
        createNotification('warning', 'Внимание', 'Сначала выберите тикет.');
        return;
    }
    
    if (newStatus === allTickets[selectedTicketId].status) {
        createNotification('info', 'Статус не изменен', 'Выбран тот же статус.');
        return;
    }

    try {
        const adminName = window.currentAdmin.adminName || 'Администратор';
        await database.ref(`support_tickets/${selectedTicketId}`).update({
            status: newStatus,
            closedBy: newStatus === 'closed' ? adminName : null
        });
        
        // Логирование
        logAdminAction('support_status', `Изменил статус тикета #${selectedTicketId.substring(0, 8)} на ${getStatusText(newStatus)}`);
        
        createNotification('success', 'Статус обновлен', `Статус тикета изменен на "${getStatusText(newStatus)}"`);
        
    } catch (error) {
        createNotification('error', 'Ошибка', 'Не удалось обновить статус: ' + error.message);
        console.error('Ошибка обновления статуса:', error);
    }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Отправка ответа по кнопке
    document.getElementById('sendAnswerBtn').addEventListener('click', sendAdminAnswer);
    
    // Отправка ответа по Ctrl+Enter
    document.getElementById('adminAnswerText').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            sendAdminAnswer();
        }
    });

    // Сохранение статуса
    document.getElementById('saveStatusBtn').addEventListener('click', updateTicketStatus);
    
    // Закрытие панели деталей
    document.getElementById('closeDetailsBtn').addEventListener('click', () => {
        document.getElementById('detailsPanel').style.display = 'none';
        selectedTicketId = null;
        updateTicketsList(); // Снимаем выделение в списке
    });

    // Фильтры по статусу
    document.getElementById('mainStatusNav').addEventListener('click', (e) => {
        const btn = e.target.closest('.admin-btn');
        if (btn) {
            document.querySelectorAll('#mainStatusNav .admin-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            updateTicketsList();
        }
    });

    // Поиск
    document.getElementById('searchInput').addEventListener('input', updateTicketsList);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (для badge) ====================
function truncateText(text, maxLength) {
    if (!text) return 'Нет описания';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatLinks(text) {
    if (!text) return 'Нет доказательств';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => {
        return `<a href="${url}" target="_blank" style="color: #6ab7ff;">${url}</a>`;
    }).replace(/\n/g, '<br>');
}

function getStatusText(status) {
    switch (status) {
        case 'new': return 'Новый';
        case 'open': return 'В работе';
        case 'closed': return 'Закрыт';
        default: return 'Неизвестно';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'new': return 'badge-warning';
        case 'open': return 'badge-info';
        case 'closed': return 'badge-success';
        default: return 'badge-primary';
    }
}

function getStatusBadge(status) {
    const text = getStatusText(status);
    const className = getStatusClass(status);
    return `<span class="admin-badge ${className}">${text}</span>`;
}

// Экспорт функции для использования в HTML
window.initSupportPanel = initSupportPanel;
