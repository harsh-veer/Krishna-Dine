/* Browser check: the shared QR poster in admin, and a customer picking a table from it. Needs API :5000 + Vite :5173 on a fresh seed (--reset --no-tables). */
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '.';
const API = 'http://localhost:5000/api';
const ok = (c, m) => { if (!c) throw new Error('FAILED: ' + m); console.log('  ✓ ' + m); };
const call = async (method, path, token, body) => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};
(async () => {
  let r = await call('POST', '/auth/login', null, { email: 'admin@krishnadine.local', password: 'Admin@12345' });
  r = await call('POST', '/auth/change-password', r.data.token, { currentPassword: 'Admin@12345', newPassword: 'Admin@12345x1' });
  const admin = r.data.token;
  for (const n of ['01', '02', '10']) await call('POST', '/tables', admin, { tableNumber: n });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 950 } });
  await page.goto('http://localhost:5173/login');
  await page.fill('#email', 'admin@krishnadine.local'); await page.fill('#password', 'Admin@12345x1');
  await page.click('button[type=submit]'); await page.waitForURL(/admin/);
  await page.goto('http://localhost:5173/admin/tables');
  await page.getByTestId('shared-qr').click();
  await page.getByTestId('qr-image').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/shared-qr-admin.png` });
  ok(true, 'Admin opens the shared QR poster');

  const phone = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await phone.goto('http://localhost:5173/menu');
  await phone.getByTestId('table-picker').waitFor();
  ok((await phone.getByTestId('pick-table').count()) === 3, 'Customer sees the 3 tables');
  await phone.screenshot({ path: `${SHOTS}/shared-qr-picker.png` });
  await phone.locator('[data-testid=pick-table][data-table-number="10"]').click();
  await phone.waitForURL(/\/menu\/.+/);
  await phone.getByTestId('table-number').waitFor();
  ok((await phone.getByTestId('table-number').textContent()).includes('10'), 'Picking Table 10 opens the menu for Table 10');
  await browser.close();
  console.log('Shared QR checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
