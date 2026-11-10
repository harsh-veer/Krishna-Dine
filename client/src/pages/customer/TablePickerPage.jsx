import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import Logo from '../../components/Logo';
import LanguageToggle from '../../components/LanguageToggle';
import { useI18n } from '../../i18n';
import { FullPageSpinner } from '../../components/ui';

/** Landing page of the shared QR code: the customer picks their table, then goes to that table's menu. */
export default function TablePickerPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tables, setTables] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    publicApi.tables().then(setTables).catch((e) => setError(errorMessage(e)));
  }, []);

  const choose = async (table) => {
    setBusyId(table.id);
    setError('');
    try {
      const { token } = await publicApi.selectTable(table.id);
      navigate(`/menu/${encodeURIComponent(token)}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusyId(null);
    }
  };

  if (!tables && !error) return <FullPageSpinner label={t('menu.finding')} />;

  return (
    <div className="min-h-screen bg-cream-100 px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-extrabold text-brand-950">{t('pick.title')}</h1>
        <p className="mt-1 text-sm text-brand-900/60">{t('pick.sub')}</p>
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {tables && tables.length === 0 && <p className="mt-6 text-sm text-brand-900/60">{t('pick.empty')}</p>}
        <div className="mt-6 grid grid-cols-3 gap-3" data-testid="table-picker">
          {(tables || []).map((tb) => (
            <button
              key={tb.id}
              type="button"
              disabled={busyId !== null}
              onClick={() => choose(tb)}
              className="card flex aspect-square flex-col items-center justify-center text-brand-950 transition active:scale-95 disabled:opacity-50"
              data-testid="pick-table"
              data-table-number={tb.tableNumber}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-900/45">{t('pick.table')}</span>
              <span className="text-3xl font-extrabold leading-tight">{tb.tableNumber}</span>
              {tb.label && <span className="mt-0.5 max-w-full truncate px-1 text-[11px] text-brand-900/50">{tb.label}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
