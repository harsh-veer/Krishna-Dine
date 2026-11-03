import logoUrl from '../assets/logo.png';

// The table QR poster: an arched card in warm cream, sage and gold. One drawing is used for the PNG download,
// the print sheet and the on-screen preview, so they always match.
export const POSTER = { W: 900, H: 1800, qr: { x: 270, y: 1090, size: 360 } };

const C = {
  cream: '#F4ECDD',
  creamLight: '#FBF7EC',
  olive: '#5A5E3A',
  oliveDark: '#4A4E30',
  sage: '#8E9473',
  sagePanel: '#E5E3CF',
  gold: '#B88F4A',
  goldSoft: '#D9BE86',
  band: '#6C7150',
};

const SERIF = '"Cormorant Garamond", Georgia, serif';
const SCRIPT = '"Great Vibes", "Brush Script MT", cursive';
const SANS = 'Jost, "Plus Jakarta Sans", Arial, sans-serif';

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

/** Arch: straight sides with a semicircular top. */
function archPath(ctx, inset, bottom) {
  const left = inset;
  const right = 900 - inset;
  const r = (right - left) / 2;
  const top = inset;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top + r);
  ctx.arc(450, top + r, r, Math.PI, 0);
  ctx.lineTo(right, bottom);
  ctx.closePath();
}

function text(ctx, str, x, y, { font, color, spacing = 0, align = 'center' }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.letterSpacing = `${spacing}px`;
  // letterSpacing adds trailing space; nudge so centred text stays centred.
  ctx.fillText(str, align === 'center' ? x + spacing / 2 : x, y);
  ctx.letterSpacing = '0px';
}

/** A single leaf, tip pointing along `angle`, starting at (x, y). */
function leaf(ctx, x, y, len, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** A curved sprig of leaves growing upward; `dir` is -1 to lean left, 1 to lean right. */
function sprig(ctx, x, y, height, dir, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * 26, y - height * 0.5, x + dir * 10, y - height);
  ctx.stroke();
  const n = 7;
  for (let i = 1; i <= n; i += 1) {
    const t = i / (n + 1);
    const px = x + dir * (26 * 2 * t * (1 - t) + 10 * t * t);
    const py = y - height * t;
    const size = 46 - i * 3;
    leaf(ctx, px, py, size, -Math.PI / 2 - 0.9 - (i % 2 ? 0.3 : 0), color);
    leaf(ctx, px, py, size, -Math.PI / 2 + 0.9 + (i % 2 ? 0 : 0.3), color);
  }
  leaf(ctx, x + dir * 10, y - height, 40, -Math.PI / 2, color);
  ctx.restore();
}

function divider(ctx, cx, y, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, y);
  ctx.lineTo(cx - 24, y);
  ctx.moveTo(cx + 24, y);
  ctx.lineTo(cx + width / 2, y);
  ctx.stroke();
  leaf(ctx, cx - 4, y, 22, Math.PI + 0.35, color);
  leaf(ctx, cx + 4, y, 22, -0.35, color);
  leaf(ctx, cx, y, 18, -Math.PI / 2, color);
}

function heart(ctx, cx, cy, s, color, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
  if (stroke) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function flame(ctx, cx, cy, s, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.2, cx + s * 0.9, cy + s * 0.9, cx, cy + s);
  ctx.bezierCurveTo(cx - s * 0.9, cy + s * 0.9, cx - s * 0.9, cy - s * 0.1, cx - s * 0.2, cy - s * 0.35);
  ctx.bezierCurveTo(cx - s * 0.1, cy - s * 0.6, cx, cy - s * 0.7, cx, cy - s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function plate(ctx, cx, cy, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
  ctx.stroke();
}

function leafIcon(ctx, cx, cy, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy + s);
  ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.4, cx + s * 0.2, cy - s * 1.2, cx + s, cy - s);
  ctx.bezierCurveTo(cx + s * 1.2, cy + s * 0.2, cx - s * 0.1, cy + s * 1.1, cx - s, cy + s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s, cy + s);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.5);
  ctx.stroke();
}

