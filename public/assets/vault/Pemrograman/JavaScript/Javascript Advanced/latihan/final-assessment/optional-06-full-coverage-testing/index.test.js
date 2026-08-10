import test from 'node:test';
import assert from 'node:assert';
import sum from './index.js';

test('sum positive numbers', () => {
  assert.strictEqual(sum(2, 3), 5);
});

test('sum zero values', () => {
  assert.strictEqual(sum(0, 5), 5);
});

test('should return 0 if a is negative', () => {
  assert.strictEqual(sum(-1, 5), 0);
});

test('should return 0 if b is negative', () => {
  assert.strictEqual(sum(5, -1), 0);
});

test('should return 0 if both numbers are negative', () => {
  assert.strictEqual(sum(-3, -2), 0);
});

test('should return 0 if a is not a number', () => {
  assert.strictEqual(sum('5', 3), 0);
});

test('should return 0 if b is not a number', () => {
  assert.strictEqual(sum(5, '3'), 0);
});

test('should return 0 if both parameters are not numbers', () => {
  assert.strictEqual(sum('a', 'b'), 0);
});