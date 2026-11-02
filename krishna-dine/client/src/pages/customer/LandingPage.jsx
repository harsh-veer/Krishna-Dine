import { Link } from 'react-router-dom';
import { QrCode, ChefHat, LayoutDashboard } from 'lucide-react';
import Logo from '../../components/Logo';
import LanguageToggle from '../../components/LanguageToggle';
import { useI18n } from '../../i18n';

export default function LandingPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-900 px-6 text-center text-cream-50">
      <Logo light className="mb-6" />
      <LanguageToggle light className="mb-6" />
      <div className="max-w-md">
        <QrCode className="mx-auto h-14 w-14 text-gold-400" />
        <h1 className="mt-5 font-display text-4xl font-semibold">{t('landing.title')}</h1>
        <p className="mt-3 text-cream-200/75">{t('landing.sub')}</p>
      </div>
      <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm">
        <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold hover:bg-white/15">
          <ChefHat className="h-4 w-4" /> Staff login
        </Link>
        <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold hover:bg-white/15">
          <LayoutDashboard className="h-4 w-4" /> Admin
        </Link>
      </div>
    </div>
  );
}
