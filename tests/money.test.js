import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidNairaAmount } from '../src/utils/money.js'

test('Naira amounts use kobo precision and remain valid at large finite values', () => {
  assert.equal(isValidNairaAmount(0.01), true)
  assert.equal(isValidNairaAmount(0.1), true)
  assert.equal(isValidNairaAmount(123456789.99), true)
  assert.equal(isValidNairaAmount(1e100), true)
  assert.equal(isValidNairaAmount(0.015), false)
  assert.equal(isValidNairaAmount(0.001), false)
  assert.equal(isValidNairaAmount(0), false)
  assert.equal(isValidNairaAmount(Number.POSITIVE_INFINITY), false)
  assert.equal(isValidNairaAmount(Number.NaN), false)
})
