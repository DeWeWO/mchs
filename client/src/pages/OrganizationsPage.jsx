import { useState, useEffect } from 'react';
import { Plus, Building, Trash2, MapPin, User, Globe, Pencil, Save, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config/env';

export default function OrganizationsPage() {
    const { addToast } = useToast();
    const [orgs, setOrgs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [staffFilter, setStaffFilter] = useState('all');

    const [formData, setFormData] = useState({
        name: '', type: 'commercial', address: '', lat: '', lng: '',
        ownerName: '', ownerPhone: '',
        userUsername: '', userPassword: '', userPhone: ''
    });

    const getAuthHeader = () => {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { 'Authorization': `Bearer ${stored.token}` } : {};
    };

    const fetchOrgs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/organizations`, { headers: getAuthHeader() });
            if(res.ok) {
                const data = await res.json();
                setOrgs(Array.isArray(data) ? data : []);
            } else {
                setOrgs([]);
            }
        } catch(e) { 
            setOrgs([]); 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchOrgs(); }, []);

    const handleOpen = (org = null) => {
        if (org) {
            setEditingId(org.id);
            setFormData({
                name: org.name, type: org.type, address: org.address || '',
                lat: org.lat || '', lng: org.lng || '',
                ownerName: org.ownerName || '', ownerPhone: org.ownerPhone || '',
                userUsername: '', userPassword: '', userPhone: '' 
            });
        } else {
            setEditingId(null);
            setFormData({ 
                name: '', type: 'commercial', address: '', lat: '', lng: '',
                ownerName: '', ownerPhone: '',
                userUsername: '', userPassword: '', userPhone: '' 
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const url = editingId ? `${API_URL}/organizations/${editingId}` : `${API_URL}/organizations/create`;
        const method = editingId ? 'PUT' : 'POST';

        if (!editingId && (!formData.userUsername || !formData.userPassword)) {
            return addToast("Логин и пароль обязательны при создании", "warning");
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error("Ошибка сохранения");
            
            addToast(editingId ? "Обновлено" : "Создано", "success");
            setIsModalOpen(false);
            fetchOrgs();
        } catch (e) { addToast(e.message, "error"); }
    };

    const handleDelete = async (id) => {
        if(!confirm("Удалить объект?")) return;
        await fetch(`${API_URL}/organizations/${id}`, { method: 'DELETE', headers: getAuthHeader() });
        fetchOrgs();
    };

    const filteredOrgs = orgs.filter(org => {
        const staffCount = org.users?.length || 0;
        if (staffFilter === 'solo') return staffCount <= 1;
        if (staffFilter === 'team') return staffCount > 1;
        return true;
    });

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <h1 className="text-3xl font-bold text-text-main">Организации</h1>
                <button onClick={() => handleOpen()} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl">
                    <Plus size={20} /> Создать объект
                </button>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-border flex flex-wrap gap-4 items-center">
                <div className="text-sm text-text-muted font-semibold uppercase">Сотрудники:</div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setStaffFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${staffFilter === 'all' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-surface text-text-muted border-border'}`}
                    >
                        Все
                    </button>
                    <button
                        onClick={() => setStaffFilter('solo')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${staffFilter === 'solo' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-surface text-text-muted border-border'}`}
                    >
                        1 оператор
                    </button>
                    <button
                        onClick={() => setStaffFilter('team')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${staffFilter === 'team' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-surface text-text-muted border-border'}`}
                    >
                        Команда &gt;1
                    </button>
                </div>
                <div className="ml-auto text-xs text-text-muted">
                    Найдено: <span className="font-bold text-text-main">{filteredOrgs.length}</span>
                </div>
            </div>

            {/* !!! ИСПРАВЛЕНИЕ ЗДЕСЬ !!! (добавлен items-start) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10 custom-scrollbar items-start">
                {isLoading ? (
                    <p className="text-text-muted col-span-full text-center">Загрузка...</p>
                ) : filteredOrgs.length === 0 ? (
                    <p className="text-text-muted col-span-full text-center">Нет объектов по выбранному фильтру</p>
                ) : (
                    filteredOrgs.map(org => (
                        <div key={org.id} className="glass-panel p-5 rounded-xl border border-border group relative hover:border-brand-blue/30 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-surface rounded-lg text-brand-blue"><Building size={24}/></div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpen(org)} className="p-1.5 hover:text-white text-text-muted"><Pencil size={16}/></button>
                                    <button onClick={() => handleDelete(org.id)} className="p-1.5 hover:text-red-500 text-text-muted"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-text-main">{org.name}</h3>
                            <p className="text-xs text-text-muted uppercase mb-3">{org.type}</p>
                            
                            <div className="space-y-2 text-sm text-text-muted border-t border-border/50 pt-3 mt-3">
                                <div className="flex items-center gap-2"><MapPin size={14}/> {org.address}</div>
                                <div className="flex items-center gap-2"><Globe size={14}/> {org.lat?.toFixed(4)}, {org.lng?.toFixed(4)}</div>
                                {org.ownerName && (
                                    <div className="flex items-center gap-2">
                                        <User size={14}/> Владелец: {org.ownerName}
                                        {org.ownerPhone && <span className="text-xs">({org.ownerPhone})</span>}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-brand-green">
                                    <User size={14}/> {org.users?.[0]?.username || "Нет оператора"}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="glass-panel p-6 rounded-2xl w-[500px] border border-border">
                        <div className="flex justify-between mb-4">
                            <h2 className="text-xl font-bold text-text-main">{editingId ? "Редактирование" : "Новый объект"}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-text-muted hover:text-white"/></button>
                        </div>
                        <div className="space-y-3">
                            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Название" className="w-full p-2 bg-surface rounded-lg border border-border text-text-main"/>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="p-2 bg-surface rounded-lg border border-border text-text-main">
                                    <option value="commercial">Коммерческий</option>
                                    <option value="state">Гос. учреждение</option>
                                    <option value="education">Образование</option>
                                </select>
                                <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Адрес" className="w-full p-2 bg-surface rounded-lg border border-border text-text-main"/>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} placeholder="Lat" className="p-2 bg-surface rounded-lg border border-border text-text-main"/>
                                <input type="number" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} placeholder="Lng" className="p-2 bg-surface rounded-lg border border-border text-text-main"/>
                            </div>

                            <div className="p-3 bg-brand-blue/10 rounded-lg border border-brand-blue/20 mt-2">
                                <p className="text-xs text-brand-blue font-bold mb-2 uppercase">Владелец адреса</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <input value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} placeholder="ФИО владельца" className="p-2 bg-surface rounded-lg border border-border text-text-main"/>
                                    <input value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value})} placeholder="Телефон владельца" className="p-2 bg-surface rounded-lg border border-border text-text-main"/>
                                </div>
                            </div>

                            {!editingId && (
                                <div className="p-3 bg-brand-blue/10 rounded-lg border border-brand-blue/20 mt-2">
                                    <p className="text-xs text-brand-blue font-bold mb-2 uppercase">Оператор объекта</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input value={formData.userUsername} onChange={e => setFormData({...formData, userUsername: e.target.value})} placeholder="Логин" className="p-2 bg-surface rounded-lg border border-border text-text-main"/>
                                        <input value={formData.userPassword} onChange={e => setFormData({...formData, userPassword: e.target.value})} placeholder="Пароль" className="p-2 bg-surface rounded-lg border border-border text-text-main"/>
                                    </div>
                                    <input value={formData.userPhone} onChange={e => setFormData({...formData, userPhone: e.target.value})} placeholder="Телефон" className="w-full p-2 bg-surface rounded-lg border border-border text-text-main mt-2"/>
                                </div>
                            )}
                            <button onClick={handleSave} className="w-full py-3 mt-4 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2"><Save size={18}/> Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}