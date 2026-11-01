import assert from 'node:assert/strict'
import test from 'node:test'
import { isWithinDateFilter } from '../src/utils/dateFilter.js'

const now = new Date(2026, 10, 4, 12)

test('history date filters use the same week and month-to-date boundaries', () => {
  assert.equal(isWithinDateFilter('2026-11-02', 'week', now), true)
  assert.equal(isWithinDateFilter('2026-10-26', 'week', now), false)
  assert.equal(isWithinDateFilter('2026-11-05', 'week', now), false)
  assert.equal(isWithinDateFilter('2026-11-01', 'month', now), true)
  assert.equal(isWithinDateFilter('2026-10-31', 'month', now), false)
  assert.equal(isWithinDateFilter('2026-11-30', 'month', now), false)
})

test('today and all-time filters keep their expected boundaries', () => {
  assert.equal(isWithinDateFilter('2026-11-04', 'today', now), true)
  assert.equal(isWithinDateFilter('2026-11-03', 'today', now), false)
  assert.equal(isWithinDateFilter('2026-11-05', 'today', now), false)
  assert.equal(isWithinDateFilter('2026-11-05', 'all', now), true)
})
