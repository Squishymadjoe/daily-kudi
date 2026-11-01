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
import { DEFAULT_CATEGORIES } from '../src/utils/categories.js'

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

test('custom categories export and restore with transactions', () => {
  const customCategory = {
    name: 'Side income',
    type: 'income',
    icon: 'Wallet',
    color: '#bd9a45',
  }
  const customTransaction = { ...transaction, type: 'income', category: 'Side income' }
  const backup = createBackup([customTransaction], exportedAt, [customCategory])
  assert.deepEqual(parseBackup(JSON.stringify(backup)), {
    transactions: [customTransaction],
    customCategories: [customCategory],
  })
})

test('legacy version one backups restore default categories without custom category metadata', () => {
  const legacyBackup = {
    ...createBackup([transaction], exportedAt),
    backupVersion: 1,
  }
  delete legacyBackup.customCategories
  assert.deepEqual(parseBackup(JSON.stringify(legacyBackup)), {
    transactions: [transaction],
    customCategories: [],
  })
})

test('invalid category metadata and unsupported transaction categories are rejected', () => {
  assert.throws(() => validateBackup({
    ...createBackup([]),
    customCategories: [{ name: 'Side income', type: 'income', icon: 'MissingIcon', color: '#123456' }],
  }), /categories are invalid/)
  assert.throws(() => validateBackup({
    ...createBackup([]),
    customCategories: [{ name: 'salary', type: 'income', icon: 'Wallet', color: '#bd9a45' }],
  }), /already exists/)
  assert.throws(() => validateBackup({
    ...createBackup([{ ...transaction, category: 'Unknown' }]),
  }), /malformed transaction/)
  assert.equal(DEFAULT_CATEGORIES.some((category) => category.name === 'Salary'), true)
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

  const customCategory = { name: 'Side income', type: 'income', icon: 'Wallet', color: '#bd9a45' }
  downloadBackup([transaction], browser, exportedAt, [customCategory])
  assert.equal(downloadedName, 'daily-kudi-backup-2026-11-01.json')
  assert.equal(downloadContent.type, 'application/json')
  assert.deepEqual(JSON.parse(downloadContent.text).transactions, [transaction])
  assert.deepEqual(JSON.parse(downloadContent.text).customCategories, [customCategory])
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
