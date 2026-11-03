import { useI18n } from '../i18n';

/** Small English / Hindi switch for customer pages. */
export default function LanguageToggle({ light = false, className = '' }) {
  const { lang, setLang } = useI18n();
  const base = light ? 'border-white/25 text-cream-50' : 'border-cream-300 bg-white text-brand-800';
  const on = light ? 'bg-gold-400 text-brand-950' : 'bg-brand-900 text-cream-50';
  return (
    <div className={`inline-flex overflow-hidden rounded-xl border text-xs font-bold ${base} ${className}`} role="group" aria-label="Language" data-testid="lang-toggle">
      <button type="button" onClick={() => setLang('en')} className={`px-2.5 py-1.5 ${lang === 'en' ? on : ''}`} aria-pressed={lang === 'en'}>EN</button>
      <button type="button" onClick={() => setLang('hi')} className={`px-2.5 py-1.5 ${lang === 'hi' ? on : ''}`} aria-pressed={lang === 'hi'}>हिं</button>
    </div>
  );
}
