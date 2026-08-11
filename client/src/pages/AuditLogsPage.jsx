import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Filter, Loader2, RefreshCw } from 'lucide-react';
import { API_URL } from '../config/env';
import { useToast } from '../context/ToastContext';

const getAuthHeader = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
    } catch {
        return {};
    }
};

export default function AuditLogsPage() {
    const { addToast } = useToast();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [action, setAction] = useState('');
    const [userId, setUserId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', '300');
            if (action) params.set('action', action);
            if (userId) params.set('userId', userId);
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const response = await fetch(`${API_URL}/audit-logs?${params.toString()}`, { headers: getAuthHeader() });
            const data = await response.json().catch(() => []);
            if (!response.ok) throw new Error(data.error || 'Failed to load audit logs');
            setLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            addToast(error.message, 'error');
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadLogs();
    }, []);

    const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort(), [logs]);

    return (
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-main flex items-center gap-3"><ClipboardList className="text-brand-blue" /> Audit logs</h1>
                    <p className="text-text-muted">User actions, security events and critical system changes</p>
                </div>
                <button onClick={loadLogs} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-sm text-text-main">
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-border flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-text-muted text-sm font-semibold uppercase"><Filter size={16} /> Filters</div>
                <select value={action} onChange={(e) => setAction(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main">
                    <option value="">All actions</option>
                    {actions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main" />
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main" />
                <button onClick={loadLogs} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold">Apply</button>
            </div>

            <div className="glass-panel rounded-2xl border border-border overflow-hidden flex-1">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-text-muted"><Loader2 className="animate-spin mr-2" /> Loading audit logs</div>
                ) : (
                    <div className="h-full overflow-auto custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface border-b border-border text-text-muted">
                                <tr>
                                    <th className="text-left p-3">Date</th>
                                    <th className="text-left p-3">User</th>
                                    <th className="text-left p-3">Role</th>
                                    <th className="text-left p-3">Action</th>
                                    <th className="text-left p-3">Entity</th>
                                    <th className="text-left p-3">Entity ID</th>
                                    <th className="text-left p-3">IP</th>
                                    <th className="text-left p-3">Metadata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b border-border/60 hover:bg-surface/60">
                                        <td className="p-3 text-text-main whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                                        <td className="p-3 text-text-main">{log.username || log.userId || '-'}</td>
                                        <td className="p-3 text-text-muted">{log.role || '-'}</td>
                                        <td className="p-3 text-brand-blue font-semibold">{log.action}</td>
                                        <td className="p-3 text-text-main">{log.entity || '-'}</td>
                                        <td className="p-3 text-text-muted font-mono text-xs">{log.entityId || '-'}</td>
                                        <td className="p-3 text-text-muted">{log.ip || '-'}</td>
                                        <td className="p-3 text-text-muted max-w-[320px] truncate">{log.metadata ? JSON.stringify(log.metadata) : '-'}</td>
                                    </tr>
                                ))}
                                {logs.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-text-muted">No audit logs found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
