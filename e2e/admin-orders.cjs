/* Browser check: admin places an order for a table and edits it. Needs API :5000 + Vite :5173 on a fresh seed (--reset --no-tables). */
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
  await call('POST', '/tables', admin, { tableNumber: '05' });
  const menu = (await call('GET', '/menu')).data;
  const tikka = menu.items.find((i) => i.name === 'Paneer Tikka');
  await call('PUT', `/menu/${tikka.id}`, admin, { sizes: [{ label: 'Half', price: 150 }, { label: 'Full', price: 249 }], addons: [{ name: 'Extra cheese', price: 30 }] });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  await page.goto('http://localhost:5173/login');
  await page.fill('#email', 'admin@krishnadine.local'); await page.fill('#password', 'Admin@12345x1');
  await page.click('button[type=submit]'); await page.waitForURL(/admin/);

  await page.goto('http://localhost:5173/admin/orders');
  await page.getByTestId('new-order').click();
  await page.waitForURL(/orders\/new/);
  await page.getByTestId('editor-item').first().waitFor();
  ok(true, 'New order screen opens from Orders & billing');

  await page.getByTestId('editor-table').selectOption({ label: 'Table 05' });
  await page.getByTestId('editor-name').fill('Phone guest');
  await page.getByTestId('editor-search').fill('tikka');
  await page.getByTestId('editor-add').first().click(); // options sheet
  await page.getByTestId('picker-size').nth(1).check();
  await page.getByTestId('picker-add').click();
  await page.getByTestId('editor-search').fill('dosa');
  await page.getByTestId('editor-add').first().click();
  await page.getByTestId('editor-search').fill('naan');
  await page.getByTestId('editor-add').first().click();
  ok((await page.getByTestId('editor-line').count()) === 3, 'three lines in the order');
  await page.screenshot({ path: `${SHOTS}/a1-new-order.png` });
  await page.getByTestId('editor-save').click();
  await page.waitForURL(/\/admin\/orders\/[a-f0-9]{24}$/);
  const id = page.url().split('/').pop();
  let o = (await call('GET', `/orders/${id}`, admin)).data;
  ok(o.tableNumber === '05' && o.customerName === 'Phone guest' && o.items.length === 3, `order ${o.orderNumber} placed for Table 05 with 3 lines`);
  ok(o.items.some((i) => /Paneer Tikka \(Full\)/.test(i.name) && i.price === 249), 'sized item priced on the server');

  // Edit
  await page.getByTestId('edit-order').click();
  await page.waitForURL(/\/edit$/);
  await page.getByTestId('editor-line').first().waitFor();
  const firstQty = page.getByTestId('line-qty').first();
  await page.getByRole('button', { name: 'Increase' }).first().click();
  ok((await firstQty.innerText()) === '2', 'quantity can be raised');
  await page.getByTestId('line-remove').last().click();
  await page.getByTestId('editor-search').fill('lassi');
  await page.getByTestId('editor-add').first().click();
  await page.screenshot({ path: `${SHOTS}/a2-edit-order.png` });
  await page.getByTestId('editor-save').click();
  await page.waitForURL(/\/admin\/orders\/[a-f0-9]{24}$/);
  o = (await call('GET', `/orders/${id}`, admin)).data;
  ok(o.items.length === 3 && o.items[0].quantity === 2 && o.items[0].price === 249, `edited: ${o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`);
  ok(o.items.some((i) => /lassi/i.test(i.name)), 'new dish added');
  ok(o.statusHistory.at(-1).note === 'Order edited by staff', 'edit recorded in the timeline');
  await page.screenshot({ path: `${SHOTS}/a3-detail.png`, fullPage: true });

  // Locked once paid
  await call('POST', `/orders/${id}/payments`, admin, { paymentMethod: 'cash' });
  await page.goto(`http://localhost:5173/admin/orders/${id}/edit`);
  await page.getByText('This order cannot be edited').waitFor();
  ok(true, 'paid orders show the locked message');
  await browser.close();
  console.log('Admin ordering checks passed');
})().catch((e) => { console.error(e.message); process.exit(1); });
