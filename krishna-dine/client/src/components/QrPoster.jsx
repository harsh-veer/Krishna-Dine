import { useEffect, useRef, useState } from 'react';
import { buildQrCard, POSTER } from '../utils/qrImage';
import { Spinner } from './ui';

/**
 * The table QR poster as an interactive card: it tilts and shines under the pointer, the QR area pulses
 * softly, and tapping the code opens the live menu for the table (the same page a customer sees).
 */
export default function QrPoster({ table, className = '', interactive = true }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const cardRef = useRef(null);
  const key = `${table.id}|${table.tableNumber}|${table.qrDataUrl?.length}`;

  useEffect(() => {
    let alive = true;
    setSrc('');
    setFailed(false);
    buildQrCard(table)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const move = (e) => {
    const el = cardRef.current;
    if (!el || !interactive || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 6}deg)`;
    el.style.setProperty('--shine-x', `${(px + 0.5) * 100}%`);
  };
  const leave = () => {
    if (cardRef.current) cardRef.current.style.transform = '';
  };

  const { qr, W, H } = POSTER;
  const area = { left: `${((qr.x - 18) / W) * 100}%`, top: `${((qr.y - 8) / H) * 100}%`, width: `${((qr.size + 36) / W) * 100}%`, height: `${((qr.size + 36) / H) * 100}%` };

  return (
    <div className={`relative mx-auto w-full ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[40px] bg-cream-100">
          {failed ? <span className="px-4 text-center text-sm text-red-600">Could not draw the poster. Use the plain code below.</span> : <Spinner />}
        </div>
      )}
      {src && (
        <div
          ref={cardRef}
          onPointerMove={move}
          onPointerLeave={leave}
          className="qr-poster relative h-full w-full overflow-hidden rounded-[28px] shadow-lift transition-transform duration-150 ease-out"
        >
          <img src={src} alt={`QR poster for table ${table.tableNumber}`} className="h-full w-full select-none" draggable="false" data-testid="qr-image" />
          {interactive && <span className="qr-shine pointer-events-none absolute inset-0" aria-hidden="true" />}
          {interactive && (
            <a
              href={table.qrCodeUrl}
              target="_blank"
              rel="noreferrer"
              style={area}
              className="qr-pulse absolute rounded-[10%]"
              aria-label={`Open the menu for table ${table.tableNumber}`}
              title="Tap to open the menu, just like a customer"
              data-testid="poster-open-menu"
            />
          )}
        </div>
      )}
    </div>
  );
}
