/* eslint-disable no-console */
/**
 * Krishna Dine end-to-end acceptance test (the 16-step workflow from the brief), in real browsers.
 *
 * Prerequisites: API on :5000, client dev server on :5173, database seeded with
 *   cd server && node seed/seed.js --reset --no-tables
 * Run:
 *   cd e2e && npm install && npx playwright install chromium && npm test
 * Env: BASE_URL (default http://localhost:5173), SHOTS (screenshot dir, default ./screenshots)
 */
const path = require('path');
const fs = require('fs');
const { chromium, devices } = require('playwright');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const SHOTS = process.env.SHOTS || path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const ADMIN = { email: 'admin@krishnadine.local', password: 'Admin@12345', next: 'Admin@12345x1' };
const KITCHEN = { email: 'kitchen@krishnadine.local', password: 'Kitchen@12345', next: 'Kitchen@12345x1' };

let step = 0;
const ok = (msg) => console.log(`  ✓ ${String(++step).padStart(2, '0')}. ${msg}`);
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function staffLogin(page, acc) {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', acc.email);
  await page.fill('#password', acc.password);
  await page.click('button[type=submit]');
  await page.waitForURL(/change-password|admin|kitchen/);
  if (page.url().includes('change-password')) {
    await page.fill('#cp', acc.password);
    await page.fill('#np', acc.next);
    await page.fill('#cf', acc.next);
    await page.click('button[type=submit]');
    await page.waitForURL(/\/(admin|kitchen)/);
  }
}

