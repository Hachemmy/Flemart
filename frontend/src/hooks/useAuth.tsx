import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

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
    login: (userData: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedToken = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            if (savedToken && userData) {
                setToken(savedToken);
                setUser(JSON.parse(userData));
            }
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }, []);

    const login = useCallback((userData: User, newToken: string) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, token, login, logout }), [user, token, login, logout]);

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
