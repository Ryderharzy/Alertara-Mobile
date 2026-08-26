import { usePreferences } from "@/context/preferences-context";
import translations from "@/data/translations";

/**
 * Hook for accessing translations in the user's preferred language
 * @returns Translation function that takes a key and returns the translated string
 */
export function useTranslation() {
  const { language } = usePreferences();

  /**
   * Get translated text for a given key
   * @param key - Translation key (e.g., "nav.home", "emergency evacuate_now")
   * @param fallback - Optional fallback text if key not found
   * @returns Translated string in user's preferred language
   */
  const t = (key: string, fallback?: string): string => {
    const translation = translations[key];
    if (!translation) {
      return fallback || key;
    }
    const normLang = (language === "fil" || language === "tl") ? "tl" : language;
    return (
      (translation as any)[normLang] ||
      (translation as any)[language] ||
      (translation as any)["tl"] ||
      fallback ||
      translation.en ||
      key
    );
  };

  return { t, language };
}
