const reportCurrency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const reportDate = new Intl.DateTimeFormat('en-NG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const reportPeriods = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
]

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonday(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export function getReportTransactions(transactions, period, now = new Date()) {
  if (period === 'all') return transactions

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start = today
  if (period === 'week') start = getMonday(today)
  if (period === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1)

  const startKey = localDateKey(start)
  const endKey = localDateKey(today)
  return transactions.filter((transaction) => transaction.date >= startKey && transaction.date <= endKey)
}

export function buildFinancialReport(transactions, period, generatedAt = new Date()) {
  const selectedPeriod = reportPeriods.find((item) => item.id === period) || reportPeriods[0]
  const includedTransactions = getReportTransactions(transactions, selectedPeriod.id, generatedAt)
  const totals = includedTransactions.reduce((result, transaction) => {
    result[transaction.type] += transaction.amount
    return result
  }, { income: 0, expense: 0 })
  const categoryTotals = new Map()

  includedTransactions.forEach((transaction) => {
    if (transaction.type !== 'expense') return
    const category = transaction.category.trim() || 'Uncategorized'
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + transaction.amount)
  })

  const categories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
  const text = [
    'DAILY KUDI',
    'Your Money. Your Records. Your Phone.',
    '',
    `Reporting period: ${selectedPeriod.label}`,
    '',
    `Total Income: ${reportCurrency.format(totals.income)}`,
    `Total Expenses: ${reportCurrency.format(totals.expense)}`,
    `Net Balance: ${reportCurrency.format(totals.income - totals.expense)}`,
    '',
    'SPENDING BREAKDOWN',
    ...(categories.length
      ? categories.map(({ name, amount }) => `${name}: ${reportCurrency.format(amount)}`)
      : ['No expenses recorded for this period.']),
    '',
    `Generated on: ${reportDate.format(generatedAt)}`,
  ].join('\n')

  return {
    period: selectedPeriod.id,
    periodLabel: selectedPeriod.label,
    transactions: includedTransactions,
    totals,
    netBalance: totals.income - totals.expense,
    categories,
    text,
    generatedAt,
  }
}

export async function copyTextToClipboard(text, browser = globalThis) {
  let clipboardError
  const clipboard = browser.navigator?.clipboard

  if (typeof clipboard?.writeText === 'function') {
    try {
      await clipboard.writeText(text)
      return
    } catch (error) {
      clipboardError = error
    }
  }

  const documentObject = browser.document
  if (documentObject?.body && typeof documentObject.execCommand === 'function') {
    const textarea = documentObject.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    documentObject.body.appendChild(textarea)
    textarea.select()

    try {
      if (!documentObject.execCommand('copy')) throw new Error('The browser did not copy the report.')
      return
    } finally {
      documentObject.body.removeChild(textarea)
    }
  }

  throw clipboardError || new Error('Clipboard access is unavailable in this browser.')
}

export async function shareOrCopyReport(text, browser = globalThis) {
  const share = browser.navigator?.share
  if (typeof share === 'function') {
    await share.call(browser.navigator, { title: 'Daily Kudi financial summary', text })
    return 'shared'
  }

  await copyTextToClipboard(text, browser)
  return 'copied'
}

export function getWhatsAppShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
