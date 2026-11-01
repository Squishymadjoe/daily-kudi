import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidTransaction } from '../src/hooks/useTransactions.js'
import {
  CUSTOM_CATEGORIES_STORAGE_KEY,
  createCustomCategory,
  deleteCustomCategory,
  loadCustomCategories,
  renameCustomCategory,
  validateCustomCategories,
} from '../src/utils/categories.js'
import {
  clearFinancialData,
  writeFinancialData,
} from '../src/utils/financialDataStorage.js'
import { TRANSACTIONS_STORAGE_KEY } from '../src/hooks/useTransactions.js'

const transaction = {
  id: 'custom-tx',
  type: 'expense',
  amount: 25,
  category: 'Pet care',
  description: 'Food',
  date: '2026-11-01',
  createdAt: '2026-11-01T10:00:00.000Z',
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
}

test('custom categories can be created with the chosen Lucide icon', () => {
  const categories = createCustomCategory([], {
    name: 'Pet care',
    type: 'expense',
    icon: 'PawPrint',
  })
  assert.deepEqual(categories, [{
    name: 'Pet care',
    type: 'expense',
    icon: 'PawPrint',
    color: '#9a8b67',
  }])
})

test('custom categories can be renamed and linked transaction labels stay in sync', () => {
  const original = { name: 'Pet care', type: 'expense', icon: 'PawPrint', color: '#9a8b67' }
  const result = renameCustomCategory([original], original, {
    name: 'Pets',
    type: 'expense',
    icon: 'HeartPulse',
  }, [transaction])
  assert.equal(result.customCategories[0].name, 'Pets')
  assert.equal(result.customCategories[0].icon, 'HeartPulse')
  assert.equal(result.transactions[0].category, 'Pets')
  assert.equal(result.transactions[0].id, transaction.id)
})

test('deleting a category preserves historical transactions by archiving it', () => {
  const category = { name: 'Pet care', type: 'expense', icon: 'PawPrint', color: '#9a8b67' }
  const result = deleteCustomCategory([category], category, [transaction])
  assert.deepEqual(result.customCategories, [{ ...category, archived: true }])
  assert.equal(result.archived, true)
  assert.deepEqual(result.transactions, [transaction])
})

test('unused custom categories can be deleted', () => {
  const category = { name: 'Pet care', type: 'expense', icon: 'PawPrint', color: '#9a8b67' }
  const result = deleteCustomCategory([category], category, [])
  assert.deepEqual(result.customCategories, [])
  assert.equal(result.archived, false)
})

test('duplicate category names are rejected case-insensitively within one type', () => {
  const categories = createCustomCategory([], {
    name: 'Pet care',
    type: 'expense',
    icon: 'PawPrint',
  })
  assert.throws(() => createCustomCategory(categories, {
    name: ' PET CARE ',
    type: 'expense',
    icon: 'Wallet',
  }), /already exists/)
  assert.doesNotThrow(() => createCustomCategory(categories, {
    name: 'Pet care',
    type: 'income',
    icon: 'Wallet',
  }))
})

test('custom categories and transactions persist locally without invalidating existing records', () => {
  const storage = createStorage()
  const categories = createCustomCategory([], {
    name: 'Pet care',
    type: 'expense',
    icon: 'PawPrint',
  })
  writeFinancialData(storage, [transaction], categories)
  assert.equal(isValidTransaction(transaction), true)
  assert.deepEqual(loadCustomCategories(storage), categories)
  assert.deepEqual(JSON.parse(storage.getItem(TRANSACTIONS_STORAGE_KEY)), [transaction])
  assert.equal(storage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY), JSON.stringify(categories))
})

test('invalid or duplicate persisted custom category data is rejected', () => {
  const storage = createStorage({
    [CUSTOM_CATEGORIES_STORAGE_KEY]: JSON.stringify([
      { name: 'Pet care', type: 'expense', icon: 'PawPrint', color: '#9a8b67' },
      { name: 'pet CARE', type: 'expense', icon: 'Wallet', color: '#bd9a45' },
    ]),
  })
  assert.throws(() => loadCustomCategories(storage), /already exists/)
  assert.throws(() => validateCustomCategories([{ name: 'Bad', type: 'expense', icon: 'Nope', color: '#123456' }]), /icon/)
})

test('failed combined category and transaction writes preserve previous data', () => {
  const storage = createStorage({
    [TRANSACTIONS_STORAGE_KEY]: JSON.stringify([transaction]),
    [CUSTOM_CATEGORIES_STORAGE_KEY]: '[]',
  })
  const originalSetItem = storage.setItem
  let writeCount = 0
  storage.setItem = (key, value) => {
    writeCount += 1
    if (writeCount === 2) throw new Error('Storage quota exceeded')
    originalSetItem(key, value)
  }
  const categories = createCustomCategory([], { name: 'Pet care', type: 'expense', icon: 'PawPrint' })
  assert.throws(() => writeFinancialData(storage, [], categories), /Storage quota exceeded/)
  assert.deepEqual(JSON.parse(storage.getItem(TRANSACTIONS_STORAGE_KEY)), [transaction])
  assert.equal(storage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY), '[]')
})

test('clearing financial data removes records and custom categories together', () => {
  const storage = createStorage({
    [TRANSACTIONS_STORAGE_KEY]: JSON.stringify([transaction]),
    [CUSTOM_CATEGORIES_STORAGE_KEY]: JSON.stringify([{ name: 'Pet care', type: 'expense', icon: 'PawPrint', color: '#9a8b67' }]),
  })
  clearFinancialData(storage)
  assert.equal(storage.getItem(TRANSACTIONS_STORAGE_KEY), null)
  assert.equal(storage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY), null)
})
