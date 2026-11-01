import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileDown,
  FileUp,
  Gift,
  HeartPulse,
  Home,
  Download,
  Info,
  Landmark,
  LineChart as LineChartIcon,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  PawPrint,
  Plane,
  Plus,
  ReceiptText,
  Search,
  Share2,
  ShieldCheck,
  Settings,
  ShoppingBag,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Trash2,
  Utensils,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import packageJson from '../package.json'
import './App.css'
import HelpCentre from './components/HelpCentre'
import { useTransactions } from './hooks/useTransactions'
import { useCategories } from './hooks/useCategories'
import { isWithinDateFilter } from './utils/dateFilter'
import {
  buildFinancialReport,
  copyTextToClipboard,
  getWhatsAppShareUrl,
  shareOrCopyReport,
} from './utils/financialReport'
import { downloadBackup, parseBackup } from './utils/backup'
import { getWholePercentages } from './utils/percentages'
import { isValidNairaAmount } from './utils/money'
import {
  CATEGORY_ICONS,
  CUSTOM_CATEGORIES_STORAGE_KEY,
  DEFAULT_CATEGORIES,
  createCustomCategory,
  deleteCustomCategory,
  getAllCategories,
  renameCustomCategory,
  validateCustomCategories,
} from './utils/categories'
import { clearFinancialData, writeFinancialData } from './utils/financialDataStorage'
import { markOnboardingComplete, shouldShowOnboarding } from './utils/onboarding'
import { TRANSACTIONS_STORAGE_KEY } from './hooks/useTransactions'

const SpendingPieChart = lazy(() => import('./components/FinancialCharts').then((module) => ({
  default: module.SpendingPieChart,
})))
const AnalyticsCharts = lazy(() => import('./components/FinancialCharts').then((module) => ({
  default: module.AnalyticsCharts,
})))

const categoryIconComponents = {
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  MoreHorizontal,
  PawPrint,
  Plane,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  Utensils,
  Wallet,
  Wrench,
}

function findCategory(categoryName, type, categories) {
  return categories.find((category) => category.name === categoryName && category.type === type)
    || categories.find((category) => category.name === 'Other' && category.type === type)
    || DEFAULT_CATEGORIES.at(-1)
}

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const shortDate = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
})

const fullDate = new Intl.DateTimeFormat('en-NG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function getLocalDate() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function compareTransactions(a, b, sort) {
  if (sort === 'highest') return b.amount - a.amount || b.date.localeCompare(a.date)
  if (sort === 'lowest') return a.amount - b.amount || b.date.localeCompare(a.date)

  const dateOrder = a.date.localeCompare(b.date)
  const createdOrder = a.createdAt.localeCompare(b.createdAt)
  return sort === 'oldest' ? dateOrder || createdOrder : -dateOrder || -createdOrder
}

const analyticsPeriods = [
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'all', label: 'All time' },
]

