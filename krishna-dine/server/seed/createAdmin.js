'use strict';
/**
 * Creates (or resets) an admin account. Use this to set up production instead of the sample logins.
 *   node seed/createAdmin.js --email owner@example.com --name "Owner" --password "S0me-long-password"
 */
const { connectDB, disconnectDB } = require('../config/db');
const { User } = require('../models');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

(async () => {
  const email = (arg('email') || '').toLowerCase().trim();
  const name = arg('name') || 'Administrator';
  const password = arg('password') || '';
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10) {
    console.error('Usage: node seed/createAdmin.js --email you@example.com --name "Your Name" --password "at-least-10-chars"');
    process.exit(1);
  }
  try {
    await connectDB();
    let user = await User.findOne({ email });
    if (!user) user = new User({ email, name, role: 'admin' });
    user.name = name;
    user.role = 'admin';
    user.isActive = true;
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.setPassword(password);
    await user.save();
    console.log(`Admin ready: ${email}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
})();
