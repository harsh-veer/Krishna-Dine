import { useCallback, useSyncExternalStore } from 'react';
import { storage } from '../services/storage';
import { messages } from './messages';

const KEY = 'kd_lang';
const listeners = new Set();
let current = storage.get(KEY, null) || 'en';
if (current !== 'en' && current !== 'hi') current = 'en';

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => current;

export function setLanguage(lang) {
  current = lang === 'hi' ? 'hi' : 'en';
  storage.set(KEY, current);
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  listeners.forEach((fn) => fn());
}

/** t('key', { n: 2 }) looks up the active language, falls back to English, then to the key. */
export function translate(lang, key, vars) {
  let text = messages[lang]?.[key] ?? messages.en[key] ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { text = text.split(`{${k}}`).join(String(v)); });
  return text;
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, () => 'en');
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  /** Picks the Hindi text of a menu record when the customer chose Hindi and one exists. */
  const pick = useCallback((obj, field) => (lang === 'hi' && obj?.[`${field}Hi`]) || obj?.[field] || '', [lang]);
  return { lang, t, pick, setLang: setLanguage };
}
