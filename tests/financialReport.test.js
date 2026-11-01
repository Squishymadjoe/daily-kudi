import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFinancialReport,
  copyTextToClipboard,
  getReportTransactions,
  getWhatsAppShareUrl,
  shareOrCopyReport,
} from '../src/utils/financialReport.js'

const now = new Date(2026, 10, 1, 12)
const transactions = [
  { id: 'today-income', type: 'income', amount: 1000, category: 'Salary', date: '2026-11-01' },
  { id: 'today-food', type: 'expense', amount: 250, category: 'Food & Dining', date: '2026-11-01' },
  { id: 'week-transport', type: 'expense', amount: 80, category: 'Transport', date: '2026-10-26' },
  { id: 'outside-week', type: 'expense', amount: 15, category: 'Data & Airtime', date: '2026-10-25' },
  { id: 'future-month', type: 'expense', amount: 40, category: 'Shopping', date: '2026-11-02' },
]

test('report periods include only transactions inside their local date range', () => {
  assert.deepEqual(getReportTransactions(transactions, 'today', now).map(({ id }) => id), [
    'today-income',
    'today-food',
  ])
  assert.deepEqual(getReportTransactions(transactions, 'week', now).map(({ id }) => id), [
    'today-income',
    'today-food',
    'week-transport',
  ])
  assert.deepEqual(getReportTransactions(transactions, 'month', now).map(({ id }) => id), [
    'today-income',
    'today-food',
  ])
  assert.equal(getReportTransactions(transactions, 'all', now).length, transactions.length)
})

test('report totals and spending breakdown use included saved expense categories', () => {
  const report = buildFinancialReport(transactions, 'week', now)
  assert.equal(report.totals.income, 1000)
  assert.equal(report.totals.expense, 330)
  assert.equal(report.netBalance, 670)
  assert.deepEqual(report.categories, [
    { name: 'Food & Dining', amount: 250 },
    { name: 'Transport', amount: 80 },
  ])
  assert.match(report.text, /Reporting period: This week/)
  assert.match(report.text, /Net Balance: ₦670\.00/)
  assert.doesNotMatch(report.text, /Data & Airtime|Shopping/)
  assert.match(report.text, /Generated on:/)

  const allTimeReport = buildFinancialReport(transactions, 'all', now)
  assert.deepEqual(allTimeReport.categories, [
    { name: 'Food & Dining', amount: 250 },
    { name: 'Transport', amount: 80 },
    { name: 'Shopping', amount: 40 },
    { name: 'Data & Airtime', amount: 15 },
  ])
  assert.match(allTimeReport.text, /Data & Airtime: ₦15\.00/)
})

test('empty reports contain zero totals and a clear no-expenses message', () => {
  const report = buildFinancialReport([], 'all', now)
  assert.equal(report.totals.income, 0)
  assert.equal(report.totals.expense, 0)
  assert.equal(report.netBalance, 0)
  assert.deepEqual(report.categories, [])
  assert.match(report.text, /Total Income: ₦0\.00/)
  assert.match(report.text, /No expenses recorded for this period\./)

  const noTransactionsToday = buildFinancialReport([transactions[2]], 'today', now)
  assert.equal(noTransactionsToday.totals.expense, 0)
  assert.deepEqual(noTransactionsToday.categories, [])
})

test('clipboard copies through the browser API and legacy browser fallback', async () => {
  let copiedText
  await copyTextToClipboard('Daily Kudi report', {
    navigator: { clipboard: { writeText: async (text) => { copiedText = text } } },
  })
  assert.equal(copiedText, 'Daily Kudi report')

  const textarea = { style: {}, setAttribute() {}, select() {} }
  const body = {
    appendChild(element) { assert.equal(element, textarea) },
    removeChild(element) { assert.equal(element, textarea) },
  }
  await copyTextToClipboard('Fallback report', {
    document: {
      body,
      createElement: () => textarea,
      execCommand: (command) => command === 'copy',
    },
  })
})

test('sharing uses Web Share when available and copies when it is unavailable', async () => {
  let sharePayload
  const shareResult = await shareOrCopyReport('Native report', {
    navigator: { share: async (payload) => { sharePayload = payload } },
  })
  assert.equal(shareResult, 'shared')
  assert.equal(sharePayload.text, 'Native report')

  let copiedText
  const copyResult = await shareOrCopyReport('Fallback report', {
    navigator: { clipboard: { writeText: async (text) => { copiedText = text } } },
  })
  assert.equal(copyResult, 'copied')
  assert.equal(copiedText, 'Fallback report')
})

test('WhatsApp link encodes the complete report text', () => {
  const report = 'DAILY KUDI\nTotal Income: ₦1,000.00'
  const url = new URL(getWhatsAppShareUrl(report))
  assert.equal(url.hostname, 'wa.me')
  assert.equal(url.searchParams.get('text'), report)
})
