import assert from 'node:assert/strict'
import test from 'node:test'
import { getWholePercentages } from '../src/utils/percentages.js'

test('whole category percentages sum to 100 when fractional values round up', () => {
  const percentages = getWholePercentages([37.25, 12.75])
  assert.deepEqual(percentages, [75, 25])
  assert.equal(percentages.reduce((sum, percentage) => sum + percentage, 0), 100)
})

test('percentage allocation handles empty, zero, and uneven categories', () => {
  assert.deepEqual(getWholePercentages([]), [])
  assert.deepEqual(getWholePercentages([0, 0]), [0, 0])

  const percentages = getWholePercentages([1, 1, 1])
  assert.deepEqual(percentages, [34, 33, 33])
  assert.equal(percentages.reduce((sum, percentage) => sum + percentage, 0), 100)
})
