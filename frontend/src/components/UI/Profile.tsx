import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';

interface User {
    id: number;
    email: string;
    username: string;
    photo: string | null;
}

interface ProfileProps {
    user: User | null;
    onLogout: () => void;
}

export default function Profile({ user, onLogout }: ProfileProps) {
    const { t } = useI18n();
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        setShowMenu(false);
    }, [location.pathname]);

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-700 transition-all duration-200 active:scale-95"
            >
                {user.photo ? (
                    <img src={user.photo} alt={user.username} className="w-8 h-8 rounded-lg object-cover ring-2 ring-brand-200 dark:ring-brand-800" />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                )}
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                    {user.username}
                </span>
                <svg className="w-4 h-4 text-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {showMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="dropdown w-56 p-2">
                        <div className="px-3 py-2 border-b border-gray-200/50 dark:border-surface-700/50 mb-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={() => { navigate('/profile'); setShowMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            {t('header.profile')}
                        </button>
                        <button
                            onClick={() => { onLogout(); setShowMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            {t('header.logout')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
