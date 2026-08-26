import { useTranslation as useI18nTranslation } from "react-i18next";
import { usePreferences } from "@/context/preferences-context";
import { getTranslation } from "@/data/emergency-translations";

/**
 * Hook for accessing translations in the user's preferred language
 * Powered by react-i18next & local bundled dictionaries.
 */
export function useTranslation() {
  const { t, i18n } = useI18nTranslation();
  const { language } = usePreferences();

  const currentLang = language === "tl" ? "fil" : (language || i18n.language || "en");

  const translate = (key: string, fallbackOrOptions?: string | Record<string, any>): string => {
    if (!key) return "";

    // 1. Check if key exists in current i18next language bundle
    if (i18n.exists(key, { lng: currentLang })) {
      const opts = typeof fallbackOrOptions === "object" ? fallbackOrOptions : {};
      return String(t(key, opts as any));
    }

    // 2. Check emergency-translations fallback dictionary
    const fallbackTrans = getTranslation(key, currentLang);
    if (fallbackTrans && fallbackTrans !== key) {
      return fallbackTrans;
    }

    // 3. Return explicit string fallback if provided by developer
    if (typeof fallbackOrOptions === "string" && fallbackOrOptions) {
      return fallbackOrOptions;
    }

    // 4. Try i18n defaultValue
    const translatedWithDefault = String(t(key, typeof fallbackOrOptions === "string" ? { defaultValue: fallbackOrOptions } : fallbackOrOptions as any));
    if (translatedWithDefault && translatedWithDefault !== key) {
      return translatedWithDefault;
    }

    // 5. Raw key format fallback
    const cleanKey = (key.split('.').pop() || key).replace(/_/g, ' ');
    return cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
  };

  return { t: translate, language: currentLang };
}
