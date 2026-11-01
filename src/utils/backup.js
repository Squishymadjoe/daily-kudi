import { isValidTransaction } from '../hooks/useTransactions.js'

export const BACKUP_APPLICATION_ID = 'daily-kudi'
export const BACKUP_VERSION = 1
export const BACKUP_APPLICATION_NAME = 'Daily Kudi'

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createBackup(transactions, exportedAt = new Date()) {
  return {
    applicationId: BACKUP_APPLICATION_ID,
    applicationName: BACKUP_APPLICATION_NAME,
    backupVersion: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    transactions,
    customCategories: [],
  }
}

export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new Error('The backup must contain a JSON object.')
  }
  if (backup.applicationId !== BACKUP_APPLICATION_ID
    || backup.applicationName !== BACKUP_APPLICATION_NAME
    || backup.backupVersion !== BACKUP_VERSION) {
    throw new Error('This backup is not compatible with this version of Daily Kudi.')
  }
  if (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) {
    throw new Error('The backup export date is missing or invalid.')
  }
  if (!Array.isArray(backup.transactions)) {
    throw new Error('The backup transactions must be a list.')
  }

  const ids = new Set()
  for (const transaction of backup.transactions) {
    if (!isValidTransaction(transaction)) {
      throw new Error('The backup contains a malformed transaction. Check its type, amount, date, and category.')
    }
    if (ids.has(transaction.id)) {
      throw new Error('The backup contains duplicate transaction IDs.')
    }
    ids.add(transaction.id)
  }

  if (!Array.isArray(backup.customCategories)
    || backup.customCategories.some((category) => typeof category !== 'string' || !category.trim())) {
    throw new Error('The backup custom categories are invalid.')
  }
  if (new Set(backup.customCategories).size !== backup.customCategories.length) {
    throw new Error('The backup contains duplicate custom categories.')
  }
  if (backup.customCategories.length) {
    throw new Error('This app version cannot restore custom categories.')
  }

  return { transactions: backup.transactions, customCategories: [] }
}

export function parseBackup(contents) {
  let backup
  try {
    backup = JSON.parse(contents)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  return validateBackup(backup)
}

export function downloadBackup(transactions, browser = globalThis, exportedAt = new Date()) {
  const backup = createBackup(transactions, exportedAt)
  const content = JSON.stringify(backup, null, 2)
  const blob = new browser.Blob([content], { type: 'application/json' })
  const url = browser.URL.createObjectURL(blob)
  const anchor = browser.document.createElement('a')
  let appended = false
  anchor.href = url
  anchor.download = `daily-kudi-backup-${localDateKey(exportedAt)}.json`
  try {
    browser.document.body.appendChild(anchor)
    appended = true
    anchor.click()
  } finally {
    if (appended) browser.document.body.removeChild(anchor)
    browser.URL.revokeObjectURL(url)
  }
}
