import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
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
  HeartPulse,
  Home,
  Download,
  Info,
  Landmark,
  LineChart as LineChartIcon,
  MessageCircle,
  MoreHorizontal,
  Pencil,
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
  X,
} from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import { useTransactions } from './hooks/useTransactions'
import { isWithinDateFilter } from './utils/dateFilter'
import {
  buildFinancialReport,
  copyTextToClipboard,
  getWhatsAppShareUrl,
  shareOrCopyReport,
} from './utils/financialReport'
import { downloadBackup, parseBackup } from './utils/backup'
import { getWholePercentages } from './utils/percentages'

const categoryOptions = [
  { name: 'Food & Dining', icon: Utensils, color: '#d99b58' },
  { name: 'Transport', icon: CarFront, color: '#79968a' },
  { name: 'Shopping', icon: ShoppingBag, color: '#b48088' },
  { name: 'Bills & utilities', icon: Smartphone, color: '#8b88b8' },
  { name: 'Health', icon: HeartPulse, color: '#c77a68' },
  { name: 'Housing', icon: Home, color: '#829bb0' },
  { name: 'Salary', icon: BriefcaseBusiness, color: '#4d947a' },
  { name: 'Other', icon: MoreHorizontal, color: '#a5a18e' },
]

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
      <p className="balance-amount" aria-live="polite">{displayAmount}</p>
      <p className="balance-caption">Across all your records</p>
      <div className="balance-divider" />
      <div className="balance-stats">
        <div className="balance-stat">
          <span className="stat-icon income-icon"><ArrowDownLeft size={15} /></span>
          <div>
            <p>Total Income</p>
            <strong>{visible ? currency.format(income) : '₦ ••••••'}</strong>
          </div>
        </div>
        <span className="balance-stat-divider" />
        <div className="balance-stat">
          <span className="stat-icon expense-icon"><ArrowUpRight size={15} /></span>
          <div>
            <p>Total Expenses</p>
            <strong>{visible ? currency.format(expenses) : '₦ ••••••'}</strong>
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

