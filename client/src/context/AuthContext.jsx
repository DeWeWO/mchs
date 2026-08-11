import { createContext, useContext, useState } from 'react';
import { API_URL } from '../config/env';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const parseApiResponse = async (response) => {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return {
            error: response.ok
                ? 'Некорректный ответ сервера'
                : `Сервер вернул ошибку ${response.status}. Проверьте backend/proxy logs.`
        };
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('mchs_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            localStorage.removeItem('mchs_user');
            return null;
        }
    });

    const login = async (username, password) => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await parseApiResponse(res);
            if (!res.ok) {
                return { success: false, error: data.error || 'Ошибка входа' };
            }

            const userData = {
                ...data.user,
                token: data.token
            };

            setUser(userData);
            localStorage.setItem('mchs_user', JSON.stringify(userData));
            return { success: true, user: userData };
        } catch (error) {
            console.error(error);
            return { success: false, error: 'Ошибка соединения с сервером' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('mchs_user');
    };

    const checkRole = (allowedRoles) => {
        if (!user) return false;
        if (!allowedRoles || allowedRoles.length === 0) return true;
        return allowedRoles.includes(user.role);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, checkRole }}>
            {children}
        </AuthContext.Provider>
    );
};
