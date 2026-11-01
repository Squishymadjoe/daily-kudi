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
import { LineChart as LineChartIcon } from 'lucide-react'

function AnalyticsTooltip({ active, payload, label, currency }) {
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

export function SpendingPieChart({ data, currency }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="68%"
          outerRadius="92%"
          paddingAngle={4}
          stroke="none"
          cornerRadius={5}
        >
          {data.map((item) => <Cell key={item.name} fill={item.color} />)}
        </Pie>
        <Tooltip
          formatter={(value) => currency.format(value)}
          contentStyle={{ border: '1px solid #e8e9e3', borderRadius: 12, fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function AnalyticsCharts({ categoryData, comparisonData, trend, netSavings, totals, currency, compactCurrency }) {
  return (
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
                  <Tooltip content={<AnalyticsTooltip currency={currency} />} position={{ x: 8, y: 8 }} />
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
  )
}
