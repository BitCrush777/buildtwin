const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateDiscount, calculateTax } = require('../src/pricing');

test('calculateDiscount applies 10% discount correctly', () => {
  const result = calculateDiscount(100, 10);
  assert.equal(result, 90);
});

test('calculateDiscount applies 0% discount correctly', () => {
  const result = calculateDiscount(50, 0);
  assert.equal(result, 50);
});

test('calculateTax computes standard 8% tax', () => {
  const tax = calculateTax(100);
  assert.equal(tax, 8);
});

test('calculateTax computes custom tax rate', () => {
  const tax = calculateTax(200, 0.05);
  assert.equal(tax, 10);
});
