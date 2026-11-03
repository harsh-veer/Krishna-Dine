/* Browser check for: item options, Hindi, feedback, installable app. Needs the API on :5000 and Vite on :5173 with a freshly seeded DB (seed --reset --no-tables). */
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
  const table = (await call('POST', '/tables', admin, { tableNumber: '07' })).data;
  const menu = (await call('GET', '/menu')).data;
  const item = menu.items.find((i) => i.name === 'Paneer Tikka');
  await call('PUT', `/menu/${item.id}`, admin, { sizes: [{ label: 'Half', price: 150 }, { label: 'Full', price: 249 }], addons: [{ name: 'Extra cheese', price: 30 }] });
  console.log('Setup done');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:5173/menu/${table.uniqueQrToken}`);
  await page.getByTestId('start-ordering').waitFor();

  // Hindi
  await page.getByRole('button', { name: 'हिं' }).first().click();
  ok((await page.getByTestId('start-ordering').innerText()).includes('मेन्यू देखें'), 'welcome screen switches to Hindi');
  await page.getByTestId('start-ordering').click();
  await page.getByText('पनीर टिक्का').first().waitFor();
  ok(true, 'item and category names show in Hindi');
  await page.screenshot({ path: `${SHOTS}/f1-menu-hindi.png` });
  await page.getByRole('button', { name: 'EN' }).first().click();

  // Options
  const card = page.getByTestId('menu-item').filter({ hasText: 'Paneer Tikka' });
  await card.getByRole('button', { name: /Add/ }).click();
  await page.getByTestId('opt-add').waitFor();
  await page.getByTestId('opt-add').click();
  ok(await page.getByText('Please choose a size').isVisible(), 'size is required');
  await page.getByTestId('opt-size').nth(1).check();
  await page.getByTestId('opt-addon').first().check();
  ok((await page.getByTestId('opt-add').innerText()).includes('279'), 'sheet total shows ₹279 (Full 249 + cheese 30)');
  await page.screenshot({ path: `${SHOTS}/f2-options.png` });
  await page.getByPlaceholder('E.g. less spicy, no onion').fill('extra crispy');
  await page.getByTestId('opt-add').click();
  await page.getByTestId('view-cart').click();
  await page.getByText('Full · + Extra cheese').waitFor();
  ok(true, 'cart shows the size and extra');
  await page.getByTestId('line-note').fill('cut in 4');
  await page.fill('#customerName', 'Tester');
  await page.screenshot({ path: `${SHOTS}/f3-cart.png` });
  await page.getByTestId('place-order').click();
  await page.waitForURL(/\/order\//);
  const orderId = page.url().match(/order\/([a-f0-9]+)/)[1];
  const staff = (await call('GET', `/orders/${orderId}`, admin)).data;
  ok(staff.items[0].price === 279 && /Full\) \+ Extra cheese/.test(staff.items[0].name), `order saved with price ${staff.items[0].price} and "${staff.items[0].name}"`);
  ok(/extra crispy.*cut in 4|cut in 4.*extra crispy/.test(staff.items[0].notes) || staff.items[0].notes.includes('cut in 4'), `item notes saved: "${staff.items[0].notes}"`);

  // Feedback: not shown until served
  ok((await page.getByTestId('feedback-card').count()) === 0, 'no feedback card before served');
  for (const s of ['accepted', 'preparing', 'ready', 'served']) await call('PATCH', `/orders/${orderId}/status`, admin, { status: s });
  await page.getByTestId('feedback-card').waitFor({ timeout: 8000 });
  await page.getByTestId('star-4').click();
  await page.getByTestId('feedback-comment').fill('Loved the paneer');
  await page.screenshot({ path: `${SHOTS}/f4-feedback.png` });
  await page.getByTestId('feedback-send').click();
  await page.getByTestId('feedback-done').waitFor();
  ok(true, 'customer sees thank-you after rating');
  const dash = (await call('GET', '/reports/dashboard', admin)).data;
  ok(dash.feedback.count === 1 && dash.feedback.average === 4, 'dashboard has the rating');

  // Admin sees it
  const ap = await ctx.newPage();
  await ap.setViewportSize({ width: 1300, height: 900 });
  await ap.goto('http://localhost:5173/login');
  await ap.fill('#email', 'admin@krishnadine.local'); await ap.fill('#password', 'Admin@12345x1');
  await ap.click('button[type=submit]'); await ap.waitForURL(/admin/);
  await ap.getByTestId('feedback-summary').waitFor();
  await ap.screenshot({ path: `${SHOTS}/f5-dashboard.png`, fullPage: true });
  ok(await ap.getByText('Loved the paneer').first().isVisible(), 'admin dashboard shows the comment');
  await ap.goto('http://localhost:5173/admin/menu'); await ap.waitForTimeout(800);
  await ap.getByRole('button', { name: /Edit Paneer Tikka|Edit/ }).first().click().catch(() => {});

  // Installable
  const manifest = await (await fetch('http://localhost:5173/manifest.webmanifest')).json();
  ok(manifest.icons.length === 2 && manifest.display === 'standalone', 'web app manifest is served');
  const sw = await fetch('http://localhost:5173/sw.js');
  ok(sw.ok, 'service worker file is served');
  await browser.close();
  console.log('All feature checks passed');
})().catch((e) => { console.error(e.message); process.exit(1); });
