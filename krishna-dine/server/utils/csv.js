'use strict';

function cell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** sections: [{ title, columns: [{key,label}], rows: [] }] */
function toCsv(sections) {
  const out = [];
  sections.forEach((section, i) => {
    if (i > 0) out.push('');
    if (section.title) out.push(cell(section.title));
    out.push(section.columns.map((c) => cell(c.label)).join(','));
    section.rows.forEach((row) => out.push(section.columns.map((c) => cell(row[c.key])).join(',')));
  });
  return `﻿${out.join('\r\n')}\r\n`;
}

module.exports = { toCsv };
