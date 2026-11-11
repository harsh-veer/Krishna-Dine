/* Browser check: a waiter takes, edits and manages orders and never sees sales or billing. Needs API :5000 + Vite :5173 on a fresh seed (--reset --no-tables). */
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
  await call('POST', '/tables', admin, { tableNumber: '07' });
  await call('POST', '/users', admin, { name: 'Ravi Waiter', email: 'ravi@krishnadine.local', role: 'waiter', password: 'Waiter@12345' });
  const wl = await call('POST', '/auth/login', null, { email: 'ravi@krishnadine.local', password: 'Waiter@12345' });
  await call('POST', '/auth/change-password', wl.data.token, { currentPassword: 'Waiter@12345', newPassword: 'Waiter@12345x1' });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page.goto('http://localhost:5173/login');
  await page.fill('#email', 'ravi@krishnadine.local'); await page.fill('#password', 'Waiter@12345x1');
  await page.click('button[type=submit]'); await page.waitForURL(/\/waiter$/);
  ok(true, 'Waiter signs in and lands on the waiter screen');

  await page.getByTestId('waiter-new-order').click();
  await page.waitForURL(/orders\/new/);
  await page.getByTestId('editor-table').selectOption({ label: 'Table 07' });
  await page.getByTestId('editor-search').fill('dosa');
  await page.getByTestId('editor-add').first().click();
  await page.getByTestId('editor-save').click();
  await page.waitForURL(/\/waiter\/orders\/[a-f0-9]{24}$/);
  const id = page.url().split('/').pop();
  ok(true, 'Waiter places an order for Table 07');

  await page.getByTestId('waiter-edit').click();
  await page.waitForURL(/\/edit$/);
  await page.getByTestId('editor-line').first().waitFor();
  await page.getByRole('button', { name: 'Increase' }).first().click();
  await page.getByTestId('editor-save').click();
  await page.waitForURL(/\/waiter\/orders\/[a-f0-9]{24}$/);
  const o = (await call('GET', `/orders/${id}`, admin)).data;
  ok(o.items[0].quantity === 2, 'Waiter edits the order (quantity 2)');

  await page.getByTestId('waiter-advance').click();
  await page.getByText('Accepted').first().waitFor();
  ok(true, 'Waiter accepts the order');
  const detailText = await page.locator('main').innerText();
  ok(!/₹/.test(detailText), 'order screen shows no money');
  await page.screenshot({ path: `${SHOTS}/w-order.png` });

  await page.goto('http://localhost:5173/waiter');
  await page.getByTestId('waiter-order-row').first().waitFor();
  ok(!/₹/.test(await page.locator('main').innerText()), 'order list shows no money');
  await page.screenshot({ path: `${SHOTS}/w-list.png` });

  await page.goto('http://localhost:5173/admin');
  await page.waitForURL(/\/waiter$/);
  ok(true, 'Waiter cannot open the admin dashboard');
  await page.goto('http://localhost:5173/admin/reports');
  await page.waitForURL(/\/waiter$/);
  ok(true, 'Waiter cannot open reports');
  await browser.close();
  console.log('Waiter checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
