import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import fr from './fr.json';
import en from './en.json';

type Lang = 'fr' | 'en';
type Translations = Record<string, string>;

const translations: Record<Lang, Translations> = { fr, en };

interface I18nContextType {
    lang: Lang;
    t: (key: string) => string;
    setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        return (localStorage.getItem('language') as Lang) || 'fr';
    });

    const setLang = (newLang: Lang) => {
        setLangState(newLang);
        localStorage.setItem('language', newLang);
    };

    const t = (key: string): string => {
        return translations[lang][key] || translations['fr'][key] || key;
    };

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    return (
        <I18nContext.Provider value={{ lang, t, setLang }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useI18n must be used within an I18nProvider');
    return context;
}
