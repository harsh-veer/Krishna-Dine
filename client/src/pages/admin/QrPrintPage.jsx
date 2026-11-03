import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { tableApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import QrPoster from '../../components/QrPoster';
import { Button, Spinner } from '../../components/ui';

/** Print sheet: one QR card per table, two per row on A4. Use the browser's "Save as PDF" for a file. */
export default function QrPrintPage() {
  const [params] = useSearchParams();
  const [tables, setTables] = useState(null);
  const [error, setError] = useState('');
  const ids = (params.get('ids') || '').split(',').filter(Boolean);

  useEffect(() => {
    tableApi.bulkQr(ids).then(setTables).catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!tables) return <Spinner />;

  return (
    <div className="min-h-screen bg-cream-200 p-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">{tables.length} QR code{tables.length === 1 ? '' : 's'} ready to print</h1>
          <p className="text-sm text-brand-900/60">Tip: choose "Save as PDF" in the print dialog to keep a copy.</p>
        </div>
        <Button icon={Printer} onClick={() => window.print()}>Print</Button>
      </div>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 print:max-w-none print:gap-4">
        {tables.map((t) => (
          <div key={t.id} className="break-inside-avoid" data-testid="print-card">
            <QrPoster table={t} interactive={false} />
            {!t.isActive && <div className="mt-1 text-center text-xs font-bold text-red-600">Disabled table</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
