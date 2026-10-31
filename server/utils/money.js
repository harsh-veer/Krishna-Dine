'use strict';
// All arithmetic is done in integer paise to avoid floating point drift.
const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => Math.round(paise) / 100;
const percentOf = (paise, percent) => Math.round((paise * Number(percent || 0)) / 100);
module.exports = { toPaise, toRupees, percentOf };
