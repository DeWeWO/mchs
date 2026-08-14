import { useState, useEffect } from 'react';
import { 
    Activity, Wind, Wifi, Zap, Droplets, 
    Navigation, Users, AlertCircle, Calendar,
    Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, CloudDrizzle
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import RadiationChart from '../components/widgets/RadiationChart';
import { API_URL, WEATHER_KEY, WEATHER_COORDS } from '../config/env';

const BACKEND_URL = API_URL;

const getAuthHeader = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
    } catch {
        return {};
    }
};

const getWmoWeather = (code) => {
    if (code === 0) return { desc: 'Ясно', Icon: Sun, color: 'text-yellow-400' };
    if ([1, 2].includes(code)) return { desc: 'Переменная облачность', Icon: Cloud, color: 'text-gray-300' };
    if (code === 3) return { desc: 'Пасмурно', Icon: Cloud, color: 'text-gray-400' };
    if ([45, 48].includes(code)) return { desc: 'Туман', Icon: CloudFog, color: 'text-gray-400' };
    if ([51, 53, 55, 56, 57].includes(code)) return { desc: 'Морось', Icon: CloudDrizzle, color: 'text-blue-300' };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { desc: 'Дождь', Icon: CloudRain, color: 'text-blue-400' };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { desc: 'Снег', Icon: Snowflake, color: 'text-blue-200' };
    if ([95, 96, 99].includes(code)) return { desc: 'Гроза', Icon: CloudLightning, color: 'text-purple-400' };
    return { desc: 'Неизвестно', Icon: Cloud, color: 'text-gray-400' };
};

