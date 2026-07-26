import { useI18n } from '../../i18n';

export default function LanguageToggle() {
    const { lang, setLang } = useI18n();

    const toggleLanguage = () => {
        setLang(lang === 'fr' ? 'en' : 'fr');
    };

    return (
        <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600 transition-all duration-200 text-xs font-bold tracking-wider text-gray-600 dark:text-gray-300 uppercase"
        >
            {lang === 'fr' ? 'EN' : 'FR'}
        </button>
    );
}
