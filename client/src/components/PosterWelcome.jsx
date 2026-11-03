import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ChevronRight, Flame, Heart, Leaf, UtensilsCrossed } from 'lucide-react';
import { LogoMark } from './Logo';
import LanguageToggle from './LanguageToggle';
import { useI18n } from '../i18n';

/** Hand-drawn style sprig that sways gently. */
function Sprig({ flip = false, className = '' }) {
  return (
    <svg viewBox="0 0 60 180" className={`poster-sway ${className}`} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <g fill="none" stroke="#8E9473" strokeWidth="2" strokeLinecap="round">
        <path d="M30 175 C 38 120, 22 60, 32 8" />
      </g>
      <g fill="#8E9473">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = 150 - i * 24;
          const x = 30 + (i % 2 ? 2 : 4) * (i < 3 ? 1 : -1) * 0.5;
          return (
            <g key={i}>
              <path d={`M${x} ${y} q-22 -6 -26 -26 q 22 -2 26 26`} opacity="0.95" />
              <path d={`M${x} ${y - 8} q22 -6 24 -26 q -22 -2 -24 26`} opacity="0.95" />
            </g>
          );
        })}
        <path d="M32 8 q-8 14 0 26 q 8 -12 0 -26" />
      </g>
    </svg>
  );
}