(async () => {
  const browser = await chromium.launch();
  const t0 = Date.now();
  try {
    // ---------- 1. Admin logs in
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const admin = await adminCtx.newPage();
    await staffLogin(admin, ADMIN);
    await admin.waitForSelector('text=Orders today');
    await shot(admin, '01-admin-dashboard');
    ok('Admin logs in (forced first-login password change completed)');

    // ---------- 2. Admin creates Table 01
    await admin.goto(`${BASE}/admin/tables`);
    await admin.click('[data-testid=add-table]');
    await admin.fill('[data-testid=table-number-input]', '01');
    await admin.click('[data-testid=save-table]');
    await admin.waitForSelector('[data-testid=qr-image]');
    ok('Admin creates Table 01');

    // ---------- 3. Admin generates its QR code (and downloads the PNG)
    const qrHref = await admin.getAttribute('[data-testid=qr-link]', 'href');
    assert(/\/menu\/[A-Za-z0-9_-]{24}$/.test(qrHref), `QR URL uses a random token: ${qrHref}`);
    const [download] = await Promise.all([admin.waitForEvent('download'), admin.click('[data-testid=download-qr]')]);
    const pngPath = path.join(SHOTS, 'table-01-qr.png');
    await download.saveAs(pngPath);
    await shot(admin, '03-admin-qr-modal');
    // Decode the downloaded PNG exactly like a phone camera would.
    const png = PNG.sync.read(fs.readFileSync(pngPath));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert(decoded && decoded.data === qrHref, `Downloaded QR decodes to the table URL (got ${decoded && decoded.data})`);
    ok(`Admin generates the QR code; downloaded PNG decodes to ${decoded.data}`);
    await admin.keyboard.press('Escape');

    // Kitchen opens the KDS before the order exists, to prove it arrives without a refresh.
    const kitchenCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const kitchen = await kitchenCtx.newPage();
    await staffLogin(kitchen, KITCHEN);
    await kitchen.waitForSelector('[data-testid=kds-connection]:has-text("Live")');
    await kitchen.click('[data-testid=kds-sound]'); // user gesture unlocks the new-order chime
    await kitchen.evaluate(() => {
      window.__chimes = 0;
      const orig = window.AudioContext.prototype.createOscillator;
      window.AudioContext.prototype.createOscillator = function patched() {
        window.__chimes += 1;
        return orig.call(this);
      };
    });

    // ---------- 4. Customer scans the QR code using a mobile phone
    const phoneCtx = await browser.newContext({ ...devices['iPhone 13'] });
    const phone = await phoneCtx.newPage();
    await phone.goto(decoded.data);
    await phone.waitForSelector('[data-testid=table-number]');
    await shot(phone, '04-customer-menu-opened');
    ok('Customer opens the scanned QR URL on an iPhone 13 viewport');

    // ---------- 5. Customer sees the correct table number
    const tableText = await phone.textContent('[data-testid=table-number]');
    assert(tableText.trim() === 'Table 01', `table chip shows Table 01 (got "${tableText}")`);
    ok('Customer sees "Table 01"');

    // ---------- 6. Customer browses the menu
    await phone.waitForSelector('[data-testid=menu-item]');
    const itemCount = await phone.locator('[data-testid=menu-item]').count();
    assert(itemCount >= 25, `menu shows all items (${itemCount})`);
    await phone.fill('input[type=search]', 'dosa');
    await phone.waitForFunction(() => document.querySelectorAll('[data-testid=menu-item]').length === 1);
    await phone.fill('input[type=search]', '');
    await shot(phone, '06-customer-menu');
    ok(`Customer browses ${itemCount} dishes across categories (search works)`);

    // ---------- 7. Customer adds multiple items to the cart
    await phone.click('button[aria-label="Add Paneer Tikka"]');
    await phone.click('button[aria-label="Add Masala Dosa"]');
    await phone.click('button[aria-label="Add Butter Naan"]');
    // Increase naan to 3 and dosa to 2.
    const naanCard = phone.locator('[data-testid=menu-item]', { hasText: 'Butter Naan' });
    await naanCard.getByLabel('Increase quantity').click();
    await naanCard.getByLabel('Increase quantity').click();
    const dosaCard = phone.locator('[data-testid=menu-item]', { hasText: 'Masala Dosa' });
    await dosaCard.getByLabel('Increase quantity').click();
    const cartBar = await phone.textContent('[data-testid=view-cart]');
    assert(cartBar.includes('6 items'), `cart has 6 items (${cartBar})`);
    ok('Customer adds Paneer Tikka x1, Masala Dosa x2, Butter Naan x3');

    // ---------- 8. Customer places the order
    await phone.click('[data-testid=view-cart]');
    await phone.fill('#instructions', 'Less spicy please, no onion in the dosa');
    await phone.fill('#customerName', 'Rahul Verma');
    await phone.fill('#customerPhone', '9876543210');
    await shot(phone, '08-customer-cart');
    await phone.click('[data-testid=place-order]');
    await phone.waitForSelector('[data-testid=order-confirmation]');
    const orderNumber = (await phone.textContent('[data-testid=order-number]')).trim();
    await shot(phone, '08-customer-confirmation');
    ok(`Customer places the order and sees confirmation ${orderNumber}`);

    // ---------- 9. Order is saved in MongoDB (checked through the authenticated admin API)
    const saved = await admin.evaluate(async (num) => {
      const token = JSON.parse(localStorage.getItem('kd_staff_token'));
      const r = await fetch(`/api/orders?search=${encodeURIComponent(num)}`, { headers: { Authorization: `Bearer ${token}` } });
      return (await r.json()).data[0];
    }, orderNumber);
    assert(saved && saved.orderNumber === orderNumber && saved.tableNumber === '01', 'order persisted with table 01');
    assert(saved.subtotal === 249 + 149 * 2 + 59 * 3, `server-side subtotal is correct (${saved.subtotal})`);
    ok(`Order saved: table ${saved.tableNumber}, subtotal ₹${saved.subtotal}, total ₹${saved.totalAmount} (GST ${saved.gstRate}%)`);

    // ---------- 10. Kitchen receives the order instantly
    const card = kitchen.locator(`[data-testid=kds-order][data-order-number="${orderNumber}"]`);
    await card.waitFor({ timeout: 5000 });
    const instr = await card.locator('[data-testid=kds-instructions]').textContent();
    assert(instr.includes('Less spicy'), 'special instructions shown prominently');
    const chimes = await kitchen.evaluate(() => window.__chimes);
    assert(chimes > 0, 'new-order sound played');
    await shot(kitchen, '10-kitchen-new-order');
    ok('Kitchen display shows the order without a refresh, with sound and instructions');

    // ---------- 11. Kitchen accepts
    await card.getByRole('button', { name: 'Accept order' }).click();
    await kitchen.getByRole('tab', { name: /Preparing/ }).click();
    await card.getByRole('button', { name: 'Start preparing' }).waitFor();
    await phone.waitForSelector('[data-testid=order-status-text]:has-text("accepted")');
    ok('Kitchen accepts the order (customer sees "Accepted")');

    // ---------- 12. Kitchen updates status to Preparing
    await card.getByRole('button', { name: 'Start preparing' }).click();
    await card.getByRole('button', { name: 'Mark ready' }).waitFor();
    await phone.waitForSelector('[data-testid=order-status-text]:has-text("being cooked")');
    await shot(kitchen, '12-kitchen-preparing');
    ok('Kitchen starts preparing (customer sees "Preparing")');

    // ---------- 13. Kitchen marks it Ready
    await card.getByRole('button', { name: 'Mark ready' }).click();
    await kitchen.getByRole('tab', { name: /Ready/ }).click();
    await card.getByRole('button', { name: 'Mark served' }).waitFor();
    ok('Kitchen marks the order Ready');

    // ---------- 14. Customer sees the updated status (no reload)
    await phone.waitForSelector('[data-testid=order-status-text]:has-text("Ready")');
    await shot(phone, '14-customer-ready');
    ok('Customer sees "Ready" live on their phone');

    // ---------- 15. Staff marks it Served
    await card.getByRole('button', { name: 'Mark served' }).click();
    await kitchen.getByRole('tab', { name: /Completed/ }).click();
    await card.waitFor();
    await phone.waitForSelector('[data-testid=order-status-text]:has-text("Enjoy")');
    ok('Staff marks the order Served (customer sees "Served")');

    // ---------- 16. Admin views the order and generates its bill
    await admin.goto(`${BASE}/admin/orders`);
    await admin.locator('[data-testid=order-row]', { hasText: orderNumber }).getByRole('link').click();
    await admin.waitForSelector('[data-testid=detail-order-number]');
    await admin.click('[data-testid=generate-bill]');
    await admin.waitForSelector('[data-testid=invoice-number]');
    const invoiceNo = (await admin.textContent('[data-testid=invoice-number]')).trim();
    await admin.click('[data-testid=method-cash]');
    await admin.click('[data-testid=record-payment]');
    await admin.waitForSelector('[data-testid=payment-paid]');
    await admin.click('[data-testid=close-order]');
    await admin.waitForSelector('text=Closed');
    await shot(admin, '16-admin-order-billed');
    const [invoice] = await Promise.all([adminCtx.waitForEvent('page'), admin.click('[data-testid=print-invoice]')]);
    await invoice.waitForSelector('[data-testid=invoice]');
    const invText = await invoice.textContent('[data-testid=invoice]');
    assert(invText.includes(invoiceNo) && invText.includes('Paneer Tikka') && invText.includes('PAID'), 'invoice is itemised and paid');
    await invoice.screenshot({ path: path.join(SHOTS, '16-invoice.png'), fullPage: true });
    ok(`Admin views the order, generates bill ${invoiceNo}, records cash payment, closes it and prints the invoice`);

    // Extra: the customer's final screen shows Paid.
    await phone.waitForSelector('text=Paid');
    await shot(phone, '16-customer-served-paid');

    console.log(`\nAll ${step} acceptance steps passed in ${((Date.now() - t0) / 1000).toFixed(1)}s. Screenshots: ${SHOTS}`);
  } catch (err) {
    console.error('\nACCEPTANCE TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
