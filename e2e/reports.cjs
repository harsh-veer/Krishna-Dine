/* Browser check: Daily, Weekly and Monthly report tabs all render without errors. Needs API :5000 + Vite :5173 and an admin signed up as admin@krishnadine.local / Admin@12345x1. */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://localhost:5173/login');
  await p.fill('#email', 'admin@krishnadine.local'); await p.fill('#password', 'Admin@12345x1');
  await p.click('button[type=submit]'); await p.waitForURL(/admin/);
  await p.goto('http://localhost:5173/admin/reports');
  for (const t of ['Daily', 'Weekly', 'Monthly', 'Weekly', 'Daily']) {
    await p.getByRole('tab', { name: t }).or(p.getByRole('button', { name: t })).first().click();
    await p.getByText(/Gross sales/).waitFor({ timeout: 8000 });
    console.log('  ✓ ' + t + ' report opens');
  }
  if (errors.length) throw new Error('FAILED: page errors ' + errors.join(' | '));
  await b.close();
  console.log('Reports checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
