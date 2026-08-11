import { useState } from 'react';
import { User, Bell, Shield, Volume2, Globe, Save } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
    const { addToast } = useToast();
    
    // Локальное состояние для формы
    const [settings, setSettings] = useState({
        sound: true,
        push: true,
        email: true,
        theme: 'dark'
    });

    const handleSave = () => {
        addToast('Настройки успешно сохранены', 'success');
    };

    const toggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 overflow-y-auto h-full custom-scrollbar">
            
            <div className="flex justify-between items-center">
                {/* Исправлено: text-white -> text-text-main */}
                <h1 className="text-3xl font-bold text-text-main tracking-tight">Настройки системы</h1>
                <button onClick={handleSave} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(0,170,255,0.3)]">
                    <Save size={18} /> Сохранить
                </button>
            </div>

            {/* Профиль */}
            <section>
                {/* Исправлено: text-slate-400 -> text-text-muted */}
                <h3 className="text-text-muted uppercase text-xs font-bold tracking-wider mb-4 ml-1">Учетная запись</h3>
                <GlassCard className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-surface-hover flex items-center justify-center text-text-muted border-2 border-border">
                        <User size={40} />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-text-muted mb-1">ФИО Оператора</label>
                                {/* Исправлено: bg-slate-900 -> bg-surface, text-white -> text-text-main */}
                                <input type="text" defaultValue="Иванов Иван Иванович" className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-main focus:border-brand-blue focus:outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs text-text-muted mb-1">Должность</label>
                                <input type="text" defaultValue="Старший оператор ЦУКС" className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-main focus:border-brand-blue focus:outline-none transition-colors" />
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </section>

            {/* Уведомления */}
            <section>
                <h3 className="text-text-muted uppercase text-xs font-bold tracking-wider mb-4 ml-1">Уведомления и Звук</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingItem 
                        icon={Volume2} 
                        title="Звуковые оповещения" 
                        desc="Сирена при статусе 'Danger'" 
                        active={settings.sound} 
                        onClick={() => toggle('sound')} 
                    />
                    <SettingItem 
                        icon={Bell} 
                        title="Push-уведомления" 
                        desc="Всплывающие окна в браузере" 
                        active={settings.push} 
                        onClick={() => toggle('push')} 
                    />
                </div>
            </section>

            {/* Безопасность */}
            <section>
                <h3 className="text-text-muted uppercase text-xs font-bold tracking-wider mb-4 ml-1">Безопасность</h3>
                <GlassCard className="space-y-4">
                    <div className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-brand-green/10 text-brand-green rounded-lg"><Shield size={20} /></div>
                            <div>
                                <div className="text-text-main font-medium group-hover:text-brand-blue transition-colors">Двухфакторная аутентификация</div>
                                <div className="text-xs text-text-muted">Рекомендуется включить</div>
                            </div>
                        </div>
                        <div className="text-brand-green text-sm font-bold">ВКЛЮЧЕНО</div>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            {/* Исправлено: bg-slate-700 -> bg-surface-hover */}
                            <div className="p-2 bg-surface-hover text-text-muted rounded-lg"><Globe size={20} /></div>
                            <div>
                                <div className="text-text-main font-medium group-hover:text-brand-blue transition-colors">История сессий</div>
                                <div className="text-xs text-text-muted">Последний вход: 10 мин назад (IP: 192.168.1.1)</div>
                            </div>
                        </div>
                        <button className="text-text-muted hover:text-text-main text-sm transition-colors">Показать</button>
                    </div>
                </GlassCard>
            </section>

        </div>
    );
}

function SettingItem({ icon: Icon, title, desc, active, onClick }) {
    return (
        <GlassCard 
            className={`cursor-pointer border transition-all ${active ? 'border-brand-blue/50 bg-brand-blue/5' : 'border-transparent hover:border-border'}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${active ? 'bg-brand-blue text-white' : 'bg-surface-hover text-text-muted'}`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <div className={`font-medium ${active ? 'text-text-main' : 'text-text-muted'}`}>{title}</div>
                        <div className="text-xs text-text-muted">{desc}</div>
                    </div>
                </div>
                {/* Переключатель (Toggle) */}
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? 'bg-brand-blue' : 'bg-gray-300 dark:bg-slate-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
            </div>
        </GlassCard>
    );
}