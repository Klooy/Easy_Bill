import { FileText, Users, Package, Truck, CreditCard, ArrowRight, TrendingUp, BarChart3, RotateCw, MessageCircle, Plus, Sun, Moon, Sunset, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { sileo } from 'sileo';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Area, Line,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { SkeletonStatCard, SkeletonChart, SkeletonGrid } from '@/components/common/Skeleton';
import { useDashboardStats, useRecentInvoices, useMonthlyStats, useTopClients } from '@/hooks/useInvoices';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS, WHATSAPP_RECHARGE_URL } from '@/lib/constants';
import { useThemeStore } from '@/store/theme.store';

const CHART_COLORS = {
  light: { grid: '#F3F4F6', tick: '#6B7280', axis: '#E5E7EB', tooltipBg: '#1C1528' },
  dark:  { grid: '#374151', tick: '#9CA3AF', axis: '#4B5563', tooltipBg: '#0F0A1A' },
};

const StatCard = ({ icon: Icon, label, value, delta = null, accent = false, to }) => {
  const content = (
    <div className="rounded-card bg-white dark:bg-gray-800 p-3 sm:p-5 shadow-card transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-badge ${accent ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-gray-100 text-gray-600 dark:text-gray-300'}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-jakarta">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="font-outfit text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            {delta !== null && delta > 0 && (
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">+{delta} este mes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Buenos días', Icon: Sun };
  if (h < 18) return { text: 'Buenas tardes', Icon: Sunset };
  return { text: 'Buenas noches', Icon: Moon };
};

const DashboardPage = () => {
  const { stats, loading } = useDashboardStats();
  const { invoices: recentInvoices, loading: loadingRecent } = useRecentInvoices();
  const { data: monthlyData, loading: loadingMonthly } = useMonthlyStats(6);
  const { data: topClients, loading: loadingClients } = useTopClients(5);
  const [flipped, setFlipped] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const cc = CHART_COLORS[theme] || CHART_COLORS.light;

  // invoice_quota ya representa los créditos disponibles (se descuenta en cada emisión)
  const quotaRemaining = stats?.invoiceQuota || 0;
  const quotaTotal = (stats?.invoiceQuota || 0) + (stats?.invoiceUsed || 0);

  useEffect(() => {
    if (!loading && stats) {
      if (quotaRemaining <= 0) {
        sileo.error({
          title: 'Sin créditos disponibles',
          description: 'Contacta al administrador para adquirir más créditos.',
          button: { title: 'Solicitar créditos', onClick: () => window.open(WHATSAPP_RECHARGE_URL, '_blank') },
          duration: 10000,
        });
      } else if (quotaRemaining <= 3) {
        sileo.warning({
          title: `Te quedan ${quotaRemaining} crédito${quotaRemaining === 1 ? '' : 's'}`,
          description: 'Considera solicitar más créditos al administrador.',
          button: { title: 'Solicitar créditos', onClick: () => window.open(WHATSAPP_RECHARGE_URL, '_blank') },
          duration: 8000,
        });
      }
    }
  }, [loading, stats, quotaRemaining]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="skeleton-shimmer h-7 w-40 rounded" />
          <div className="skeleton-shimmer mt-2 h-4 w-56 rounded" />
        </div>
        <div className="skeleton-shimmer h-[140px] rounded-card" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const quotaPercent = quotaTotal > 0
    ? Math.round(((stats?.invoiceUsed || 0) / quotaTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        {(() => { const g = getGreeting(); return (
          <>
            <div className="flex items-center gap-2">
              <g.Icon className="h-6 w-6 text-primary-500" />
              <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">
                {g.text}{stats?.companyName ? `, ${stats.companyName}` : ''}
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">Resumen de tu actividad</p>
          </>
        ); })()}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3 animate-fade-in-up stagger-1">
        <Link to="/invoices/new" className="flex items-center gap-2 rounded-card bg-gradient-to-r from-primary-500 to-primary-700 px-4 py-3 text-sm font-semibold text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]">
          <Plus className="h-4 w-4" /> Nueva Factura
        </Link>
        <Link to="/clients/new" className="flex items-center gap-2 rounded-card border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 active:scale-[0.98]">
          <Users className="h-4 w-4" /> Nuevo Cliente
        </Link>
        <Link to="/products/new" className="flex items-center gap-2 rounded-card border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 active:scale-[0.98]">
          <Package className="h-4 w-4" /> Nuevo Producto
        </Link>
        <Link to="/invoices" className="flex items-center gap-2 rounded-card border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 active:scale-[0.98]">
          <FileText className="h-4 w-4" /> Ver Facturas
        </Link>
      </div>

      {/* Credit Card + Stats — combined row on lg: */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:gap-6 animate-fade-in-up stagger-2">

        {/* Cuota / Créditos — Flip Card */}
        <div
          className="cursor-pointer lg:row-span-1"
          style={{ perspective: '1000px' }}
          onClick={() => setFlipped((f) => !f)}
        >
          <div
            className="relative h-full transition-transform duration-700 rounded-card"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* ── FRONT ── */}
            <div
              className="relative flex h-full flex-col overflow-hidden rounded-card bg-gradient-to-r from-primary-500 to-primary-700 p-5 text-white shadow-primary-md sm:p-6"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Shine sweep */}
              <div className="pointer-events-none absolute inset-0 rounded-card" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)', backgroundSize: '250% 100%', animation: 'card-shine 4s ease-in-out infinite' }} />

              {/* Flip hint — top-right corner */}
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-badge bg-white/15 px-1.5 py-0.5 text-[9px] font-medium text-white/50 backdrop-blur-sm">
                <RotateCw className="h-2.5 w-2.5" />
                Toca para voltear
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-primary-200 font-jakarta">Créditos disponibles</p>
                  <p className="mt-1 font-outfit text-3xl font-bold leading-none sm:text-4xl">{quotaRemaining}</p>
                </div>
                <CreditCard className="h-8 w-8 shrink-0 text-primary-200/70 sm:h-10 sm:w-10" />
              </div>
              <div className="mt-auto pt-4">
                <div className="flex justify-between text-[11px] text-primary-200/80">
                  <span>{stats?.invoiceUsed || 0} usados</span>
                  <span>{quotaTotal} total</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary-800/30">
                  <div
                    className="h-full rounded-full bg-white/80 dark:bg-white/60 transition-all"
                    style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                  />
                </div>
              </div>
              {quotaRemaining <= 5 && (
                <p className="mt-2 text-[11px] text-primary-200/80 font-jakarta">
                  ⚠️ Créditos bajos — contacta al administrador
                </p>
              )}
            </div>

            {/* ── BACK ── */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-card bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-5 text-white shadow-primary-md sm:p-6"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {/* Shine sweep back */}
              <div className="pointer-events-none absolute inset-0 rounded-card" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.12) 55%, transparent 60%)', backgroundSize: '250% 100%', animation: 'card-shine 4s ease-in-out infinite' }} />

              {/* Flip hint — top-right corner */}
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-badge bg-white/15 px-1.5 py-0.5 text-[9px] font-medium text-white/50 backdrop-blur-sm">
                <RotateCw className="h-2.5 w-2.5" />
                Toca para volver
              </div>

              <div className="relative z-10 text-center">
                <p className="font-outfit text-base font-bold sm:text-lg">¿Necesitas más créditos?</p>
                <p className="mt-1 text-xs text-primary-200/80 font-jakarta sm:text-sm">Recarga tus créditos de facturación</p>
              </div>

              <a
                href={WHATSAPP_RECHARGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 inline-flex min-h-[44px] items-center gap-2 rounded-input bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
              >
                <MessageCircle className="h-5 w-5 text-green-500" />
                Recargar créditos
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid — beside the flip card on lg: */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={FileText} label="Facturas emitidas" value={stats?.invoicesCount || 0} delta={stats?.invoicesMonth} accent to="/invoices" />
          <StatCard icon={Users} label="Clientes" value={stats?.clientsCount || 0} delta={stats?.clientsMonth} to="/clients" />
          <StatCard icon={Package} label="Productos" value={stats?.productsCount || 0} delta={stats?.productsMonth} to="/products" />
          <StatCard icon={Truck} label="Proveedores" value={stats?.suppliersCount || 0} to="/suppliers" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Sales Chart — Combo: bars (revenue) + line (invoice count) */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <h2 className="font-outfit text-lg font-bold text-gray-900 dark:text-white">Ventas mensuales</h2>
          </div>

          {loadingMonthly ? (
            <div className="mt-4 flex h-[260px] items-end gap-3 px-4">
              {[65, 40, 80, 55, 70, 45].map((h, i) => (
                <div key={i} className="flex-1 skeleton-shimmer rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center">
              <div className="text-center">
                <BarChart3 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 font-jakarta">Sin datos de ventas aún</p>
                <p className="mt-1 text-xs text-gray-400/70 dark:text-gray-500/70 font-jakarta">Emite tu primera factura para ver estadísticas</p>
              </div>
            </div>
          ) : (() => {
            const totalPeriod = monthlyData.reduce((s, m) => s + (m.total || 0), 0);
            const totalInvoices = monthlyData.reduce((s, m) => s + (m.count || 0), 0);
            const avgPerInvoice = totalInvoices > 0 ? totalPeriod / totalInvoices : 0;
            const lastMonth = monthlyData[monthlyData.length - 1];
            const prevMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
            const growth = prevMonth && prevMonth.total > 0
              ? ((lastMonth.total - prevMonth.total) / prevMonth.total * 100)
              : null;

            return (
              <>
                {/* Mini summary stats */}
                <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-badge bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 sm:px-3 sm:py-2">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-jakarta">Total período</p>
                    <p className="font-outfit text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate" title={formatCurrency(totalPeriod)}>{formatCurrencyCompact(totalPeriod)}</p>
                  </div>
                  <div className="rounded-badge bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 sm:px-3 sm:py-2">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-jakarta">Prom. / fact.</p>
                    <p className="font-outfit text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate" title={formatCurrency(avgPerInvoice)}>{formatCurrencyCompact(avgPerInvoice)}</p>
                  </div>
                  <div className="rounded-badge bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 sm:px-3 sm:py-2">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-jakarta">Variación</p>
                    <p className={`font-outfit text-xs sm:text-sm font-bold ${growth === null ? 'text-gray-400' : growth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {growth === null ? '—' : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className="mb-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400 font-jakarta">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary-500" /> Ingresos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 rounded-full bg-emerald-500" /> Facturas
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#5B21B6" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: cc.tick }}
                      tickLine={false}
                      axisLine={{ stroke: cc.axis }}
                    />
                    <YAxis
                      yAxisId="revenue"
                      tick={{ fontSize: 9, fill: cc.tick }}
                      tickLine={false}
                      axisLine={false}
                      width={42}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `$${v}`}
                    />
                    <YAxis
                      yAxisId="count"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#10B981' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: cc.tooltipBg,
                        border: 'none',
                        borderRadius: '9px',
                        color: '#fff',
                        fontSize: '12px',
                        padding: '10px 14px',
                      }}
                      formatter={(value, name) => {
                        if (name === 'total') return [formatCurrency(value), 'Ingresos'];
                        return [value, 'Facturas'];
                      }}
                      labelStyle={{ color: '#A78BFA', marginBottom: 4, fontWeight: 600 }}
                    />
                    <Bar
                      yAxisId="revenue"
                      dataKey="total"
                      fill="url(#barGradient)"
                      radius={[6, 6, 0, 0]}
                      barSize={monthlyData.length <= 3 ? 40 : monthlyData.length <= 6 ? 28 : 20}
                    />
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="count"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ fill: '#10B981', stroke: '#fff', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            );
          })()}
        </div>

        {/* Top Clients — Ranked list */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary-500" />
            <h2 className="font-outfit text-lg font-bold text-gray-900 dark:text-white">Top clientes</h2>
          </div>
          {loadingClients ? (
            <div className="space-y-3 py-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-badge p-2">
                  <div className="skeleton-shimmer h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton-shimmer h-3 w-24 rounded" />
                    <div className="skeleton-shimmer h-2 rounded" style={{ width: `${90 - i * 12}%` }} />
                  </div>
                  <div className="skeleton-shimmer h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : topClients.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 font-jakarta">Sin datos de clientes aún</p>
              </div>
            </div>
          ) : (() => {
            const maxTotal = Math.max(...topClients.map(c => c.total));
            const medals = ['text-amber-500', 'text-gray-400', 'text-amber-700'];
            return (
              <div className="space-y-2">
                {topClients.map((client, i) => (
                  <div key={client.name} className="flex items-center gap-3 rounded-badge p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    {/* Rank */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? `bg-gray-100 dark:bg-gray-700 ${medals[i]}` : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}>
                      {i + 1}
                    </div>
                    {/* Name + progress bar */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white font-jakarta">{client.name}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                          style={{ width: `${maxTotal > 0 ? (client.total / maxTotal) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    {/* Amount */}
                    <p className="shrink-0 font-outfit text-sm font-bold text-gray-900 dark:text-white">{formatCurrencyCompact(client.total)}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-outfit text-lg font-bold text-gray-900 dark:text-white">Facturas recientes</h2>
          <Link to="/invoices">
            <Button variant="ghost" size="sm" className="text-primary-600">
              Ver todas <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {loadingRecent ? (
          <div className="mt-4 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center justify-between rounded-badge border p-3">
                <div className="space-y-2">
                  <div className="skeleton-shimmer h-4 w-24 rounded" />
                  <div className="skeleton-shimmer h-3 w-32 rounded" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="skeleton-shimmer ml-auto h-4 w-20 rounded" />
                  <div className="skeleton-shimmer ml-auto h-5 w-14 rounded-badge" />
                </div>
              </div>
            ))}
          </div>
        ) : recentInvoices.length === 0 ? (
          <div className="mt-4 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 font-jakarta">
              Tus facturas emitidas aparecerán aquí
            </p>
            <Link to="/invoices/new">
              <Button className="mt-3 rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white">
                Emitir primera factura
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recentInvoices.map((inv) => (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-badge border p-3 transition-colors hover:bg-gray-50 dark:bg-gray-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                    {inv.number || inv.reference_code}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="truncate">{inv.clients?.names || inv.clients?.company || '—'}</span>
                    <span className="shrink-0 text-gray-300 dark:text-gray-600">•</span>
                    <span className="shrink-0">{formatDate(inv.created_at)}</span>
                  </div>
                </div>
                <div className="ml-3 text-right">
                  <p className="font-outfit text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(inv.total)}
                  </p>
                  <span className={`inline-block rounded-badge px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] || ''}`}>
                    {STATUS_LABELS[inv.status] || inv.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
