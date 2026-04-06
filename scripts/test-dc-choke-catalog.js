/**
 * Node: findBestDCChokeCatalogRowImpl sentetik katalog testleri.
 * Kaynak: src/scripts/dc-choke-catalog-pick.js
 * Çalıştır: node scripts/test-dc-choke-catalog.js
 */
'use strict';

const assert = require('assert');
const path = require('path');
const { findBestDCChokeCatalogRowImpl } = require(path.join(__dirname, '..', 'src', 'scripts', 'dc-choke-catalog-pick.js'));

function getColumn(row, possibleNames) {
  if (!row || !possibleNames || possibleNames.length === 0) return undefined;
  for (const name of possibleNames) {
    if (Object.prototype.hasOwnProperty.call(row, name) && row[name] !== null && row[name] !== undefined) {
      return row[name];
    }
  }
  return undefined;
}

function pick(targetMh, iReq, rows, tol = 0.1) {
  return findBestDCChokeCatalogRowImpl(getColumn, targetMh, iReq, rows, tol);
}

// 1) Aynı ±0.1 mH bandında düşük I_katalog tercih edilir
{
  const rows = [
    { 'Inductance (mH)': 1.5, 'Current Rating (A)': 80, Cost: 50, 'Product Name': 'HighA' },
    { 'Inductance (mH)': 1.48, 'Current Rating (A)': 50, Cost: 200, 'Product Name': 'LowA_worseCost' },
  ];
  const { row, reason } = pick(1.5, 45, rows);
  assert.strictEqual(reason, 'ok');
  assert.strictEqual(row['Product Name'], 'LowA_worseCost');
  assert.strictEqual(Number(row['Current Rating (A)']), 50);
}

// 2) Aynı I_katalog ve aynı |ΔL| ise düşük maliyet
{
  const rows = [
    { 'Inductance (mH)': 1.52, 'Current Rating (A)': 60, Cost: 300, 'Product Name': 'Expensive' },
    { 'Inductance (mH)': 1.48, 'Current Rating (A)': 60, Cost: 100, 'Product Name': 'Cheap' },
  ];
  const { row, reason } = pick(1.5, 50, rows);
  assert.strictEqual(reason, 'ok');
  assert.strictEqual(row['Product Name'], 'Cheap');
}

// 3) I_req altındaki satırlar elenir; kalan içinden en küçük yeterli akım
{
  const rows = [
    { 'Inductance (mH)': 1.0, 'Current Rating (A)': 30, Cost: 10, 'Product Name': 'TooWeak' },
    { 'Inductance (mH)': 1.05, 'Current Rating (A)': 100, Cost: 10, 'Product Name': 'Big' },
    { 'Inductance (mH)': 1.04, 'Current Rating (A)': 55, Cost: 10, 'Product Name': 'Right' },
  ];
  const { row, reason } = pick(1.0, 50, rows);
  assert.strictEqual(reason, 'ok');
  assert.strictEqual(row['Product Name'], 'Right');
}

// 4) Boş katalog
{
  const r = pick(1.0, 10, []);
  assert.strictEqual(r.reason, 'empty');
  assert.strictEqual(r.row, null);
}

// 5) Akım yetersiz
{
  const rows = [{ 'Inductance (mH)': 2.0, 'Current Rating (A)': 5, Cost: 1, 'Product Name': 'X' }];
  const r = pick(2.0, 999, rows);
  assert.strictEqual(r.reason, 'no-current-or-cost');
}

// 6) Tolerans dışı L
{
  const rows = [{ 'Inductance (mH)': 2.0, 'Current Rating (A)': 100, Cost: 1, 'Product Name': 'Far' }];
  const r = pick(1.0, 10, rows, 0.1);
  assert.strictEqual(r.reason, 'no-tolerance');
}

// 7) Cost yoksa elenir
{
  const rows = [
    { 'Inductance (mH)': 1.5, 'Current Rating (A)': 60, 'Product Name': 'NoCost' },
    { 'Inductance (mH)': 1.5, 'Current Rating (A)': 100, Cost: 1, 'Product Name': 'HasCost' },
  ];
  const { row, reason } = pick(1.5, 50, rows);
  assert.strictEqual(reason, 'ok');
  assert.strictEqual(row['Product Name'], 'HasCost');
}

console.log('dc-choke-catalog-pick: tüm testler tamam.');
