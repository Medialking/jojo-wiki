// mining_farm.js

// Инициализация Firebase (используем ту же конфигурацию)
const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

// Проверяем, загружен ли Firebase
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase не загружен!');
    // Загружаем Firebase динамически если нужно
    const firebaseScript = document.createElement('script');
    firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js';
    firebaseScript.onload = function() {
        const firebaseDBScript = document.createElement('script');
        firebaseDBScript.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js';
        firebaseDBScript.onload = function() {
            initializeFirebase();
        };
        document.head.appendChild(firebaseDBScript);
    };
    document.head.appendChild(firebaseScript);
} else {
    initializeFirebase();
}

function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    window.database = firebase.database();
    
    // Запускаем инициализацию фермы
    initializeFarm();
}

function initializeFarm() {
    // Ждем немного чтобы все загрузилось
    setTimeout(() => {
        createParticles();
        
        document.getElementById("loader").style.opacity = "0";
        setTimeout(async () => {
            document.getElementById("loader").style.display = "none";
            document.getElementById("content").style.opacity = "1";
            
            if (await checkAuth()) {
                // Проверяем, что TimeManager доступен
                if (typeof TimeManager === 'undefined') {
                    console.error('❌ TimeManager не загружен!');
                    showError('Ошибка загрузки модуля времени');
                    return;
                }
                
                try {
                    await TimeManager.syncWithServer();
                    await loadPointsData();
                    await loadFarmData();
                    setupEventListeners();
                    startFarmUpdates();
                    updateFarmVisualization();
                    updateIncomeHistory();
                } catch (error) {
                    console.error('❌ Ошибка инициализации фермы:', error);
                    showError('Ошибка загрузки фермы: ' + error.message);
                }
            }
        }, 400);
    }, 100);
}

// Глобальные переменные
let userId = null;
let userNickname = null;
let farmData = null;
let pointsData = null;
let lastUpdateTime = null;
let updateInterval = null;

// Структура улучшений фермы
const UPGRADES = {
    COOLING: {
        name: 'cooling',
        maxLevel: 100,
        baseCost: 100,
        costMultiplier: 1.15,
        incomeBonusPerLevel: 0.01, // +1% к доходу за уровень
        description: 'Увеличивает стабильность фермы'
    },
    GPU: {
        name: 'gpu',
        maxCount: 50,
        baseCost: 150,
        costMultiplier: 1.2,
        powerPerGPU: 10, // GH/s за видеокарту
        powerConsumption: 20, // Вт за видеокарту
        description: 'Основная вычислительная мощность'
    },
    ENERGY: {
        name: 'energy',
        maxLevel: 50,
        baseCost: 120,
        costMultiplier: 1.12,
        powerLimitPerLevel: 20, // +20 Вт за уровень
        description: 'Энергоснабжение фермы'
    },
    AI: {
        name: 'ai',
        maxLevel: 30,
        baseCost: 200,
        costMultiplier: 1.18,
        efficiencyPerLevel: 0.005, // +0.5% эффективности за уровень
        description: 'ИИ оптимизация процессов'
    },
    CLOUD: {
        name: 'cloud',
        maxLevel: 20,
        baseCost: 300,
        costMultiplier: 1.25,
        powerBonusPerLevel: 0.02, // +2% к мощности за уровень
        description: 'Облачные вычисления'
    },
    ALGORITHM: {
        name: 'algorithm',
        maxLevel: 10,
        baseCost: 500,
        costMultiplier: 1.3,
        profitBonusPerLevel: 0.03, // +3% прибыльности за уровень
        description: 'Алгоритм майнинга'
    }
};

// ЗАГРУЗКА СТРАНИЦЫ
window.onload = async function() {
    // Инициализация уже происходит в initializeFarm()
};

// СОЗДАНИЕ ФОНОВЫХ ЧАСТИЦ
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        const size = Math.random() * 2 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        
        const duration = Math.random() * 20 + 15;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        particlesContainer.appendChild(particle);
    }
}

// ПРОВЕРКА АВТОРИЗАЦИИ
async function checkAuth() {
    userId = localStorage.getItem('jojoland_userId');
    userNickname = localStorage.getItem('jojoland_nickname');
    
    if (!userId || !userNickname) {
        showError('Для доступа к ферме необходимо войти в аккаунт');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 3000);
        return false;
    }
    
    return true;
}