export default function Dashboard() {
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Данные с сервера
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Погода (Оставляем, она была норм)
    const [weather, setWeather] = useState({ temp: '--', desc: '...', wind: 0, deg: 0, humidity: 0, pressure: 0, icon: '01d' });
    const [weatherError, setWeatherError] = useState(null);

    // 1. Часы
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Загрузка Статистики с Бэка
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/stats`, { headers: getAuthHeader() });
                const data = await res.json();
                setStats(data);
            } catch (e) {
                console.error("Ошибка загрузки статистики", e);
            } finally {
                setLoading(false);
            }
        };
        
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Обновляем каждые 5 сек
        return () => clearInterval(interval);
    }, []);

    // 3. Загрузка Погоды (Open-Meteo, ключ не нужен)
    useEffect(() => {
        let cancelled = false;
        const fetchWeather = async () => {
            try {
                setWeatherError(null);
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_COORDS.lat}&longitude=${WEATHER_COORDS.lon}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m`);
                if (!res.ok) throw new Error('weather');
                const data = await res.json();
                if (cancelled) return;
                
                const current = data.current;
                const weatherInfo = getWmoWeather(current.weather_code);
                
                setWeather({
                    temp: Math.round(current.temperature_2m),
                    desc: weatherInfo.desc,
                    wind: Math.round(current.wind_speed_10m * 10) / 10, // km/h (можно перевести в м/с разделив на 3.6 если нужно)
                    deg: current.wind_direction_10m,
                    humidity: current.relative_humidity_2m,
                    pressure: Math.round(current.surface_pressure),
                    Icon: weatherInfo.Icon,
                    iconColor: weatherInfo.color
                });
            } catch (e) {
                if (!cancelled) {
                    setWeatherError('Нет связи с погодной службой');
                }
            }
        };
        fetchWeather();
        return () => {
            cancelled = true;
        };
    }, []);

    // Если грузится
    if (loading && !stats) return <div className="p-10 text-center text-brand-blue animate-pulse">Загрузка данных ЦУКС...</div>;

    // Дефолтные значения, если база пустая
    const s = stats?.sensors || { total: 0, online: 0, offline: 0, danger: 0 };
    const u = stats?.users || { total: 0, admins: 0 };
    const alerts = stats?.alerts || [];

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">
            
            {/* ШАПКА */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-border pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight flex items-center gap-3">
                        Панель мониторинга <span className="px-2 py-0.5 rounded text-xs bg-brand-blue/20 text-brand-blue border border-brand-blue/30 animate-pulse">LIVE</span>
                    </h1>
                    <p className="text-text-muted mt-1 text-sm">Оперативная сводка: г. Ургенч</p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-mono font-bold text-text-main tracking-widest">
                        {currentTime.toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-brand-blue font-medium flex items-center justify-end gap-2">
                        <Calendar size={14}/> {currentTime.toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* ВЕРХНИЙ РЯД */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Погода */}
                <GlassCard className="relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Погода</div>
                            <div className="text-4xl font-bold text-text-main">{weather.temp}°C</div>
                            <div className="text-sm text-brand-blue capitalize">{weather.desc}</div>
                        </div>
                        {weather.Icon ? (
                            <weather.Icon size={48} className={`-mt-1 opacity-90 ${weather.iconColor}`} />
                        ) : (
                            <Cloud size={48} className="-mt-1 opacity-50 text-gray-400" />
                        )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-text-muted">
                        <div className="flex items-center gap-1"><Droplets size={12} className="text-blue-400"/> {weather.humidity}%</div>
                        <div className="flex items-center gap-1"><Wind size={12}/> {weather.wind} км/ч</div>
                        {weatherError && <div className="col-span-2 text-[11px] text-brand-red mt-1">{weatherError}</div>}
                    </div>
                </GlassCard>

                {/* 2. Статус Сети (РЕАЛЬНЫЙ) */}
                <GlassCard>
                    <div className="text-xs text-text-muted uppercase font-bold mb-2">Сеть датчиков</div>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-3xl font-bold text-brand-green">{s.online}</div>
                            <div className="text-xs text-text-muted">Онлайн</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-text-muted">{s.total}</div>
                            <div className="text-xs text-text-muted">Всего</div>
                        </div>
                    </div>
                    <div className="mt-3 w-full bg-surface h-1.5 rounded-full overflow-hidden">
                        <div className="bg-brand-green h-full transition-all duration-1000" style={{ width: `${s.total ? (s.online/s.total)*100 : 0}%` }}></div>
                    </div>
                </GlassCard>

                {/* 3. Персонал (РЕАЛЬНЫЙ) */}
                <GlassCard>
                    <div className="text-xs text-text-muted uppercase font-bold mb-2">Персонал</div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-bold text-text-main">{u.total}</div>
                            <div className="text-xs text-text-muted">Сотрудников</div>
                        </div>
                        <div className="p-3 bg-surface rounded-full text-brand-blue">
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-text-muted">
                        Администраторов: <span className="text-text-main font-bold">{u.admins}</span>
                    </div>
                </GlassCard>

                {/* 4. Тревоги (РЕАЛЬНЫЙ) */}
                <GlassCard className={s.danger > 0 ? "border-brand-red/50 bg-brand-red/5" : ""}>
                    <div className="text-xs text-text-muted uppercase font-bold mb-2">Уровень угрозы</div>
                    <div className="flex items-center gap-3">
                        <AlertCircle size={32} className={s.danger > 0 ? "text-brand-red animate-pulse" : "text-brand-green"} />
                        <div>
                            <div className={`text-2xl font-bold ${s.danger > 0 ? "text-brand-red" : "text-brand-green"}`}>
                                {s.danger > 0 ? `${s.danger} ТРЕВОГ` : "НОРМА"}
                            </div>
                            <div className="text-xs text-text-muted">Активные инциденты</div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* СРЕДНИЙ РЯД */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-64">
                {/* График (Пока фейк, но красивый) */}
                <GlassCard className="lg:col-span-2 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Zap size={18} className="text-yellow-400"/>
                            <h3 className="font-bold text-text-main">Радиационный фон (Avg)</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <RadiationChart dataPoints={[0.11, 0.12, 0.11, 0.13, 0.12]} />
                    </div>
                </GlassCard>

                {/* ЖУРНАЛ (РЕАЛЬНЫЙ) */}
                <GlassCard className="flex flex-col">
                    <div className="text-xs text-text-muted uppercase font-bold mb-3">Последние события</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {alerts.length === 0 ? (
                            <div className="text-sm text-text-muted text-center mt-10">Журнал чист</div>
                        ) : (
                            alerts.map((alert) => (
                                <div key={alert.id} className="flex gap-3 p-2 rounded bg-surface/50 border border-border">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-brand-red shrink-0 animate-pulse"></div>
                                    <div>
                                        <div className="text-sm font-bold text-text-main">{alert.text}</div>
                                        <div className="text-xs text-text-muted">
                                            {new Date(alert.time).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
