import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { locales } from '../i18n/locales';
import type { Language } from '../i18n/locales';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof locales.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('ja');

    useEffect(() => {
        const savedLang = localStorage.getItem('psrun_language');
        if (savedLang && (savedLang === 'en' || savedLang === 'ja')) {
            setLanguageState(savedLang);
        } else {
            const browserLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
            setLanguageState(browserLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('psrun_language', lang);
    };

    const t = (key: keyof typeof locales.en) => {
        return locales[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
