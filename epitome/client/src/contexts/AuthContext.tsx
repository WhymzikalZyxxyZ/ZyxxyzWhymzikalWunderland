import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
    user:     User | null;
    loading:  boolean;
    login:    (username: string, password: string) => Promise<void>;
    signup:   (username: string, password: string) => Promise<void>;
    logout:   () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user,    setUser]    = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<User>('/auth/me')
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const u = await api.post<User>('/auth/login', { username, password });
        setUser(u);
    }, []);

    const signup = useCallback(async (username: string, password: string) => {
        const u = await api.post<User>('/auth/signup', { username, password });
        setUser(u);
    }, []);

    const logout = useCallback(async () => {
        await api.post('/auth/logout', {});
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
