import { api, unwrap } from './api';

export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body, { skipAuth: true })),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  changePassword: (body) => unwrap(api.post('/auth/change-password', body)),
};

export const publicApi = {
  table: (token) => unwrap(api.get(`/public/tables/${encodeURIComponent(token)}`, { skipAuth: true })),
  settings: () => unwrap(api.get('/public/settings', { skipAuth: true })),
  menu: () => unwrap(api.get('/menu', { skipAuth: true })),
  placeOrder: (body) => unwrap(api.post('/orders', body, { skipAuth: true })),
  order: (id, token) => unwrap(api.get(`/orders/${id}`, { headers: { 'X-Order-Token': token }, skipAuth: true })),
};

export const menuApi = {
  list: (params) => unwrap(api.get('/menu', { params: { all: true, ...params } })),
  create: (body) => unwrap(api.post('/menu', body)),
  update: (id, body) => unwrap(api.put(`/menu/${id}`, body)),
  setAvailability: (id, isAvailable) => unwrap(api.patch(`/menu/${id}/availability`, { isAvailable })),
  remove: (id) => unwrap(api.delete(`/menu/${id}`)),
  categories: () => unwrap(api.get('/categories', { params: { all: true } })),
  createCategory: (body) => unwrap(api.post('/categories', body)),
  updateCategory: (id, body) => unwrap(api.put(`/categories/${id}`, body)),
  removeCategory: (id) => unwrap(api.delete(`/categories/${id}`)),
  upload: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return unwrap(api.post('/uploads', fd));
  },
};

export const tableApi = {
  list: () => unwrap(api.get('/tables')),
  create: (body) => unwrap(api.post('/tables', body)),
  update: (id, body) => unwrap(api.put(`/tables/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/tables/${id}`)),
  qr: (id) => unwrap(api.get(`/tables/${id}/qr`)),
  regenerate: (id) => unwrap(api.post(`/tables/${id}/regenerate-qr`)),
  bulkQr: (ids) => unwrap(api.get('/tables/qr/bulk', { params: ids?.length ? { ids: ids.join(',') } : {} })),
};

export const orderApi = {
  list: (params) => api.get('/orders', { params }).then((r) => r.data),
  get: (id) => unwrap(api.get(`/orders/${id}`)),
  byTable: (tableId, params) => unwrap(api.get(`/orders/table/${tableId}`, { params })),
  setStatus: (id, status, reason) => unwrap(api.patch(`/orders/${id}/status`, { status, reason })),
  bill: (id) => unwrap(api.get(`/orders/${id}/bill`)),
  generateBill: (id, body = {}) => unwrap(api.post(`/orders/${id}/bill`, body)),
  pay: (id, body) => unwrap(api.post(`/orders/${id}/payments`, body)),
  close: (id) => unwrap(api.post(`/orders/${id}/close`)),
  remove: (id) => unwrap(api.delete(`/orders/${id}`)),
  bulkDelete: (ids) => unwrap(api.post('/orders/bulk-delete', { ids })),
  purgeOld: (olderThanDays, dryRun = false) => unwrap(api.post('/orders/purge-old', { olderThanDays, dryRun })),
};

export const paymentApi = {
  confirm: (id, body) => unwrap(api.patch(`/payments/${id}/confirm`, body)),
  fail: (id, body = {}) => unwrap(api.patch(`/payments/${id}/fail`, body)),
  gateway: () => unwrap(api.get('/payments/gateway')),
};

export const reportApi = {
  dashboard: () => unwrap(api.get('/reports/dashboard')),
  daily: (date) => unwrap(api.get('/reports/daily', { params: { date } })),
  weekly: (end) => unwrap(api.get('/reports/weekly', { params: { end } })),
  monthly: (month) => unwrap(api.get('/reports/monthly', { params: { month } })),
};

export const userApi = {
  list: () => unwrap(api.get('/users')),
  create: (body) => unwrap(api.post('/users', body)),
  update: (id, body) => unwrap(api.put(`/users/${id}`, body)),
  resetPassword: (id, password) => unwrap(api.post(`/users/${id}/reset-password`, { password })),
  remove: (id) => unwrap(api.delete(`/users/${id}`)),
};

export const settingsApi = {
  get: () => unwrap(api.get('/settings')),
  update: (body) => unwrap(api.put('/settings', body)),
};
