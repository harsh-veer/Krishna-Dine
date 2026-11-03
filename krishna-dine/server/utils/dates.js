'use strict';
const { env } = require('../config/env');

// The restaurant runs on IST (no DST), so day boundaries are computed with a fixed offset.
const OFFSET_MS = () => env.timezoneOffsetMinutes * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns "YYYY-MM-DD" for the restaurant's local date of `date`. */
function localDateKey(date = new Date()) {
  return new Date(date.getTime() + OFFSET_MS()).toISOString().slice(0, 10);
}

/** Start instant (UTC Date) of the local day given by "YYYY-MM-DD". */
function startOfLocalDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - OFFSET_MS());
}

function addDays(date, n) {
  return new Date(date.getTime() + n * DAY_MS);
}

function isValidDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return false;
  const d = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

/** Inclusive start / exclusive end for a local day. */
function dayRange(key = localDateKey()) {
  const start = startOfLocalDay(key);
  return { start, end: addDays(start, 1) };
}

function monthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - OFFSET_MS());
  const end = new Date(Date.UTC(y, m, 1) - OFFSET_MS());
  return { start, end };
}

/** Mongo $dateToString timezone string such as "+05:30". */
function mongoTz() {
  const mins = env.timezoneOffsetMinutes;
  const sign = mins < 0 ? '-' : '+';
  const abs = Math.abs(mins);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

module.exports = { localDateKey, startOfLocalDay, addDays, isValidDateKey, dayRange, monthRange, mongoTz, DAY_MS };
