import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import nl from './locales/nl.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: localStorage.getItem('language') || 'en', // Default locale
  fallbackLocale: 'en', // Fallback locale when translation is missing
  messages: {
    en,
    nl,
    fr,
    de
  }
});

export default i18n;
