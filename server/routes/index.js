'use strict';
const express = require('express');
const a = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { loginLimiter, orderLimiter, publicLimiter } = require('../middleware/rateLimiters');
const { imageUpload } = require('../middleware/upload');
const v = require('../validators');

const auth = require('../controllers/authController');
const tables = require('../controllers/tableController');
const menu = require('../controllers/menuController');
const orders = require('../controllers/orderController');
const payments = require('../controllers/paymentController');
const reports = require('../controllers/reportController');
const users = require('../controllers/userController');
const settings = require('../controllers/settingsController');
const pub = require('../controllers/publicController');
const uploads = require('../controllers/uploadController');
const push = require('../controllers/pushController');

const ADMIN = authorize('admin');
const STAFF = authorize('admin', 'kitchen');

const router = express.Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

// ---- Authentication
const authRouter = express.Router();
authRouter.post('/login', loginLimiter, validate({ body: v.auth.login }), a(auth.login));
authRouter.post('/logout', a(auth.logout));
authRouter.get('/me', authenticate, a(auth.me));
authRouter.post('/change-password', authenticate, validate({ body: v.auth.changePassword }), a(auth.changePassword));
router.use('/auth', authRouter);

// ---- Public (customer) endpoints
router.get('/public/tables/:token', publicLimiter, a(pub.resolveTable));
router.get('/public/settings', publicLimiter, a(settings.publicSettings));

// ---- Tables (admin)
const tableRouter = express.Router();
tableRouter.use(authenticate);
tableRouter.get('/', STAFF, a(tables.list));
tableRouter.post('/', ADMIN, validate({ body: v.tables.create }), a(tables.create));
tableRouter.get('/qr/bulk', ADMIN, validate({ query: v.tables.bulkQuery }), a(tables.bulkQr));
tableRouter.get('/qr/bulk.zip', ADMIN, validate({ query: v.tables.bulkQuery }), a(tables.bulkQr));
tableRouter.put('/:id', ADMIN, validate({ params: v.idParams, body: v.tables.update }), a(tables.update));
tableRouter.delete('/:id', ADMIN, validate({ params: v.idParams }), a(tables.remove));
tableRouter.get('/:id/qr', ADMIN, validate({ params: v.idParams, query: v.tables.qrQuery }), a(tables.qr));
tableRouter.post('/:id/regenerate-qr', ADMIN, validate({ params: v.idParams }), a(tables.regenerateQr));
router.use('/tables', tableRouter);

// ---- Menu & categories (read is public; writes are admin; kitchen may toggle availability)
router.get('/menu', publicLimiter, optionalAuth, validate({ query: v.menu.listQuery }), a(menu.listMenu));
router.get('/push/key', authenticate, STAFF, a(push.key));
router.post('/push/subscribe', authenticate, STAFF, a(push.subscribe));
router.post('/push/unsubscribe', authenticate, STAFF, a(push.unsubscribe));
router.post('/push/test', authenticate, STAFF, a(push.test));
router.post('/menu', authenticate, ADMIN, validate({ body: v.menu.create }), a(menu.createItem));
router.put('/menu/:id', authenticate, ADMIN, validate({ params: v.idParams, body: v.menu.update }), a(menu.updateItem));
router.patch('/menu/:id/availability', authenticate, STAFF, validate({ params: v.idParams, body: v.menu.availability }), a(menu.setAvailability));
router.delete('/menu/:id', authenticate, ADMIN, validate({ params: v.idParams }), a(menu.deleteItem));

router.get('/categories', publicLimiter, optionalAuth, validate({ query: v.categories.listQuery }), a(menu.listCategories));
router.post('/categories', authenticate, ADMIN, validate({ body: v.categories.create }), a(menu.createCategory));
router.put('/categories/:id', authenticate, ADMIN, validate({ params: v.idParams, body: v.categories.update }), a(menu.updateCategory));
router.delete('/categories/:id', authenticate, ADMIN, validate({ params: v.idParams }), a(menu.deleteCategory));

