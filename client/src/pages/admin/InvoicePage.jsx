import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { orderApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { LogoMark } from '../../components/Logo';
import { Button, Spinner } from '../../components/ui';
import { formatDateTime, formatINR2, PAYMENT_LABEL } from '../../utils/format';

/** Printable tax invoice (A4 or 80mm thermal; the layout is narrow and centred). */
export default function InvoicePage() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    orderApi.bill(id).then(setBill).catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!bill) return <Spinner />;
  const { order: o, restaurant: r } = bill;
  const paidRecord = bill.payments.find((p) => p.paymentStatus === 'paid');

  return (
    <div className="min-h-screen bg-cream-200 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[420px] justify-end gap-2 px-4">
        <Button icon={Printer} onClick={() => window.print()}>Print</Button>
      </div>
      <div className="mx-auto max-w-[420px] bg-white p-7 font-mono text-[13px] leading-relaxed text-black shadow-lift print:max-w-none print:p-0 print:shadow-none" data-testid="invoice">
        <div className="text-center">
          <LogoMark className="mx-auto h-12 w-12 print:hidden" />
          <div className="mt-2 font-sans text-lg font-extrabold">{r.name}</div>
          <div className="text-xs">{r.address}</div>
          {r.phone && <div className="text-xs">Phone: {r.phone}</div>}
          {r.gstin && <div className="text-xs">GSTIN: {r.gstin}</div>}
          <div className="mt-3 border-y border-dashed border-black py-1 font-sans text-sm font-bold tracking-widest">TAX INVOICE</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-2 text-xs">
          <div>Invoice: {o.invoiceNumber || 'Not generated'}</div>
          <div className="text-right">Order: {o.orderNumber}</div>
          <div>Table: {o.tableNumber}</div>
          <div className="text-right">{formatDateTime(o.billGeneratedAt || o.createdAt)}</div>
          <div className="col-span-2">Customer: {o.customerName}{o.customerPhone ? ` (${o.customerPhone})` : ''}</div>
        </div>
        <table className="mt-3 w-full border-t border-dashed border-black text-xs">
          <thead>
            <tr className="border-b border-dashed border-black text-left"><th className="py-1">Item</th><th className="py-1 text-right">Qty</th><th className="py-1 text-right">Rate</th><th className="py-1 text-right">Amt</th></tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.menuItem}><td className="py-0.5 pr-1">{i.name}</td><td className="text-right">{i.quantity}</td><td className="text-right">{i.price.toFixed(2)}</td><td className="text-right">{i.lineTotal.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 space-y-0.5 border-t border-dashed border-black pt-2 text-xs">
          <Line label="Subtotal" value={o.subtotal} />
          {o.serviceCharge > 0 && <Line label={`Service charge @${o.serviceChargeRate}%`} value={o.serviceCharge} />}
          <Line label={`CGST @${o.gstRate / 2}%`} value={o.cgst} />
          <Line label={`SGST @${o.gstRate / 2}%`} value={o.sgst} />
          {o.roundOff !== 0 && <Line label="Round off" value={o.roundOff} />}
        </div>
        <div className="mt-2 flex justify-between border-y border-dashed border-black py-1.5 font-sans text-base font-extrabold">
          <span>TOTAL</span><span>{formatINR2(o.totalAmount)}</span>
        </div>
        <div className="mt-2 text-xs">
          Payment: {o.paymentStatus === 'paid' ? `PAID (${PAYMENT_LABEL[o.paymentMethod]})${paidRecord?.transactionReference ? ` Ref ${paidRecord.transactionReference}` : ''}` : 'PENDING'}
        </div>
        <div className="mt-4 text-center text-xs">{r.invoiceFooter}</div>
        <div className="mt-1 text-center text-[10px] text-black/60">Powered by Krishna Dine</div>
      </div>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between"><span>{label}</span><span>{Number(value).toFixed(2)}</span></div>
  );
}
