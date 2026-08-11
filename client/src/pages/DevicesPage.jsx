import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Cpu, Trash2, Copy, Pencil, X, Filter } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { API_URL, DEVICE_TYPES, DEVICE_STATUSES } from '../config/env';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export default function DevicesPage() {
    const { addToast } = useToast();
    const { logout } = useAuth();

    const [sensors, setSensors] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedOrg, setSelectedOrg] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    const [formData, setFormData] = useState({
        name: '',
        token: '',
        lat: '',
        lng: '',
        buildingId: '',
        floor: '',
        addressDetails: '',
        locationMode: 'coords',
        type: 'multi'
    });

    const getAuthHeader = () => {
        try {
            const stored = JSON.parse(localStorage.getItem('mchs_user'));
            return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
        } catch {
            return {};
        }
    };

    const readJson = async (response, fallback = null) => {
        try {
            return await response.json();
        } catch {
            return fallback;
        }
    };

    const handleAuthOrPermissionError = useCallback((response, payload) => {
        const message = payload?.error || 'Нет доступа';
        const tokenInvalid = response.status === 401 || /токен/i.test(message);

        if (tokenInvalid) {
            addToast('Сессия истекла. Войдите снова.', 'warning');
            logout();
            return;
        }

        if (response.status === 403) {
            addToast(message, 'warning');
        }
    }, [addToast, logout]);

    const fetchData = useCallback(async () => {
        const headers = getAuthHeader();

        try {
            const [devRes, orgRes] = await Promise.all([
                fetch(`${API_URL}/devices`, { headers }),
                fetch(`${API_URL}/organizations`, { headers })
            ]);

            const [devPayload, orgPayload] = await Promise.all([
                readJson(devRes, []),
                readJson(orgRes, [])
            ]);

            if (!devRes.ok) {
                handleAuthOrPermissionError(devRes, devPayload);
                setSensors([]);
            } else {
                setSensors(ensureArray(devPayload));
            }

            if (!orgRes.ok) {
                handleAuthOrPermissionError(orgRes, orgPayload);
                setOrgs([]);
            } else {
                setOrgs(ensureArray(orgPayload));
            }
        } catch (error) {
            console.error(error);
            setSensors([]);
            setOrgs([]);
            addToast('Ошибка загрузки данных', 'error');
        }
    }, [addToast, handleAuthOrPermissionError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredSensors = useMemo(() => {
        return ensureArray(sensors).filter((sensor) => {
            const matchOrg = selectedOrg === 'all' || sensor.organizationId === selectedOrg;
            const matchStatus = selectedStatus === 'all' || sensor.status === selectedStatus;
            return matchOrg && matchStatus;
        });
    }, [sensors, selectedOrg, selectedStatus]);

    const organizationOptions = useMemo(() => [
        { id: 'all', name: 'Все объекты' },
        ...ensureArray(orgs).map((org) => ({ id: org.id, name: org.name }))
    ], [orgs]);

    const handleOpen = (device = null) => {
        if (device) {
            setEditingId(device.id);
            setFormData({
                name: device.name,
                token: device.token,
                lat: device.lat,
                lng: device.lng,
                buildingId: device.organizationId || '',
                floor: device.floor,
                addressDetails: device.addressDetails || '',
                locationMode: device.organizationId ? 'building' : 'coords',
                type: device.type || 'multi'
            });
        } else {
            setEditingId(null);
            const newToken = `ESP32-PRO-${Math.random().toString(36).substr(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
            setFormData({
                name: '',
                token: newToken,
                lat: '',
                lng: '',
                buildingId: '',
                floor: '',
                addressDetails: '',
                locationMode: 'coords',
                type: 'multi'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        let finalLat = formData.lat;
        let finalLng = formData.lng;

        if (formData.locationMode === 'building' && formData.buildingId) {
            const org = ensureArray(orgs).find((item) => item.id === formData.buildingId);
            if (org) {
                finalLat = org.lat;
                finalLng = org.lng;
            }
        }

        const url = editingId ? `${API_URL}/devices/${editingId}` : `${API_URL}/devices`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    ...formData,
                    lat: finalLat,
                    lng: finalLng,
                    organizationId: formData.buildingId || null
                })
            });

            const payload = await readJson(response, {});
            if (!response.ok) {
                handleAuthOrPermissionError(response, payload);
                if (response.status !== 401 && response.status !== 403) {
                    addToast(payload?.error || 'Ошибка сохранения', 'error');
                }
                return;
            }

            setIsModalOpen(false);
            fetchData();
            addToast('Сохранено', 'success');
        } catch (error) {
            console.error(error);
            addToast('Ошибка сети при сохранении', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить?')) return;

        try {
            const response = await fetch(`${API_URL}/devices/${id}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });

            const payload = await readJson(response, {});
            if (!response.ok) {
                handleAuthOrPermissionError(response, payload);
                if (response.status !== 401 && response.status !== 403) {
                    addToast(payload?.error || 'Ошибка удаления', 'error');
                }
                return;
            }

            fetchData();
            addToast('Удалено', 'success');
        } catch (error) {
            console.error(error);
            addToast('Ошибка сети при удалении', 'error');
        }
    };

    const copyToken = (token) => {
        navigator.clipboard.writeText(token);
        addToast('Токен скопирован', 'info');
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <h1 className="text-3xl font-bold text-text-main">Оборудование</h1>
                <button onClick={() => handleOpen()} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl">
                    <Plus size={20} /> Добавить
                </button>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-border flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-text-muted text-sm font-semibold uppercase">
                    <Filter size={16} /> Фильтры
                </div>
                <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main">
                    {organizationOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                </select>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main">
                    <option value="all">Все статусы</option>
                    {Object.values(DEVICE_STATUSES).map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <div className="ml-auto text-xs text-text-muted">
                    Найдено: <span className="font-bold text-text-main">{filteredSensors.length}</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-border glass-panel custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-surface border-b border-border sticky top-0 backdrop-blur-md">
                        <tr>
                            <th className="p-4 text-text-muted">Название</th>
                            <th className="p-4 text-text-muted">Токен</th>
                            <th className="p-4 text-text-muted">Объект</th>
                            <th className="p-4 text-text-muted">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredSensors.length === 0 && (
                            <tr>
                                <td colSpan="4" className="p-4 text-center text-text-muted">Нет оборудования</td>
                            </tr>
                        )}
                        {filteredSensors.map((sensor) => (
                            <tr key={sensor.id} className="hover:bg-surface-hover">
                                <td className="p-4 font-bold text-text-main flex items-center gap-3">
                                    <Cpu className={sensor.status === 'DANGER' ? 'text-red-500 animate-pulse' : 'text-brand-green'} />
                                    {sensor.name}
                                </td>
                                <td className="p-4 text-xs font-mono text-text-muted cursor-pointer hover:text-white" onClick={() => copyToken(sensor.token)}>
                                    {sensor.token} <Copy size={12} className="inline ml-1" />
                                </td>
                                <td className="p-4 text-sm">{sensor.organization?.name || '—'}</td>
                                <td className="p-4 flex gap-2">
                                    <button onClick={() => handleOpen(sensor)} className="p-2 hover:bg-white/10 rounded"><Pencil size={16} /></button>
                                    <button onClick={() => handleDelete(sensor.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="glass-panel p-6 rounded-2xl w-[500px] border border-border">
                        <div className="flex justify-between mb-4">
                            <h2 className="text-xl font-bold text-text-main">Датчик (Multi-Sensor)</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-text-muted" /></button>
                        </div>

                        <div className="space-y-4">
                            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Название" className="w-full p-2 bg-surface rounded-lg border border-border text-text-main" />

                            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full p-2 bg-surface rounded-lg border border-border text-text-main">
                                <option value={DEVICE_TYPES.MULTI}>Мультисенсор</option>
                                <option value={DEVICE_TYPES.GAS}>Газ</option>
                                <option value={DEVICE_TYPES.SMOKE}>Пожар</option>
                                <option value={DEVICE_TYPES.RADIATION}>Радиация</option>
                                <option value={DEVICE_TYPES.WATER_CAMERA}>Гидрологический</option>
                            </select>

                            <div className="flex gap-2">
                                <input value={formData.token} readOnly className="flex-1 p-2 bg-black/30 rounded-lg border border-border text-xs font-mono text-brand-green" />
                                <button onClick={() => copyToken(formData.token)} className="p-2 bg-surface hover:bg-white/10 rounded-lg border border-border"><Copy size={16} /></button>
                            </div>

                            <div className="p-3 bg-surface/30 rounded-xl border border-border">
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => setFormData({ ...formData, locationMode: 'coords' })} className={`flex-1 py-1 text-xs rounded-lg ${formData.locationMode === 'coords' ? 'bg-brand-blue text-white' : 'bg-surface text-text-muted'}`}>Координаты</button>
                                    <button onClick={() => setFormData({ ...formData, locationMode: 'building' })} className={`flex-1 py-1 text-xs rounded-lg ${formData.locationMode === 'building' ? 'bg-brand-blue text-white' : 'bg-surface text-text-muted'}`}>В здании</button>
                                </div>

                                {formData.locationMode === 'coords' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} placeholder="Lat" className="p-2 bg-surface rounded-lg border border-border text-text-main" />
                                        <input type="number" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} placeholder="Lng" className="p-2 bg-surface rounded-lg border border-border text-text-main" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <select value={formData.buildingId} onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })} className="w-full p-2 bg-surface rounded-lg border border-border text-text-main">
                                            <option value="">Выберите объект...</option>
                                            {ensureArray(orgs).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} placeholder="Этаж" className="p-2 bg-surface rounded-lg border border-border text-text-main" />
                                            <input value={formData.addressDetails} onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })} placeholder="Кабинет" className="p-2 bg-surface rounded-lg border border-border text-text-main" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleSave} className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold">Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
