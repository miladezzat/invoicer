'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserDropdown } from '@/components/ui/user-dropdown'
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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
    { name: 'Paid', value: analytics.invoiceStats.paid, color: COLORS[1] },
    { name: 'Pending', value: analytics.invoiceStats.pending, color: COLORS[2] },
    { name: 'Overdue', value: analytics.invoiceStats.overdue, color: COLORS[3] },
    { name: 'Draft', value: analytics.invoiceStats.draft, color: COLORS[0] },
  ].filter(item => item.value > 0) : []

  const revenueChartData = analytics?.revenueOverTime.map(item => ({
    month: formatMonth(item.month),
    revenue: item.revenue,
    invoices: item.invoiceCount,
  })) || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
              <Link href="/app/invoices" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-white font-black text-xs sm:text-sm">
                  IN
                </div>
                <span className="text-lg sm:text-xl font-bold">Invoicer</span>
              </Link>
            </div>
            <UserDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['30d', '90d', '1y', 'all'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {p === '30d' && 'Last 30 Days'}
                    {p === '90d' && 'Last 90 Days'}
                    {p === '1y' && 'Last Year'}
                    {p === 'all' && 'All Time'}
                  </span>
                  <span className="sm:hidden">
                    {p === '30d' && '30D'}
                    {p === '90d' && '90D'}
                    {p === '1y' && '1Y'}
                    {p === 'all' && 'All'}
                  </span>
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportLoading || loading}
              className="w-full sm:w-auto"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(analytics.invoiceStats.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.invoiceStats.total} total invoices
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Paid Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(analytics.invoiceStats.paidRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.invoiceStats.paid} paid invoices
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Pending Revenue</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                      {formatCurrency(analytics.invoiceStats.pendingRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.invoiceStats.pending + analytics.invoiceStats.overdue} unpaid
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Collection Rate</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {analytics.invoiceStats.total > 0
                        ? Math.round((analytics.invoiceStats.paid / analytics.invoiceStats.total) * 100)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoices paid on time
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Revenue Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Revenue Over Time</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Monthly revenue and invoice count</CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {revenueChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'revenue') return formatCurrency(value)
                              return value
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke={COLORS[0]} 
                            strokeWidth={2}
                            name="Revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                        No revenue data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Invoice Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Invoice Status</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Distribution by status</CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                        No invoice data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Clients */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Top Clients</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Highest revenue by client</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.topClients.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {analytics.topClients.slice(0, 5).map((client, index) => (
                        <div key={client.clientId} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">{client.clientName}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-sm sm:text-base">{formatCurrency(client.totalRevenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      No client data available
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
    </div>
  )
}

