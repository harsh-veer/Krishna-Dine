import { Link } from 'react-router-dom';
import { Leaf, ReceiptText } from 'lucide-react';
import { LogoMark } from './Logo';
import LanguageToggle from './LanguageToggle';
import Sprig from './Sprig';
import { useI18n } from '../i18n';

/** Top of the customer menu: the poster arch, brand, tagline and the table. */
export default function MenuHero({ table, lastOrderId }) {
  const { t, lang } = useI18n();
  const script = lang === 'hi' ? 'font-serif italic' : 'font-script';
  return (
    <div className={`relative px-4 pt-4 ${lang === 'hi' ? '[&_*]:!tracking-normal' : ''}`}>
      <div className="relative z-20 flex items-center justify-between">
        {lastOrderId ? (
          <Link to={`/order/${lastOrderId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D9BE86] bg-white/80 px-3 text-xs font-bold text-[#4A4E30]" data-testid="my-orders">
            <ReceiptText className="h-4 w-4" /> {t('menu.myOrders')}
          </Link>
        ) : (
          <span />
        )}
        <LanguageToggle />
      </div>

      <div className="relative -mt-2 mx-auto flex max-w-xs flex-col items-center rounded-t-[9999px] border-[3px] border-b-0 border-[#B88F4A] bg-gradient-to-b from-[#FBF7EC] to-transparent px-5 pb-5 pt-9">
        <div className="pointer-events-none absolute inset-[6px] bottom-0 rounded-t-[9999px] border border-b-0 border-[#D9BE86]" />
        <Sprig className="pointer-events-none absolute -left-5 bottom-0 h-24 w-7 opacity-70" />
        <Sprig flip className="pointer-events-none absolute -right-5 bottom-0 h-24 w-7 opacity-70" />
        <div className="poster-rise rounded-full border-[3px] border-[#B88F4A] bg-white p-1 shadow-soft">
          <LogoMark className="h-14 w-14 !rounded-full !p-0 !shadow-none !ring-0" />
        </div>
        <div className="poster-rise mt-3 text-center" style={{ animationDelay: '90ms' }} data-testid="hero-title">
          <div className="font-cormorant text-[1.35rem] font-semibold tracking-[0.26em] text-[#4A4E30]">KRISHNA HOTEL</div>
          <div className="font-jost text-[10px] font-medium tracking-[0.3em] text-[#4A4E30]">&amp; RESTAURANT</div>
        </div>
        <p className={`poster-rise mt-2 text-center text-[1.45rem] leading-tight text-[#B88F4A] ${script}`} style={{ animationDelay: '180ms' }}>{t('poster.script')}</p>
        <span className="poster-rise mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#5A5E3A] uppercase px-4 py-1.5 font-jost text-xs font-semibold tracking-[0.2em] text-[#FBF7EC]" style={{ animationDelay: '270ms' }} data-testid="table-number">
          <Leaf className="h-3.5 w-3.5 text-[#D9BE86]" /> {t('common.table', { n: table.tableNumber })}
        </span>
      </div>
      <div className="mx-auto flex max-w-xs items-center gap-2 text-[#8E9473]" aria-hidden="true">
        <span className="h-px flex-1 bg-[#D9BE86]" />
        <span className="font-jost text-[10px] tracking-[0.25em] text-[#4A4E30]/70">{t('poster.tag')}</span>
        <span className="h-px flex-1 bg-[#D9BE86]" />
      </div>
    </div>
  );
}
