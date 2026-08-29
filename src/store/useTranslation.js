import { useStore } from './hooks.js';
import { translations } from './i18n.js';

export function useTranslation() {
  const { language } = useStore();
  const dict = translations[language] && language === 'id' ? translations.id : translations.en;
  const t = (key, vars) => {
    let str = dict[key] !== undefined ? dict[key] : translations.en[key] !== undefined ? translations.en[key] : key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return str;
  };
  return { t, language };
}
