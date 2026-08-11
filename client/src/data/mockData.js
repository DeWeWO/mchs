// 1. БАЗА МЧС (Координаты штаба)
export const MCHS_BASE = { lng: 60.625, lat: 41.545, title: "ЦУКС МЧС" };

// 2. ЗДАНИЯ (Родительские объекты)
export const BUILDINGS = [
    {
        id: 'b1',
        title: 'Главный Штаб МЧС',
        address: 'ул. Аль-Хорезми, 15',
        lat: 41.5514,
        lng: 60.6333,
        floors: 3,
        operator: 'Иванов И.И.',
        status: 'good'
    },
    {
        id: 'b2',
        title: 'Химзавод "Ургенч"',
        address: 'Промзона, Сектор 4',
        lat: 41.5600,
        lng: 60.6510,
        floors: 2,
        operator: 'Петров С.С.',
        status: 'danger'
    }
];

// 3. ДАТЧИКИ (Привязанные к зданиям или уличные)
export const ALL_SENSORS = [
    // --- ДАТЧИКИ В ШТАБЕ (b1) ---
    { id: 101, buildingId: 'b1', floor: 1, type: 'smoke', title: 'Холл (Вход)', status: 'good', value: '0 ppm' },
    { id: 102, buildingId: 'b1', floor: 1, type: 'temp', title: 'Серверная', status: 'warning', value: '28°C' },
    { id: 103, buildingId: 'b1', floor: 2, type: 'gas', title: 'Кухня', status: 'good', value: '0%' },
    { id: 104, buildingId: 'b1', floor: 3, type: 'radiation', title: 'Лаборатория', status: 'good', value: '0.12 мкЗв' },

    // --- ДАТЧИКИ НА ХИМЗАВОДЕ (b2) ---
    { id: 201, buildingId: 'b2', floor: 1, type: 'gas', title: 'Цех переработки', status: 'danger', value: 'CH4 5%' },
    { id: 202, buildingId: 'b2', floor: 2, type: 'smoke', title: 'Вентшахта', status: 'good', value: 'Чисто' },

    // --- УЛИЧНЫЕ ДАТЧИКИ (Без здания) ---
    { id: 301, buildingId: null, lat: 41.5350, lng: 60.6200, type: 'radiation', title: 'Ж/Д Вокзал (Улица)', status: 'good', value: '0.15 мкЗв', operator: 'Сидоров А.А.' },
    { id: 302, buildingId: null, lat: 41.5707, lng: 60.6317, type: 'aqi', title: 'Парк (Пост №1)', status: 'moderate', value: 'AQI 85', operator: 'Сидоров А.А.' },
];

// 4. ОПЕРАТОРЫ (Персонал)
export const OPERATORS = [
    { id: 'u1', name: 'Иванов И.И.', role: 'Старший оператор', status: 'active' },
    { id: 'u2', name: 'Смирнова Е.А.', role: 'Диспетчер', status: 'active' },
    { id: 'u3', name: 'Петров С.С.', role: 'Техник', status: 'busy' },
    { id: 'u4', name: 'Алиев Р.М.', role: 'Стажер', status: 'offline' },
];