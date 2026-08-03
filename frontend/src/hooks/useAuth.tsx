import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { getApiUrl } from '../config/api';

interface User {
    id: number;
    email: string;
    username: string;
    photo: string | null;
    github_id?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isRestoring: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);

    const clearStoredAuth = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }, []);

    useEffect(() => {
        let cancelled = false;
        const restore = async () => {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (!savedToken || !savedUser) {
                if (!cancelled) setIsRestoring(false);
                return;
            }
            try {
                const res = await fetch(`${getApiUrl()}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${savedToken}` },
                });
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setToken(savedToken);
                        setUser(data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                } else if (res.status === 401) {
                    clearStoredAuth();
                } else {
                    setToken(savedToken);
                    setUser(JSON.parse(savedUser));
                }
            } catch {
                if (!cancelled) {
                    setToken(savedToken);
                    setUser(JSON.parse(savedUser));
                }
            } finally {
                if (!cancelled) setIsRestoring(false);
            }
        };
        restore();

        const onUnauthorized = () => {
            clearStoredAuth();
            setToken(null);
            setUser(null);
        };
        window.addEventListener('auth:unauthorized', onUnauthorized);
        return () => {
            cancelled = true;
            window.removeEventListener('auth:unauthorized', onUnauthorized);
        };
    }, [clearStoredAuth]);

    const login = useCallback((userData: User, newToken: string) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        clearStoredAuth();
        setToken(null);
        setUser(null);
    }, [clearStoredAuth]);

    const value = useMemo(
        () => ({ user, token, isRestoring, login, logout }),
        [user, token, isRestoring, login, logout]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
