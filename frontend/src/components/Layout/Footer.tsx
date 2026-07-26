import { NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n';

export default function Footer() {
    const { t } = useI18n();

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-800 border-t border-gray-200/50 dark:border-surface-700/50 shadow-lg">
            <nav className="flex items-center justify-around px-4 py-2 max-w-lg mx-auto">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                            isActive
                                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`
                    }
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-[11px] font-semibold">{t('nav.home')}</span>
                </NavLink>

                <NavLink
                    to="/learning"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                            isActive
                                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`
                    }
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-[11px] font-semibold">{t('nav.learning')}</span>
                </NavLink>

                <NavLink
                    to="/projects"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                            isActive
                                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`
                    }
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="text-[11px] font-semibold">{t('nav.projects')}</span>
                </NavLink>
            </nav>
        </footer>
    );
}
