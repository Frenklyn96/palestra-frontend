import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// importa direttamente i file json
import itTranslations from './locales/it/translation.json';
import enTranslations from './locales/en/translation.json';

const resources = {
  it: {
    translation: itTranslations,
  },
  en: {
    translation: enTranslations,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'it',  // lingua di default
    keySeparator: '.',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