export async function buildQrCard(table) {
  const { W, H } = POSTER;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  try {
    await Promise.all([
      document.fonts?.load(`700 60px ${SERIF}`),
      document.fonts?.load(`600 60px ${SERIF}`),
      document.fonts?.load(`60px ${SCRIPT}`),
      document.fonts?.load(`500 30px ${SANS}`),
    ]);
    await document.fonts?.ready;
  } catch {
    /* fall back to system fonts */
  }

  // Background and arch
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#EFE4CF');
  bg.addColorStop(1, '#E6D8BD');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  archPath(ctx, 40, H - 40);
  const inner = ctx.createLinearGradient(0, 0, 0, H);
  inner.addColorStop(0, C.creamLight);
  inner.addColorStop(1, C.cream);
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  archPath(ctx, 54, H - 54);
  ctx.strokeStyle = C.goldSoft;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Keep everything inside the arch
  ctx.save();
  archPath(ctx, 40, H - 40);
  ctx.clip();

  // Logo
  const logo = await loadImage(logoUrl);
  ctx.beginPath();
  ctx.arc(450, 175, 72, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(450, 175, 68, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, 450 - 60, 175 - 60, 120, 120);
  ctx.restore();

  text(ctx, 'KRISHNA HOTEL', 450, 300, { font: `600 44px ${SERIF}`, color: C.oliveDark, spacing: 10 });
  text(ctx, '& RESTAURANT', 450, 340, { font: `500 26px ${SANS}`, color: C.oliveDark, spacing: 9 });
  text(ctx, 'AKBARPUR', 450, 378, { font: `500 20px ${SANS}`, color: C.gold, spacing: 8 });
  heart(ctx, 450, 408, 8, C.gold);

  // Headline
  text(ctx, 'TASTE THE', 450, 500, { font: `500 46px ${SERIF}`, color: C.oliveDark, spacing: 14 });
  text(ctx, 'TRADITION', 450, 610, { font: `700 124px ${SERIF}`, color: C.olive, spacing: 4 });
  text(ctx, 'Fresh, hot and made with love.', 450, 700, { font: `76px ${SCRIPT}`, color: C.gold });
  divider(ctx, 450, 740, 360, C.sage);
  text(ctx, 'SIMPLE. FRESH. PURE VEG.', 450, 802, { font: `500 30px ${SANS}`, color: C.oliveDark, spacing: 7 });
  text(ctx, 'Order from your table, straight to our kitchen.', 450, 846, { font: `400 25px ${SANS}`, color: 'rgba(74,78,48,0.8)' });

  // Scan panel
  ctx.fillStyle = C.sagePanel;
  roundRect(ctx, 130, 890, 640, 610, 56);
  ctx.fill();
  ctx.strokeStyle = C.goldSoft;
  ctx.lineWidth = 2;
  ctx.stroke();
  // tab with leaf at the top of the panel
  ctx.beginPath();
  ctx.arc(450, 890, 34, 0, Math.PI * 2);
  ctx.fillStyle = C.creamLight;
  ctx.fill();
  ctx.strokeStyle = C.goldSoft;
  ctx.stroke();
  leafIcon(ctx, 450, 890, 13, C.sage);

  text(ctx, 'SCAN TO ORDER', 450, 950, { font: `500 32px ${SANS}`, color: C.oliveDark, spacing: 10 });
  text(ctx, 'OUR MENU', 450, 1020, { font: `700 78px ${SERIF}`, color: C.olive, spacing: 6 });
  text(ctx, `TABLE ${table.tableNumber}`, 450, 1064, { font: `600 28px ${SANS}`, color: C.gold, spacing: 8 });

  const q = POSTER.qr;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, q.x - 18, q.y - 8, q.size + 36, q.size + 36, 30);
  ctx.fill();
  const qr = await loadImage(table.qrDataUrl);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, q.x, q.y + 10, q.size, q.size);
  ctx.imageSmoothingEnabled = true;

  sprig(ctx, 190, 1480, 330, -1, C.sage);
  sprig(ctx, 710, 1480, 330, 1, C.sage);

  // Icon row
  const cols = [
    { x: 165, icon: leafIcon, a: 'FRESH', b: 'every day' },
    { x: 365, icon: flame, a: 'PURE VEG', b: 'kitchen' },
    { x: 565, icon: (c, x, y, s, col) => heart(c, x, y, s * 0.8, col, true), a: 'MADE', b: 'with love' },
    { x: 745, icon: plate, a: 'SERVED', b: 'at your table' },
  ];
  cols.forEach((col, i) => {
    col.icon(ctx, col.x, 1560, 20, C.sage);
    text(ctx, col.a, col.x, 1614, { font: `600 20px ${SANS}`, color: C.oliveDark, spacing: 3 });
    text(ctx, col.b, col.x, 1642, { font: `400 21px ${SANS}`, color: 'rgba(74,78,48,0.75)' });
    if (i > 0) {
      ctx.strokeStyle = C.goldSoft;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(col.x - 100, 1538);
      ctx.lineTo(col.x - 100, 1650);
      ctx.stroke();
    }
  });

  // Footer band
  ctx.fillStyle = C.band;
  ctx.fillRect(0, 1668, W, H - 1668);
  text(ctx, 'Good food. Happy moments.', 450, 1726, { font: `54px ${SCRIPT}`, color: '#F6EFDF' });
  ctx.restore();

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
