'use strict';
module.exports = {
  STAFF: 'staff',
  KITCHEN: 'role:kitchen',
  ADMIN: 'role:admin',
  WAITER: 'role:waiter',
  order: (id) => `order:${id}`,
  table: (id) => `table:${id}`,
};
