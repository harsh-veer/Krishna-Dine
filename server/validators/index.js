'use strict';
const { z } = require('zod');
const { ORDER_STATUS, PAYMENT_METHODS, TABLE_STATUS, ROLES } = require('../config/constants');
const { isValidDateKey } = require('../utils/dates');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParams = z.object({ id: objectId });
const trimmed = (max) => z.string().trim().max(max);
const boolish = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
const dateKey = z.string().refine(isValidDateKey, 'Use date format YYYY-MM-DD');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain letters and numbers');
const imagePath = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^\/api\/uploads\/[a-f\d]{24}$/i.test(v) || /^https:\/\/[^\s"'<>]+$/i.test(v), 'Image must be an uploaded image or an https URL');

const auth = {
  login: z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email'), password: z.string().min(1, 'Password is required').max(200) }),
  changePassword: z
    .object({ currentPassword: z.string().min(1).max(200), newPassword: password })
    .refine((v) => v.currentPassword !== v.newPassword, { message: 'New password must be different', path: ['newPassword'] }),
};

const tables = {
  create: z.object({
    tableNumber: trimmed(20).min(1, 'Table number is required').regex(/^[A-Za-z0-9 _-]+$/, 'Use letters, numbers, spaces or dashes'),
    label: trimmed(60).optional().default(''),
    seats: z.coerce.number().int().min(1).max(50).optional().default(4),
    isActive: z.boolean().optional().default(true),
  }),
  update: z.object({
    tableNumber: trimmed(20).min(1).regex(/^[A-Za-z0-9 _-]+$/, 'Use letters, numbers, spaces or dashes').optional(),
    label: trimmed(60).optional(),
    seats: z.coerce.number().int().min(1).max(50).optional(),
    isActive: z.boolean().optional(),
    status: z.enum(TABLE_STATUS).optional(),
  }),
  qrQuery: z.object({ format: z.enum(['png', 'json']).optional().default('json'), download: boolish.optional() }),
  bulkQuery: z.object({ ids: z.string().max(5000).optional() }),
};

const categories = {
  create: z.object({
    name: trimmed(60).min(1, 'Name is required'),
    nameHi: trimmed(60).optional().default(''),
    description: trimmed(300).optional().default(''),
    image: imagePath.optional().default(''),
    displayOrder: z.coerce.number().int().min(0).max(1000).optional().default(0),
    isActive: z.boolean().optional().default(true),
  }),
  update: z.object({
    name: trimmed(60).min(1).optional(),
    nameHi: trimmed(60).optional(),
    description: trimmed(300).optional(),
    image: imagePath.optional(),
    displayOrder: z.coerce.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  }),
  listQuery: z.object({ all: boolish.optional() }),
};

const sizeOpt = z.object({ label: trimmed(30).min(1), price: z.coerce.number().min(0).max(100000) });
const addonOpt = z.object({ name: trimmed(40).min(1), price: z.coerce.number().min(0).max(10000) });
const menuItemBase = {
  nameHi: trimmed(100).optional().default(''),
  descriptionHi: trimmed(500).optional().default(''),
  sizes: z.array(sizeOpt).max(6).optional().default([]),
  addons: z.array(addonOpt).max(12).optional().default([]),
  name: trimmed(100).min(1, 'Name is required'),
  description: trimmed(500).optional().default(''),
  category: objectId,
  price: z.coerce.number().min(0, 'Price cannot be negative').max(100000),
  image: imagePath.optional().default(''),
  isVegetarian: z.boolean().optional().default(true),
  isAvailable: z.boolean().optional().default(true),
  preparationTime: z.coerce.number().int().min(0).max(240).optional().default(15),
};

const menu = {
  create: z.object(menuItemBase),
  update: z.object({
    name: menuItemBase.name.optional(),
    description: trimmed(500).optional(),
    nameHi: trimmed(100).optional(),
    descriptionHi: trimmed(500).optional(),
    sizes: z.array(sizeOpt).max(6).optional(),
    addons: z.array(addonOpt).max(12).optional(),
    category: objectId.optional(),
    price: z.coerce.number().min(0).max(100000).optional(),
    image: imagePath.optional(),
    isVegetarian: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    preparationTime: z.coerce.number().int().min(0).max(240).optional(),
  }),
  availability: z.object({ isAvailable: z.boolean() }),
  listQuery: z.object({
    all: boolish.optional(),
    category: objectId.optional(),
    search: trimmed(60).optional(),
    vegOnly: boolish.optional(),
  }),
};

const orders = {
  create: z.object({
    qrToken: z.string().trim().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Invalid QR code'),
    customerName: trimmed(60).min(1, 'Please enter your name'),
    customerPhone: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((v) => v.replace(/[\s-]/g, ''))
      .refine((v) => v === '' || /^(\+91)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number'),
    specialInstructions: trimmed(500).optional().default(''),
    idempotencyKey: z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
    items: z
      .array(z.object({ menuItemId: objectId, quantity: z.coerce.number().int().min(1).max(50), size: trimmed(30).optional().default(''), addons: z.array(trimmed(40)).max(12).optional().default([]), notes: trimmed(120).optional().default('') }))
      .min(1, 'Your cart is empty')
      .max(40, 'Too many different items in one order'),
  }),
  listQuery: z.object({
    date: dateKey.optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
    table: objectId.optional(),
    status: z.string().max(100).optional(), // comma separated
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    active: boolish.optional(),
    closed: boolish.optional(),
    search: trimmed(40).optional(),
    page: z.coerce.number().int().min(1).max(10000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  }),
  status: z
    .object({ status: z.enum(Object.values(ORDER_STATUS).filter((s) => s !== 'pending')), reason: trimmed(200).optional() })
    .refine((v) => v.status !== 'cancelled' || (v.reason && v.reason.length >= 3), { message: 'Please give a reason for cancelling (at least 3 characters)', path: ['reason'] }),
  bulkDelete: z.object({ ids: z.array(objectId).min(1, 'Select at least one order').max(200, 'Delete at most 200 orders at a time') }),
  purge: z.object({ olderThanDays: z.coerce.number().int().min(1, 'Choose at least 1 day').max(3650), dryRun: z.boolean().optional().default(false) }),
  tableParams: z.object({ tableId: objectId }),
  tableQuery: z.object({ includeClosed: boolish.optional() }),
  feedback: z.object({ rating: z.number().int().min(1).max(5), comment: trimmed(500).optional().default('') }),
  trackQuery: z.object({ token: z.string().max(100).optional() }),
  bill: z.object({ applyServiceCharge: z.boolean().optional() }),
  payment: z.object({ paymentMethod: z.enum(PAYMENT_METHODS), transactionReference: trimmed(100).optional().default(''), note: trimmed(200).optional().default('') }),
};

const payments = {
  confirm: z.object({ transactionReference: trimmed(100).min(4, 'Enter the UPI transaction / UTR reference'), note: trimmed(200).optional() }),
  fail: z.object({ note: trimmed(200).optional() }),
  verify: z.object({ paymentId: trimmed(100).min(1), signature: trimmed(200).min(1) }),
};

const reports = {
  daily: z.object({ date: dateKey.optional(), format: z.enum(['json', 'csv']).optional().default('json') }),
  weekly: z.object({ end: dateKey.optional(), format: z.enum(['json', 'csv']).optional().default('json') }),
  monthly: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use month format YYYY-MM').optional(), format: z.enum(['json', 'csv']).optional().default('json') }),
};

const users = {
  create: z.object({
    name: trimmed(80).min(1, 'Name is required'),
    email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
    role: z.enum(Object.values(ROLES)),
    password,
  }),
  update: z.object({ name: trimmed(80).min(1).optional(), role: z.enum(Object.values(ROLES)).optional(), isActive: z.boolean().optional() }),
  resetPassword: z.object({ password }),
};

const settings = {
  update: z.object({
    restaurantName: trimmed(100).min(1).optional(),
    brandName: trimmed(60).min(1).optional(),
    address: trimmed(250).optional(),
    phone: trimmed(30).optional(),
    gstin: trimmed(15)
      .optional()
      .refine((v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), 'Enter a valid 15-character GSTIN'),
    gstRate: z.coerce.number().min(0).max(28).optional(),
    serviceChargeEnabled: z.boolean().optional(),
    serviceChargeRate: z.coerce.number().min(0).max(20).optional(),
    roundTotal: z.boolean().optional(),
    invoiceFooter: trimmed(200).optional(),
    upiId: trimmed(60)
      .optional()
      .refine((v) => !v || /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(v), 'Enter a valid UPI ID like restaurant@upi'),
  }),
};

module.exports = { objectId, idParams, auth, tables, categories, menu, orders, payments, reports, users, settings };