/** The welcome screen a customer sees after scanning: the poster, alive. */
export default function PosterWelcome({ table, tableToken, settings, onStart }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(null);
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!tableToken) return;
    QRCode.toDataURL(`${window.location.origin}/menu/${tableToken}`, { margin: 1, width: 480, errorCorrectionLevel: 'M', color: { dark: '#3F4A2C', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => {});
  }, [tableToken]);
  const features = [
    { key: 'fresh', icon: Leaf },
    { key: 'veg', icon: Flame },
    { key: 'love', icon: Heart },
    { key: 'table', icon: UtensilsCrossed },
  ];
  const rise = (n) => ({ animationDelay: `${n * 90}ms` });
  const scriptClass = lang === 'hi' ? 'font-serif italic' : 'font-script';

  return (
    <div className={`relative flex min-h-[100svh] flex-col items-center overflow-hidden bg-gradient-to-b from-[#EFE4CF] to-[#E6D8BD] px-4 pt-5 text-[#4A4E30] ${lang === 'hi' ? '[&_*]:!tracking-normal' : ''}`}>
      <div className="absolute right-4 top-4 z-20">
        <LanguageToggle />
      </div>

      <div className="relative mt-8 flex w-full max-w-md flex-1 flex-col items-center rounded-t-[9999px] border-[3px] border-[#B88F4A] bg-gradient-to-b from-[#FBF7EC] to-[#F4ECDD] px-6 pb-0 pt-12 shadow-lift">
        <div className="pointer-events-none absolute inset-[7px] rounded-t-[9999px] border border-[#D9BE86]" />

        <div className="poster-rise" style={rise(0)}>
          <div className="rounded-full border-[3px] border-[#B88F4A] bg-white p-1.5 shadow-soft">
            <LogoMark className="h-16 w-16 !rounded-full !p-0 !shadow-none !ring-0" />
          </div>
        </div>

        <div className="poster-rise mt-4 text-center" style={rise(1)}>
          <div className="font-cormorant text-2xl font-semibold tracking-[0.28em]">KRISHNA HOTEL</div>
          <div className="mt-0.5 font-jost text-[11px] font-medium tracking-[0.3em]">&amp; RESTAURANT</div>
          <div className="mt-1 font-jost text-[10px] font-medium tracking-[0.3em] text-[#B88F4A]">AKBARPUR ♥</div>
        </div>

        <div className="poster-rise mt-6 text-center" style={rise(2)}>
          <div className="font-cormorant text-xl tracking-[0.35em]">{t('poster.kicker')}</div>
          <h1 className="font-cormorant text-[3.1rem] font-bold leading-none tracking-wide text-[#5A5E3A]">{t('poster.headline')}</h1>
          <p className={`mt-2 text-[1.7rem] leading-tight text-[#B88F4A] ${scriptClass}`}>{t('poster.script')}</p>
        </div>

        <div className="poster-rise mt-3 flex items-center gap-2 text-[#8E9473]" style={rise(3)} aria-hidden="true">
          <span className="h-px w-16 bg-current" />
          <Leaf className="h-4 w-4" />
          <span className="h-px w-16 bg-current" />
        </div>
        <p className="poster-rise mt-3 text-center font-jost text-[13px] font-medium tracking-[0.22em]" style={rise(3)}>{t('poster.tag')}</p>

        <div className="poster-rise relative mt-6 w-full rounded-[2rem] border border-[#D9BE86] bg-[#E5E3CF] px-5 pb-5 pt-7 text-center" style={rise(4)}>
          <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[#D9BE86] bg-[#FBF7EC] text-[#8E9473]">
            <Leaf className="h-4 w-4" />
          </div>
          <Sprig className="pointer-events-none absolute -left-1 bottom-2 h-28 w-8 opacity-80" />
          <Sprig flip className="pointer-events-none absolute -right-1 bottom-2 h-28 w-8 opacity-80" />
          <div className="font-jost text-[11px] font-medium tracking-[0.3em]">{t('poster.scan')}</div>
          <div className="font-cormorant text-[2.1rem] font-bold leading-tight tracking-wider text-[#5A5E3A]">{t('poster.menu')}</div>
          <div className="mt-0.5 font-jost text-[11px] font-semibold tracking-[0.3em] text-[#B88F4A]" data-testid="welcome-table">{t('poster.table', { n: table.tableNumber })}</div>
          {qr && (
            <button type="button" onClick={onStart} className="poster-qr relative mx-auto mt-3 block rounded-3xl bg-white p-3 shadow-soft" aria-label={t('welcome.cta')} data-testid="welcome-qr">
              <img src={qr} alt="" className="h-40 w-40" draggable="false" />
            </button>
          )}
          <button
            type="button"
            onClick={onStart}
            className="poster-cta mt-3 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#5A5E3A] font-jost text-base font-semibold tracking-wide text-[#FBF7EC] shadow-soft transition active:scale-[0.98]"
            data-testid="start-ordering"
          >
            {t('welcome.cta')} <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="poster-rise mt-5 w-full" style={rise(5)}>
          <div className="grid grid-cols-4 divide-x divide-[#D9BE86]">
            {features.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setOpen(open === key ? null : key)}
                aria-expanded={open === key}
                className={`group flex flex-col items-center gap-1 px-1 py-2 text-center transition ${open === key ? 'text-[#5A5E3A]' : 'text-[#8E9473]'}`}
                data-testid={`feature-${key}`}
              >
                <Icon className="h-6 w-6 transition group-hover:scale-110 group-active:scale-95" strokeWidth={1.6} />
                <span className="font-jost text-[10px] font-semibold tracking-[0.14em] text-[#4A4E30]">{t(`poster.f.${key}`)}</span>
                <span className="font-jost text-[10px] text-[#4A4E30]/70">{t(`poster.f.${key}.sub`)}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 min-h-[2.5rem] text-center font-jost text-[13px] leading-snug text-[#4A4E30]/85" aria-live="polite" data-testid="feature-blurb">
            {open ? t(`poster.b.${open}`) : t('poster.hint')}
          </p>
        </div>

        <div className="mt-auto -mx-6 w-[calc(100%+3rem)] bg-[#6C7150] px-4 pb-4 pt-2 text-center text-[#F6EFDF]">
          <div className={`text-[1.6rem] ${scriptClass}`}>{t('poster.footer')}</div>
          <div className="font-jost text-[10px] tracking-[0.2em] text-[#F6EFDF]/70">{settings?.address || 'AKBARPUR, UTTAR PRADESH'}</div>
        </div>
      </div>
    </div>
  );
}
