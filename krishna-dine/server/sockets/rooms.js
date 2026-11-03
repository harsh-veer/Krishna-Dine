'use strict';
module.exports = {
  STAFF: 'staff',
  KITCHEN: 'role:kitchen',
  ADMIN: 'role:admin',
  order: (id) => `order:${id}`,
  table: (id) => `table:${id}`,
};
