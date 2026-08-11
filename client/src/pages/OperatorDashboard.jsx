import { useState, useEffect } from 'react';
import { Cpu, Zap, WifiOff, Thermometer, Pencil, MapPin, Search, AlertCircle, Building, Phone } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL, SOCKET_URL, DEVICE_STATUSES, ROLES } from '../config/env';

export default function OperatorDashboard() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [checkDeviceId, setCheckDeviceId] = useState('');
    const [checkedDevice, setCheckedDevice] = useState(null);
    const [organization, setOrganization] = useState(null);
    const [globalAlertActive, setGlobalAlertActive] = useState(false);
    const [incidents, setIncidents] = useState([]);
    
    const [formData, setFormData] = useState({
        name: '', lat: '', lng: '', floor: '', addressDetails: ''
    });

    const getAuthHeader = () => {
        return user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
    };

    const fetchMyDevices = async () => {
        try {
            const res = await fetch(`${API_URL}/devices/my-devices`, { headers: getAuthHeader() });
            const data = await res.json();
            setDevices(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOrganization = async () => {
        try {
            const res = await fetch(`${API_URL}/organizations`, { headers: getAuthHeader() });
            const data = await res.json();
            const myOrg = Array.isArray(data) ? data.find(org => org.id === user?.organizationId) : null;
            setOrganization(myOrg);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchGlobalAlertStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/mchs/global-alert/status`, { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setGlobalAlertActive(data.active);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchIncidents = async () => {
        try {
            const res = await fetch(`${API_URL}/incidents?limit=5`, { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                // Сервер уже фильтрует инциденты для операторов
                setIncidents(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (user?.role === ROLES.ORG_OPERATOR) {
            fetchMyDevices();
            fetchOrganization();
            fetchGlobalAlertStatus();
            fetchIncidents();
            
            // WebSocket для обновлений в реальном времени
            const socket = io(SOCKET_URL);
            socket.on('device-update', (device) => {
                // Обновляем устройство если оно наше
                if (device.organizationId === user?.organizationId) {
                    setDevices(prev => prev.map(d => d.id === device.id ? device : d));
                }
            });
            socket.on('global-alert', ({ active }) => {
                setGlobalAlertActive(active);
            });
            socket.on('alert', () => {
                // Перезагружаем инциденты при новой тревоге
                fetchIncidents();
            });
            
            // Обновляем каждые 30 секунд (fallback)
            const interval = setInterval(() => {
                fetchMyDevices();
                fetchGlobalAlertStatus();
            }, 30000);
            
            return () => {
                socket.disconnect();
                clearInterval(interval);
            };
        }
    }, [user]);

    const handleCheckDevice = async () => {
        if (!checkDeviceId.trim()) {
            addToast("Введите ID устройства", "warning");
            return;
        }
        
        try {
            const res = await fetch(`${API_URL}/devices/check/${checkDeviceId}`, { headers: getAuthHeader() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Устройство не найдено");
            setCheckedDevice(data);
            addToast(data.isConnected ? "Устройство подключено" : "Устройство офлайн", data.isConnected ? "success" : "warning");
        } catch (e) {
            addToast(e.message, "error");
            setCheckedDevice(null);
        }
    };

    const handleOpenEdit = (device) => {
        setEditingDevice(device);
        setFormData({
            name: device.name || '',
            lat: device.lat || '',
            lng: device.lng || '',
            floor: device.floor || '',
            addressDetails: device.addressDetails || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveDevice = async () => {
        try {
            const res = await fetch(`${API_URL}/devices/${editingDevice.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error("Ошибка обновления");
            addToast("Устройство обновлено", "success");
            setIsModalOpen(false);
            fetchMyDevices();
        } catch (e) {
            addToast(e.message, "error");
        }
    };

    const stats = {
        total: devices.length,
        online: devices.filter(d => d.status !== DEVICE_STATUSES.OFFLINE).length,
        danger: devices.filter(d => d.status === DEVICE_STATUSES.DANGER).length,
    };

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-main">Панель объекта: {organization?.name || user?.organization?.name || '—'}</h1>
                    <p className="text-text-muted mt-1">Управление устройствами и мониторинг</p>
                    {globalAlertActive && (
                        <div className="mt-3 px-4 py-2 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2 text-red-400 animate-pulse">
                            <AlertCircle size={20} />
                            <span className="font-bold">АКТИВНА ГЛОБАЛЬНАЯ ТРЕВОГА</span>
                        </div>
                    )}
                    {organization && (
                        <div className="mt-2 flex gap-4 text-sm text-text-muted">
                            {organization.ownerName && (
                                <span className="flex items-center gap-1">
                                    <Building size={14}/> {organization.ownerName}
                                </span>
                            )}
                            {organization.ownerPhone && (
                                <span className="flex items-center gap-1">
                                    <Phone size={14}/> {organization.ownerPhone}
                                </span>
                            )}
                            {organization.address && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={14}/> {organization.address}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Последние инциденты */}
            {incidents.length > 0 && (
                <div className="glass-panel p-4 rounded-xl border border-border mb-6">
                    <h3 className="text-sm font-bold text-text-muted uppercase mb-3">Последние тревоги</h3>
                    <div className="space-y-2">
                        {incidents.map(inc => (
                            <div key={inc.id} className={`p-2 rounded-lg border ${inc.resolved ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-text-main">{inc.type}</span>
                                    <span className="text-xs text-text-muted">{new Date(inc.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-text-muted mt-1">{inc.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Проверка устройства по ID */}
            <div className="glass-panel p-4 rounded-xl border border-border mb-6">
                <h3 className="text-sm font-bold text-text-muted uppercase mb-3">Проверка устройства по ID</h3>
                <div className="flex gap-2">
                    <input
                        value={checkDeviceId}
                        onChange={(e) => setCheckDeviceId(e.target.value)}
                        placeholder="Введите ID устройства"
                        className="flex-1 p-2 bg-surface rounded-lg border border-border text-text-main"
                    />
                    <button onClick={handleCheckDevice} className="px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-lg flex items-center gap-2">
                        <Search size={16}/> Проверить
                    </button>
                </div>
                {checkedDevice && (
                    <div className={`mt-3 p-3 rounded-lg border ${checkedDevice.isConnected ? 'bg-green-500/10 border-green-500' : 'bg-gray-500/10 border-gray-500'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className={checkedDevice.isConnected ? 'text-green-500' : 'text-gray-500'}/>
                            <span className="font-bold text-text-main">{checkedDevice.name}</span>
                        </div>
                        <p className="text-xs text-text-muted">
                            Статус: {checkedDevice.isConnected ? 'Подключено к Wi-Fi' : 'Не подключено'}
                        </p>
                        {checkedDevice.lastSeenTime && (
                            <p className="text-xs text-text-muted mt-1">
                                Последняя активность: {new Date(checkedDevice.lastSeenTime).toLocaleString()}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-3 gap-4 mt-6">
                <StatCard title="Всего устройств" value={stats.total} icon={Cpu} />
                <StatCard title="В сети" value={stats.online} icon={Zap} color="text-brand-green" />
                <StatCard title="Тревоги" value={stats.danger} icon={WifiOff} color={stats.danger > 0 ? "text-brand-red animate-pulse" : ""} />
            </div>

            {/* Список устройств */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold text-text-main mb-4">Список устройств</h2>
                <div className="glass-panel p-4 rounded-xl border border-border">
                    {isLoading ? (
                        <p className="text-text-muted">Загрузка...</p>
                    ) : devices.length === 0 ? (
                        <p className="text-text-muted">Устройства не найдены</p>
                    ) : (
                        devices.map(d => (
                            <div key={d.id} className="flex justify-between items-center p-3 border-b border-border last:border-0 hover:bg-surface-hover group">
                                <div className="flex items-center gap-3 flex-1">
                                    <Thermometer className={d.status === DEVICE_STATUSES.DANGER ? "text-red-500 animate-pulse" : "text-brand-blue"} />
                                    <div className="flex-1">
                                        <p className="font-bold text-text-main">{d.name}</p>
                                        <p className="text-xs text-text-muted">
                                            Газ: {d.gasLevel.toFixed(1)}ppm | 
                                            Дым: {d.smokeDetected ? 'Обнаружен' : 'Нет'} | 
                                            Батарея: {d.batteryLevel}%
                                        </p>
                                        {d.addressDetails && (
                                            <p className="text-xs text-text-muted mt-1">
                                                {d.floor && `Этаж ${d.floor}, `}{d.addressDetails}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={d.status} />
                                    <button
                                        onClick={() => handleOpenEdit(d)}
                                        className="p-2 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Редактировать"
                                    >
                                        <Pencil size={16} className="text-text-muted hover:text-brand-blue"/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Модальное окно редактирования устройства */}
            {isModalOpen && editingDevice && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="glass-panel p-6 rounded-2xl w-[500px] border border-border">
                        <h2 className="text-xl font-bold text-text-main mb-4">Редактирование устройства</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted mb-1 block">Название</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full p-2 bg-surface rounded-lg border border-border text-text-main"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">Широта</label>
                                    <input
                                        type="number"
                                        value={formData.lat}
                                        onChange={(e) => setFormData({...formData, lat: e.target.value})}
                                        className="w-full p-2 bg-surface rounded-lg border border-border text-text-main"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">Долгота</label>
                                    <input
                                        type="number"
                                        value={formData.lng}
                                        onChange={(e) => setFormData({...formData, lng: e.target.value})}
                                        className="w-full p-2 bg-surface rounded-lg border border-border text-text-main"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">Этаж</label>
                                    <input
                                        type="number"
                                        value={formData.floor}
                                        onChange={(e) => setFormData({...formData, floor: e.target.value})}
                                        className="w-full p-2 bg-surface rounded-lg border border-border text-text-main"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">Адрес/Кабинет</label>
                                    <input
                                        value={formData.addressDetails}
                                        onChange={(e) => setFormData({...formData, addressDetails: e.target.value})}
                                        className="w-full p-2 bg-surface rounded-lg border border-border text-text-main"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 rounded-lg bg-surface hover:bg-surface-hover text-text-muted transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSaveDevice}
                                    className="flex-1 py-2 rounded-lg bg-brand-blue text-white hover:bg-blue-600 transition-colors font-bold"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, icon: Icon, color = "text-text-main" }) => (
    <div className="glass-panel p-4 rounded-xl border border-border">
        <div className="flex justify-between items-center">
            <div className="text-xs uppercase text-text-muted">{title}</div>
            <Icon size={18} className="text-text-muted" />
        </div>
        <div className={`text-3xl font-bold mt-2 ${color}`}>{value}</div>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        [DEVICE_STATUSES.ONLINE]: 'bg-green-500/10 text-green-500',
        [DEVICE_STATUSES.DANGER]: 'bg-red-500/10 text-red-500 animate-pulse',
        [DEVICE_STATUSES.WARNING]: 'bg-yellow-500/10 text-yellow-500',
        [DEVICE_STATUSES.OFFLINE]: 'bg-slate-500/10 text-slate-500',
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || styles[DEVICE_STATUSES.OFFLINE]}`}>{status}</span>;
};