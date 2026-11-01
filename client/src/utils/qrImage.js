import logoUrl from '../assets/logo.png';

// Builds a print-ready PNG: brand header, the QR code, table number and a short instruction.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function buildQrCard(table) {
  const W = 900;
  const H = 1260;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }

  ctx.fillStyle = '#FBF7EE';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0B3B2E';
  ctx.fillRect(0, 0, W, 230);
  const logo = await loadImage(logoUrl);
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 50, 65, 100, 100, 24);
  ctx.fill();
  ctx.drawImage(logo, 55, 70, 90, 90);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F6EFDF';
  ctx.font = '600 72px Fraunces, Georgia, serif';
  ctx.fillText('Krishna Dine', W / 2 + 60, 120);
  ctx.fillStyle = '#D6B36A';
  ctx.font = '600 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('KRISHNA HOTEL & RESTAURANT · AKBARPUR', W / 2 + 60, 180);

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 120, 290, 660, 660, 40);
  ctx.fill();
  const qr = await loadImage(table.qrDataUrl);
  ctx.drawImage(qr, 150, 320, 600, 600);

  ctx.fillStyle = '#0B3B2E';
  ctx.font = '800 96px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(`Table ${table.tableNumber}`, W / 2, 1080);
  ctx.fillStyle = 'rgba(11,59,46,0.7)';
  ctx.font = '500 30px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Scan with your phone camera to see the menu and order', W / 2, 1150);
  ctx.font = '500 26px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(11,59,46,0.45)';
  ctx.fillText('No app needed', W / 2, 1200);

  return canvas.toDataURL('image/png');
}

export async function downloadQrCard(table) {
  const url = await buildQrCard(table);
  const a = document.createElement('a');
  a.href = url;
  a.download = `krishna-dine-table-${String(table.tableNumber).replace(/[^A-Za-z0-9_-]+/g, '-')}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
