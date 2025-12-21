// fix_points.js - Исправление балансов новогодних очков
// Запустите этот скрипт один раз для исправления всех проблемных балансов

const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

async function fixAllPointsBalances() {
    try {
        console.log('🔧 Начинаем исправление балансов...');
        
        const snapshot = await database.ref('holiday_points').once('value');
        
        if (!snapshot.exists()) {
            console.log('❌ Нет данных о новогодних очках');
            return;
        }
        
        const allPointsData = snapshot.val();
        let fixedCount = 0;
        let negativeFixedCount = 0;
        let decimalFixedCount = 0;
        
        for (const userId in allPointsData) {
            const userData = allPointsData[userId];
            const updates = {};
            let userNeedsFix = false;
            
            if (userData.total_points !== undefined) {
                const currentPoints = userData.total_points;
                let newPoints = Math.round(currentPoints);
                
                if (currentPoints < 0) {
                    console.log(`👤 Игрок ${userId}: отрицательный баланс ${currentPoints} -> исправляем`);
                    newPoints = 50;
                    negativeFixedCount++;
                    userNeedsFix = true;
                }
                else if (!Number.isInteger(currentPoints)) {
                    console.log(`👤 Игрок ${userId}: дробный баланс ${currentPoints} -> округляем до ${newPoints}`);
                    decimalFixedCount++;
                    userNeedsFix = true;
                }
                
                if (userNeedsFix && newPoints !== currentPoints) {
                    updates.total_points = newPoints;
                }
            }
            
            if (userData.available_points !== undefined) {
                const currentAvailable = userData.available_points;
                let newAvailable = Math.round(currentAvailable);
                
                if (currentAvailable < 0) {
                    newAvailable = 0;
                    userNeedsFix = true;
                }
                else if (!Number.isInteger(currentAvailable)) {
                    userNeedsFix = true;
                }
                
                if (userNeedsFix && newAvailable !== currentAvailable) {
                    updates.available_points = newAvailable;
                }
            }
            
            if (userData.spent_points !== undefined) {
                const currentSpent = userData.spent_points;
                let newSpent = Math.round(currentSpent);
                
                if (currentSpent < 0) {
                    newSpent = 0;
                    userNeedsFix = true;
                }
                else if (!Number.isInteger(currentSpent)) {
                    userNeedsFix = true;
                }
                
                if (userNeedsFix && newSpent !== currentSpent) {
                    updates.spent_points = newSpent;
                }
            }
            
            if (Object.keys(updates).length > 0) {
                await database.ref('holiday_points/' + userId).update(updates);
                fixedCount++;
                
                console.log(`✅ Исправлен баланс игрока ${userId}:`, updates);
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log('\n📊 Результаты исправления:');
        console.log(`✅ Всего исправлено игроков: ${fixedCount}`);
        console.log(`🔧 Исправлено отрицательных балансов: ${negativeFixedCount}`);
        console.log(`🔧 Исправлено дробных балансов: ${decimalFixedCount}`);
        console.log('\n🎉 Исправление завершено!');
        
    } catch (error) {
        console.error('❌ Ошибка при исправлении балансов:', error);
    }
}

async function showProblematicUsers() {
    try {
        console.log('🔍 Поиск проблемных балансов...');
        
        const snapshot = await database.ref('holiday_points').once('value');
        
        if (!snapshot.exists()) {
            console.log('❌ Нет данных о новогодних очках');
            return;
        }
        
        const allPointsData = snapshot.val();
        let negativeUsers = [];
        let decimalUsers = [];
        
        for (const userId in allPointsData) {
            const userData = allPointsData[userId];
            
            if (userData.total_points !== undefined) {
                const points = userData.total_points;
                
                if (points < 0) {
                    negativeUsers.push({
                        userId: userId,
                        points: points,
                        nickname: 'Нужно получить из users'
                    });
                }
                else if (!Number.isInteger(points)) {
                    decimalUsers.push({
                        userId: userId,
                        points: points,
                        nickname: 'Нужно получить из users'
                    });
                }
            }
        }
        
        if (negativeUsers.length === 0 && decimalUsers.length === 0) {
            console.log('✅ Все балансы корректны!');
            return;
        }
        
        console.log('\n⚠️ Проблемные балансы:');
        
        if (negativeUsers.length > 0) {
            console.log('\n❌ Отрицательные балансы:');
            negativeUsers.forEach(user => {
                console.log(`  👤 ${user.userId}: ${user.points} очков`);
            });
        }
        
        if (decimalUsers.length > 0) {
            console.log('\n📊 Дробные балансы:');
            decimalUsers.forEach(user => {
                console.log(`  👤 ${user.userId}: ${user.points} очков`);
            });
        }
        
        console.log(`\n📈 Всего проблемных: ${negativeUsers.length + decimalUsers.length}`);
        
    } catch (error) {
        console.error('❌ Ошибка при поиске проблемных балансов:', error);
    }
}

async function getUsersNicknames(userIds) {
    try {
        const nicknames = {};
        
        for (const userId of userIds) {
            const snapshot = await database.ref('users/' + userId).once('value');
            if (snapshot.exists()) {
                const userData = snapshot.val();
                nicknames[userId] = userData.nickname || 'Неизвестно';
            }
        }
        
        return nicknames;
    } catch (error) {
        console.error('❌ Ошибка получения никнеймов:', error);
        return {};
    }
}

function createFixUI() {
    if (document.getElementById('fix-container')) return;
    
    const container = document.createElement('div');
    container.id = 'fix-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #ffcc00;
        border-radius: 15px;
        padding: 20px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 9999;
        width: 350px;
        box-shadow: 0 0 30px rgba(255, 204, 0, 0.3);
    `;
    
    container.innerHTML = `
        <h3 style="color: #ffcc00; margin: 0 0 15px; text-align: center;">
            🔧 Исправление балансов
        </h3>
        
        <div style="margin-bottom: 15px;">
            <button id="check-btn" style="width: 100%; padding: 12px; margin-bottom: 10px;
                   background: linear-gradient(90deg, #0088ff, #00ccff); 
                   border: none; border-radius: 8px; color: white; 
                   font-family: 'Orbitron', sans-serif; cursor: pointer;">
                🔍 Проверить балансы
            </button>
            
            <button id="fix-btn" style="width: 100%; padding: 12px;
                   background: linear-gradient(90deg, #00cc66, #00ff88); 
                   border: none; border-radius: 8px; color: white; 
                   font-family: 'Orbitron', sans-serif; cursor: pointer;">
                ⚡ Исправить все
            </button>
        </div>
        
        <div id="results" style="background: rgba(255, 255, 255, 0.05); 
             border-radius: 10px; padding: 15px; margin-top: 15px; 
             max-height: 200px; overflow-y: auto; display: none;">
            <div id="results-content"></div>
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
            <button id="close-btn" style="padding: 8px 20px;
                   background: rgba(255, 68, 68, 0.8); 
                   border: none; border-radius: 6px; color: white; 
                   font-size: 12px; cursor: pointer;">
                Закрыть
            </button>
        </div>
    `;
    
    document.body.appendChild(container);
    
    document.getElementById('check-btn').addEventListener('click', async () => {
        await showProblematicUsersUI();
    });
    
    document.getElementById('fix-btn').addEventListener('click', async () => {
        await fixAllPointsBalancesUI();
    });
    
    document.getElementById('close-btn').addEventListener('click', () => {
        container.remove();
    });
}

async function showProblematicUsersUI() {
    const resultsDiv = document.getElementById('results');
    const contentDiv = document.getElementById('results-content');
    
    resultsDiv.style.display = 'block';
    contentDiv.innerHTML = '<div style="text-align: center; padding: 10px;">🔍 Проверка...</div>';
    
    try {
        const snapshot = await database.ref('holiday_points').once('value');
        
        if (!snapshot.exists()) {
            contentDiv.innerHTML = '<div style="color: #ff4444; text-align: center;">❌ Нет данных</div>';
            return;
        }
        
        const allPointsData = snapshot.val();
        let negativeUsers = [];
        let decimalUsers = [];
        
        for (const userId in allPointsData) {
            const userData = allPointsData[userId];
            
            if (userData.total_points !== undefined) {
                const points = userData.total_points;
                
                if (points < 0) {
                    negativeUsers.push({ userId, points });
                }
                else if (!Number.isInteger(points)) {
                    decimalUsers.push({ userId, points });
                }
            }
        }
        
        let html = '';
        
        if (negativeUsers.length === 0 && decimalUsers.length === 0) {
            html = '<div style="color: #00ff00; text-align: center;">✅ Все балансы корректны!</div>';
        } else {
            html += '<div style="margin-bottom: 15px;">';
            
            if (negativeUsers.length > 0) {
                html += '<div style="color: #ff4444; font-weight: bold; margin-bottom: 8px;">❌ Отрицательные:</div>';
                negativeUsers.forEach(user => {
                    html += `<div style="font-size: 12px; margin-bottom: 5px; color: #ff9999;">
                        👤 ${user.userId.substring(0, 8)}...: ${user.points} → 50
                    </div>`;
                });
            }
            
            if (decimalUsers.length > 0) {
                html += '<div style="color: #ffaa00; font-weight: bold; margin-bottom: 8px; margin-top: 15px;">📊 Дробные:</div>';
                decimalUsers.forEach(user => {
                    html += `<div style="font-size: 12px; margin-bottom: 5px; color: #ffcc99;">
                        👤 ${user.userId.substring(0, 8)}...: ${user.points} → ${Math.round(user.points)}
                    </div>`;
                });
            }
            
            html += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                📈 Всего проблемных: <strong>${negativeUsers.length + decimalUsers.length}</strong>
            </div>`;
            
            html += '</div>';
        }
        
        contentDiv.innerHTML = html;
        
    } catch (error) {
        contentDiv.innerHTML = `<div style="color: #ff4444; text-align: center;">
            ❌ Ошибка: ${error.message}
        </div>`;
    }
}

async function fixAllPointsBalancesUI() {
    const resultsDiv = document.getElementById('results');
    const contentDiv = document.getElementById('results-content');
    const fixBtn = document.getElementById('fix-btn');
    
    resultsDiv.style.display = 'block';
    fixBtn.disabled = true;
    fixBtn.innerHTML = '⏳ Исправление...';
    
    contentDiv.innerHTML = '<div style="text-align: center; padding: 10px;">⚡ Исправление...</div>';
    
    try {
        const snapshot = await database.ref('holiday_points').once('value');
        
        if (!snapshot.exists()) {
            contentDiv.innerHTML = '<div style="color: #ff4444; text-align: center;">❌ Нет данных</div>';
            return;
        }
        
        const allPointsData = snapshot.val();
        let fixedCount = 0;
        let negativeFixedCount = 0;
        let decimalFixedCount = 0;
        
        let progressHtml = '<div style="font-size: 11px; color: #aaaaff; margin-bottom: 10px;">Прогресс:</div>';
        contentDiv.innerHTML = progressHtml;
        
        for (const userId in allPointsData) {
            const userData = allPointsData[userId];
            const updates = {};
            let userNeedsFix = false;
            
            if (userData.total_points !== undefined) {
                const currentPoints = userData.total_points;
                let newPoints = Math.round(currentPoints);
                
                if (currentPoints < 0) {
                    newPoints = 50;
                    negativeFixedCount++;
                    userNeedsFix = true;
                }
                else if (!Number.isInteger(currentPoints)) {
                    decimalFixedCount++;
                    userNeedsFix = true;
                }
                
                if (userNeedsFix && newPoints !== currentPoints) {
                    updates.total_points = newPoints;
                }
            }
            
            if (userData.available_points !== undefined) {
                const currentAvailable = userData.available_points;
                let newAvailable = Math.round(currentAvailable);
                
                if (currentAvailable < 0) {
                    newAvailable = 0;
                    userNeedsFix = true;
                }
                else if (!Number.isInteger(currentAvailable)) {
                    userNeedsFix = true;
                }
                
                if (userNeedsFix && newAvailable !== currentAvailable) {
                    updates.available_points = newAvailable;
                }
            }
            
            if (userData.spent_points !== undefined) {
                const currentSpent = userData.spent_points;
                let newSpent = Math.round(currentSpent);
                
                if (currentSpent < 0) {
                    newSpent = 0;
                    userNeedsFix = true;
                }
                else if (!Number.isInteger(currentSpent)) {
                    userNeedsFix = true;
                }
                
                if (userNeedsFix && newSpent !== currentSpent) {
                    updates.spent_points = newSpent;
                }
            }
            
            if (Object.keys(updates).length > 0) {
                await database.ref('holiday_points/' + userId).update(updates);
                fixedCount++;
                
                const userKey = userId.substring(0, 8) + '...';
                contentDiv.innerHTML += `<div style="font-size: 11px; color: #88ff88; margin-bottom: 3px;">
                    ✅ ${userKey}: исправлен
                </div>`;
                contentDiv.scrollTop = contentDiv.scrollHeight;
                
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        let resultHtml = `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="color: #00ff00; font-weight: bold; margin-bottom: 5px;">🎉 Исправление завершено!</div>
                <div style="font-size: 12px;">
                    <div>✅ Всего исправлено: <strong>${fixedCount}</strong></div>
                    <div>🔧 Отрицательных → 50: <strong>${negativeFixedCount}</strong></div>
                    <div>🔧 Дробных → целые: <strong>${decimalFixedCount}</strong></div>
                </div>
            </div>
        `;
        
        contentDiv.innerHTML += resultHtml;
        
    } catch (error) {
        contentDiv.innerHTML = `<div style="color: #ff4444; text-align: center;">
            ❌ Ошибка: ${error.message}
        </div>`;
    } finally {
        fixBtn.disabled = false;
        fixBtn.innerHTML = '⚡ Исправить все';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'fix-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid ${type === 'success' ? '#00cc66' : '#ff4444'};
        border-radius: 15px;
        padding: 30px 40px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 10000;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 0 50px rgba(0, 204, 102, 0.5);
    `;
    
    notification.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 20px;">
            ${type === 'success' ? '✅' : '❌'}
        </div>
        <div style="font-size: 18px; margin-bottom: 10px;">
            ${type === 'success' ? 'Успешно!' : 'Ошибка!'}
        </div>
        <div style="font-size: 14px; color: #aaaaff;">
            ${message}
        </div>
        <button id="close-notif" style="margin-top: 20px; padding: 10px 30px;
               background: linear-gradient(90deg, #6200ff, #ff00ff); 
               border: none; border-radius: 8px; color: white; 
               cursor: pointer;">
            Закрыть
        </button>
    `;
    
    document.body.appendChild(notification);
    
    document.getElementById('close-notif').addEventListener('click', () => {
        notification.remove();
    });
}

window.onload = function() {
    const adminKey = localStorage.getItem('admin_key') || 'admin123';
    
    if (adminKey === 'admin123') {
        setTimeout(() => {
            createFixUI();
        }, 1000);
    }
};

console.log('🔧 Скрипт исправления балансов загружен');
console.log('📝 Доступные функции:');
console.log('   - fixAllPointsBalances() - исправить все балансы');
console.log('   - showProblematicUsers() - показать проблемные балансы');
