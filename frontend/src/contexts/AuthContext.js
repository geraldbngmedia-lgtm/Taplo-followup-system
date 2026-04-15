import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import { API } from '@/config';

const AuthContext = createContext(null);

// Set up axios to always send the token
function setAxiosToken(token) {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('taplo_access_token', token);
    } else {
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('taplo_access_token');
        localStorage.removeItem('taplo_refresh_token');
    }
}

// Initialize token from localStorage on load
const savedToken = localStorage.getItem('taplo_access_token');
if (savedToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// Always send cookies too as fallback
axios.defaults.withCredentials = true;

function formatApiErrorDetail(detail) {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null = checking
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('taplo_access_token');
        if (!token) {
            setUser(false);
            setLoading(false);
            return;
        }
        try {
            const { data } = await axios.get(`${API}/auth/me`);
            setUser(data);
        } catch {
            // Token expired or invalid — clear it
            setAxiosToken(null);
            setUser(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { checkAuth(); }, [checkAuth]);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post(`${API}/auth/login`, { email, password });
            if (data.access_token) {
                setAxiosToken(data.access_token);
                if (data.refresh_token) localStorage.setItem('taplo_refresh_token', data.refresh_token);
            }
            setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
            return { success: true };
        } catch (e) {
            return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await axios.post(`${API}/auth/register`, { name, email, password });
            if (data.access_token) {
                setAxiosToken(data.access_token);
                if (data.refresh_token) localStorage.setItem('taplo_refresh_token', data.refresh_token);
            }
            setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
            return { success: true };
        } catch (e) {
            return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
        }
    };

    const logout = async () => {
        try {
            await axios.post(`${API}/auth/logout`, {});
        } catch { /* ignore */ }
        setAxiosToken(null);
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
