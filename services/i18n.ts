import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import fil from '../locales/fil.json';

const resources = {
  en: { translation: en },
  fil: { translation: fil },
};

export const getInitialLanguage = (): 'en' | 'fil' => {
  try {
    // Safely require expo-localization to prevent crashes if native module isn't compiled yet
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Localization = require('expo-localization');
    const locales = Localization?.getLocales ? Localization.getLocales() : null;
    if (locales && locales.length > 0) {
      const languageCode = locales[0]?.languageCode?.toLowerCase();
      if (languageCode === 'fil' || languageCode === 'tl') {
        return 'fil';
      }
    }
  } catch (error) {
    console.warn('[i18n] Native ExpoLocalization module unavailable. Defaulting to "en".');
  }
  return 'en';
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: getInitialLanguage(),
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false,
      },
    })
    .catch((err) => {
      console.error('[i18n] Failed to initialize i18next:', err);
    });
}

export default i18n;
