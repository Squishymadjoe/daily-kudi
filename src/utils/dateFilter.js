function getLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export function isWithinDateFilter(dateString, filter, now = new Date()) {
  if (filter === 'all') return true

  const todayKey = getLocalDateKey(now)
  if (dateString > todayKey) return false
  if (filter === 'today') return dateString === todayKey

  const [year, month, day] = dateString.split('-').map(Number)
  const transactionDate = new Date(year, month - 1, day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (filter === 'week') {
    return transactionDate >= getWeekStart(today)
  }
  if (filter === 'month') {
    return transactionDate.getFullYear() === today.getFullYear()
      && transactionDate.getMonth() === today.getMonth()
  }
  return true
}
