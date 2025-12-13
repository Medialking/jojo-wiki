// timeManager.js - Общий менеджер времени для всех новогодних активностей
let SERVER_TIME_OFFSET = 0;

class TimeManager {
    // Синхронизация времени с сервером Firebase
    static async syncWithServer() {
        try {
            const ref = firebase.database().ref('.info/serverTimeOffset');
            const snapshot = await ref.once('value');
            const offset = snapshot.val() || 0;
            SERVER_TIME_OFFSET = offset;
            console.log('✅ Время синхронизировано с сервером, offset:', offset);
            return this.getCurrentTime();
        } catch (error) {
            console.log('⚠️ Используем локальное время');
            SERVER_TIME_OFFSET = 0;
            return this.getCurrentTime();
        }
    }
    
    // Получение текущего времени (серверное + offset)
    static getCurrentTime() {
        return Date.now() + SERVER_TIME_OFFSET;
    }
    
    // Получение даты в формате YYYY-MM-DD для проверок
    static getTodayKey() {
        const now = new Date(this.getCurrentTime());
        return now.toISOString().split('T')[0];
    }
    
    // Проверка, можно ли выполнить действие (прошло ли 24 часа)
    static canPerformAction(lastActionTime) {
        if (!lastActionTime) {
            return true; // Никогда не выполнялось
        }
        
        const now = this.getCurrentTime();
        const lastTime = new Date(lastActionTime).getTime();
        const hoursSinceLast = (now - lastTime) / (1000 * 60 * 60);
        
        console.log(`⏰ Проверка времени: ${hoursSinceLast.toFixed(2)} часов с последнего действия`);
        return hoursSinceLast >= 24;
    }
    
    // Получение времени до следующего действия
    static getTimeToNextAction(lastActionTime) {
        if (!lastActionTime) {
            return 0; // Можно выполнить сразу
        }
        
        const lastTime = new Date(lastActionTime).getTime();
        const nextTime = lastTime + (24 * 60 * 60 * 1000);
        const now = this.getCurrentTime();
        
        const timeLeft = Math.max(0, nextTime - now);
        console.log(`⏰ Времени до следующего действия: ${this.formatTime(timeLeft)}`);
        return timeLeft;
    }
    
    // Форматирование времени в ЧЧ:ММ:СС
    static formatTime(ms) {
        if (ms <= 0) return "00:00:00";
        
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Проверка, выполнялось ли действие сегодня (по ключу даты)
    static wasActionToday(actionDate) {
        if (!actionDate) return false;
        
        const todayKey = this.getTodayKey();
        const actionKey = new Date(actionDate).toISOString().split('T')[0];
        
        console.log(`📅 Проверка даты: сегодня ${todayKey}, действие ${actionKey}`);
        return actionKey === todayKey;
    }
    
    // Проверка по данным в формате { "2025-01-15": {...} }
    static wasActionTodayInObject(actionsObject) {
        if (!actionsObject) return false;
        
        const todayKey = this.getTodayKey();
        const wasToday = actionsObject[todayKey] !== undefined;
        
        console.log(`📊 Проверка объекта: ${todayKey} в объекте? ${wasToday}`);
        return wasToday;
    }
    
    // Получение разницы во времени для отладки
    static getTimeDifference(lastActionTime) {
        const now = this.getCurrentTime();
        const lastTime = new Date(lastActionTime).getTime();
        return now - lastTime;
    }
}