// ЗАГРУЗКА ДАННЫХ ОЧКОВ
async function loadPointsData() {
    try {
        const snapshot = await database.ref('holiday_points/' + userId).once('value');
        
        if (snapshot.exists()) {
            pointsData = snapshot.val();
            console.log('✅ Данные очков загружены для фермы');
        } else {
            pointsData = { total_points: 0 };
        }
        
        // Обновляем отображение очков
        updatePointsDisplay();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных очков:', error);
        pointsData = { total_points: 0 };
    }
}

// ЗАГРУЗКА ДАННЫХ ФЕРМЫ
async function loadFarmData() {
    try {
        const snapshot = await database.ref('mining_farms/' + userId).once('value');
        
        if (snapshot.exists()) {
            farmData = snapshot.val();
            console.log('✅ Данные фермы загружены:', farmData);
            
            // Проверяем и инициализируем недостающие поля
            if (!farmData.upgrades) {
                farmData.upgrades = initializeUpgrades();
            }
            
            if (!farmData.income) {
                farmData.income = initializeIncome();
            }
            
            if (!farmData.history) {
                farmData.history = [];
            }
            
            if (!farmData.lastClaim) {
                farmData.lastClaim = null;
            }
            
            // Обновляем данные в Firebase
            await saveFarmData();
            
        } else {
            // Создаем новую ферму
            farmData = {
                upgrades: initializeUpgrades(),
                income: initializeIncome(),
                history: [],
                lastClaim: null,
                createdAt: new Date().toISOString(),
                totalEarned: 0
            };
            
            await database.ref('mining_farms/' + userId).set(farmData);
            console.log('✅ Новая ферма создана');
        }
        
        // Обновляем UI
        updateAllDisplays();
        updateClaimProgress();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных фермы:', error);
        showError('Ошибка загрузки фермы');
        farmData = null;
    }
}

// ИНИЦИАЛИЗАЦИЯ УЛУЧШЕНИЙ
function initializeUpgrades() {
    return {
        cooling: { level: 1 },
        gpu: { count: 1 },
        energy: { level: 1 },
        ai: { level: 1 },
        cloud: { level: 0 },
        algorithm: { level: 1 }
    };
}

// ИНИЦИАЛИЗАЦИЯ ДОХОДА
function initializeIncome() {
    return {
        perHour: calculateIncomePerHour(),
        accumulated: 0,
        lastUpdate: new Date().toISOString()
    };
}

// СОХРАНЕНИЕ ДАННЫХ ФЕРМЫ
async function saveFarmData() {
    try {
        await database.ref('mining_farms/' + userId).set(farmData);
        console.log('✅ Данные фермы сохранены');
    } catch (error) {
        console.error('❌ Ошибка сохранения данных фермы:', error);
    }
}

// ОБНОВЛЕНИЕ ВСЕХ ОТОБРАЖЕНИЙ
function updateAllDisplays() {
    updatePointsDisplay();
    updateUpgradeDisplays();
    updateFarmStats();
    updateFarmVisualization();
}

// ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ОЧКОВ
function updatePointsDisplay() {
    const totalPoints = pointsData?.total_points || 0;
    document.getElementById('farm-points').textContent = totalPoints;
}

// ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ УЛУЧШЕНИЙ
function updateUpgradeDisplays() {
    if (!farmData || !farmData.upgrades) return;
    
    const upgrades = farmData.upgrades;
    const userPoints = pointsData?.total_points || 0;
    
    // Охлаждение
    const coolingLevel = upgrades.cooling.level || 1;
    const coolingCost = calculateUpgradeCost(UPGRADES.COOLING, coolingLevel);
    const coolingBonus = (coolingLevel - 1) * UPGRADES.COOLING.incomeBonusPerLevel * 100;
    
    document.getElementById('cooling-level').textContent = coolingLevel;
    document.getElementById('cooling-bonus').textContent = `+${coolingBonus.toFixed(1)}%`;
    document.getElementById('cooling-cost').textContent = coolingCost;
    document.getElementById('cooling-progress').style.width = `${(coolingLevel / UPGRADES.COOLING.maxLevel) * 100}%`;
    
    const coolingBtn = document.getElementById('upgrade-cooling');
    coolingBtn.disabled = coolingLevel >= UPGRADES.COOLING.maxLevel || userPoints < coolingCost;
    coolingBtn.textContent = coolingLevel >= UPGRADES.COOLING.maxLevel ? 'Макс. уровень' : 'Улучшить';
    
    // Видеокарты
    const gpuCount = upgrades.gpu.count || 1;
    const gpuCost = calculateUpgradeCost(UPGRADES.GPU, gpuCount);
    const gpuPower = gpuCount * UPGRADES.GPU.powerPerGPU;
    
    document.getElementById('gpu-count').textContent = gpuCount;
    document.getElementById('gpu-power').textContent = UPGRADES.GPU.powerPerGPU;
    document.getElementById('gpu-cost').textContent = gpuCost;
    document.getElementById('gpu-progress').style.width = `${(gpuCount / UPGRADES.GPU.maxCount) * 100}%`;
    
    const gpuBtn = document.getElementById('upgrade-gpu');
    gpuBtn.disabled = gpuCount >= UPGRADES.GPU.maxCount || userPoints < gpuCost || !canAddGPU();
    gpuBtn.textContent = gpuCount >= UPGRADES.GPU.maxCount ? 'Макс. количество' : 'Добавить GPU';
    
    // Энергоснабжение
    const energyLevel = upgrades.energy.level || 1;
    const energyCost = calculateUpgradeCost(UPGRADES.ENERGY, energyLevel);
    const energyLimit = energyLevel * UPGRADES.ENERGY.powerLimitPerLevel;
    
    document.getElementById('energy-level').textContent = energyLevel;
    document.getElementById('energy-limit').textContent = energyLimit;
    document.getElementById('energy-cost').textContent = energyCost;
    document.getElementById('energy-progress').style.width = `${(energyLevel / UPGRADES.ENERGY.maxLevel) * 100}%`;
    
    const energyBtn = document.getElementById('upgrade-energy');
    energyBtn.disabled = energyLevel >= UPGRADES.ENERGY.maxLevel || userPoints < energyCost;
    energyBtn.textContent = energyLevel >= UPGRADES.ENERGY.maxLevel ? 'Макс. уровень' : 'Улучшить';
    
    // ИИ Оптимизация
    const aiLevel = upgrades.ai.level || 1;
    const aiCost = calculateUpgradeCost(UPGRADES.AI, aiLevel);
    const aiEfficiency = (aiLevel - 1) * UPGRADES.AI.efficiencyPerLevel * 100;
    
    document.getElementById('ai-level').textContent = aiLevel;
    document.getElementById('ai-efficiency').textContent = `+${aiEfficiency.toFixed(1)}%`;
    document.getElementById('ai-cost').textContent = aiCost;
    document.getElementById('ai-progress').style.width = `${(aiLevel / UPGRADES.AI.maxLevel) * 100}%`;
    
    const aiBtn = document.getElementById('upgrade-ai');
    aiBtn.disabled = aiLevel >= UPGRADES.AI.maxLevel || userPoints < aiCost;
    aiBtn.textContent = aiLevel >= UPGRADES.AI.maxLevel ? 'Макс. уровень' : 'Улучшить';
    
    // Облачный сервер
    const cloudLevel = upgrades.cloud.level || 0;
    const cloudCost = calculateUpgradeCost(UPGRADES.CLOUD, cloudLevel);
    const cloudBonus = cloudLevel * UPGRADES.CLOUD.powerBonusPerLevel * 100;
    
    document.getElementById('cloud-level').textContent = cloudLevel;
    document.getElementById('cloud-bonus').textContent = cloudLevel > 0 ? `+${cloudBonus.toFixed(1)}%` : '+0%';
    document.getElementById('cloud-cost').textContent = cloudCost;
    document.getElementById('cloud-progress').style.width = `${(cloudLevel / UPGRADES.CLOUD.maxLevel) * 100}%`;
    
    const cloudBtn = document.getElementById('upgrade-cloud');
    cloudBtn.disabled = cloudLevel >= UPGRADES.CLOUD.maxLevel || userPoints < cloudCost;
    cloudBtn.textContent = cloudLevel === 0 ? 'Активировать' : cloudLevel >= UPGRADES.CLOUD.maxLevel ? 'Макс. уровень' : 'Улучшить';
    
    // Алгоритм
    const algorithmLevel = upgrades.algorithm.level || 1;
    const algorithmCost = calculateUpgradeCost(UPGRADES.ALGORITHM, algorithmLevel);
    const algorithmProfit = (algorithmLevel - 1) * UPGRADES.ALGORITHM.profitBonusPerLevel * 100;
    const algorithmVersion = `1.${algorithmLevel - 1}`;
    
    document.getElementById('algorithm-version').textContent = algorithmVersion;
    document.getElementById('algorithm-profit').textContent = `+${algorithmProfit.toFixed(1)}%`;
    document.getElementById('algorithm-cost').textContent = algorithmCost;
    document.getElementById('algorithm-progress').style.width = `${(algorithmLevel / UPGRADES.ALGORITHM.maxLevel) * 100}%`;
    
    const algorithmBtn = document.getElementById('upgrade-algorithm');
    algorithmBtn.disabled = algorithmLevel >= UPGRADES.ALGORITHM.maxLevel || userPoints < algorithmCost;
    algorithmBtn.textContent = algorithmLevel >= UPGRADES.ALGORITHM.maxLevel ? 'Макс. версия' : 'Обновить';
}

