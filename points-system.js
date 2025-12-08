// ---------- Firebase ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "PASTE_HERE",
    authDomain: "PASTE_HERE",
    projectId: "PASTE_HERE",
    storageBucket: "PASTE_HERE",
    messagingSenderId: "PASTE_HERE",
    appId: "PASTE_HERE",
    databaseURL: "PASTE_HERE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------- Основные переменные ----------
let username = localStorage.getItem("username");
let lastClaim = localStorage.getItem("lastClaim");
let points = 0;

// ---------- UI элементы ----------
const modal = document.getElementById("authModal");
const mainContent = document.getElementById("mainContent");
const userPoints = document.getElementById("userPoints");
const statsPoints = document.getElementById("statsPoints");
const statsNext = document.getElementById("statsNext");
const pointsWidget = document.getElementById("pointsWidget");

// ---------- ФУНКЦИИ ----------

// Сохранить ник
window.saveUsername = async function () {
    const input = document.getElementById("usernameInput").value.trim();

    if (input.length < 3) {
        alert("Минимум 3 символа!");
        return;
    }

    username = input;
    localStorage.setItem("username", username);

    await registerPlayer(username);

    modal.style.display = "none";
    mainContent.style.display = "block";
    pointsWidget.style.display = "block";

    loadPlayerData();
};

// Зарегистрировать игрока
async function registerPlayer(name) {
    const playerRef = ref(db, "players/" + name);

    const snap = await get(playerRef);

    if (!snap.exists()) {
        await set(playerRef, {
            points: 0,
            lastClaim: 0,
            days: 0
        });
    }
}

// Загрузка данных игрока
async function loadPlayerData() {
    const snap = await get(ref(db, "players/" + username));
    const data = snap.val();

    points = data.points;
    lastClaim = data.lastClaim;

    userPoints.innerText = points;
    statsPoints.innerText = points;

    updateTimer();
}

// Проверка таймера
function updateTimer() {
    const now = Date.now();
    const diff = now - lastClaim;

    if (diff >= 86400000) {
        document.getElementById("dailyReward").style.display = "flex";
        document.getElementById("timerContainer").style.display = "none";
    } else {
        const remaining = 86400000 - diff;

        document.getElementById("dailyReward").style.display = "none";
        document.getElementById("timerContainer").style.display = "flex";

        startCountdown(remaining);
    }
}

// Таймер обратного отсчёта
function startCountdown(ms) {
    function tick() {
        ms -= 1000;

        if (ms <= 0) {
            loadPlayerData();
            return;
        }

        let h = Math.floor(ms / 3600000);
        let m = Math.floor((ms % 3600000) / 60000);
        let s = Math.floor((ms % 60000) / 1000);

        statsNext.innerText = `${h}:${m}:${s}`;
        document.getElementById("countdownTimer").innerText = `${h}:${m}:${s}`;

        setTimeout(tick, 1000);
    }
    tick();
}

// Получить награду
window.claimDailyReward = async function () {
    const now = Date.now();

    if (now - lastClaim < 86400000) return;

    const reward = Math.floor(Math.random() * 10) + 1;
    points += reward;

    lastClaim = now;
    localStorage.setItem("lastClaim", lastClaim);

    await update(ref(db, "players/" + username), {
        points: points,
        lastClaim: lastClaim
    });

    alert(`Вы получили ${reward} очков!`);

    loadPlayerData();
};

if (username) {
    modal.style.display = "none";
    mainContent.style.display = "block";
    pointsWidget.style.display = "block";
    loadPlayerData();
} else {
    modal.style.display = "block";
}
