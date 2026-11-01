import assert from 'node:assert/strict'
import test from 'node:test'
import { TRANSACTIONS_STORAGE_KEY } from '../src/hooks/useTransactions.js'
import { CUSTOM_CATEGORIES_STORAGE_KEY } from '../src/utils/categories.js'
import {
  isOnboardingComplete,
  markOnboardingComplete,
  ONBOARDING_STORAGE_KEY,
  shouldShowOnboarding,
} from '../src/utils/onboarding.js'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem(key, value) { values.set(key, String(value)) },
  }
}

test('first-time users see onboarding and completion is saved locally', () => {
  const storage = createStorage()
  assert.equal(shouldShowOnboarding(storage, [TRANSACTIONS_STORAGE_KEY, CUSTOM_CATEGORIES_STORAGE_KEY]), true)
  markOnboardingComplete(storage)
  assert.equal(storage.getItem(ONBOARDING_STORAGE_KEY), 'true')
  assert.equal(isOnboardingComplete(storage), true)
  assert.equal(shouldShowOnboarding(storage), false)
})

test('existing transaction or category data does not trigger first-run onboarding', () => {
  for (const key of [TRANSACTIONS_STORAGE_KEY, CUSTOM_CATEGORIES_STORAGE_KEY]) {
    const storage = createStorage({ [key]: '[]' })
    assert.equal(shouldShowOnboarding(storage, [TRANSACTIONS_STORAGE_KEY, CUSTOM_CATEGORIES_STORAGE_KEY]), false)
    assert.equal(isOnboardingComplete(storage), true)
  }
})

test('skipping onboarding persists completion and prevents automatic repetition', () => {
  const storage = createStorage()
  assert.equal(shouldShowOnboarding(storage), true)
  markOnboardingComplete(storage)
  assert.equal(shouldShowOnboarding(storage), false)
})
