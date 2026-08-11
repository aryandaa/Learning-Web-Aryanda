import test from 'node:test';
import assert from 'node:assert';
import { sum } from './index.js';

test('sum ', () => {
  const result = sum(2, 3);
  assert.strictEqual(result, 5);
});