// РАСЧЕТ СТОИМОСТИ УЛУЧШЕНИЯ
function calculateUpgradeCost(upgrade, currentLevel) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel - 1));
}

// ПРОВЕРКА МОЖНО ЛИ ДОБАВИТЬ GPU
function canAddGPU() {
    if (!farmData || !farmData.upgrades) return false;
    
    const gpuCount = farmData.upgrades.gpu.count || 1;
    const energyLevel = farmData.upgrades.energy.level || 1;
    const powerLimit = energyLevel * UPGRADES.ENERGY.powerLimitPerLevel;
    const powerConsumed = gpuCount * UPGRADES.GPU.powerConsumption;
    
    return powerConsumed + UPGRADES.GPU.powerConsumption <= powerLimit;
}

// РАСЧЕТ ДОХОДА В ЧАС
function calculateIncomePerHour() {
    if (!farmData || !farmData.upgrades) return 0;
    
    const upgrades = farmData.upgrades;
    
    // Базовая мощность от видеокарт
    let basePower = (upgrades.gpu.count || 1) * UPGRADES.GPU.powerPerGPU;
    
    // Бонус от охлаждения (+1% за уровень)
    const coolingBonus = 1 + ((upgrades.cooling.level || 1) - 1) * UPGRADES.COOLING.incomeBonusPerLevel;
    
    // Бонус от ИИ оптимизации (+0.5% за уровень)
    const aiBonus = 1 + ((upgrades.ai.level || 1) - 1) * UPGRADES.AI.efficiencyPerLevel;
    
    // Бонус от облачного сервера (+2% за уровень)
    const cloudBonus = 1 + (upgrades.cloud.level || 0) * UPGRADES.CLOUD.powerBonusPerLevel;
    
    // Бонус от алгоритма (+3% за уровень)
    const algorithmBonus = 1 + ((upgrades.algorithm.level || 1) - 1) * UPGRADES.ALGORITHM.profitBonusPerLevel;
    
    // Итоговый доход в час
    let incomePerHour = basePower * coolingBonus * aiBonus * cloudBonus * algorithmBonus;
    
    // Ограничиваем доход для баланса (максимум 100 очков в час)
    return Math.min(incomePerHour, 100);
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ ФЕРМЫ
function updateFarmStats() {
    if (!farmData || !farmData.upgrades) return;
    
    const upgrades = farmData.upgrades;
    
    // Уровень фермы (среднее всех улучшений)
    const coolingLevel = upgrades.cooling.level || 1;
    const gpuCount = upgrades.gpu.count || 1;
    const energyLevel = upgrades.energy.level || 1;
    const aiLevel = upgrades.ai.level || 1;
    const cloudLevel = upgrades.cloud.level || 0;
    const algorithmLevel = upgrades.algorithm.level || 1;
    
    const averageLevel = Math.floor((coolingLevel + gpuCount + energyLevel + aiLevel + cloudLevel + algorithmLevel) / 6);
    document.getElementById('farm-level').textContent = averageLevel;
    document.getElementById('level-progress').style.width = `${(averageLevel / 50) * 100}%`;
    
    // Мощность хэширования
    const hashPower = (upgrades.gpu.count || 1) * UPGRADES.GPU.powerPerGPU;
    const cloudBonus = 1 + (upgrades.cloud.level || 0) * UPGRADES.CLOUD.powerBonusPerLevel;
    const totalHashPower = hashPower * cloudBonus;
    
    document.getElementById('hash-power').textContent = `${totalHashPower.toFixed(1)} GH/s`;
    document.getElementById('hash-desc').textContent = `Базовые: ${hashPower} GH/s + облако: +${((cloudBonus - 1) * 100).toFixed(1)}%`;
    
    // Эффективность
    const powerConsumed = (upgrades.gpu.count || 1) * UPGRADES.GPU.powerConsumption;
    const powerLimit = (upgrades.energy.level || 1) * UPGRADES.ENERGY.powerLimitPerLevel;
    const efficiency = powerLimit > 0 ? (powerConsumed / powerLimit) * 100 : 0;
    
    document.getElementById('efficiency').textContent = `${efficiency.toFixed(1)}%`;
    document.getElementById('efficiency-desc').textContent = 
        `Потребление: ${powerConsumed} Вт / Лимит: ${powerLimit} Вт`;
    
    // Время работы
    if (farmData.createdAt) {
        const created = new Date(farmData.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        document.getElementById('uptime').textContent = `${diffDays} дней`;
    }
    
    // Обновляем доход в час
    const incomePerHour = calculateIncomePerHour();
    const incomePerDay = incomePerHour * 24;
    
    document.getElementById('daily-income').textContent = incomePerDay.toFixed(1);
    
    // Сохраняем обновленный доход
    if (farmData.income) {
        farmData.income.perHour = incomePerHour;
        farmData.income.lastUpdate = new Date().toISOString();
    }
}

// ВИЗУАЛИЗАЦИЯ ФЕРМЫ
function updateFarmVisualization() {
    if (!farmData || !farmData.upgrades) return;
    
    const gpuCount = farmData.upgrades.gpu.count || 1;
    const farmRack = document.getElementById('farm-rack');
    
    // Очищаем существующие слоты
    farmRack.innerHTML = '';
    
    // Создаем слоты для GPU (максимум 5 для отображения)
    const maxDisplaySlots = 5;
    const slotsToShow = Math.min(gpuCount, maxDisplaySlots);
    
    for (let i = 0; i < maxDisplaySlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'gpu-slot';
        slot.dataset.slot = i + 1;
        
        if (i < slotsToShow) {
            slot.classList.remove('empty');
        } else {
            slot.classList.add('empty');
        }
        
        farmRack.appendChild(slot);
    }
    
    // Если есть больше GPU чем отображается, показываем счетчик
    if (gpuCount > maxDisplaySlots) {
        const counter = document.createElement('div');
        counter.className = 'gpu-counter';
        counter.textContent = `+${gpuCount - maxDisplaySlots} GPU`;
        counter.style.cssText = `
            color: #00ff88;
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            margin-top: 10px;
            text-align: center;
        `;
        farmRack.appendChild(counter);
    }
    
    // Обновляем статусы
    const coolingLevel = farmData.upgrades.cooling.level || 1;
    const energyLevel = farmData.upgrades.energy.level || 1;
    
    document.getElementById('cooling-status').textContent = 
        coolingLevel > 5 ? 'Оптимально' : coolingLevel > 2 ? 'Нормально' : 'Слабое';
    
    document.getElementById('cooling-status').style.color = 
        coolingLevel > 5 ? '#00ff88' : coolingLevel > 2 ? '#ffff00' : '#ff4444';
    
    document.getElementById('power-status').textContent = 
        energyLevel > 3 ? 'Стабильно' : 'Нестабильно';
    
    document.getElementById('power-status').style.color = 
        energyLevel > 3 ? '#00ff88' : '#ffaa00';
    
    document.getElementById('network-status').textContent = 'Онлайн';
    document.getElementById('network-status').style.color = '#00ff88';
}

// ЗАПУСК ОБНОВЛЕНИЙ ФЕРМЫ
function startFarmUpdates() {
    // Обновляем каждую секунду
    updateInterval = setInterval(() => {
        updateFarmIncome();
        updateClaimProgress();
        updateNextPayoutTimer();
    }, 1000);
    
    // Первое обновление
    updateFarmIncome();
}

// ОБНОВЛЕНИЕ ДОХОДА ФЕРМЫ
function updateFarmIncome() {
    if (!farmData || !farmData.income) return;
    
    const now = new Date();
    const lastUpdate = farmData.income.lastUpdate ? new Date(farmData.income.lastUpdate) : now;
    const secondsPassed = (now - lastUpdate) / 1000;
    
    // Доход в секунду
    const incomePerSecond = farmData.income.perHour / 3600;
    const incomeToAdd = incomePerSecond * secondsPassed;
    
    // Добавляем накопленный доход
    farmData.income.accumulated = (farmData.income.accumulated || 0) + incomeToAdd;
    farmData.income.lastUpdate = now.toISOString();
    
    // Обновляем отображение доступного дохода
    updateClaimableAmount();
}

// ОБНОВЛЕНИЕ ДОСТУПНОЙ СУММЫ ДЛЯ СБОРА
function updateClaimableAmount() {
    if (!farmData || !farmData.income) return;
    
    const claimable = farmData.income.accumulated || 0;
    document.getElementById('claimable-amount').textContent = claimable.toFixed(2);
    
    const claimBtn = document.getElementById('claim-btn');
    claimBtn.disabled = claimable < 0.01; // Минимум 0.01 очка для сбора
}

// ОБНОВЛЕНИЕ ПРОГРЕССА СБОРА
function updateClaimProgress() {
    if (!farmData || !farmData.lastClaim) {
        document.getElementById('claim-progress').style.width = '0%';
        return;
    }
    
    const lastClaim = new Date(farmData.lastClaim);
    const now = new Date();
    const hoursSinceClaim = (now - lastClaim) / (1000 * 60 * 60);
    const progress = Math.min((hoursSinceClaim / 24) * 100, 100);
    
    document.getElementById('claim-progress').style.width = `${progress}%`;
    
    const claimBtn = document.getElementById('claim-btn');
    claimBtn.disabled = progress < 100 || (farmData.income.accumulated || 0) < 0.01;
}

// ОБНОВЛЕНИЕ ТАЙМЕРА СЛЕДУЮЩЕЙ ВЫПЛАТЫ
function updateNextPayoutTimer() {
    if (!farmData || !farmData.lastClaim) {
        document.getElementById('next-payout').textContent = '24:00:00';
        return;
    }
    
    const lastClaim = new Date(farmData.lastClaim);
    const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now >= nextClaim) {
        document.getElementById('next-payout').textContent = 'Готово!';
        return;
    }
    
    const diff = nextClaim - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('next-payout').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// УЛУЧШЕНИЕ ХАРАКТЕРИСТИК - ИСПРАВЛЕННАЯ ФУНКЦИЯ
async function upgradeCharacteristic(upgradeType) {
    if (!farmData || !farmData.upgrades || !pointsData) return;
    
    const upgrade = UPGRADES[upgradeType.toUpperCase()];
    if (!upgrade) return;
    
    const currentLevel = farmData.upgrades[upgrade.name].level || 
                       farmData.upgrades[upgrade.name].count || 
                       1;
    
    const cost = calculateUpgradeCost(upgrade, currentLevel);
    const userPoints = pointsData.total_points || 0;
    
    // Проверка возможности улучшения
    if (userPoints < cost) {
        showError('Недостаточно новогодних очков');
        return;
    }
    
    // Проверка максимального уровня
    const maxLevel = upgrade.maxLevel || upgrade.maxCount || 100;
    if (currentLevel >= maxLevel) {
        showError('Достигнут максимальный уровень');
        return;
    }
    
    // Для GPU проверяем энергоснабжение
    if (upgrade.name === 'gpu' && !canAddGPU()) {
        showError('Недостаточно энергии. Улучшите энергоснабжение!');
        return;
    }
    
    try {
        // Вычитаем очки
        const newPoints = userPoints - cost;
        
        // Обновляем улучшение
        if (upgrade.name === 'gpu') {
            farmData.upgrades[upgrade.name].count = currentLevel + 1;
        } else {
            farmData.upgrades[upgrade.name].level = currentLevel + 1;
        }
        
        // Обновляем очки в обоих местах
        pointsData.total_points = newPoints;
        
        // Используем set вместо update для исправления ошибки с точками
        // Создаем объект для обновления
        const updates = {};
        updates[`upgrades/${upgrade.name}`] = farmData.upgrades[upgrade.name];
        
        // Обновляем все данные одним запросом
        await database.ref('mining_farms/' + userId).update({
            upgrades: farmData.upgrades
        });
        
        // Обновляем очки отдельно
        await database.ref('holiday_points/' + userId).update({
            total_points: newPoints
        });
        
        // Пересчитываем доход
        farmData.income.perHour = calculateIncomePerHour();
        
        // Обновляем UI
        updateAllDisplays();
        updateClaimProgress();
        
        // Показываем уведомление
        const upgradeName = getUpgradeDisplayName(upgrade.name);
        showNotification(`✅ ${upgradeName} улучшена до уровня ${currentLevel + 1}!`);
        
        console.log(`✅ Улучшено: ${upgrade.name} до уровня ${currentLevel + 1}, потрачено: ${cost} очков`);
        
    } catch (error) {
        console.error('❌ Ошибка улучшения:', error);
        showError('Ошибка при улучшении');
    }
}

// ПОЛУЧЕНИЕ ОТОБРАЖАЕМОГО ИМЕНИ УЛУЧШЕНИЯ
function getUpgradeDisplayName(upgradeName) {
    const names = {
        'cooling': 'Система охлаждения',
        'gpu': 'Видеокарты',
        'energy': 'Энергоснабжение',
        'ai': 'ИИ Оптимизация',
        'cloud': 'Облачный сервер',
        'algorithm': 'Алгоритм майнинга'
    };
    return names[upgradeName] || upgradeName;
}

// СБОР ДОХОДА
async function claimIncome() {
    if (!farmData || !farmData.income) return;
    
    const claimable = farmData.income.accumulated || 0;
    
    if (claimable < 0.01) {
        showError('Недостаточно накопленного дохода');
        return;
    }
    
    // Проверяем, можно ли собирать (раз в 24 часа)
    if (farmData.lastClaim) {
        const lastClaim = new Date(farmData.lastClaim);
        const now = new Date();
        const hoursSinceClaim = (now - lastClaim) / (1000 * 60 * 60);
        
        if (hoursSinceClaim < 24) {
            const hoursLeft = 24 - hoursSinceClaim;
            showError(`Следующий сбор возможен через ${Math.ceil(hoursLeft)} часов`);
            return;
        }
    }
    
    try {
        // Округляем до 2 знаков
        const claimedAmount = parseFloat(claimable.toFixed(2));
        
        // Обновляем общее количество очков
        const currentPoints = pointsData.total_points || 0;
        const newPoints = currentPoints + claimedAmount;
        
        pointsData.total_points = newPoints;
        
        // Обновляем статистику фермы
        farmData.income.accumulated = 0;
        farmData.lastClaim = new Date().toISOString();
        farmData.totalEarned = (farmData.totalEarned || 0) + claimedAmount;
        
        // Добавляем в историю
        const claimRecord = {
            date: new Date().toISOString(),
            amount: claimedAmount,
            type: 'farm_income'
        };
        
        farmData.history.unshift(claimRecord);
        // Ограничиваем историю 50 записями
        farmData.history = farmData.history.slice(0, 50);
        
        // Сохраняем все изменения одним запросом
        await database.ref('mining_farms/' + userId).update({
            income: farmData.income,
            lastClaim: farmData.lastClaim,
            totalEarned: farmData.totalEarned,
            history: farmData.history
        });
        
        // Обновляем очки отдельно
        await database.ref('holiday_points/' + userId).update({
            total_points: newPoints
        });
        
        // Обновляем UI
        updateAllDisplays();
        updateIncomeHistory();
        
        // Показываем модальное окно с результатом
        showClaimModal(claimedAmount);
        
        console.log(`✅ Собран доход: ${claimedAmount} очков, всего: ${newPoints} очков`);
        
    } catch (error) {
        console.error('❌ Ошибка сбора дохода:', error);
        showError('Ошибка при сборе дохода');
    }
}

// ПОКАЗ МОДАЛЬНОГО ОКНА СБОРА
function showClaimModal(amount) {
    const modal = document.getElementById('claim-modal');
    const amountElement = document.getElementById('claimed-amount');
    const claimTimeElement = document.getElementById('claim-time');
    const messageElement = document.getElementById('claim-message');
    
    // Устанавливаем значения
    document.querySelector('#claimed-amount .points-number').textContent = amount.toFixed(2);
    
    // Рассчитываем время с последнего сбора
    if (farmData.history && farmData.history.length > 0) {
        const lastClaim = new Date(farmData.history[0].date);
        const now = new Date();
        const hoursDiff = (now - lastClaim) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            claimTimeElement.textContent = `${hoursDiff.toFixed(1)}ч`;
        }
    }
    
    // Устанавливаем сообщение
    let message = '';
    if (amount < 10) {
        message = 'Хорошее начало! Улучшайте ферму для большего дохода!';
    } else if (amount < 50) {
        message = 'Отличный результат! Ферма работает эффективно!';
    } else if (amount < 100) {
        message = 'Великолепно! Ваша ферма приносит большой доход!';
    } else {
        message = 'Потрясающе! Максимальная эффективность достигнута!';
    }
    
    messageElement.textContent = message;
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Закрытие модального окна
    document.getElementById('close-claim').addEventListener('click', function() {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.opacity = '1';
        }, 300);
    });
}

