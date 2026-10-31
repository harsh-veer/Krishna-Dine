'use strict';
/**
 * Seeds sample data. Safe to run more than once: existing records are left untouched.
 *   npm run seed          create anything missing
 *   npm run seed:reset    wipe ALL Krishna Dine data first (refuses to run in production)
 *   add --no-tables       skip the 10 sample tables (e.g. to create Table 01 yourself)
 */
const { env } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Table, Category, MenuItem, Order, Payment, Settings, Counter, Upload } = require('../models');
const { newQrToken, buildMenuUrl } = require('../services/qrService');
const data = require('./data');

const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ACCOUNTS = [
  {
    name: process.env.SEED_ADMIN_NAME || 'Restaurant Admin',
    email: (process.env.SEED_ADMIN_EMAIL || 'admin@krishnadine.local').toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
  },
  {
    name: process.env.SEED_KITCHEN_NAME || 'Kitchen Staff',
    email: (process.env.SEED_KITCHEN_EMAIL || 'kitchen@krishnadine.local').toLowerCase(),
    password: process.env.SEED_KITCHEN_PASSWORD || 'Kitchen@12345',
    role: 'kitchen',
  },
];

async function seed({ reset = false, tables = true, log = console.log } = {}) {
  if (reset) {
    if (env.isProd && process.env.ALLOW_PRODUCTION_RESET !== 'true') throw new Error('Refusing to reset a production database');
    await Promise.all([User, Table, Category, MenuItem, Order, Payment, Settings, Counter, Upload].map((m) => m.deleteMany({})));
    log('Cleared existing data');
  }

  await Settings.get();

  for (const acc of ACCOUNTS) {
    if (await User.exists({ email: acc.email })) {
      log(`User exists: ${acc.email}`);
      continue;
    }
    const user = new User({ name: acc.name, email: acc.email, role: acc.role, mustChangePassword: true });
    await user.setPassword(acc.password);
    await user.save();
    log(`Created ${acc.role}: ${acc.email}`);
  }

  const catIds = {};
  for (const c of data.categories) {
    const slug = slugify(c.name);
    const doc = await Category.findOneAndUpdate({ slug }, { $setOnInsert: { ...c, slug, isActive: true } }, { upsert: true, new: true });
    catIds[c.name] = doc._id;
  }
  log(`Categories: ${data.categories.length}`);

  let createdItems = 0;
  for (const [cat, name, description, price, preparationTime] of data.items) {
    const exists = await MenuItem.exists({ name, category: catIds[cat], isDeleted: false });
    if (exists) continue;
    await MenuItem.create({ name, description, price, preparationTime, category: catIds[cat], isVegetarian: true, isAvailable: true, image: '' });
    createdItems += 1;
  }
  log(`Menu items created: ${createdItems} (total defined: ${data.items.length})`);

  let createdTables = 0;
  for (let i = 1; tables && i <= 10; i += 1) {
    const tableNumber = String(i).padStart(2, '0');
    if (await Table.exists({ tableNumber })) continue;
    const token = newQrToken();
    await Table.create({ tableNumber, seats: i <= 6 ? 4 : 6, uniqueQrToken: token, qrCodeUrl: buildMenuUrl(token) });
    createdTables += 1;
  }
  log(`Tables created: ${createdTables}`);
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seed({ reset: process.argv.includes('--reset'), tables: !process.argv.includes('--no-tables') });
      console.log('\nSeed complete. Local development logins (you will be asked to change the password on first login):');
      ACCOUNTS.forEach((a) => console.log(`  ${a.role.padEnd(8)} ${a.email} / ${a.password}`));
    } catch (err) {
      console.error('Seed failed:', err.message);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}

module.exports = { seed, ACCOUNTS };
