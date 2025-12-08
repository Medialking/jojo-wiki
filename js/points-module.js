// points-module.js
import { db, ref, set, get, update } from './firebase-config.js';

// ---------- Глобальные переменные модуля ----------
let username = localStorage.getItem("username");
let points = 0;
let lastClaim = 0;

// ---------- Функции модуля ----------

// Сохранить ник (вызывается из HTML)
window.saveUsername = async function () {
    const input = document.getElementById("usernameInput").value.trim();

    if (input.length < 3) {
        alert("Минимум 3 символа!");
        return;
    }

    username = input;
    localStorage.setItem("username", username);

    await registerPlayer(username);

    // Скрываем модалку и показываем виджет
    document.getElementById("authModal").style.display = "none";
    document.getElementById("pointsWidget").style.display = "block";

    loadPlayerData();
};

// Зарегистрировать игрока в Firebase
async function registerPlayer(name) {
    const playerRef = ref(db, "players/" + name);
    const snap = await get(playerRef);

    if (!snap.exists()) {
        await set(playerRef, {
            points: 0,
            lastClaim: 0,
            days: 0,
            registeredAt: Date.now()
        });
    }
}

// Загрузка данных игрока
async function loadPlayerData() {
    if (!username) return;
    
    try {
        const snap = await get(ref(db, "players/" + username));
        const data = snap.val();

        if (data) {
            points = data.points;
            lastClaim = data.lastClaim;

            // Обновляем UI
            const userPointsElements = document.querySelectorAll("#userPoints, #statsPoints");
            userPointsElements.forEach(el => {
                if (el) el.innerText = points;
            });

            updateTimer();
        }
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
    }
}

// Проверка таймера
function updateTimer() {
    const now = Date.now();
    const diff = now - lastClaim;

    const dailyReward = document.getElementById("dailyReward");
    const timerContainer = document.getElementById("timerContainer");
    const statsNext = document.getElementById("statsNext");
    const countdownTimer = document.getElementById("countdownTimer");

    if (diff >= 86400000) {
        if (dailyReward) dailyReward.style.display = "flex";
        if (timerContainer) timerContainer.style.display = "none";
    } else {
        if (dailyReward) dailyReward.style.display = "none";
        if (timerContainer) timerContainer.style.display = "flex";

        const remaining = 86400000 - diff;
        startCountdown(remaining, statsNext, countdownTimer);
    }
}

// Таймер обратного отсчёта
function startCountdown(ms, statsElement, countdownElement) {
    function tick() {
        ms -= 1000;

        if (ms <= 0) {
            loadPlayerData();
            return;
        }

        let h = Math.floor(ms / 3600000);
        let m = Math.floor((ms % 3600000) / 60000);
        let s = Math.floor((ms % 60000) / 1000);

        // Форматирование: 01:05:09
        const format = (num) => num.toString().padStart(2, '0');
        const timeString = `${format(h)}:${format(m)}:${format(s)}`;

        if (statsElement) statsElement.innerText = timeString;
        if (countdownElement) countdownElement.innerText = timeString;

        setTimeout(tick, 1000);
    }
    tick();
}

// Получить награду (вызывается из HTML)
window.claimDailyReward = async function () {
    const now = Date.now();

    if (now - lastClaim < 86400000) {
        alert("Вы уже получали награду сегодня!");
        return;
    }

    const reward = Math.floor(Math.random() * 10) + 1;
    points += reward;

    lastClaim = now;
    localStorage.setItem("lastClaim", lastClaim);

    try {
        await update(ref(db, "players/" + username), {
            points: points,
            lastClaim: lastClaim
        });

        alert(`🎁 Вы получили ${reward} очков!\nВсего очков: ${points}`);
        loadPlayerData();
    } catch (error) {
        alert("Ошибка при сохранении данных. Попробуйте позже.");
        console.error(error);
    }
};

// ---------- Инициализация модуля ----------
function initPointsModule() {
    const authModal = document.getElementById("authModal");
    const mainContent = document.getElementById("mainContent");
    const pointsWidget = document.getElementById("pointsWidget");

    if (username) {
        // Пользователь уже зарегистрирован
        if (authModal) authModal.style.display = "none";
        if (mainContent) mainContent.style.display = "block";
        if (pointsWidget) pointsWidget.style.display = "block";
        
        loadPlayerData();
    } else {
        // Нужна регистрация
        if (authModal) authModal.style.display = "flex";
        if (pointsWidget) pointsWidget.style.display = "none";
    }
}

// Запускаем модуль при загрузке страницы
document.addEventListener('DOMContentLoaded', initPointsModule);
