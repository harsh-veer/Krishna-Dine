import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '../../utils/format';

// Single-series charts: one brand hue, thin marks, recessive grid, hover tooltip, no dual axes.
const INK = '#4A3026';
const SERIES = '#8B4A2B';
const GRID = '#EBD5C3';
const tick = { fill: 'rgba(74,48,38,0.55)', fontSize: 12 };

function ChartTooltip({ active, payload, label, valueKind, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm shadow-lift">
      <div className="font-semibold text-brand-950">{labelFormatter ? labelFormatter(label) : label}</div>
      <div className="mt-0.5 text-brand-900/70">
        {p.name}: <span className="font-bold text-brand-950">{valueKind === 'money' ? formatINR(p.value) : p.value}</span>
      </div>
      {p.payload.orders !== undefined && valueKind === 'money' && <div className="text-xs text-brand-900/50">{p.payload.orders} orders</div>}
    </div>
  );
}

const shortINR = (v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `₹${v}`);

export function RevenueBarChart({ data, xKey = 'date', yKey = 'revenue', name = 'Sales', height = 260, xFormatter, labelFormatter, valueKind = 'money' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={xFormatter} interval="preserveStartEnd" minTickGap={8} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={52} tickFormatter={valueKind === 'money' ? shortINR : undefined} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(31,107,74,0.08)' }} content={<ChartTooltip valueKind={valueKind} labelFormatter={labelFormatter || xFormatter} />} />
        <Bar dataKey={yKey} name={name} fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueAreaChart({ data, xKey = 'label', yKey = 'revenue', name = 'Sales', height = 260, xFormatter }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="kdArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES} stopOpacity={0.22} />
            <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={xFormatter} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={52} tickFormatter={shortINR} />
        <Tooltip cursor={{ stroke: INK, strokeOpacity: 0.25 }} content={<ChartTooltip valueKind="money" labelFormatter={xFormatter} />} />
        <Area type="monotone" dataKey={yKey} name={name} stroke={SERIES} strokeWidth={2} fill="url(#kdArea)" dot={{ r: 4, fill: SERIES, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
