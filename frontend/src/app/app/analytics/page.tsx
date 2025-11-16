'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetHeader, SheetTitle, SheetClose, SheetContent } from '@/components/ui/sheet'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppNavigation } from '@/components/ui/app-navigation'
import { FeatureGate } from '@/components/feature-gate'
import { analyticsAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Feature } from '@/contexts/features-context'
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock,
  Download,
  Loader2,
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  Crown,
  Zap,
  Filter,
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  slate: '#64748b',
}

const CHART_COLORS = [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.red, COLORS.purple, COLORS.pink]

interface InvoiceStats {
  total: number
  paid: number
  pending: number
  overdue: number
  draft: number
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
}

interface RevenueData {
  month: string
  revenue: number
  invoiceCount: number
}

interface TopClient {
  clientId: string
  clientName: string
  totalRevenue: number
  invoiceCount: number
}

interface AnalyticsData {
  invoiceStats: InvoiceStats
  revenueOverTime: RevenueData[]
  topClients: TopClient[]
  recentActivity: any[]
  currencyBreakdown: Record<string, number>
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <FeatureGate feature={Feature.ANALYTICS}>
        <AnalyticsContent />
      </FeatureGate>
    </ProtectedRoute>
  )
}

function AnalyticsContent() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'30d' | '90d' | '1y' | 'all'>('30d')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await analyticsAPI.getAnalytics(period)
      setAnalytics(response.data.data)
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load analytics',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const response = await analyticsAPI.exportAnalytics('json')
      const dataStr = JSON.stringify(response.data.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-${new Date().toISOString()}.json`
      link.click()
      
      toast({
        title: 'Export Complete',
        description: 'Analytics data has been downloaded',
      })
    } catch (error: any) {
      toast({
        title: 'Export Error',
        description: error.response?.data?.message || 'Failed to export analytics',
        variant: 'destructive',
      })
    } finally {
      setExportLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  // Prepare chart data
  const statusData = analytics ? [
    { name: 'Paid', value: analytics.invoiceStats.paid, color: COLORS.green },
    { name: 'Pending', value: analytics.invoiceStats.pending, color: COLORS.yellow },
    { name: 'Overdue', value: analytics.invoiceStats.overdue, color: COLORS.red },
    { name: 'Draft', value: analytics.invoiceStats.draft, color: COLORS.blue },
  ].filter(item => item.value > 0) : []

  const revenueChartData = analytics?.revenueOverTime.map(item => ({
    month: formatMonth(item.month),
    revenue: item.revenue,
    invoices: item.invoiceCount,
  })) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <AppNavigation />

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Analytics</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-0.5">
                  Track your performance and insights
                </p>
              </div>
            </div>
            {/* Mobile Filter Button */}
            <Button
              onClick={() => setFilterDrawerOpen(true)}
              variant="outline"
              size="sm"
              className="md:hidden gap-2 rounded-xl shadow-md"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </div>

          {/* Desktop Controls - Hidden on Mobile */}
          <Card className="shadow-md hidden md:block">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Time Period
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['30d', '90d', '1y', 'all'] as const).map((p) => (
                      <Button
                        key={p}
                        variant={period === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod(p)}
                        disabled={loading}
                        className="gap-2 rounded-xl"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>
                          {p === '30d' && 'Last 30 Days'}
                          {p === '90d' && 'Last 90 Days'}
                          {p === '1y' && 'Last Year'}
                          {p === 'all' && 'All Time'}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={exportLoading || loading}
                    className="gap-2 rounded-xl"
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Export Data</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative inline-flex">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-6">Loading analytics...</p>
              <p className="text-sm text-muted-foreground mt-2">Crunching the numbers</p>
            </div>
          ) : analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Revenue</CardTitle>
                    <div className="p-2 bg-blue-100 rounded-xl shadow-sm">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {formatCurrency(analytics.invoiceStats.totalRevenue)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {analytics.invoiceStats.total} {analytics.invoiceStats.total === 1 ? 'invoice' : 'invoices'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-green-50/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-green-600 uppercase tracking-wider">Paid Revenue</CardTitle>
                    <div className="p-2 bg-green-100 rounded-xl shadow-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-green-700">
                      {formatCurrency(analytics.invoiceStats.paidRevenue)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {analytics.invoiceStats.paid} paid
                      </Badge>
                      <div className="flex items-center text-xs text-green-600 font-semibold">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {analytics.invoiceStats.total > 0
                          ? Math.round((analytics.invoiceStats.paidRevenue / analytics.invoiceStats.totalRevenue) * 100)
                          : 0}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-yellow-50/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Pending Revenue</CardTitle>
                    <div className="p-2 bg-yellow-100 rounded-xl shadow-sm">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-yellow-700">
                      {formatCurrency(analytics.invoiceStats.pendingRevenue)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {analytics.invoiceStats.pending + analytics.invoiceStats.overdue} unpaid
                      </Badge>
                      {analytics.invoiceStats.overdue > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {analytics.invoiceStats.overdue} overdue
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Collection Rate</CardTitle>
                    <div className="p-2 bg-purple-100 rounded-xl shadow-sm">
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-purple-700">
                      {analytics.invoiceStats.total > 0
                        ? Math.round((analytics.invoiceStats.paid / analytics.invoiceStats.total) * 100)
                        : 0}%
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${analytics.invoiceStats.total > 0
                              ? Math.round((analytics.invoiceStats.paid / analytics.invoiceStats.total) * 100)
                              : 0}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Success rate
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Over Time */}
                <Card className="shadow-md hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50/50">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl font-bold">Revenue Trend</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Monthly performance overview</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6 pt-6">
                    {revenueChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'revenue') return formatCurrency(value)
                              return value
                            }}
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke={COLORS.blue}
                            strokeWidth={3}
                            name="Revenue"
                            dot={{ fill: COLORS.blue, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[300px] text-sm text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                        <p>No revenue data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Invoice Status Distribution */}
                <Card className="shadow-md hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50/50">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Activity className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl font-bold">Invoice Status</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Distribution breakdown</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6 pt-6">
                    {statusData.length > 0 ? (
                      <div>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {statusData.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-900">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.value} invoices</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[280px] text-sm text-muted-foreground">
                        <FileText className="h-12 w-12 mb-3 opacity-20" />
                        <p>No invoice data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Clients */}
              <Card className="shadow-md hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-green-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Crown className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl font-bold">Top Clients</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Your best customers</CardDescription>
                      </div>
                    </div>
                    {analytics.topClients.length > 0 && (
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        {analytics.topClients.length} clients
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {analytics.topClients.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.topClients.slice(0, 5).map((client, index) => {
                        const maxRevenue = analytics.topClients[0].totalRevenue
                        const percentage = (client.totalRevenue / maxRevenue) * 100
                        return (
                          <div key={client.clientId} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900' :
                                  index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700' :
                                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {index === 0 && <Crown className="h-4 w-4" />}
                                  {index !== 0 && (index + 1)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-base text-slate-900 truncate">{client.clientName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {client.invoiceCount} {client.invoiceCount === 1 ? 'invoice' : 'invoices'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-base text-slate-900">{formatCurrency(client.totalRevenue)}</p>
                                <p className="text-xs text-muted-foreground">{percentage.toFixed(0)}% of top</p>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  index === 0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                  index === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                  index === 2 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                                  'bg-gradient-to-r from-slate-400 to-slate-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                      <Users className="h-12 w-12 mb-3 opacity-20" />
                      <p>No client data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  Failed to load analytics data
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Sheet open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} side="bottom">
        <SheetHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filters & Export
          </SheetTitle>
          <SheetClose onClose={() => setFilterDrawerOpen(false)} />
        </SheetHeader>
        <SheetContent className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Time Period Section */}
            <div>
              <label className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 block">
                Time Period
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['30d', '90d', '1y', 'all'] as const).map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => {
                      setPeriod(p)
                      setFilterDrawerOpen(false)
                    }}
                    disabled={loading}
                    className="gap-2 rounded-xl h-auto py-4"
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="text-base font-semibold">
                      {p === '30d' && 'Last 30 Days'}
                      {p === '90d' && 'Last 90 Days'}
                      {p === '1y' && 'Last Year'}
                      {p === 'all' && 'All Time'}
                    </span>
                  </Button>
                ))}
              </div>
              {period && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Currently showing:{' '}
                    <span className="font-bold">
                      {period === '30d' && 'Last 30 Days'}
                      {period === '90d' && 'Last 90 Days'}
                      {period === '1y' && 'Last Year'}
                      {period === 'all' && 'All Time'}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Export Section */}
            <div className="pt-4 border-t">
              <label className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 block">
                Export Data
              </label>
              <Button
                onClick={() => {
                  handleExport()
                  setFilterDrawerOpen(false)
                }}
                disabled={exportLoading || loading}
                className="w-full gap-2 rounded-xl h-auto py-4 text-base"
                variant="outline"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>Export Analytics Data</span>
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Download your analytics data as JSON
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

