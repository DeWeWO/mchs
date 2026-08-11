import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLES } from '../config/env';
import logo from '../assets/logo.png'; 

// 👇 ВОТ ЗДЕСЬ ДОЛЖНО БЫТЬ "export default"
export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const getHomePathByRole = (role) => {
        if (role === ROLES.MAP_OPERATOR) return '/map';
        if (role === ROLES.HAZARD_OPERATOR) return '/hazards';
        if (role === ROLES.ORG_OPERATOR) return '/operator-dashboard';
        if (role === ROLES.ADMIN) return '/devices';
        return '/';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(username, password);
        if (result.success) {
            addToast(`Добро пожаловать!`, 'success');
            navigate(getHomePathByRole(result?.user?.role), { replace: true }); 
        } else {
            addToast(result.error, 'error');
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-bg-app relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-brand-blue/5 opacity-5 pointer-events-none"></div>
            
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-border shadow-2xl z-10">
                <div className="text-center mb-8">
                    <img src={logo} alt="Logo" className="w-16 h-16 mx-auto mb-4 object-contain" />
                    <h1 className="text-2xl font-bold text-text-main">Вход в систему</h1>
                    <p className="text-text-muted text-sm mt-1">Ситуационный центр МЧС</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs text-text-muted mb-2 font-bold uppercase">Логин</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-surface border border-border rounded-xl py-3 pl-10 pr-4 text-text-main focus:border-brand-blue focus:outline-none transition-colors"
                                placeholder="Введите логин"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-text-muted mb-2 font-bold uppercase">Пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-surface border border-border rounded-xl py-3 pl-10 pr-4 text-text-main focus:border-brand-blue focus:outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <ShieldCheck size={20} /> Войти
                    </button>
                </form>
            </div>
        </div>
    );
}
