import translations from '../../resources/translations.json' assert { type: 'json' };

export class LocalizationService {
  constructor() {
    this.currentLanguage = 'es';
  }

  setLanguage(lang) {
    if (lang === 'en' || lang === 'es') {
      this.currentLanguage = lang;
    }
  }

  t(key) {
    const langMap = translations[this.currentLanguage] || {};
    return langMap[key] || key;
  }
}

export const localizationService = new LocalizationService();