function SpendingBreakdown({ data, totalExpenses, onMore }) {
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
        color: categoryOptions.find((category) => category.name === name)?.color || '#a5a18e',
      }))
      .sort((a, b) => b.value - a.value)
  }, [data])
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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="92%"
                  paddingAngle={4}
                  stroke="none"
                  cornerRadius={5}
                >
                  {chartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value) => currency.format(value)}
                  contentStyle={{ border: '1px solid #e8e9e3', borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
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

function RecentTransactions({ transactions, onAdd, onEdit, onDelete }) {
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
            const category = categoryOptions.find((item) => item.name === transaction.category) || categoryOptions.at(-1)
            const CategoryIcon = transaction.type === 'income' ? ArrowDownLeft : category.icon
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

function HistoryTransaction({ transaction, onEdit, onDelete }) {
  const category = categoryOptions.find((item) => item.name === transaction.category) || categoryOptions.at(-1)
  const CategoryIcon = category.icon
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

function TransactionHistory({ transactions, persistenceError, onAdd, onEdit, onDelete }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [search, setSearch] = useState('')

  const categories = useMemo(
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
    <main className="dashboard history-page">
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
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
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

function AnalyticsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const percentage = item.payload.percentage

  return (
    <div className="analytics-tooltip">
      {label && <span>{label}</span>}
      <strong>{item.name || item.payload.name}</strong>
      <b>{currency.format(item.value)}</b>
      {percentage !== undefined && <span>{percentage.toFixed(1)}% of expenses</span>}
    </div>
  )
}

function AnalyticsScreen({ transactions, persistenceError, onAdd, onShare }) {
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
        color: categoryOptions.find((category) => category.name === name)?.color || '#a5a18e',
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodTransactions, totals.expense])

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
    <main className="dashboard analytics-page">
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
          <section className="analytics-chart-grid">
            <article className="analytics-panel category-chart-panel">
              <div className="analytics-panel-heading">
                <div>
                  <p className="eyebrow">Where it goes</p>
                  <h2>Spending breakdown</h2>
                </div>
                <span className="analytics-panel-total">{currency.format(totals.expense)}</span>
              </div>
              {categoryData.length ? (
                <div className="analytics-category-content">
                  <div className="analytics-donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="amount"
                          nameKey="name"
                          innerRadius="65%"
                          outerRadius="91%"
                          paddingAngle={3}
                          stroke="none"
                          cornerRadius={5}
                        >
                          {categoryData.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip content={<AnalyticsTooltip />} position={{ x: 8, y: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="analytics-donut-center">
                      <span>Total expenses</span>
                      <strong>{currency.format(totals.expense)}</strong>
                    </div>
                  </div>
                  <div className="analytics-category-legend">
                    {categoryData.map((category) => (
                      <div className="analytics-legend-row" key={category.name}>
                        <span className="analytics-legend-dot" style={{ backgroundColor: category.color }} />
                        <span className="analytics-legend-name">{category.name}</span>
                        <span className="analytics-legend-percent">{category.percentage.toFixed(1)}%</span>
                        <strong>{currency.format(category.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="analytics-chart-empty">No expenses in this period yet.</div>
              )}
            </article>

            <article className="analytics-panel comparison-panel">
              <div className="analytics-panel-heading">
                <div>
                  <p className="eyebrow">Money in and out</p>
                  <h2>Income vs expenses</h2>
                </div>
                <span className={`comparison-net ${netSavings < 0 ? 'negative-value' : ''}`}>
                  {netSavings >= 0 ? '+' : '−'}{currency.format(Math.abs(netSavings))}
                </span>
              </div>
              <div className="analytics-bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 12, right: 7, bottom: 4, left: 3 }}>
                    <CartesianGrid stroke="#eef0e9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#858c82', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      width={60}
                      tick={{ fill: '#92988d', fontSize: 9 }}
                      tickFormatter={(value) => compactCurrency.format(value)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => [currency.format(value), name]}
                      position={{ x: 8, y: 8 }}
                      contentStyle={{ border: '1px solid #e8e9e3', borderRadius: 12, fontSize: 11 }}
                    />
                    <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]} maxBarSize={54}>
                      {comparisonData.map((item) => <Cell key={item.name} fill={item.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-color-key">
                {comparisonData.map((item) => (
                  <span key={item.name}><i style={{ backgroundColor: item.fill }} />{item.name}</span>
                ))}
              </div>
            </article>

            <article className="analytics-panel trends-panel">
              <div className="analytics-panel-heading">
                <div>
                  <p className="eyebrow">Over time</p>
                  <h2>Spending trends</h2>
                </div>
                <span className="trend-group-label">
                  <LineChartIcon size={14} />
                  {trend.grouping === 'day' ? 'Daily' : trend.grouping === 'week' ? 'Weekly' : 'Monthly'}
                </span>
              </div>
              <div className="analytics-trend-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend.data} margin={{ top: 12, right: 10, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id="spendingTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#51846a" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#51846a" stopOpacity={0.015} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eef0e9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#858c82', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis
                      width={60}
                      tick={{ fill: '#92988d', fontSize: 9 }}
                      tickFormatter={(value) => compactCurrency.format(value)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [currency.format(value), 'Expenses']}
                      position={{ x: 8, y: 8 }}
                      contentStyle={{ border: '1px solid #e8e9e3', borderRadius: 12, fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#4d8063"
                      strokeWidth={2.2}
                      fill="url(#spendingTrendFill)"
                      activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

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
      <section className="transaction-dialog share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
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

function TransactionDialog({ type, transaction, onClose, onSave }) {
  const [transactionType, setTransactionType] = useState(transaction?.type || type)
  const [category, setCategory] = useState(transaction?.category || (type === 'income' ? 'Salary' : 'Food & Dining'))
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [date, setDate] = useState(() => transaction?.date || getLocalDate())
  const [validationError, setValidationError] = useState('')
  const options = categoryOptions.filter((item) => transactionType === 'income' ? ['Salary', 'Other'].includes(item.name) : item.name !== 'Salary')

  function changeType(event) {
    const nextType = event.target.value
    setTransactionType(nextType)
    const nextCategories = categoryOptions.filter((item) => nextType === 'income' ? ['Salary', 'Other'].includes(item.name) : item.name !== 'Salary')
    if (!nextCategories.some((item) => item.name === category)) setCategory(nextType === 'income' ? 'Salary' : 'Food & Dining')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || !transactionType || !category.trim() || !date) {
      setValidationError('Enter an amount greater than zero and choose a type, category, and date.')
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
      <section className="transaction-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
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
          <div className="amount-input-wrap"><span>₦</span><input id="transaction-amount" type="number" min="0.01" step="any" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus /></div>
          <label className="form-label" htmlFor="transaction-category">Category</label>
          <div className="select-wrap">
            <select id="transaction-category" value={category} onChange={(event) => setCategory(event.target.value)} required>
              {options.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
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
  onClose,
  onRestore,
  onClear,
  isInstalled,
  canInstall,
  onInstall,
  installHelpOpen,
  onToggleInstallHelp,
  installInstructions,
}) {
  const fileInputRef = useRef(null)
  const [feedback, setFeedback] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [pendingBackup, setPendingBackup] = useState(null)

  function handleExport() {
    try {
      downloadBackup(transactions)
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
    else onClose()
  })

  function confirmRestore() {
    if (!pendingBackup) return
    if (onRestore(pendingBackup.transactions)) {
      setFeedback({ type: 'success', message: `${pendingBackup.transactions.length} ${pendingBackup.transactions.length === 1 ? 'transaction was' : 'transactions were'} restored successfully.` })
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

  return (
    <div className="dialog-backdrop settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="transaction-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="dialog-heading">
          <div>
            <span className="dialog-icon settings"><Settings size={20} /></span>
            <div>
              <p className="eyebrow">Your preferences</p>
              <h2 id="settings-title">Settings</h2>
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
                ? 'This permanently removes all locally stored financial records and category labels from this device. This cannot be undone.'
                : `Restoring will replace all ${transactions.length} current ${transactions.length === 1 ? 'record' : 'records'} with ${pendingBackup.transactions.length} ${pendingBackup.transactions.length === 1 ? 'record' : 'records'} from this backup. This cannot be undone.`}
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
        ) : (
          <div className="settings-content">
            <section className="settings-section">
              <div className="settings-section-heading">
                <span><Database size={16} /></span>
                <div><h3>Data management</h3><p>{transactions.length} saved {transactions.length === 1 ? 'transaction' : 'transactions'}</p></div>
              </div>
              <div className="settings-action-list">
                <button className="settings-action-row" type="button" onClick={handleExport}>
                  <span className="settings-action-icon"><FileDown size={17} /></span>
                  <span><strong>Export backup</strong><small>Download your records as a JSON file</small></span>
                  <FileDown className="settings-action-arrow" size={16} />
                </button>
                <button className="settings-action-row" type="button" onClick={() => fileInputRef.current?.click()}>
                  <span className="settings-action-icon"><FileUp size={17} /></span>
                  <span><strong>Restore backup</strong><small>Replace records from a Daily Kudi backup</small></span>
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
                <span><ShieldCheck size={16} /></span>
                <div><h3>Privacy</h3><p>Private by design</p></div>
              </div>
              <p className="settings-section-copy">Your financial information is stored locally on your device. Daily Kudi does not require an account and does not send your financial records to an external server.</p>
            </section>

            <section className="settings-section app-information">
              <div className="settings-section-heading">
                <span><Info size={16} /></span>
                <div><h3>App information</h3><p>Daily Kudi · Personal finance, on your phone</p></div>
              </div>
              <p className="settings-section-copy">Backup version 1 · Your data stays in this browser unless you choose to export it.</p>
            </section>

            <section className="settings-section clear-data-section">
              <div className="settings-section-heading">
                <span><Trash2 size={16} /></span>
                <div><h3>Clear all data</h3><p>Permanently remove local financial records and categories</p></div>
              </div>
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

function App() {
  const { transactions, saveTransactions, clearTransactions, persistenceError } = useTransactions()
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

  function restoreTransactions(restoredTransactions) {
    return saveTransactions(restoredTransactions)
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

      {activePage === 'dashboard' ? <main className="dashboard" id="dashboard-home">
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
            onMore={() => navigate('Analytics')}
          />
          <RecentTransactions
            transactions={transactions}
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
          persistenceError={persistenceError}
          onAdd={setDialogType}
          onEdit={editTransaction}
          onDelete={deleteTransaction}
        />
      ) : (
        <AnalyticsScreen
          transactions={transactions}
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
          onClose={() => setSettingsOpen(false)}
          onRestore={restoreTransactions}
          onClear={clearTransactions}
          isInstalled={isInstalled}
          canInstall={Boolean(installPrompt)}
          onInstall={installApplication}
          installHelpOpen={installHelpOpen}
          onToggleInstallHelp={() => setInstallHelpOpen((open) => !open)}
          installInstructions={installInstructions}
        />
      )}
    </div>
  )
}

export default App