const analyticsDateFormat = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function useEscapeToClose(onEscape) {
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onEscapeRef.current()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

function useDialogFocus() {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    const previousFocus = document.activeElement
    const getFocusableElements = () => [...dialog.querySelectorAll(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => element.getClientRects().length > 0)
    const focusableElements = getFocusableElements()
    ;(focusableElements[0] || dialog).focus()

    function keepFocusInside(event) {
      if (event.key !== 'Tab') return
      const currentElements = getFocusableElements()
      if (!currentElements.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = currentElements[0]
      const last = currentElements[currentElements.length - 1]
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', keepFocusInside)
    return () => {
      document.removeEventListener('keydown', keepFocusInside)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return dialogRef
}

function getAnalyticsRange(period, now, transactions) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start
  let end = today

  if (period === 'last7') {
    start = new Date(today)
    start.setDate(start.getDate() - 6)
  } else if (period === 'last30') {
    start = new Date(today)
    start.setDate(start.getDate() - 29)
  } else if (period === 'thisMonth') {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
  } else if (period === 'lastMonth') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    end = new Date(today.getFullYear(), today.getMonth(), 0)
  } else {
    const transactionDates = transactions.map((transaction) => parseLocalDate(transaction.date))
    start = transactionDates.length
      ? new Date(transactionDates.reduce((earliest, date) => Math.min(earliest, date.getTime()), Infinity))
      : today
    if (transactionDates.length) {
      end = new Date(transactionDates.reduce((latest, date) => Math.max(latest, date.getTime()), today.getTime()))
    }
  }

  return {
    start,
    end,
    startKey: localDateKey(start),
    endKey: localDateKey(end),
    label: period === 'all' && !transactions.length
      ? 'All time'
      : `${analyticsDateFormat.format(start)} – ${analyticsDateFormat.format(end)}`,
  }
}

function getTrendGrouping(period, start, end) {
  if (period === 'last30') return 'week'
  if (period === 'all') {
    const days = Math.ceil((end - start) / 86400000) + 1
    if (days > 120) return 'month'
    if (days > 31) return 'week'
  }
  return 'day'
}

function buildSpendingTrend(transactions, range, period) {
  if (!transactions.length) return { data: [], grouping: 'day' }
  const grouping = getTrendGrouping(period, range.start, range.end)
  const buckets = new Map()
  const current = new Date(range.start)

  if (grouping === 'month') current.setDate(1)
  while (current <= range.end) {
    let key
    let label
    if (grouping === 'month') {
      key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
      label = new Intl.DateTimeFormat('en-NG', { month: 'short', year: '2-digit' }).format(current)
      current.setMonth(current.getMonth() + 1)
    } else if (grouping === 'week') {
      key = localDateKey(current)
      const endOfWeek = new Date(current)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const visibleEnd = endOfWeek > range.end ? range.end : endOfWeek
      label = `${new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(current)}–${new Intl.DateTimeFormat('en-NG', { day: 'numeric' }).format(visibleEnd)}`
      current.setDate(current.getDate() + 7)
    } else {
      key = localDateKey(current)
      label = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(current)
      current.setDate(current.getDate() + 1)
    }
    buckets.set(key, { label, expenses: 0 })
  }

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue
    const date = parseLocalDate(transaction.date)
    let key
    if (grouping === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } else if (grouping === 'week') {
      const daysFromStart = Math.floor((date - range.start) / 86400000)
      const weekStart = new Date(range.start)
      weekStart.setDate(weekStart.getDate() + Math.floor(daysFromStart / 7) * 7)
      key = localDateKey(weekStart)
    } else {
      key = localDateKey(date)
    }
    const bucket = buckets.get(key)
    if (bucket) bucket.expenses += transaction.amount
  }

  return { data: [...buckets.values()], grouping }
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

function BalanceCard({ balance, income, expenses }) {
  const [visible, setVisible] = useState(true)
  const displayAmount = visible ? currency.format(balance) : '₦ ••••••'

  return (
    <section className="balance-card" aria-label="Account balance summary">
      <div className="balance-decoration balance-decoration-one" />
      <div className="balance-decoration balance-decoration-two" />
      <div className="balance-topline">
        <div className="balance-label">
          <span className="balance-icon"><Wallet size={17} /></span>
          <span>Total Balance</span>
        </div>
        <button
          className="icon-button balance-visibility"
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide balance' : 'Show balance'}
        >
          {visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
      <p className="balance-amount" aria-live="polite"><span key={displayAmount}>{displayAmount}</span></p>
      <p className="balance-caption">Across all your records</p>
      <div className="balance-divider" />
      <div className="balance-stats">
        <div className="balance-stat">
          <span className="stat-icon income-icon"><ArrowDownLeft size={15} /></span>
          <div>
            <p>Total Income</p>
            <strong><span key={visible ? income : 'income-hidden'}>{visible ? currency.format(income) : '₦ ••••••'}</span></strong>
          </div>
        </div>
        <span className="balance-stat-divider" />
        <div className="balance-stat">
          <span className="stat-icon expense-icon"><ArrowUpRight size={15} /></span>
          <div>
            <p>Total Expenses</p>
            <strong><span key={visible ? expenses : 'expenses-hidden'}>{visible ? currency.format(expenses) : '₦ ••••••'}</span></strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function QuickActions({ onAdd }) {
  return (
    <section className="quick-actions" aria-label="Quick actions">
      <button className="action-button income-action" onClick={() => onAdd('income')} type="button">
        <span className="action-icon"><ArrowDownLeft size={19} /></span>
        <span><strong>Add income</strong><small>Record money in</small></span>
        <ArrowRight className="action-arrow" size={17} />
      </button>
      <button className="action-button expense-action" onClick={() => onAdd('expense')} type="button">
        <span className="action-icon"><ArrowUpRight size={19} /></span>
        <span><strong>Add expense</strong><small>Record money out</small></span>
        <ArrowRight className="action-arrow" size={17} />
      </button>
    </section>
  )
}

function SpendingBreakdown({ data, totalExpenses, onMore, categories }) {
  const chartData = useMemo(() => {
    const groups = data.reduce((result, transaction) => {
      if (transaction.type !== 'expense') return result
      result[transaction.category] = (result[transaction.category] || 0) + transaction.amount
      return result
    }, {})
    return Object.entries(groups)
      .map(([name, value]) => ({
        name,
        value,
        color: findCategory(name, 'expense', categories).color,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data, categories])
  const percentages = getWholePercentages(chartData.map((category) => category.value))

  return (
    <section className="panel spending-panel" id="analytics">
      <SectionHeading
        eyebrow="Your outgoings"
        title="Spending breakdown"
        action={<button className="more-button" aria-label="More spending options" type="button" onClick={onMore}><MoreHorizontal size={20} /></button>}
      />
      {chartData.length ? (
        <div className="spending-content">
          <div className="chart-wrap">
            <Suspense fallback={<div className="chart-loading" role="status">Loading chart…</div>}>
              <SpendingPieChart data={chartData} currency={currency} />
            </Suspense>
            <div className="chart-center">
              <span>Total expenses</span>
              <strong>{currency.format(totalExpenses)}</strong>
            </div>
          </div>
          <div className="category-list">
            {chartData.map((category, index) => (
              <div className="category-row" key={category.name}>
                <span className="category-dot" style={{ backgroundColor: category.color }} />
                <span className="category-name">{category.name}</span>
                <strong>{percentages[index]}%</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-spending">
          <div className="empty-chart" aria-hidden="true"><span /><span /><span /></div>
          <strong>No spending to break down yet</strong>
          <p>Once you record an expense, your categories will show up here.</p>
        </div>
      )}
    </section>
  )
}

function RecentTransactions({ transactions, categories, onAdd, onEdit, onDelete }) {
  const [showAll, setShowAll] = useState(false)

  return (
    <section className="panel transactions-panel" id="history">
      <SectionHeading
        eyebrow="The latest"
        title="Recent transactions"
        action={transactions.length > 5 && (
          <button className="text-button" type="button" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Show less' : 'View all'} <ArrowRight size={14} />
          </button>
        )}
      />
      {transactions.length ? (
        <div className="transaction-list">
          {(showAll ? transactions : transactions.slice(0, 5)).map((transaction) => {
            const category = findCategory(transaction.category, transaction.type, categories)
            const CategoryIcon = categoryIconComponents[category.icon] || MoreHorizontal
            return (
              <article className="transaction-row" key={transaction.id}>
                <span className={`transaction-icon ${transaction.type}`}>
                  <CategoryIcon size={18} />
                </span>
                <div className="transaction-details">
                  <strong>{transaction.description || transaction.category}</strong>
                  <span>{transaction.category}<i />{shortDate.format(new Date(`${transaction.date}T12:00:00`))}</span>
                </div>
                <strong className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'income' ? '+' : '−'}{currency.format(transaction.amount)}
                </strong>
                <div className="transaction-actions">
                  <button type="button" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.description || transaction.category}`}>
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => onDelete(transaction)} aria-label={`Delete ${transaction.description || transaction.category}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-transactions">
          <span className="empty-receipt"><ReceiptText size={22} /></span>
          <div>
            <strong>Your story starts here</strong>
            <p>No transactions yet. Add your first one to get started.</p>
          </div>
          <button type="button" className="empty-add-button" onClick={() => onAdd('expense')} aria-label="Add your first transaction">
            <Plus size={18} />
          </button>
        </div>
      )}
      {!transactions.length && <div className="privacy-note"><span /> Your records stay on this device</div>}
    </section>
  )
}

function HistoryTransaction({ transaction, categories, onEdit, onDelete }) {
  const category = findCategory(transaction.category, transaction.type, categories)
  const CategoryIcon = categoryIconComponents[category.icon] || MoreHorizontal
  const date = new Date(`${transaction.date}T12:00:00`)

  return (
    <article className="history-transaction">
      <span className={`transaction-icon ${transaction.type}`} style={{ color: category.color }}>
        <CategoryIcon size={18} />
      </span>
      <div className="history-transaction-details">
        <strong>{transaction.description || transaction.category}</strong>
        <span>{transaction.category}<i />{shortDate.format(date)}</span>
      </div>
      <span className={`history-type-indicator ${transaction.type}`}>
        {transaction.type === 'income' ? 'Income' : 'Expense'}
      </span>
      <strong className={`transaction-amount ${transaction.type}`}>
        {transaction.type === 'income' ? '+' : '−'}{currency.format(transaction.amount)}
      </strong>
      <div className="transaction-actions">
        <button type="button" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.description || transaction.category}`}>
          <Pencil size={14} />
        </button>
        <button type="button" onClick={() => onDelete(transaction)} aria-label={`Delete ${transaction.description || transaction.category}`}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}

function TransactionHistory({ transactions, categories, persistenceError, onAdd, onEdit, onDelete }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [search, setSearch] = useState('')

  const categoryNames = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.category))].sort((a, b) => a.localeCompare(b)),
    [transactions],
  )

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-NG')
    return transactions
      .filter((transaction) => typeFilter === 'all' || transaction.type === typeFilter)
      .filter((transaction) => categoryFilter === 'all' || transaction.category === categoryFilter)
      .filter((transaction) => isWithinDateFilter(transaction.date, dateFilter))
      .filter((transaction) => !query
        || transaction.description.toLocaleLowerCase('en-NG').includes(query)
        || transaction.category.toLocaleLowerCase('en-NG').includes(query))
      .sort((a, b) => compareTransactions(a, b, sortOrder))
  }, [transactions, typeFilter, categoryFilter, dateFilter, search, sortOrder])

  const hasActiveFilters = typeFilter !== 'all'
    || categoryFilter !== 'all'
    || dateFilter !== 'all'
    || search.trim() !== ''

  function clearFilters() {
    setTypeFilter('all')
    setCategoryFilter('all')
    setDateFilter('all')
    setSortOrder('newest')
    setSearch('')
  }

  return (
    <main className="dashboard history-page screen-enter" key="history-screen">
      {persistenceError && <p className="storage-alert" role="alert">{persistenceError}</p>}
      <div className="history-title-row">
        <div>
          <p className="eyebrow">Every little detail</p>
          <h1>Transaction history</h1>
          <p className="history-subtitle">A clear view of where your money goes and grows.</p>
        </div>
        <button className="history-add-button" type="button" onClick={() => onAdd('expense')}>
          <Plus size={17} /> Add transaction
        </button>
      </div>

      <section className="history-card" aria-label="Transaction history">
        <div className="history-card-heading">
          <div>
            <h2>All transactions</h2>
            <span>{filteredTransactions.length} {filteredTransactions.length === 1 ? 'record' : 'records'}</span>
          </div>
        </div>

        <div className="history-filters">
          <div className="history-search">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Search descriptions and categories"
              type="search"
              placeholder="Search descriptions or categories"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}
          </div>
          <label className="history-select-wrap">
            <span className="sr-only">Filter by category</span>
            <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categoryNames.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
          <label className="history-select-wrap date-select-wrap">
            <CalendarDays size={15} aria-hidden="true" />
            <span className="sr-only">Filter by date</span>
            <select aria-label="Filter by date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
          <label className="history-select-wrap sort-select-wrap">
            <span className="sr-only">Sort transactions</span>
            <select aria-label="Sort transactions" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>

        <div className="history-type-filters" role="group" aria-label="Filter by transaction type">
          {[
            { id: 'all', label: 'All transactions' },
            { id: 'income', label: 'Income' },
            { id: 'expense', label: 'Expenses' },
          ].map((item) => (
            <button
              className={typeFilter === item.id ? 'selected' : ''}
              type="button"
              key={item.id}
              onClick={() => setTypeFilter(item.id)}
              aria-pressed={typeFilter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredTransactions.length ? (
          <div className="history-list">
            {filteredTransactions.map((transaction) => (
              <HistoryTransaction
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : transactions.length ? (
          <div className="history-empty history-no-results">
            <span className="history-empty-icon"><Search size={23} /></span>
            <h3>No matching transactions</h3>
            <p>Try changing your search or filters to find what you’re looking for.</p>
            {hasActiveFilters && <button className="history-clear-button" type="button" onClick={clearFilters}>Clear filters</button>}
          </div>
        ) : (
          <div className="history-empty">
            <span className="history-empty-icon"><ReceiptText size={24} /></span>
            <h3>Your history starts here</h3>
            <p>Once you add an income or expense, you’ll find it here.</p>
            <button className="history-add-button" type="button" onClick={() => onAdd('expense')}>
              <Plus size={17} /> Add transaction
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function AnalyticsScreen({ transactions, categories, persistenceError, onAdd, onShare }) {
  const [period, setPeriod] = useState('thisMonth')
  const [now] = useState(() => new Date())
  const selectedPeriod = analyticsPeriods.find((item) => item.id === period) || analyticsPeriods[2]
  const range = useMemo(() => getAnalyticsRange(period, now, transactions), [period, now, transactions])

  const periodTransactions = useMemo(() => transactions.filter((transaction) => (
    transaction.date >= range.startKey && transaction.date <= range.endKey
  )), [transactions, range.startKey, range.endKey])

  const totals = useMemo(() => periodTransactions.reduce((result, transaction) => {
    result[transaction.type] += transaction.amount
    return result
  }, { income: 0, expense: 0 }), [periodTransactions])

  const netSavings = totals.income - totals.expense

  const categoryData = useMemo(() => {
    const groups = new Map()
    periodTransactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return
      const name = transaction.category?.trim() || 'Uncategorized'
      groups.set(name, (groups.get(name) || 0) + transaction.amount)
    })
    return [...groups.entries()]
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totals.expense > 0 ? (amount / totals.expense) * 100 : 0,
        color: findCategory(name, 'expense', categories).color,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodTransactions, totals.expense, categories])

  const trend = useMemo(
    () => buildSpendingTrend(periodTransactions, range, period),
    [periodTransactions, range, period],
  )

  const comparisonData = [
    { name: 'Income', amount: totals.income, fill: '#4d947a' },
    { name: 'Expenses', amount: totals.expense, fill: '#c77a68' },
    { name: 'Net savings', amount: netSavings, fill: netSavings >= 0 ? '#79968a' : '#b48088' },
  ]

  const insights = useMemo(() => {
    if (!periodTransactions.length) return []
    const items = []
    if (categoryData.length) {
      const highest = categoryData[0]
      items.push({
        icon: ShoppingBag,
        title: `${highest.name} is your highest spending category`,
        detail: `${currency.format(highest.amount)} · ${highest.percentage.toFixed(1)}% of your expenses`,
      })
    }
    if (totals.income > totals.expense && totals.income > 0) {
      items.push({
        icon: TrendingUp,
        title: 'Your income exceeded your expenses',
        detail: `${currency.format(netSavings)} left after expenses for this period.`,
      })
    }

    if (period === 'thisMonth') {
      const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      const comparisonDay = Math.min(now.getDate(), previousMonthDays)
      const previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, comparisonDay)
      const previousStartKey = localDateKey(previousStart)
      const previousEndKey = localDateKey(previousEnd)
      const previousExpenses = transactions.reduce((sum, transaction) => (
        transaction.type === 'expense'
          && transaction.date >= previousStartKey
          && transaction.date <= previousEndKey
          ? sum + transaction.amount
          : sum
      ), 0)

      if (previousExpenses > 0 && totals.expense < previousExpenses) {
        const change = ((previousExpenses - totals.expense) / previousExpenses) * 100
        items.push({
          icon: TrendingDown,
          title: `You spent ${change.toFixed(0)}% less than the same point last month`,
          detail: `${currency.format(previousExpenses - totals.expense)} less than the comparable period.`,
        })
      }
    }
    return items
  }, [periodTransactions, categoryData, totals, netSavings, period, now, transactions])

  const compactCurrency = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  return (
    <main className="dashboard analytics-page screen-enter" key="analytics-screen">
      {persistenceError && <p className="storage-alert" role="alert">{persistenceError}</p>}
      <div className="analytics-title-row">
        <div>
          <p className="eyebrow">Your money, in perspective</p>
          <h1>Financial Analytics</h1>
          <p className="analytics-subtitle">Understand your spending habits.</p>
        </div>
        <div className="analytics-title-actions">
          <div className="analytics-current-period">
            <CalendarDays size={16} />
            <span>{range.label}</span>
          </div>
          <button className="share-summary-button" type="button" onClick={() => onShare(
            period === 'all' ? 'all' : period === 'thisMonth' ? 'month' : period === 'last7' ? 'week' : 'today',
          )}>
            <Share2 size={16} /> Share summary
          </button>
        </div>
      </div>

      <section className="analytics-period-panel" aria-label="Reporting period">
        <span className="analytics-control-label">Reporting period</span>
        <div className="analytics-period-options" role="group" aria-label="Select reporting period">
          {analyticsPeriods.map((item) => (
            <button
              key={item.id}
              type="button"
              className={period === item.id ? 'selected' : ''}
              aria-pressed={period === item.id}
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="analytics-metrics" aria-label="Financial metrics">
        <article className="analytics-metric-card income-metric">
          <span className="analytics-metric-icon"><ArrowDownLeft size={17} /></span>
          <span>Total income</span>
          <strong>{currency.format(totals.income)}</strong>
          <small>{selectedPeriod.label}</small>
        </article>
        <article className="analytics-metric-card expense-metric">
          <span className="analytics-metric-icon"><ArrowUpRight size={17} /></span>
          <span>Total expenses</span>
          <strong>{currency.format(totals.expense)}</strong>
          <small>{selectedPeriod.label}</small>
        </article>
        <article className="analytics-metric-card savings-metric">
          <span className="analytics-metric-icon"><Wallet size={17} /></span>
          <span>Net savings</span>
          <strong className={netSavings < 0 ? 'negative-value' : ''}>{currency.format(netSavings)}</strong>
          <small>Income minus expenses</small>
        </article>
        <article className="analytics-metric-card category-metric">
          <span className="analytics-metric-icon"><ShoppingBag size={17} /></span>
          <span>Highest spending</span>
          <strong className="metric-category-name">{categoryData[0]?.name || '—'}</strong>
          <small>{categoryData[0] ? currency.format(categoryData[0].amount) : 'No expenses recorded'}</small>
        </article>
      </section>

      {periodTransactions.length ? (
        <>
          <Suspense fallback={<div className="chart-loading analytics-loading" role="status">Loading analytics charts…</div>}>
            <AnalyticsCharts
              categoryData={categoryData}
              comparisonData={comparisonData}
              trend={trend}
              netSavings={netSavings}
              totals={totals}
              currency={currency}
              compactCurrency={compactCurrency}
            />
          </Suspense>

          {insights.length > 0 && (
            <section className="analytics-insights">
              <div className="analytics-insights-heading">
                <span className="insights-icon"><Landmark size={17} /></span>
                <div>
                  <p className="eyebrow">A closer look</p>
                  <h2>Financial insights</h2>
                </div>
              </div>
              <div className="analytics-insight-list">
                {insights.map((insight) => {
                  const InsightIcon = insight.icon
                  return (
                    <article className="analytics-insight" key={insight.title}>
                      <span><InsightIcon size={17} /></span>
                      <div><strong>{insight.title}</strong><p>{insight.detail}</p></div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="analytics-empty-state">
          <span className="analytics-empty-icon"><LineChartIcon size={26} /></span>
          <h2>No transactions for this period</h2>
          <p>Analytics will appear here after you record income or expenses for {selectedPeriod.label.toLowerCase()}.</p>
          <button type="button" className="history-add-button" onClick={() => onAdd('expense')}>
            <Plus size={17} /> Add transaction
          </button>
        </section>
      )}
    </main>
  )
}

function ShareSummaryDialog({ transactions, initialPeriod, onClose }) {
  const dialogRef = useDialogFocus()
  const [period, setPeriod] = useState(initialPeriod)
  const [feedback, setFeedback] = useState('')
  const [generatedAt] = useState(() => new Date())
  const report = useMemo(
    () => buildFinancialReport(transactions, period, generatedAt),
    [transactions, period, generatedAt],
  )
  const whatsappUrl = getWhatsAppShareUrl(report.text)

  async function handleShare() {
    setFeedback('')
    try {
      const result = await shareOrCopyReport(report.text)
      setFeedback(result === 'shared' ? 'Choose an app to share your summary.' : 'Summary copied to your clipboard.')
    } catch (error) {
      if (error?.name === 'AbortError') return
      console.error('Unable to share the Daily Kudi financial summary.', error)
      setFeedback('The summary could not be shared. Try copying it or using WhatsApp.')
    }
  }

  async function handleCopy() {
    setFeedback('')
    try {
      await copyTextToClipboard(report.text)
      setFeedback('Summary copied to your clipboard.')
    } catch (error) {
      console.error('Unable to copy the Daily Kudi financial summary.', error)
      setFeedback('The summary could not be copied. Try sharing it or using WhatsApp.')
    }
  }

  useEscapeToClose(onClose)

  return (
    <div className="dialog-backdrop share-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="transaction-dialog share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" tabIndex={-1}>
        <div className="dialog-heading">
          <div>
            <span className="dialog-icon settings"><Share2 size={20} /></span>
            <div>
              <p className="eyebrow">Ready when you are</p>
              <h2 id="share-dialog-title">Share summary</h2>
            </div>
          </div>
          <button className="icon-button close-dialog" type="button" onClick={onClose} aria-label="Close share summary"><X size={19} /></button>
        </div>

        <div className="share-period-options" role="group" aria-label="Choose summary period">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'This month' },
            { id: 'all', label: 'All time' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={period === item.id ? 'selected' : ''}
              aria-pressed={period === item.id}
              onClick={() => {
                setPeriod(item.id)
                setFeedback('')
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="share-report-preview" aria-label="Financial summary preview">
          <pre>{report.text}</pre>
        </div>
        <p className="share-privacy-note"><Smartphone size={14} /> Your summary is prepared on this device. Nothing is sent until you choose a destination.</p>
        {feedback && <p className="share-feedback" role="status">{feedback}</p>}
        <div className="share-actions">
          <button className="share-primary-action" type="button" onClick={handleShare}>
            <Share2 size={16} /> Share summary
          </button>
          <button className="share-copy-action" type="button" onClick={handleCopy}>
            <Copy size={16} /> Copy
          </button>
          <a className="share-whatsapp-action" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </section>
    </div>
  )
}

function BottomNavigation({ onAdd, active, onNavigate }) {
  const items = [
    { label: 'Home', icon: Home, target: 'home' },
    { label: 'Analytics', icon: Landmark, target: 'analytics' },
    { label: 'Add', icon: Plus, target: null },
    { label: 'History', icon: ReceiptText, target: 'history' },
    { label: 'Settings', icon: Settings, target: 'settings' },
  ]

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ label, icon: Icon, target }) => label === 'Add' ? (
        <button className="nav-item add-nav-item" key={label} type="button" onClick={() => onAdd('expense')} aria-label="Add transaction">
          <span className="add-nav-icon"><Icon size={22} strokeWidth={2.2} /></span>
          <span>Add</span>
        </button>
      ) : (
        <button
          className={`nav-item ${active === label ? 'active' : ''}`}
          key={label}
          type="button"
          onClick={() => onNavigate(label, target)}
          aria-current={active === label ? 'page' : undefined}
        >
          <Icon size={19} strokeWidth={active === label ? 2.2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function TransactionDialog({ type, transaction, categories, onClose, onSave }) {
  const dialogRef = useDialogFocus()
  const [transactionType, setTransactionType] = useState(transaction?.type || type)
  const [category, setCategory] = useState(transaction?.category || (type === 'income' ? 'Salary' : 'Food & Dining'))
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [date, setDate] = useState(() => transaction?.date || getLocalDate())
  const [validationError, setValidationError] = useState('')
  const options = categories.filter((item) => item.type === transactionType && !item.archived)

  function changeType(event) {
    const nextType = event.target.value
    setTransactionType(nextType)
    const nextCategories = categories.filter((item) => item.type === nextType && !item.archived)
    if (!nextCategories.some((item) => item.name === category)) setCategory(nextCategories[0]?.name || '')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || !transactionType || !category.trim() || !date) {
      setValidationError('Enter an amount greater than zero and choose a type, category, and date.')
      return
    }
    if (!isValidNairaAmount(value)) {
      setValidationError('Enter an amount with no more than two decimal places (kobo).')
      return
    }

    const saved = onSave({
      id: transaction?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      type: transactionType,
      amount: value,
      category,
      description: description.trim(),
      date,
      createdAt: transaction?.createdAt || new Date().toISOString(),
    })
    if (!saved) setValidationError('This transaction could not be saved. Please try again.')
  }

  useEscapeToClose(onClose)

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="transaction-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1}>
        <div className="dialog-heading">
          <div>
            <span className={`dialog-icon ${transactionType}`}>{transactionType === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span>
            <div>
              <p className="eyebrow">A little more clarity</p>
              <h2 id="dialog-title">{transaction ? 'Edit transaction' : `Add ${type}`}</h2>
            </div>
          </div>
          <button className="icon-button close-dialog" type="button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="transaction-type">Type</label>
          <div className="select-wrap">
            <select id="transaction-type" value={transactionType} onChange={changeType} required>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
          <label className="form-label" htmlFor="transaction-amount">Amount</label>
          <div className="amount-input-wrap"><span>₦</span><input id="transaction-amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus /></div>
          <label className="form-label" htmlFor="transaction-category">Category</label>
          <div className="select-wrap">
            <select id="transaction-category" value={category} onChange={(event) => setCategory(event.target.value)} required>
              {options.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              {transaction && categories
                .filter((item) => item.type === transactionType && item.archived && item.name === category)
                .map((item) => <option key={item.name} value={item.name}>{item.name} (historical)</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
          <label className="form-label" htmlFor="transaction-description">Description <span>Optional</span></label>
          <input className="text-input" id="transaction-description" type="text" maxLength={60} placeholder="What was it for?" value={description} onChange={(event) => setDescription(event.target.value)} />
          <label className="form-label" htmlFor="transaction-date">Date</label>
          <input className="text-input date-input" id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          {validationError && <p className="form-error" role="alert">{validationError}</p>}
          <button className={`save-transaction ${transactionType}`} type="submit"><Check size={17} /> {transaction ? 'Save changes' : `Save ${type}`}</button>
          <p className="local-record-note"><span /> Saved on this device</p>
        </form>
      </section>
    </div>
  )
}

function SettingsDialog({
  transactions,
  customCategories,
  categories,
  categoryPersistenceError,
  onClose,
  onRestore,
  onClear,
  onSaveCategories,
  onShowIntroduction,
  isInstalled,
  canInstall,
  onInstall,
  installHelpOpen,
  onToggleInstallHelp,
  installInstructions,
}) {
  const dialogRef = useDialogFocus()
  const fileInputRef = useRef(null)
  const [feedback, setFeedback] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [pendingBackup, setPendingBackup] = useState(null)
  const [categoryForm, setCategoryForm] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState('expense')
  const [categoryIcon, setCategoryIcon] = useState('MoreHorizontal')
  const [categoryFormError, setCategoryFormError] = useState('')
  const [settingsPage, setSettingsPage] = useState(null)

  function handleExport() {
    try {
      downloadBackup(transactions, undefined, undefined, customCategories)
      setFeedback({ type: 'success', message: 'Your backup has been downloaded to this device.' })
    } catch (error) {
      console.error('Unable to export the Daily Kudi backup.', error)
      setFeedback({ type: 'error', message: 'The backup could not be downloaded. Check your browser download settings and try again.' })
    }
  }

  async function handleBackupSelection(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const backup = parseBackup(await file.text())
      setPendingBackup(backup)
      setConfirmation('restore')
      setFeedback(null)
    } catch (error) {
      setPendingBackup(null)
      setFeedback({ type: 'error', message: error.message || 'This backup could not be read.' })
    }
  }

  function cancelConfirmation() {
    setConfirmation(null)
    setPendingBackup(null)
  }

  useEscapeToClose(() => {
    if (confirmation) cancelConfirmation()
    else if (settingsPage) setSettingsPage(null)
    else onClose()
  })

  function confirmRestore() {
    if (!pendingBackup) return
    if (onRestore(pendingBackup.transactions, pendingBackup.customCategories)) {
      setFeedback({ type: 'success', message: `${pendingBackup.transactions.length} ${pendingBackup.transactions.length === 1 ? 'transaction and category list were' : 'transactions and category list were'} restored successfully.` })
      cancelConfirmation()
    } else {
      setFeedback({ type: 'error', message: 'The backup could not be saved. Your existing records have not been replaced.' })
    }
  }

  function confirmClear() {
    if (onClear()) {
      setFeedback({ type: 'success', message: 'All locally stored financial records have been cleared.' })
      cancelConfirmation()
    } else {
      setFeedback({ type: 'error', message: 'Your records could not be cleared. No changes were made.' })
      setConfirmation(null)
    }
  }

  function startCategoryForm(type = 'expense', category = null) {
    setCategoryForm(category ? { original: category } : { original: null })
    setCategoryName(category?.name || '')
    setCategoryType(category?.type || type)
    setCategoryIcon(category?.icon || 'MoreHorizontal')
    setCategoryFormError('')
  }

  function saveCategory(event) {
    event.preventDefault()
    const draft = { name: categoryName.trim(), type: categoryType, icon: categoryIcon }
    try {
      let nextCategories
      let nextTransactions = transactions
      if (categoryForm.original) {
        const result = renameCustomCategory(customCategories, categoryForm.original, draft, transactions)
        nextCategories = result.customCategories
        nextTransactions = result.transactions
      } else {
        nextCategories = createCustomCategory(customCategories, draft)
      }
      if (!onSaveCategories(nextTransactions, nextCategories)) {
        setCategoryFormError('This category could not be saved. Your existing records have not been changed.')
        return
      }
      setFeedback({
        type: 'success',
        message: categoryForm.original ? 'Category updated.' : 'Category added.',
      })
      setCategoryForm(null)
      setCategoryFormError('')
    } catch (error) {
      setCategoryFormError(error.message || 'Check the category details and try again.')
    }
  }

  function removeCategory(category) {
    const inUse = transactions.some((transaction) => (
      transaction.type === category.type && transaction.category === category.name
    ))
    const message = inUse
      ? `"${category.name}" is used by saved transactions. Remove it from new entries and keep its historical label?`
      : `Delete the "${category.name}" category?`
    if (!window.confirm(message)) return

    try {
      const result = deleteCustomCategory(customCategories, category, transactions)
      if (!onSaveCategories(transactions, result.customCategories)) {
        setFeedback({ type: 'error', message: 'The category could not be removed. No data was changed.' })
        return
      }
      setFeedback({
        type: 'success',
        message: result.archived
          ? `"${category.name}" is archived. Its transaction history is preserved.`
          : `"${category.name}" was deleted.`,
      })
      if (categoryForm?.original?.name === category.name && categoryForm.original.type === category.type) {
        setCategoryForm(null)
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'The category could not be removed.' })
    }
  }

  return (
    <div className="dialog-backdrop settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="transaction-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1}>
        <div className="dialog-heading">
          <div>
            <span className="dialog-icon settings"><Settings size={20} /></span>
            <div>
              <p className="eyebrow">{settingsPage ? 'Daily Kudi' : 'Your preferences'}</p>
              <h2 id="settings-title">{settingsPage === 'privacy' ? 'Privacy policy' : settingsPage === 'about' ? 'About Daily Kudi' : settingsPage === 'help' ? 'Help Centre' : 'Settings'}</h2>
            </div>
          </div>
          <button className="icon-button close-dialog" type="button" onClick={onClose} aria-label="Close settings"><X size={19} /></button>
        </div>

        {confirmation ? (
          <div className="settings-confirmation" role="alertdialog" aria-labelledby="settings-confirm-title">
            <span className={`settings-confirm-icon ${confirmation === 'clear' ? 'danger' : ''}`}>
              {confirmation === 'clear' ? <Trash2 size={20} /> : <FileUp size={20} />}
            </span>
            <h3 id="settings-confirm-title">{confirmation === 'clear' ? 'Clear all data?' : 'Restore this backup?'}</h3>
            <p>
              {confirmation === 'clear'
                ? 'This permanently removes transactions and custom categories saved by Daily Kudi in this browser. If you have no backup, clearing app or browser storage, losing this device, or some uninstall actions may make your records impossible to recover. Download a backup first if you may need these records.'
                : `Restoring replaces all ${transactions.length} current ${transactions.length === 1 ? 'transaction' : 'transactions'} and custom categories with the validated backup. Your current data stays unchanged if you cancel or validation fails.`}
            </p>
            <div className="settings-confirm-actions">
              <button type="button" className="settings-secondary-action" onClick={cancelConfirmation}>Cancel</button>
              <button
                type="button"
                className={`settings-destructive-action ${confirmation === 'restore' ? 'restore-action' : ''}`}
                onClick={confirmation === 'clear' ? confirmClear : confirmRestore}
              >
                {confirmation === 'clear' ? 'Clear all data' : 'Restore backup'}
              </button>
            </div>
          </div>
        ) : settingsPage === 'help' ? (
          <HelpCentre onBack={() => setSettingsPage(null)} />
        ) : settingsPage === 'privacy' ? (
          <div className="settings-content information-page">
            <button type="button" className="information-back" onClick={() => setSettingsPage(null)}>
              <ArrowLeft size={15} /> Back to Settings
            </button>
            <p className="information-intro">This policy describes how the Daily Kudi app handles information when you use it.</p>
            <section className="settings-section policy-section">
              <h3>What Daily Kudi does</h3>
              <p>Daily Kudi helps you record income and expenses, review balances and spending, manage categories, and create local backups.</p>
            </section>
            <section className="settings-section policy-section">
              <h3>Information you enter</h3>
              <p>Transactions may include the type, amount, category, description, date, and an app-generated record identifier and creation time. Custom categories include a name, transaction type, and selected icon and color.</p>
            </section>
            <section className="settings-section policy-section">
              <h3>Local storage and accounts</h3>
              <p>Daily Kudi does not require registration or an account. Transaction and custom category records are saved in this browser’s LocalStorage on this device. The app does not automatically upload financial records to a Daily Kudi server or cloud account, and does not provide cloud synchronisation.</p>
              <p>The service worker caches application files for offline use, not private transaction records. Your local records are not a synced or guaranteed archival copy: browser storage can be cleared, removed, unavailable, or lost with the device or browser profile.</p>
            </section>
            <section className="settings-section policy-section">
              <h3>Backups and sharing</h3>
              <p>When you choose Export backup, Daily Kudi creates a JSON file on your device containing your transactions and custom categories. Restoring reads a file you select, validates it, and replaces local records and categories only after you confirm.</p>
              <p>Backup files can contain sensitive financial details. Keep them somewhere private and secure; anyone who obtains an unprotected copy may be able to read it. Exported files are not deleted when you clear app data.</p>
              <p>If you choose to share a financial summary, your browser’s share sheet or a WhatsApp link can send the report text to a destination you select. This is an optional action and sends information outside the app; review the summary and destination before sharing.</p>
            </section>
            <section className="settings-section policy-section">
              <h3>Deletion and uninstalling</h3>
              <p>Use Settings → Clear all data to remove Daily Kudi’s locally stored transactions and custom categories. This cannot remove JSON backups you previously downloaded or data you separately shared.</p>
              <p>Clearing this site’s browser storage removes local records. Uninstalling an installed PWA may leave or remove its browser storage depending on the browser and operating system. Back up records before clearing storage, uninstalling, changing browser profiles, or replacing a device.</p>
            </section>
            <section className="settings-section policy-section">
              <h3>Hosting and technical information</h3>
              <p>The app is hosted on Netlify. Like other hosting providers, Netlify may process technical request information, such as IP address, browser details, and request time, to deliver and operate the site. This is separate from the app’s LocalStorage financial records; the app’s normal static-file requests do not include transaction contents. Netlify’s own privacy information governs its handling of hosting data.</p>
            </section>
            <section className="settings-section policy-section">
              <h3>Questions</h3>
              <p>No developer email or postal contact is published in this application. If a support channel was provided with the copy of Daily Kudi you use, please use that channel for privacy questions.</p>
            </section>
            <p className="policy-updated">Policy reviewed 1 November 2026.</p>
          </div>
        ) : settingsPage === 'about' ? (
          <div className="settings-content information-page about-page">
            <button type="button" className="information-back" onClick={() => setSettingsPage(null)}>
              <ArrowLeft size={15} /> Back to Settings
            </button>
            <section className="about-brand-card">
              <img src="/daily-kudi-logo.png" alt="Daily Kudi logo" />
              <h3>Daily Kudi</h3>
              <p className="about-tagline">Your offline expense tracker for Nigeria.</p>
              <p>Record income and expenses, understand your spending, and keep your financial records on your device. Daily Kudi works offline after its app files have loaded.</p>
              <span className="about-version">Version {packageJson.version}</span>
            </section>
            <button className="settings-action-row" type="button" onClick={() => setSettingsPage('privacy')}>
              <span className="settings-action-icon"><ShieldCheck size={17} /></span>
              <span><strong>Privacy policy</strong><small>How information is stored and handled</small></span>
              <ArrowRight className="settings-action-arrow" size={16} />
            </button>
            <p className="about-contact-note">No developer contact details are currently provided in the app.</p>
          </div>
        ) : (
          <div className="settings-content">
            <section className="settings-section category-management-section">
              <div className="settings-section-heading">
                <span><Wallet size={16} /></span>
                <div><h3>Transaction categories</h3><p>Keep income and spending organized your way</p></div>
              </div>
              {categoryPersistenceError && <p className="settings-category-error" role="alert">{categoryPersistenceError}</p>}
              {['income', 'expense'].map((type) => (
                <div className="managed-category-group" key={type}>
                  <div className="managed-category-heading">
                    <strong>{type === 'income' ? 'Income categories' : 'Expense categories'}</strong>
                    <button type="button" onClick={() => startCategoryForm(type)} disabled={Boolean(categoryPersistenceError)}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <div className="managed-category-list">
                    {categories.filter((category) => category.type === type).map((category) => {
                      const Icon = categoryIconComponents[category.icon] || MoreHorizontal
                      return (
                        <div className="managed-category-row" key={`${category.type}:${category.name}`}>
                          <span className="managed-category-icon" style={{ color: category.color }}><Icon size={16} /></span>
                          <span className="managed-category-name">
                            <strong>{category.name}</strong>
                            {category.archived
                              ? <small>Kept for transaction history</small>
                              : category.isDefault && <small>Default category</small>}
                          </span>
                          {!category.isDefault && !category.archived && (
                            <span className="managed-category-actions">
                              <button type="button" aria-label={`Rename ${category.name}`} onClick={() => startCategoryForm(type, category)}><Pencil size={14} /></button>
                              <button type="button" aria-label={`Delete ${category.name}`} onClick={() => removeCategory(category)}><Trash2 size={14} /></button>
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {categoryForm && (
                <form className="category-editor" onSubmit={saveCategory}>
                  <label className="form-label" htmlFor="custom-category-name">Category name</label>
                  <input
                    className="text-input"
                    id="custom-category-name"
                    type="text"
                    maxLength={32}
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    required
                    autoFocus
                  />
                  <label className="form-label" htmlFor="custom-category-type">Type</label>
                  <div className="select-wrap">
                    <select id="custom-category-type" value={categoryType} onChange={(event) => setCategoryType(event.target.value)} disabled={Boolean(categoryForm.original)}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </div>
                  <label className="form-label" htmlFor="custom-category-icon">Icon</label>
                  <div className="select-wrap">
                    <select id="custom-category-icon" value={categoryIcon} onChange={(event) => setCategoryIcon(event.target.value)}>
                      {CATEGORY_ICONS.map((icon) => <option key={icon.id} value={icon.id}>{icon.label}</option>)}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </div>
                  {categoryFormError && <p className="form-error" role="alert">{categoryFormError}</p>}
                  <div className="category-editor-actions">
                    <button type="button" className="settings-secondary-action" onClick={() => setCategoryForm(null)}>Cancel</button>
                    <button type="submit" className="settings-destructive-action restore-action">
                      <Check size={15} /> {categoryForm.original ? 'Save changes' : 'Add category'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="settings-section">
              <div className="settings-section-heading">
                <span><Database size={16} /></span>
                <div><h3>Data management</h3><p>{transactions.length} saved {transactions.length === 1 ? 'transaction' : 'transactions'}</p></div>
              </div>
              <p className="settings-section-copy backup-safety-note">JSON backups contain transaction details and custom categories. Keep downloaded files private. Restore validates the file and asks before replacing local records.</p>
              <div className="settings-action-list">
                <button className="settings-action-row" type="button" onClick={handleExport}>
                  <span className="settings-action-icon"><FileDown size={17} /></span>
                  <span><strong>Export backup</strong><small>Download your records as a JSON file</small></span>
                  <FileDown className="settings-action-arrow" size={16} />
                </button>
                <button className="settings-action-row" type="button" onClick={() => fileInputRef.current?.click()}>
                  <span className="settings-action-icon"><FileUp size={17} /></span>
                  <span><strong>Restore backup</strong><small>Review and confirm before replacing local records and categories</small></span>
                  <FileUp className="settings-action-arrow" size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  className="settings-file-input"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleBackupSelection}
                  aria-label="Choose a Daily Kudi backup file"
                />
              </div>
            </section>

            <section className="settings-section install-section">
              <div className="settings-section-heading">
                <span><Download size={16} /></span>
                <div>
                  <h3>Install Daily Kudi</h3>
                  <p>{isInstalled ? 'Already installed on this device' : 'Use Daily Kudi like an app, even offline'}</p>
                </div>
              </div>
              {!isInstalled && (
                <>
                  {canInstall && (
                    <button className="install-settings-button" type="button" onClick={onInstall}>
                      <Download size={15} /> Install Daily Kudi
                    </button>
                  )}
                  {!canInstall && (
                    <button className="install-help-toggle" type="button" onClick={onToggleInstallHelp}>
                      {installHelpOpen ? 'Hide installation instructions' : 'How to install'}
                    </button>
                  )}
                  {installHelpOpen && (
                    <p className="settings-section-copy install-instructions">{installInstructions}</p>
                  )}
                </>
              )}
            </section>

            <section className="settings-section">
              <div className="settings-section-heading">
                <span><Info size={16} /></span>
                <div><h3>Getting started</h3><p>Revisit the Daily Kudi introduction</p></div>
              </div>
              <button className="install-help-toggle" type="button" onClick={onShowIntroduction}>View introduction again</button>
            </section>

            <section className="settings-section">
              <div className="settings-section-heading">
                <span><ShieldCheck size={16} /></span>
                <div><h3>Privacy summary</h3><p>Your records stay under your control</p></div>
              </div>
              <ul className="privacy-summary-list">
                <li>No account required</li>
                <li>Financial records stored locally in this browser</li>
                <li>No automatic cloud synchronisation</li>
                <li>Back up and restore only when you choose</li>
                <li>You control deletion of local records</li>
              </ul>
              <button className="install-help-toggle" type="button" onClick={() => setSettingsPage('privacy')}>Read privacy policy</button>
            </section>

            <section className="settings-section app-information">
              <div className="settings-section-heading">
                <span><Wallet size={16} /></span>
                <div><h3>About Daily Kudi</h3><p>Version {packageJson.version}</p></div>
              </div>
              <button className="install-help-toggle" type="button" onClick={() => setSettingsPage('about')}>About Daily Kudi</button>
            </section>

            <section className="settings-section help-settings-section">
              <div className="settings-section-heading">
                <span><BookOpen size={16} /></span>
                <div><h3>Help Centre</h3><p>Guides, answers, and troubleshooting</p></div>
              </div>
              <button className="install-help-toggle" type="button" onClick={() => setSettingsPage('help')}>Browse help topics</button>
            </section>

            <section className="settings-section clear-data-section">
              <div className="settings-section-heading">
                <span><Trash2 size={16} /></span>
                <div><h3>Clear all data</h3><p>Permanently remove local financial records and categories</p></div>
              </div>
              <p className="clear-data-warning">Without a backup, clearing browser storage or losing this device may permanently remove your records.</p>
              <button className="clear-data-button" type="button" onClick={() => setConfirmation('clear')}>
                <Trash2 size={15} /> Clear all data
              </button>
            </section>

            {feedback && <p className={`settings-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
            <button type="button" className="save-transaction settings-done" onClick={onClose}>Done</button>
          </div>
        )}

        {confirmation && feedback && <p className={`settings-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      </section>
    </div>
  )
}

function OnboardingDialog({ step, onStepChange, onFinish, storageError }) {
  const dialogRef = useDialogFocus()
  const steps = [
    {
      icon: Wallet,
      eyebrow: 'Welcome to Daily Kudi',
      title: 'A calmer way to track your money',
      copy: 'Keep a clear, private record of the money that comes in and goes out, right on your device.',
    },
    {
      icon: ArrowDownLeft,
      eyebrow: 'Record as you go',
      title: 'Add income and expenses in seconds',
      copy: 'Choose Add income or Add expense, enter the amount, pick a category, and save. You can edit or remove a record later.',
    },
    {
      icon: LineChartIcon,
      eyebrow: 'See the bigger picture',
      title: 'Your dashboard and analytics',
      copy: 'Your dashboard shows your balance and recent spending. Analytics helps you explore income, expenses, categories, and trends over time.',
    },
    {
      icon: ShieldCheck,
      eyebrow: 'Private, on your device',
      title: 'Your records stay yours',
      copy: 'Transactions are stored in this browser on this device. Export a backup from Settings and restore it whenever you need to move or protect your records.',
    },
  ]
  const current = steps[step]
  const StepIcon = current.icon
  const isLastStep = step === steps.length - 1

  useEscapeToClose(onFinish)

  return (
    <div className="dialog-backdrop onboarding-backdrop">
      <section ref={dialogRef} className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" tabIndex={-1}>
        <button className="onboarding-skip" type="button" onClick={onFinish}>Skip introduction</button>
        <img className="onboarding-logo" src="/daily-kudi-logo.png" alt="Daily Kudi" />
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => (
            <span className={index === step ? 'active' : index < step ? 'complete' : ''} key={item.eyebrow} />
          ))}
        </div>
        <span className="onboarding-step-icon"><StepIcon size={24} /></span>
        <p className="eyebrow">{current.eyebrow}</p>
        <h1 id="onboarding-title">{current.title}</h1>
        <p className="onboarding-copy">{current.copy}</p>
        {storageError && <p className="settings-feedback error" role="alert">{storageError}</p>}
        <div className="onboarding-actions">
          {step > 0 && <button className="settings-secondary-action" type="button" onClick={() => onStepChange(step - 1)}>Back</button>}
          <button
            className="settings-destructive-action restore-action"
            type="button"
            onClick={() => isLastStep ? onFinish() : onStepChange(step + 1)}
          >
            {isLastStep ? 'Get Started' : 'Continue'} <ArrowRight size={16} />
          </button>
        </div>
        <p className="onboarding-step-count">{step + 1} of {steps.length}</p>
      </section>
    </div>
  )
}

function getInitialOnboardingOpen() {
  try {
    return shouldShowOnboarding(window.localStorage, [
      TRANSACTIONS_STORAGE_KEY,
      CUSTOM_CATEGORIES_STORAGE_KEY,
    ])
  } catch (error) {
    console.error('Unable to check Daily Kudi onboarding status.', error)
    return true
  }
}

function App() {
  const {
    transactions,
    saveTransactions,
    replaceTransactionsInState,
    setExternalPersistenceError,
    persistenceError,
  } = useTransactions()
  const categoryState = useCategories()
  const { customCategories, categoryPersistenceError } = categoryState
  const categories = useMemo(() => getAllCategories(customCategories), [customCategories])
  const [dialogType, setDialogType] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [activeNav, setActiveNav] = useState('Home')
  const [activePage, setActivePage] = useState('dashboard')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sharePeriod, setSharePeriod] = useState(null)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(getInitialOnboardingOpen)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [onboardingStorageError, setOnboardingStorageError] = useState('')
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState(null)
  const updateReloadStarted = useRef(false)
  const isApplyingUpdateRef = useRef(false)

  function reloadAfterUpdate() {
    if (!isApplyingUpdateRef.current || updateReloadStarted.current) return
    updateReloadStarted.current = true
    window.location.reload()
  }

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onNeedReload: reloadAfterUpdate,
    onRegisterError(error) {
      console.error('Unable to register the Daily Kudi service worker.', error)
    },
  })

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine)
    const installMedia = window.matchMedia('(display-mode: standalone)')
    const updateInstalled = () => setIsInstalled(installMedia.matches || navigator.standalone === true)
    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    updateInstalled()
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    installMedia.addEventListener('change', updateInstalled)

    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      installMedia.removeEventListener('change', updateInstalled)
    }
  }, [])

  const totals = useMemo(() => transactions.reduce((result, transaction) => {
    result[transaction.type] += transaction.amount
    return result
  }, { income: 0, expense: 0 }), [transactions])

  const [today] = useState(() => new Date())
  const greetingDate = fullDate.format(today)

  function navigate(label, target) {
    setActiveNav(label)
    if (label === 'History') {
      setSettingsOpen(false)
      setActivePage('history')
      return
    }
    if (label === 'Analytics') {
      setSettingsOpen(false)
      setActivePage('analytics')
      return
    }

    setActivePage('dashboard')
    if (label === 'Settings') {
      setSettingsOpen(true)
      return
    }
    setSettingsOpen(false)
    if (target && target !== 'home') {
      window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 0)
    }
  }

  function saveTransaction(transaction) {
    const updatedTransactions = editingTransaction
      ? transactions.map((item) => item.id === transaction.id ? transaction : item)
      : [transaction, ...transactions]
    if (!saveTransactions(updatedTransactions)) return false
    setDialogType(null)
    setEditingTransaction(null)
    return true
  }

  function editTransaction(transaction) {
    setEditingTransaction(transaction)
    setDialogType(transaction.type)
  }

  function deleteTransaction(transaction) {
    const label = transaction.description || transaction.category
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    saveTransactions(transactions.filter((item) => item.id !== transaction.id))
  }

  function openShareSummary(period = 'today') {
    setSharePeriod(period)
  }

  function saveFinancialDataState(nextTransactions, nextCustomCategories) {
    try {
      const validatedCategories = validateCustomCategories(nextCustomCategories)
      writeFinancialData(window.localStorage, nextTransactions, validatedCategories)
      replaceTransactionsInState(nextTransactions)
      categoryState.acceptCustomCategories(validatedCategories)
      return true
    } catch (error) {
      console.error('Unable to save Daily Kudi records and categories together.', error)
      setExternalPersistenceError('Your records and categories could not be saved. No changes were made.')
      categoryState.setCategoryError('Your category changes could not be saved to this browser.')
      return false
    }
  }

  function restoreTransactions(restoredTransactions, restoredCategories) {
    return saveFinancialDataState(restoredTransactions, restoredCategories)
  }

  function clearAllFinancialData() {
    try {
      clearFinancialData(window.localStorage)
      replaceTransactionsInState([])
      categoryState.acceptCustomCategories([])
      return true
    } catch (error) {
      console.error('Unable to clear Daily Kudi records and categories.', error)
      setExternalPersistenceError('Your records and categories could not be cleared. No changes were made.')
      categoryState.setCategoryError('Your categories could not be cleared.')
      return false
    }
  }

  function finishOnboarding() {
    try {
      markOnboardingComplete(window.localStorage)
      setOnboardingStorageError('')
    } catch (error) {
      console.error('Unable to save Daily Kudi onboarding status.', error)
      setOnboardingStorageError('The introduction could not be marked complete in this browser. You can continue, but it may appear again after a reload.')
    }
    setOnboardingOpen(false)
    setOnboardingStep(0)
  }

  function showIntroductionAgain() {
    setSettingsOpen(false)
    setOnboardingStep(0)
    setOnboardingStorageError('')
    setOnboardingOpen(true)
  }

  async function installApplication() {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setIsInstalled(true)
    } catch (error) {
      console.error('Unable to install Daily Kudi.', error)
    } finally {
      setInstallPrompt(null)
    }
  }

  async function applyServiceWorkerUpdate() {
    if (!('serviceWorker' in navigator)) {
      setUpdateError('Service worker updates are not available in this browser.')
      return
    }
    if (isApplyingUpdateRef.current) return
    isApplyingUpdateRef.current = true
    updateReloadStarted.current = false
    setIsApplyingUpdate(true)
    setUpdateError(null)
    let controllerChangeTimeout
    let resolveControllerChange
    const controllerChanged = new Promise((resolve) => {
      resolveControllerChange = resolve
    })
    const handleControllerChange = () => {
      window.clearTimeout(controllerChangeTimeout)
      reloadAfterUpdate()
      resolveControllerChange(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true })
    try {
      await updateServiceWorker(true)
      const didControllerChange = await Promise.race([
        controllerChanged,
        new Promise((resolve) => {
          controllerChangeTimeout = window.setTimeout(() => resolve(false), 10000)
        }),
      ])
      if (!didControllerChange) {
        throw new Error('The updated service worker did not take control of this page.')
      }
    } catch (error) {
      console.error('Unable to activate the Daily Kudi update.', error)
      isApplyingUpdateRef.current = false
      updateReloadStarted.current = false
      setIsApplyingUpdate(false)
      setUpdateError('The update could not be applied. Please try again.')
    } finally {
      window.clearTimeout(controllerChangeTimeout)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }

  const installInstructions = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? 'In Safari, tap Share, then choose Add to Home Screen.'
    : /Android/i.test(navigator.userAgent)
      ? 'In Chrome, open the browser menu and choose Install app or Add to Home screen.'
      : 'In Chrome or Edge, use the install icon in the address bar or choose Install Daily Kudi from the browser menu.'

  return (
    <div className="app-shell" id="home">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => { setActiveNav('Home'); setActivePage('dashboard'); setSettingsOpen(false) }}>
          <img className="brand-logo" src="/daily-kudi-logo.png" alt="Daily Kudi" />
        </a>
        <div className="header-right">
          <div className={`connection-indicator ${isOnline ? 'online' : 'offline'}`} role="status" aria-label={isOnline ? 'Online' : 'Offline'}>
            <span />
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <div className="greeting">
            <strong>Good day!</strong>
            <span>{greetingDate}</span>
          </div>
          {!isInstalled && installPrompt && (
            <button className="header-install-button" type="button" onClick={installApplication}>
              <Download size={15} /> Install
            </button>
          )}
          <button className="header-settings" type="button" aria-label="Open settings" onClick={() => { setActiveNav('Settings'); setSettingsOpen(true) }}>
            <Settings size={19} />
          </button>
        </div>
      </header>

      {needRefresh && (
        <div className="pwa-update-banner" role="status">
          <span>{isApplyingUpdate ? 'Applying the Daily Kudi update…' : updateError || 'A Daily Kudi update is ready.'}</span>
          <button type="button" onClick={applyServiceWorkerUpdate} disabled={isApplyingUpdate}>
            {isApplyingUpdate ? 'Updating…' : 'Update now'}
          </button>
          <button className="dismiss-update" type="button" onClick={() => setNeedRefresh(false)} aria-label="Dismiss update notice"><X size={15} /></button>
        </div>
      )}

      {activePage === 'dashboard' ? <main className="dashboard screen-enter" id="dashboard-home" key="dashboard-screen">
        {persistenceError && <p className="storage-alert" role="alert">{persistenceError}</p>}
        <div className="welcome-row">
          <div>
            <p className="eyebrow">Your personal money space</p>
            <h1>Money, <em>made mindful.</em></h1>
          </div>
          <button className="share-summary-button" type="button" onClick={() => openShareSummary()}>
            <Share2 size={16} /> Share summary
          </button>
        </div>

        <BalanceCard balance={totals.income - totals.expense} income={totals.income} expenses={totals.expense} />
        <QuickActions onAdd={setDialogType} />

        <div className="dashboard-grid">
          <SpendingBreakdown
            data={transactions}
            totalExpenses={totals.expense}
            categories={categories}
            onMore={() => navigate('Analytics')}
          />
          <RecentTransactions
            transactions={transactions}
            categories={categories}
            onAdd={setDialogType}
            onEdit={editTransaction}
            onDelete={deleteTransaction}
          />
        </div>
        <footer className="dashboard-footer">
          <BrandMark />
          <span>Your money. Your records. Your phone.</span>
          <span className="footer-dot" />
          <span>Made for your everyday</span>
        </footer>
      </main> : activePage === 'history' ? (
        <TransactionHistory
          transactions={transactions}
          categories={categories}
          persistenceError={persistenceError}
          onAdd={setDialogType}
          onEdit={editTransaction}
          onDelete={deleteTransaction}
        />
      ) : (
        <AnalyticsScreen
          transactions={transactions}
          categories={categories}
          persistenceError={persistenceError}
          onAdd={setDialogType}
          onShare={openShareSummary}
        />
      )}

      <BottomNavigation onAdd={setDialogType} active={activeNav} onNavigate={navigate} />

      {dialogType && (
        <TransactionDialog
          key={editingTransaction?.id || dialogType}
          type={dialogType}
          transaction={editingTransaction}
          categories={categories}
          onClose={() => {
            setDialogType(null)
            setEditingTransaction(null)
          }}
          onSave={saveTransaction}
        />
      )}
      {sharePeriod && (
        <ShareSummaryDialog
          transactions={transactions}
          initialPeriod={sharePeriod}
          onClose={() => setSharePeriod(null)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          transactions={transactions}
          customCategories={customCategories}
          categories={categories}
          categoryPersistenceError={categoryPersistenceError}
          onClose={() => setSettingsOpen(false)}
          onRestore={restoreTransactions}
          onClear={clearAllFinancialData}
          onSaveCategories={saveFinancialDataState}
          onShowIntroduction={showIntroductionAgain}
          isInstalled={isInstalled}
          canInstall={Boolean(installPrompt)}
          onInstall={installApplication}
          installHelpOpen={installHelpOpen}
          onToggleInstallHelp={() => setInstallHelpOpen((open) => !open)}
          installInstructions={installInstructions}
        />
      )}
      {onboardingOpen && (
        <OnboardingDialog
          step={onboardingStep}
          onStepChange={setOnboardingStep}
          onFinish={finishOnboarding}
          storageError={onboardingStorageError}
        />
      )}
    </div>
  )
}

export default App
