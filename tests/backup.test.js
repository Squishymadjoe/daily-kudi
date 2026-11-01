import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BACKUP_APPLICATION_ID,
  BACKUP_APPLICATION_NAME,
  BACKUP_VERSION,
  createBackup,
  downloadBackup,
  parseBackup,
  validateBackup,
} from '../src/utils/backup.js'
import {
  clearTransactionsFromStorage,
  TRANSACTIONS_STORAGE_KEY,
  writeTransactionsToStorage,
} from '../src/hooks/useTransactions.js'

const exportedAt = new Date('2026-11-01T10:00:00.000Z')
const transaction = {
  id: 'tx-1',
  type: 'expense',
  amount: 125.5,
  category: 'Food & Dining',
  description: 'Lunch',
  date: '2026-11-01',
  createdAt: '2026-11-01T09:00:00.000Z',
}

test('backup export includes application metadata, timestamp, transactions, and category list', () => {
  const backup = createBackup([transaction], exportedAt)
  assert.equal(backup.applicationId, BACKUP_APPLICATION_ID)
  assert.equal(backup.applicationName, BACKUP_APPLICATION_NAME)
  assert.equal(backup.backupVersion, BACKUP_VERSION)
  assert.equal(backup.exportedAt, exportedAt.toISOString())
  assert.deepEqual(backup.transactions, [transaction])
  assert.deepEqual(backup.customCategories, [])
})

test('valid JSON backup restores the complete transaction list', () => {
  const parsed = parseBackup(JSON.stringify(createBackup([transaction], exportedAt)))
  assert.deepEqual(parsed, { transactions: [transaction], customCategories: [] })
})

test('invalid JSON and incompatible backup metadata are rejected', () => {
  assert.throws(() => parseBackup('{invalid json'), /not valid JSON/)
  assert.throws(() => validateBackup({ ...createBackup([]), applicationId: 'other-app' }), /not compatible/)
  assert.throws(() => validateBackup({ ...createBackup([]), backupVersion: BACKUP_VERSION + 1 }), /not compatible/)
})

test('malformed transactions, invalid amounts, dates, types, categories, and duplicate IDs are rejected', () => {
  const makeBackup = (changed) => ({ ...createBackup([transaction]), transactions: [changed] })
  assert.throws(() => validateBackup(makeBackup({ ...transaction, amount: 0 })), /malformed transaction/)
  assert.throws(() => validateBackup(makeBackup({ ...transaction, amount: Number.NaN })), /malformed transaction/)
  assert.throws(() => validateBackup(makeBackup({ ...transaction, type: 'transfer' })), /malformed transaction/)
  assert.throws(() => validateBackup(makeBackup({ ...transaction, date: '2026-02-30' })), /malformed transaction/)
  assert.throws(() => validateBackup(makeBackup({ ...transaction, category: '  ' })), /malformed transaction/)
  assert.throws(() => validateBackup(makeBackup({ ...transaction, category: 'Unrecognized category' })), /malformed transaction/)
  assert.throws(() => validateBackup(makeBackup({ ...transaction, category: 'Salary' })), /malformed transaction/)
  assert.throws(() => validateBackup({ ...createBackup([transaction, transaction]) }), /duplicate transaction IDs/)
})

test('invalid category metadata and unsupported custom categories are rejected', () => {
  assert.throws(() => validateBackup({ ...createBackup([]), customCategories: ['   '] }), /custom categories are invalid/)
  assert.throws(() => validateBackup({ ...createBackup([]), customCategories: ['Personal'] }), /cannot restore custom categories/)
})

test('export triggers a dated JSON download and releases the generated URL', async () => {
  let downloadedName
  let downloadContent
  let revokedUrl
  const anchor = {
    click() {
      downloadedName = this.download
    },
  }
  const browser = {
    Blob: class {
      constructor(parts, options) {
        downloadContent = { text: parts.join(''), type: options.type }
      }
    },
    URL: {
      createObjectURL: () => 'blob:daily-kudi-backup',
      revokeObjectURL: (url) => { revokedUrl = url },
    },
    document: {
      body: {
        appendChild(element) { assert.equal(element, anchor) },
        removeChild(element) { assert.equal(element, anchor) },
      },
      createElement: (tag) => {
        assert.equal(tag, 'a')
        return anchor
      },
    },
  }

  downloadBackup([transaction], browser, exportedAt)
  assert.equal(downloadedName, 'daily-kudi-backup-2026-11-01.json')
  assert.equal(downloadContent.type, 'application/json')
  assert.deepEqual(JSON.parse(downloadContent.text).transactions, [transaction])
  assert.equal(revokedUrl, 'blob:daily-kudi-backup')
})

test('failed LocalStorage replacement leaves the existing backup untouched', () => {
  const savedRecords = new Map([[TRANSACTIONS_STORAGE_KEY, JSON.stringify([transaction])]])
  const storage = {
    getItem: (key) => savedRecords.get(key),
    setItem() { throw new Error('Storage quota exceeded') },
    removeItem: (key) => savedRecords.delete(key),
  }

  assert.throws(() => writeTransactionsToStorage(storage, []), /Storage quota exceeded/)
  assert.deepEqual(JSON.parse(storage.getItem(TRANSACTIONS_STORAGE_KEY)), [transaction])
  clearTransactionsFromStorage(storage)
  assert.equal(storage.getItem(TRANSACTIONS_STORAGE_KEY), undefined)
})
