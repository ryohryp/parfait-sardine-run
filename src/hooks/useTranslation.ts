import { useLanguage } from '../contexts/LanguageContext';

export const useTranslation = () => {
    return useLanguage();
};