// ---- Orders
router.post('/orders', orderLimiter, validate({ body: v.orders.create }), a(orders.create));
router.post('/orders/admin', authenticate, ADMIN, validate({ body: v.orders.adminCreate }), a(orders.createByStaff));
router.get('/orders', authenticate, STAFF, validate({ query: v.orders.listQuery }), a(orders.list));
router.post('/orders/bulk-delete', authenticate, ADMIN, validate({ body: v.orders.bulkDelete }), a(orders.bulkDelete));
router.post('/orders/purge-old', authenticate, ADMIN, validate({ body: v.orders.purge }), a(orders.purgeOld));
router.get('/orders/table/:tableId', authenticate, STAFF, validate({ params: v.orders.tableParams, query: v.orders.tableQuery }), a(orders.byTable));
router.get('/orders/:id', publicLimiter, optionalAuth, validate({ params: v.idParams, query: v.orders.trackQuery }), a(orders.get));
router.post('/orders/:id/feedback', publicLimiter, validate({ params: v.idParams, body: v.orders.feedback }), a(orders.feedback));
router.patch('/orders/:id', authenticate, ADMIN, validate({ params: v.idParams, body: v.orders.edit }), a(orders.edit));
router.patch('/orders/:id/status', authenticate, STAFF, validate({ params: v.idParams, body: v.orders.status }), a(orders.updateStatus));

router.delete('/orders/:id', authenticate, ADMIN, validate({ params: v.idParams }), a(orders.remove));

// ---- Billing (admin)
router.get('/orders/:id/bill', authenticate, ADMIN, validate({ params: v.idParams }), a(orders.getBill));
router.post('/orders/:id/bill', authenticate, ADMIN, validate({ params: v.idParams, body: v.orders.bill }), a(orders.generateBill));
router.post('/orders/:id/payments', authenticate, ADMIN, validate({ params: v.idParams, body: v.orders.payment }), a(orders.recordPayment));
router.post('/orders/:id/close', authenticate, ADMIN, validate({ params: v.idParams }), a(orders.close));

router.get('/payments', authenticate, ADMIN, a(payments.list));
router.get('/payments/gateway', authenticate, ADMIN, a(payments.gatewayInfo));
router.patch('/payments/:id/confirm', authenticate, ADMIN, validate({ params: v.idParams, body: v.payments.confirm }), a(payments.confirm));
router.patch('/payments/:id/fail', authenticate, ADMIN, validate({ params: v.idParams, body: v.payments.fail }), a(payments.fail));
router.post('/payments/:id/verify', authenticate, ADMIN, validate({ params: v.idParams, body: v.payments.verify }), a(payments.verify));

// ---- Reports (admin)
router.get('/reports/dashboard', authenticate, ADMIN, a(reports.dashboard));
router.get('/reports/daily', authenticate, ADMIN, validate({ query: v.reports.daily }), a(reports.daily));
router.get('/reports/weekly', authenticate, ADMIN, validate({ query: v.reports.weekly }), a(reports.weekly));
router.get('/reports/monthly', authenticate, ADMIN, validate({ query: v.reports.monthly }), a(reports.monthly));

// ---- Staff management (admin)
router.get('/users', authenticate, ADMIN, a(users.list));
router.post('/users', authenticate, ADMIN, validate({ body: v.users.create }), a(users.create));
router.put('/users/:id', authenticate, ADMIN, validate({ params: v.idParams, body: v.users.update }), a(users.update));
router.post('/users/:id/reset-password', authenticate, ADMIN, validate({ params: v.idParams, body: v.users.resetPassword }), a(users.resetPassword));
router.delete('/users/:id', authenticate, ADMIN, validate({ params: v.idParams }), a(users.remove));

// ---- Settings (admin)
router.get('/settings', authenticate, ADMIN, a(settings.get));
router.put('/settings', authenticate, ADMIN, validate({ body: v.settings.update }), a(settings.update));

// ---- Uploads
router.post('/uploads', authenticate, ADMIN, imageUpload.single('image'), a(uploads.create));
router.get('/uploads/:id', validate({ params: v.idParams }), a(uploads.get));

module.exports = router;
