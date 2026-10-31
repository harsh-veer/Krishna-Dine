'use strict';
const mongoose = require('mongoose');
const { env } = require('./env');

mongoose.set('strictQuery', true);
// User input never reaches query filters untyped: every request is validated with Zod and
// stripped of `$`/`.` keys by express-mongo-sanitize (see app.js).

async function connectDB(uri = env.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, autoIndex: true });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
