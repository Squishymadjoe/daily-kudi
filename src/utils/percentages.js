export function getWholePercentages(values) {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (!values.length || total <= 0) return values.map(() => 0)

  const exactPercentages = values.map((value) => (value / total) * 100)
  const percentages = exactPercentages.map(Math.floor)
  const remaining = 100 - percentages.reduce((sum, percentage) => sum + percentage, 0)
  const fractionalOrder = exactPercentages
    .map((percentage, index) => ({ index, fraction: percentage - Math.floor(percentage) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)

  for (let index = 0; index < remaining; index += 1) {
    percentages[fractionalOrder[index].index] += 1
  }

  return percentages
}
