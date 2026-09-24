import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, isAppLocale, LOCALE_STORAGE_KEY, type AppLocale } from '~/util/constants';
import ptBR from '~/locales/pt-BR.json';
import en from '~/locales/en.json';

const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
const initialLocale: AppLocale = isAppLocale(savedLocale) ? savedLocale : DEFAULT_LOCALE;

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = initialLocale;

i18n.on('languageChanged', (locale) => {
  document.documentElement.lang = locale;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
});

export function setAppLocale(locale: AppLocale) {
  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
    return;
  }

  document.documentElement.lang = locale;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export default i18n;
