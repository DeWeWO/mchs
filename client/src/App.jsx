import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Bell, LogOut, Siren } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import HazardsMap from './pages/HazardsMap';
import ReportsPage from './pages/ReportsPage';
import IncidentsPage from './pages/IncidentsPage';
import OperatorsPage from './pages/OperatorsPage';
import SettingsPage from './pages/SettingsPage';
import DevicesPage from './pages/DevicesPage';
import OrganizationsPage from './pages/OrganizationsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LoginPage from './pages/LoginPage';
import OperatorDashboard from './pages/OperatorDashboard';

import { API_URL, SOCKET_URL, ROLES } from './config/env';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const parseJsonSafe = async (response) => {
    try {
        return await response.json();
    } catch {
        return {};
    }
};

const getDefaultRouteByRole = (role) => {
    if (role === ROLES.MAP_OPERATOR) return '/map';
    if (role === ROLES.HAZARD_OPERATOR) return '/hazards';
    if (role === ROLES.ORG_OPERATOR) return '/operator-dashboard';
    if (role === ROLES.ADMIN) return '/devices';
    return '/';
};

const Header = () => {
    const { user, logout } = useAuth();
    const { addToast } = useToast();
    const [isGlobalAlertActive, setIsGlobalAlertActive] = useState(false);
    const hasShownSessionToast = useRef(false);

    const getAuthHeader = () => {
        return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
    };

    const handleApiAuthError = (status, payload) => {
        const errorText = payload?.error || '';
        const tokenInvalid = status === 401 || /токен/i.test(errorText);

        if (tokenInvalid) {
            if (!hasShownSessionToast.current) {
                addToast('Сессия истекла. Войдите снова.', 'warning');
                hasShownSessionToast.current = true;
            }
            logout();
            return true;
        }

        if (status === 403) {
            addToast(payload?.error || 'Нет доступа', 'warning');
            return true;
        }

        return false;
    };

    useEffect(() => {
        if (!user) return undefined;

        hasShownSessionToast.current = false;

        const loadAlertStatus = async () => {
            try {
                const response = await fetch(`${API_URL}/mchs/global-alert/status`, {
                    headers: getAuthHeader()
                });
                const payload = await parseJsonSafe(response);

                if (!response.ok) {
                    handleApiAuthError(response.status, payload);
                    return;
                }

                setIsGlobalAlertActive(Boolean(payload.active));
            } catch (error) {
                console.error('Ошибка загрузки статуса тревоги:', error);
            }
        };

        if (
            user.role === ROLES.MCHS_USER ||
            user.role === ROLES.SUPER_ADMIN ||
            user.role === ROLES.ORG_OPERATOR ||
            user.role === ROLES.ADMIN
        ) {
            void loadAlertStatus();
        }

        const socket = io(SOCKET_URL);
        socket.on('global-alert', ({ active }) => {
            setIsGlobalAlertActive(Boolean(active));
        });

        return () => socket.disconnect();
    }, [user]);

    const handleGlobalAlert = async (active) => {
        const confirmMsg = active ? 'Включить общую тревогу?' : 'Отключить общую тревогу?';
        if (!window.confirm(confirmMsg)) return;

        try {
            const response = await fetch(`${API_URL}/mchs/global-alert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ active })
            });

            const payload = await parseJsonSafe(response);
            if (!response.ok) {
                if (!handleApiAuthError(response.status, payload)) {
                    addToast(payload?.error || 'Ошибка изменения тревоги', 'warning');
                }
                return;
            }

            addToast(active ? 'СИГНАЛ ТРЕВОГИ ОТПРАВЛЕН!' : 'Тревога отменена.', active ? 'error' : 'success');
            setIsGlobalAlertActive(active);
        } catch {
            addToast('Ошибка связи', 'warning');
        }
    };

    const canAlert = user?.role === ROLES.MCHS_USER || user?.role === ROLES.SUPER_ADMIN;

    return (
        <header className="h-16 glass-panel border-b border-border flex items-center justify-between px-8 z-40 shrink-0">
            <h2 className="text-lg font-semibold tracking-wide text-text-main">Ситуационный центр</h2>

            <div className="flex items-center gap-4">
                {canAlert && (
                    isGlobalAlertActive ? (
                        <button onClick={() => handleGlobalAlert(false)} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase">
                            <Siren size={16} /> ОТБОЙ ТРЕВОГИ
                        </button>
                    ) : (
                        <button onClick={() => handleGlobalAlert(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase animate-pulse">
                            <Siren size={16} /> ОБЩАЯ ТРЕВОГА
                        </button>
                    )
                )}

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface text-text-muted text-xs font-bold uppercase">
                    <div className="w-2 h-2 rounded-full bg-brand-green" />
                    {user?.role}
                </div>

                <button className="relative p-2 text-text-muted hover:text-text-main rounded-full hover:bg-surface-hover">
                    <Bell size={20} />
                </button>

                <button onClick={logout} className="p-2 text-text-muted hover:text-red-400 rounded-full hover:bg-surface-hover" title="Выйти">
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

const ProtectedLayout = () => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    if (user.role === ROLES.MAP_OPERATOR && window.location.pathname !== '/map') {
        return <Navigate to="/map" replace />;
    }

    if (user.role === ROLES.HAZARD_OPERATOR && window.location.pathname !== '/hazards') {
        return <Navigate to="/hazards" replace />;
    }

    if (user.role === ROLES.ORG_OPERATOR && window.location.pathname !== '/operator-dashboard') {
        return <Navigate to="/operator-dashboard" replace />;
    }

    return (
        <div className="flex h-screen w-full bg-bg-app text-text-main">
            <Sidebar />
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <Header />
                <div className="flex-1 relative w-full h-full overflow-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

const NavigateToHome = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={getDefaultRouteByRole(user.role)} replace />;
};

const RoleRoute = ({ allowedRoles, children }) => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={getDefaultRouteByRole(user.role)} replace />;
    }

    return children;
};

export default function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<ProtectedLayout />}>
                                <Route path="/" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MCHS_USER]}><Dashboard /></RoleRoute>} />
                                <Route path="operator-dashboard" element={<RoleRoute allowedRoles={[ROLES.ORG_OPERATOR]}><OperatorDashboard /></RoleRoute>} />
                                <Route path="map" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.MAP_OPERATOR]}><MapPage /></RoleRoute>} />
                                <Route path="hazards" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.HAZARD_OPERATOR]}><HazardsMap /></RoleRoute>} />
                                <Route path="devices" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MCHS_USER]}><DevicesPage /></RoleRoute>} />
                                <Route path="reports" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MCHS_USER]}><ReportsPage /></RoleRoute>} />
                                <Route path="incidents" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.ADMIN]}><IncidentsPage /></RoleRoute>} />
                                <Route path="organizations" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}><OrganizationsPage /></RoleRoute>} />
                                <Route path="operators" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}><OperatorsPage /></RoleRoute>} />
                                <Route path="audit-logs" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}><AuditLogsPage /></RoleRoute>} />
                                <Route path="settings" element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MCHS_USER, ROLES.ORG_OPERATOR]}><SettingsPage /></RoleRoute>} />
                                <Route path="*" element={<NavigateToHome />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
