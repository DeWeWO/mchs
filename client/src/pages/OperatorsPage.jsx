import { useState, useEffect, useMemo } from 'react';
import { UserPlus, User, Shield, Circle, Trash2, Phone, Loader2, Pencil } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { API_URL, ROLES } from '../config/env';

export default function OperatorsPage() {
    const { addToast } = useToast();
    const { user: currentUser } = useAuth();
    const [operators, setOperators] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [selectedOrganization, setSelectedOrganization] = useState('all');

    const canManage = currentUser?.role === ROLES.SUPER_ADMIN;

    const getAuthHeader = () => {
        const storedUser = JSON.parse(localStorage.getItem('mchs_user'));
        const token = currentUser?.token || storedUser?.token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        password: '',
        role: ROLES.ORG_OPERATOR,
        phone: '',
        organizationId: ''
    });
    
   const fetchOrganizations = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('mchs_user'));
            const token = currentUser?.token || storedUser?.token;
            const res = await fetch(`${API_URL}/organizations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOrganizations(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
        }
    };

   const fetchUsers = async () => {
    setIsLoading(true);
    try {
        // 1. Достаем токен (или из контекста, или из localStorage)
        // В AuthContext ты скорее всего сохраняешь user, внутри которого есть token
        const storedUser = JSON.parse(localStorage.getItem('mchs_user'));
        const token = currentUser?.token || storedUser?.token;

        if (!token) {
            throw new Error("Вы не авторизованы");
        }

        const res = await fetch(`${API_URL}/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // <--- ВАЖНО: ОТПРАВЛЯЕМ ТОКЕН
            }
        });

        // 2. Если сервер вернул ошибку (401, 403, 500)
        if (!res.ok) {
            if (res.status === 401) {
                // Можно сделать логаут, если токен протух
                addToast("Сессия истекла, войдите заново", "error");
            }
            throw new Error("Ошибка доступа к данным");
        }

        const data = await res.json();

        // 3. Защита от дурака: убедимся, что пришел массив
        if (Array.isArray(data)) {
            setOperators(data);
        } else {
            setOperators([]); // Если пришло что-то левое, ставим пустой массив
            console.error("Сервер вернул не массив:", data);
        }

    } catch (e) {
        console.error(e);
        addToast(e.message, "error");
        setOperators([]); // Чтобы map не ломался, ставим пустой массив
    } finally {
        setIsLoading(false);
    }
};
    
    useEffect(() => { 
        fetchUsers();
        fetchOrganizations();
    }, []);

    const organizationOptions = useMemo(() => {
        const seen = new Map();
        operators.forEach(op => {
            if (op.organization) {
                seen.set(op.organization.id, op.organization.name);
            }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [operators]);

    const filteredOperators = useMemo(() => {
        if (selectedOrganization === 'all') return operators;
        return operators.filter(op => op.organization?.id === selectedOrganization);
    }, [operators, selectedOrganization]);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ 
            fullName: '', 
            username: '', 
            password: '', 
            role: ROLES.ORG_OPERATOR, 
            phone: '',
            organizationId: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            fullName: user.fullName || '',
            username: user.username,
            password: '',
            role: user.role,
            phone: user.phone || '',
            organizationId: user.organizationId || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.fullName || !formData.username) return addToast("ФИО и Логин обязательны", "warning");
        if (!editingUser && !formData.password) return addToast("Введите пароль", "warning");

        try {
            const url = editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users/create`;
            const method = editingUser ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Ошибка");

            addToast(editingUser ? "Данные обновлены" : "Сотрудник создан", "success");
            setIsModalOpen(false);
            fetchUsers();
        } catch (e) {
            addToast(e.message, "error");
        }
    };

    const handleDelete = async (id) => {
        if (currentUser.id === id) return addToast("Нельзя удалить себя!", "warning");
        if (!window.confirm("Уволить сотрудника?")) return;
        
        try {
            await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: getAuthHeader() });
            setOperators(prev => prev.filter(u => u.id !== id));
            addToast("Сотрудник удален", "info");
        } catch (e) {
            addToast("Не удалось удалить", "error");
        }
    };
    
    const getStatusColor = (role) => {
        if (role === ROLES.SUPER_ADMIN) return 'text-purple-500';
        if (role === ROLES.ADMIN) return 'text-blue-500';
        return 'text-green-500';
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-text-main">Администраторы</h1>
                    <p className="text-text-muted">Управление учетными записями администраторов</p>
                </div>
                {canManage && (
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-brand-blue hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg"
                    >
                        <UserPlus size={20} /> Добавить администратора
                    </button>
                )}
            </div>

            <div className="glass-panel p-4 rounded-xl border border-border flex flex-wrap gap-4 items-center">
                <div className="text-sm text-text-muted font-semibold uppercase">Организация</div>
                <select value={selectedOrganization} onChange={(e) => setSelectedOrganization(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main">
                    <option value="all">Все</option>
                    {organizationOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                </select>
                <div className="ml-auto text-xs text-text-muted">
                    Найдено: <span className="font-bold text-text-main">{filteredOperators.length}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-app/50 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin text-brand-blue" size={32} />
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                    {filteredOperators.map(user => (
                        <div key={user.id} className="glass-panel p-5 rounded-xl border border-border flex items-center gap-4 hover:border-brand-blue/50 transition-colors group relative">
                             <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center text-text-muted border border-border relative">
                                <User size={28} />
                                <Circle size={12} className={`absolute bottom-0 right-0 fill-current ${getStatusColor(user.role)}`} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-lg font-bold text-text-main truncate">{user.fullName || user.username}</div>
                                <div className="text-xs text-text-muted flex items-center gap-1 mb-1">
                                    <Shield size={12} /> {user.role} {user.organization && `(${user.organization.name})`}
                                </div>
                                {user.phone && <div className="text-xs text-text-muted flex items-center gap-1"><Phone size={12}/> {user.phone}</div>}
                            </div>
                             {canManage && (
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-app/80 rounded-lg p-1">
                                    <button onClick={() => openEditModal(user)} className="p-1.5 text-text-muted hover:text-brand-blue transition-colors" title="Редактировать">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors" title="Удалить">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            {isModalOpen && canManage && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="glass-panel p-6 rounded-2xl w-96 border border-border">
                        <h2 className="text-xl font-bold text-text-main mb-4">
                            {editingUser ? 'Редактирование' : 'Новый администратор'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted mb-1 block">ФИО</label>
                                <input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} type="text" className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">Логин</label>
                                    <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} type="text" className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue"/>
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">Пароль</label>
                                    <input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="password" placeholder={editingUser ? "***" : ""} className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted mb-1 block">Роль</label>
                                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue">
                                    <option value={ROLES.ORG_OPERATOR}>Оператор</option>
                                    <option value={ROLES.ADMIN}>Админ</option>
                                    <option value={ROLES.MAP_OPERATOR}>Оператор карты</option>
                                    <option value={ROLES.HAZARD_OPERATOR}>Оператор угроз</option>
                                    {canManage && <option value={ROLES.SUPER_ADMIN}>Супер Админ</option>}
                                </select>
                            </div>
                            {formData.role === ROLES.ORG_OPERATOR && (
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">Организация</label>
                                    <select 
                                        value={formData.organizationId} 
                                        onChange={e => setFormData({...formData, organizationId: e.target.value})} 
                                        className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue"
                                    >
                                        <option value="">Выберите организацию...</option>
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-text-muted mb-1 block">Телефон</label>
                                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="text" placeholder="+998..." className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue"/>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 rounded-lg bg-surface hover:bg-surface-hover text-text-muted transition-colors">Отмена</button>
                                <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-brand-blue text-white hover:bg-blue-600 transition-colors font-bold">Сохранить</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
