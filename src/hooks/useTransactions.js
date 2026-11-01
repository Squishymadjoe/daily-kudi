import { useState } from 'react'

export const TRANSACTIONS_STORAGE_KEY = 'daily-kudi-transactions'
export const TRANSACTION_CATEGORIES = Object.freeze({
  income: Object.freeze(['Salary', 'Other']),
  expense: Object.freeze([
    'Food & Dining',
    'Transport',
    'Shopping',
    'Bills & utilities',
    'Health',
    'Housing',
    'Other',
  ]),
})

export function writeTransactionsToStorage(storage, transactions) {
  storage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions))
}

export function clearTransactionsFromStorage(storage) {
  storage.removeItem(TRANSACTIONS_STORAGE_KEY)
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isValidTransaction(transaction) {
  return Boolean(
    transaction
    && typeof transaction.id === 'string'
    && transaction.id.trim()
    && (transaction.type === 'income' || transaction.type === 'expense')
    && typeof transaction.amount === 'number'
    && Number.isFinite(transaction.amount)
    && transaction.amount > 0
    && typeof transaction.category === 'string'
    && TRANSACTION_CATEGORIES[transaction.type].includes(transaction.category)
    && typeof transaction.description === 'string'
    && isValidDate(transaction.date)
    && typeof transaction.createdAt === 'string'
    && Number.isFinite(Date.parse(transaction.createdAt)),
  )
}

function loadTransactions() {
  if (typeof window === 'undefined') return { transactions: [], error: null }

  try {
    const stored = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)
    if (stored === null) return { transactions: [], error: null }

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return {
        transactions: [],
        error: 'Saved transaction data is invalid and could not be loaded. Adding a transaction will replace the damaged data.',
      }
    }

    const seenIds = new Set()
    const transactions = parsed.filter((transaction) => {
      if (!isValidTransaction(transaction) || seenIds.has(transaction.id)) return false
      seenIds.add(transaction.id)
      return true
    })

    return {
      transactions,
      error: transactions.length === parsed.length
        ? null
        : 'Some saved transaction data is invalid and was skipped. Saving a change will replace the damaged entries.',
    }
  } catch (error) {
    console.error('Unable to read Daily Kudi transactions from LocalStorage.', error)
    return {
      transactions: [],
      error: 'Saved transaction data could not be read. Check your browser storage settings before adding transactions.',
    }
  }
}

export function useTransactions() {
  const [storedState] = useState(loadTransactions)
  const [transactions, setTransactions] = useState(storedState.transactions)
  const [persistenceError, setPersistenceError] = useState(storedState.error)

  function saveTransactions(nextTransactions) {
    const ids = new Set()
    const isValidList = Array.isArray(nextTransactions) && nextTransactions.every((transaction) => {
      if (!isValidTransaction(transaction) || ids.has(transaction.id)) return false
      ids.add(transaction.id)
      return true
    })

    if (!isValidList) {
      setPersistenceError('This change could not be saved because the transaction data is invalid.')
      return false
    }

    try {
      writeTransactionsToStorage(window.localStorage, nextTransactions)
      setTransactions(nextTransactions)
      setPersistenceError(null)
      return true
    } catch (error) {
      console.error('Unable to save Daily Kudi transactions to LocalStorage.', error)
      setPersistenceError('Your change could not be saved to this browser. Check available storage and try again.')
      return false
    }
  }

  function clearTransactions() {
    try {
      clearTransactionsFromStorage(window.localStorage)
      setTransactions([])
      setPersistenceError(null)
      return true
    } catch (error) {
      console.error('Unable to clear Daily Kudi transactions from LocalStorage.', error)
      setPersistenceError('Your records could not be cleared from this browser. Check your browser storage settings and try again.')
      return false
    }
  }

  return { transactions, saveTransactions, clearTransactions, persistenceError }
}
