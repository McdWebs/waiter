import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

interface DataItem {
  name: string
  value: number
  fill?: string
}

interface BarChartCardProps {
  title: string
  data: DataItem[]
  valueFormatter?: (n: number) => string
  barColors?: string[]
}

const DEFAULT_COLORS = ['#10b981', '#34d399', '#6ee7b7'] // emerald scale

export default function BarChartCard({
  title,
  data,
  valueFormatter = (n) => String(n),
  barColors = DEFAULT_COLORS,
}: BarChartCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="h-[200px] min-h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={valueFormatter}
              width={36}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
              formatter={(value: unknown) => {
                const n = Array.isArray(value) ? value[0] : value
                return [valueFormatter(Number(n)), '']
              }}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={barColors[index % barColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
