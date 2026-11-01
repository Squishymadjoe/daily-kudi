import { CUSTOM_CATEGORIES_STORAGE_KEY } from './categories.js'
import { TRANSACTIONS_STORAGE_KEY } from '../hooks/useTransactions.js'

function restoreKey(storage, key, value) {
  if (value === null) storage.removeItem(key)
  else storage.setItem(key, value)
}

function updateKeys(storage, updates) {
  const previous = updates.map(([key]) => [key, storage.getItem(key)])
  try {
    for (const [key, value] of updates) restoreKey(storage, key, value)
  } catch (error) {
    const rollbackErrors = []
    for (const [key, value] of previous) {
      try {
        restoreKey(storage, key, value)
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError)
      }
    }
    if (rollbackErrors.length) {
      throw new AggregateError([error, ...rollbackErrors], 'Saving local financial data failed and could not be fully rolled back.')
    }
    throw error
  }
}

export function writeFinancialData(storage, transactions, customCategories) {
  updateKeys(storage, [
    [TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions)],
    [CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories)],
  ])
}

export function clearFinancialData(storage) {
  updateKeys(storage, [
    [TRANSACTIONS_STORAGE_KEY, null],
    [CUSTOM_CATEGORIES_STORAGE_KEY, null],
  ])
}
