// Настройки чувствительности
const THRESHOLDS = {
    GAS_DANGER: 3000,  // Критический газ
    GAS_WARNING: 1500, // Подозрительный газ
    TEMP_MAX: 50.0,    // Пожар по температуре
    SHAKE_LIMIT: 3.0   // Землетрясение (разница G)
};

function analyzeData(payload) {
    let status = 'good';
    let alerts = [];

    // 1. АНАЛИЗ ГАЗА (MQ7, MQ9, MQ6)
    // Берем максимальное значение из всех датчиков газа
    const maxGas = Math.max(payload.mq7 || 0, payload.mq9 || 0, payload.mq6 || 0);
    
    if (maxGas > THRESHOLDS.GAS_DANGER) {
        status = 'danger';
        alerts.push('Критический уровень газа!');
    } else if (maxGas > THRESHOLDS.GAS_WARNING) {
        if (status !== 'danger') status = 'warning';
        alerts.push('Повышенная загазованность');
    }

    // 2. АНАЛИЗ ОГНЯ (Датчик пламени)
    // Если fire == 1 (или 0, зависит от инверсии датчика. Обычно 0 = огонь, 1 = норма)
    // Давай пока считать, что 1 = ОГОНЬ (как ты написал)
    if (Number(payload.fire) === 1) { 
        status = 'danger';
        alerts.push('ОБНАРУЖЕНО ПЛАМЯ');
    }

    // 3. ЗЕМЛЕТРЯСЕНИЕ (Акселерометр)
    // Считаем полную перегрузку (вектор)
    const totalG = Math.sqrt(
        Math.pow(payload.acc_x, 2) + 
        Math.pow(payload.acc_y, 2) + 
        Math.pow(payload.acc_z, 2)
    );

    // Норма ~9.8. Если отклонение сильное — трясет.
    const deviation = Math.abs(totalG - 9.81);
    
    if (deviation > THRESHOLDS.SHAKE_LIMIT) {
        status = 'danger';
        alerts.push('СЕЙСМОАКТИВНОСТЬ / ВИБРАЦИЯ');
    }

    // 4. ТЕМПЕРАТУРА
    if (payload.mpu_temp > THRESHOLDS.TEMP_MAX) {
        if (status !== 'danger') status = 'warning';
        alerts.push(`Высокая температура: ${payload.mpu_temp}°C`);
    }

    return { status, alerts };
}

module.exports = { analyzeData };