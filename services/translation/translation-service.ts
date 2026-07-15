import { LanguageCode, getTranslation, languageNames } from "@/data/emergency-translations";

/**
 * Translation Service
 * Provides centralized translation functionality for emergency phrases
 */

class TranslationService {
  private currentLanguage: LanguageCode = "en";

  /**
   * Set the current language for translations
   */
  setLanguage(language: LanguageCode): void {
    this.currentLanguage = language;
  }

  /**
   * Get the current language
   */
  getCurrentLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  /**
   * Translate a phrase key to the current language
   * @param phraseKey - The key of the phrase to translate
   * @param language - Optional language override (defaults to current language)
   * @returns The translated phrase
   */
  translate(phraseKey: string, language?: LanguageCode): string {
    const targetLanguage = language || this.currentLanguage;
    return getTranslation(phraseKey, targetLanguage);
  }

  /**
   * Translate multiple phrase keys at once
   * @param phraseKeys - Array of phrase keys to translate
   * @param language - Optional language override
   * @returns Object with phrase keys as keys and translations as values
   */
  translateBatch(phraseKeys: string[], language?: LanguageCode): Record<string, string> {
    const targetLanguage = language || this.currentLanguage;
    const result: Record<string, string> = {};
    
    phraseKeys.forEach(key => {
      result[key] = getTranslation(key, targetLanguage);
    });
    
    return result;
  }

  /**
   * Get the display name for a language code
   */
  getLanguageName(language: LanguageCode): string {
    return languageNames[language] || language;
  }

  /**
   * Format a message with placeholders
   * @param template - The template string with placeholders like {name}
   * @param values - Object with values to replace placeholders
   * @returns Formatted string
   */
  formatMessage(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key]?.toString() || match;
    });
  }

  /**
   * Translate and format a message with placeholders
   * @param phraseKey - The key of the phrase to translate
   * @param values - Object with values to replace placeholders
   * @param language - Optional language override
   * @returns Translated and formatted string
   */
  translateAndFormat(phraseKey: string, values: Record<string, string | number>, language?: LanguageCode): string {
    const translated = this.translate(phraseKey, language);
    return this.formatMessage(translated, values);
  }
}

// Singleton instance
export const translationService = new TranslationService();

/**
 * React hook for using translations
 * This should be used with the preferences context to get the user's language
 */
export function useTranslation(language?: LanguageCode) {
  return {
    t: (phraseKey: string) => translationService.translate(phraseKey, language),
    translateBatch: (phraseKeys: string[]) => translationService.translateBatch(phraseKeys, language),
    formatMessage: (template: string, values: Record<string, string | number>) => 
      translationService.formatMessage(template, values),
    translateAndFormat: (phraseKey: string, values: Record<string, string | number>) =>
      translationService.translateAndFormat(phraseKey, values, language),
    getLanguageName: (lang: LanguageCode) => translationService.getLanguageName(lang),
  };
}