// ОБНОВЛЕНИЕ ИСТОРИИ ДОХОДОВ
function updateIncomeHistory() {
    if (!farmData || !farmData.history) return;
    
    const historyList = document.getElementById('income-history');
    const history = farmData.history || [];
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">💰</div>
                <p>Пока нет истории доходов</p>
                <small>Соберите первый доход с фермы!</small>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = history.map(record => {
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let typeText = 'Доход с фермы';
        let icon = '⚡';
        
        return `
            <div class="income-item">
                <div class="income-date">
                    <div>${formattedDate}</div>
                    <small>${time}</small>
                </div>
                <div class="income-info">
                    <div class="income-type">${icon} ${typeText}</div>
                </div>
                <div class="income-amount">+${record.amount.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    // Кнопки улучшений
    document.getElementById('upgrade-cooling').addEventListener('click', () => upgradeCharacteristic('COOLING'));
    document.getElementById('upgrade-gpu').addEventListener('click', () => upgradeCharacteristic('GPU'));
    document.getElementById('upgrade-energy').addEventListener('click', () => upgradeCharacteristic('ENERGY'));
    document.getElementById('upgrade-ai').addEventListener('click', () => upgradeCharacteristic('AI'));
    document.getElementById('upgrade-cloud').addEventListener('click', () => upgradeCharacteristic('CLOUD'));
    document.getElementById('upgrade-algorithm').addEventListener('click', () => upgradeCharacteristic('ALGORITHM'));
    
    // Кнопка сбора дохода
    document.getElementById('claim-btn').addEventListener('click', claimIncome);
    
    // Кнопка обновления баланса
    document.getElementById('refresh-balance').addEventListener('click', async () => {
        await loadPointsData();
        showNotification('Баланс обновлен!');
    });
    
    // Кнопка обновления страницы
    document.getElementById('farm-refresh-btn').addEventListener('click', async () => {
        await loadFarmData();
        showNotification('Данные фермы обновлены!');
    });
    
    // Кнопка помощи
    document.getElementById('farm-help-btn').addEventListener('click', () => {
        const modal = document.getElementById('help-modal');
        modal.style.display = 'flex';
        
        document.getElementById('close-help').addEventListener('click', function() {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.opacity = '1';
            }, 300);
        });
    });
    
    // Закрытие модальных окон по клику на фон
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.opacity = '0';
                setTimeout(() => {
                    this.style.display = 'none';
                    this.style.opacity = '1';
                }, 300);
            }
        });
    });
}

// ПОКАЗ УВЕДОМЛЕНИЯ
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(0, 204, 102, 0.9)' : 'rgba(255, 68, 68, 0.9)'};
        border: 1px solid ${type === 'success' ? '#00cc66' : '#ff4444'};
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
        font-size: 14px;
    `;
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">
            ${type === 'success' ? '✅ Успешно!' : '⚠️ Ошибка'}
        </div>
        <div>${message}</div>
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
    }, 3000);
}

// ПОКАЗ ОШИБКИ
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 68, 68, 0.9);
        border: 1px solid #ff4444;
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
    `;
    errorDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">⚠️ Ошибка</div>
        <div style="font-size: 14px;">${message}</div>
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }, 3000);
}

// ОСТАНОВКА ОБНОВЛЕНИЙ ПРИ ЗАКРЫТИИ СТРАНИЦЫ
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
