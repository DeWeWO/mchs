// src/data/sensors.js

export const MCHS_BASE = { lng: 60.625, lat: 41.545, title: "ЦУКС МЧС" };

export const SENSORS_DATA = [
    { id: 101, lng: 60.6333, lat: 41.5514, type: 'aqi', title: 'Центральная Площадь', status: 'moderate', value: 'AQI 78' },
    { id: 102, lng: 60.6510, lat: 41.5600, type: 'gas', title: 'Газовая станция №3', status: 'good', value: 'CH4 0.1%' },
    { id: 103, lng: 60.6200, lat: 41.5350, type: 'radiation', title: 'Ж/Д Вокзал', status: 'danger', value: '0.45 мкЗв' },
    { id: 104, lng: 60.6317, lat: 41.5707, type: 'radiation', title: 'ТАТУ Ургенч', status: 'good', value: '0.11 мкЗв' },
    { id: 105, lng: 60.6150, lat: 41.5700, type: 'gas', title: 'Промзона "Текстиль"', status: 'offline', value: 'Нет связи' },
];

export const CAMERAS_DATA = [
    { id: 'c1', lng: 60.6350, lat: 41.5530, title: 'Перекресток Аль-Хорезми' },
    { id: 'c2', lng: 60.6480, lat: 41.5580, title: 'КПП Химзавод' }
];