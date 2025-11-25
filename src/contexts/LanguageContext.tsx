import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import { locales } from '../i18n/locales';
import type { Language } from '../i18n/locales';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof locales.en, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const savedLang = localStorage.getItem('psrun_language');
        if (savedLang && (savedLang === 'en' || savedLang === 'ja')) {
            return savedLang as Language;
        }
        return navigator.language.startsWith('ja') ? 'ja' : 'en';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('psrun_language', lang);
    };

    const t = (key: keyof typeof locales.en, params?: Record<string, string | number>) => {
        let text = locales[language][key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
            });
        }
        return text;
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
