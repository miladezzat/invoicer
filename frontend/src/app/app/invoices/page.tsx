'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import { Plus, FileText, Trash2, Eye, MoreVertical, Edit, Share2, User, CreditCard, Settings, X, BarChart3, Search, Filter, Download, Copy, TrendingUp, DollarSign, Clock, CheckCircle2, AlertCircle, ArrowUpDown, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppNavigation } from '@/components/ui/app-navigation'
import { invoicesAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useFeatures } from '@/contexts/features-context'
import { Feature } from '@/contexts/features-context'

export default function InvoicesPage() {
  return (
    <ProtectedRoute>
      <InvoicesContent />
    </ProtectedRoute>
  )
}

function InvoicesContent() {
  const { user, logout } = useAuth()
  const { hasFeature } = useFeatures()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientIdFilter = searchParams.get('clientId')
  const clientNameFilter = searchParams.get('clientName')
  
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; invoiceId: string; invoiceNumber: string } | null>(null)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // New UX enhancements
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  const fetchInvoices = async () => {
    try {
      // Pass clientId filter to API if present
      const params: any = {}
      if (clientIdFilter) {
        params.clientId = clientIdFilter
      }
      
      const response = await invoicesAPI.list(params)
      const invoicesList = response.data.invoices || []
      setInvoices(invoicesList)
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch invoices. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [clientIdFilter])

  // Computed: Filter, search, and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices]

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(invoice => 
        invoice.number.toLowerCase().includes(query) ||
        invoice.clientName?.toLowerCase().includes(query) ||
        invoice.total?.toString().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(invoice => invoice.status.toLowerCase() === statusFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'date') {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      } else if (sortBy === 'amount') {
        comparison = (a.total || 0) - (b.total || 0)
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status)
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [invoices, searchQuery, statusFilter, sortBy, sortOrder])

  // Computed: Statistics
  const statistics = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
    const paid = invoices.filter(inv => inv.status.toLowerCase() === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0)
    const pending = invoices.filter(inv => ['sent', 'viewed'].includes(inv.status.toLowerCase())).reduce((sum, inv) => sum + (inv.total || 0), 0)
    const overdue = invoices.filter(inv => inv.status.toLowerCase() === 'overdue').reduce((sum, inv) => sum + (inv.total || 0), 0)
    
    return {
      total,
      paid,
      pending,
      overdue,
      count: invoices.length,
      paidCount: invoices.filter(inv => inv.status.toLowerCase() === 'paid').length,
      pendingCount: invoices.filter(inv => ['sent', 'viewed'].includes(inv.status.toLowerCase())).length,
      overdueCount: invoices.filter(inv => inv.status.toLowerCase() === 'overdue').length,
    }
  }, [invoices])

  const clearClientFilter = () => {
    router.push('/app/invoices')
  }

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      await invoicesAPI.update(invoiceId, { status: newStatus })
      // Refresh the list
      fetchInvoices()
      toast({
        title: 'Status updated',
        description: 'Invoice status has been updated successfully.',
      })
    } catch (error: any) {
      console.error('Failed to update status:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const openDeleteDialog = (invoiceId: string, invoiceNumber: string) => {
    setDeleteDialog({ open: true, invoiceId, invoiceNumber })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return

    try {
      await invoicesAPI.delete(deleteDialog.invoiceId)
      fetchInvoices()
      toast({
        title: 'Invoice deleted',
        description: `Invoice ${deleteDialog.invoiceNumber} has been deleted successfully.`,
      })
    } catch (error: any) {
      console.error('Failed to delete invoice:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete invoice',
        variant: 'destructive',
      })
    } finally {
      closeDeleteDialog()
    }
  }

  const handleEnablePayment = async (invoiceId: string, invoiceNumber: string) => {
    if (!hasFeature(Feature.PAYMENT_INTEGRATION)) {
      setShowUpgradeModal(true)
      setOpenMenuId(null)
      setMenuPosition(null)
      return
    }

    setPaymentLoading(invoiceId)
    try {
      const response = await invoicesAPI.enablePayment(invoiceId)
      fetchInvoices()
      toast({
        title: 'Payment Enabled!',
        description: `Clients can now pay ${invoiceNumber} online. Share the invoice link to accept payments.`,
      })
      setOpenMenuId(null)
      setMenuPosition(null)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to enable payment'
      
      if (errorMessage.includes('Stripe account')) {
        toast({
          title: 'Stripe Account Required',
          description: 'Please connect your Stripe account in Settings before enabling payments.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setPaymentLoading(null)
    }
  }

  const handleShare = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await invoicesAPI.enablePublicLink(invoiceId)
      const token = response.data.token
      const shareableUrl = `${window.location.origin}/i/${token}`
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl)
      
      toast({
        title: 'Link copied!',
        description: `Shareable link for invoice ${invoiceNumber} has been copied to clipboard.`,
      })
    } catch (error: any) {
      console.error('Share error:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate shareable link.',
        variant: 'destructive',
      })
    }
  }

  const handleDuplicate = async (invoiceId: string, invoiceNumber: string) => {
    try {
      // Call API to duplicate invoice on backend
      const response = await invoicesAPI.duplicate(invoiceId)
      const newInvoice = response.data
      
      toast({
        title: 'Invoice duplicated!',
        description: `Created ${newInvoice.number} from ${invoiceNumber}`,
      })
      
      // Navigate to builder with new invoice
      router.push(`/builder?id=${newInvoice._id}`)
    } catch (error: any) {
      console.error('Duplicate error:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to duplicate invoice.',
        variant: 'destructive',
      })
    }
  }

  const isOverdue = (invoice: any) => {
    if (invoice.status.toLowerCase() === 'paid') return false
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  const getDaysOverdue = (invoice: any) => {
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const toggleSort = (field: 'date' | 'amount' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'viewed':
        return 'bg-purple-100 text-purple-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'void':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <AppNavigation />

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Invoices</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-0.5">
                  Manage and track all your invoices
                </p>
              </div>
            </div>
            <Link href="/builder">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">New Invoice</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        {!loading && invoices.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Total Revenue */}
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-600 mb-1 truncate uppercase tracking-wider">Total Revenue</p>
                    <h3 className="text-xl sm:text-3xl font-bold truncate text-slate-900">${(statistics.total / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-1">{statistics.count} {statistics.count === 1 ? 'invoice' : 'invoices'}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-xl shadow-sm flex-shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paid */}
            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-green-50/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-600 mb-1 truncate uppercase tracking-wider">Paid</p>
                    <h3 className="text-xl sm:text-3xl font-bold text-green-700 truncate">${(statistics.paid / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-1">{statistics.paidCount} {statistics.paidCount === 1 ? 'invoice' : 'invoices'}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-xl shadow-sm flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending */}
            <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-yellow-50/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-yellow-600 mb-1 truncate uppercase tracking-wider">Pending</p>
                    <h3 className="text-xl sm:text-3xl font-bold text-yellow-700 truncate">${(statistics.pending / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-1">{statistics.pendingCount} {statistics.pendingCount === 1 ? 'invoice' : 'invoices'}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-xl shadow-sm flex-shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue */}
            <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-red-50/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-600 mb-1 truncate uppercase tracking-wider">Overdue</p>
                    <h3 className="text-xl sm:text-3xl font-bold text-red-700 truncate">${(statistics.overdue / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-1">{statistics.overdueCount} {statistics.overdueCount === 1 ? 'invoice' : 'invoices'}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-red-100 rounded-xl shadow-sm flex-shrink-0">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        {!loading && invoices.length > 0 && (
          <Card className="mb-6 shadow-lg border-2">
            <CardContent className="p-0">
              {/* Search Section */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-50 to-blue-50/30">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by invoice number, client, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm transition-all placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Section */}
              <div className="p-4 sm:p-6 border-t">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5" />
                      Filter by Status
                    </label>
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer transition-all appearance-none font-medium shadow-sm"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                      >
                        <option value="all">All Status</option>
                        <option value="draft">📝 Draft</option>
                        <option value="sent">📤 Sent</option>
                        <option value="viewed">👁️ Viewed</option>
                        <option value="paid">✅ Paid</option>
                        <option value="overdue">⚠️ Overdue</option>
                        <option value="void">🚫 Void</option>
                      </select>
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Sort By
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant={sortBy === 'date' ? 'default' : 'outline'}
                        size="default"
                        onClick={() => toggleSort('date')}
                        className={`gap-2 px-6 rounded-xl font-semibold shadow-sm transition-all ${
                          sortBy === 'date' 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                            : 'hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Date</span>
                        {sortBy === 'date' && (
                          <ArrowUpDown className="h-3.5 w-3.5 ml-1" />
                        )}
                      </Button>
                      <Button
                        variant={sortBy === 'amount' ? 'default' : 'outline'}
                        size="default"
                        onClick={() => toggleSort('amount')}
                        className={`gap-2 px-6 rounded-xl font-semibold shadow-sm transition-all ${
                          sortBy === 'amount' 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                            : 'hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <DollarSign className="h-4 w-4" />
                        <span>Amount</span>
                        {sortBy === 'amount' && (
                          <ArrowUpDown className="h-3.5 w-3.5 ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchQuery || statusFilter !== 'all' || clientIdFilter) && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t bg-blue-50/30">
                  <div className="pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Active Filters</span>
                        <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                          {[searchQuery, statusFilter !== 'all', clientIdFilter].filter(Boolean).length}
                        </Badge>
                      </div>
                      
                      {searchQuery && (
                        <Badge className="gap-2 pl-3 pr-2 py-2 bg-white border-2 border-blue-200 text-slate-700 hover:border-blue-400 transition-all">
                          <Search className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-medium">Search: <span className="font-bold">{searchQuery}</span></span>
                          <button onClick={() => setSearchQuery('')} className="hover:bg-red-100 rounded p-0.5 transition-colors">
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </Badge>
                      )}
                      {statusFilter !== 'all' && (
                        <Badge className="gap-2 pl-3 pr-2 py-2 bg-white border-2 border-green-200 text-slate-700 hover:border-green-400 transition-all">
                          <Filter className="h-3.5 w-3.5 text-green-600" />
                          <span className="font-medium">Status: <span className="font-bold capitalize">{statusFilter}</span></span>
                          <button onClick={() => setStatusFilter('all')} className="hover:bg-red-100 rounded p-0.5 transition-colors">
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </Badge>
                      )}
                      {clientIdFilter && clientNameFilter && (
                        <Badge className="gap-2 pl-3 pr-2 py-2 bg-white border-2 border-purple-200 text-slate-700 hover:border-purple-400 transition-all">
                          <User className="h-3.5 w-3.5 text-purple-600" />
                          <span className="font-medium">Client: <span className="font-bold">{decodeURIComponent(clientNameFilter)}</span></span>
                          <button onClick={clearClientFilter} className="hover:bg-red-100 rounded p-0.5 transition-colors">
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </Badge>
                      )}
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setStatusFilter('all')
                          if (clientIdFilter) clearClientFilter()
                        }}
                        className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors uppercase tracking-wider border-2 border-red-200 hover:border-red-400"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Count and Export */}
              <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        <span className="text-blue-600 text-lg">{filteredInvoices.length}</span>
                        <span className="text-slate-500 mx-1.5">/</span>
                        <span className="text-slate-600">{invoices.length}</span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {filteredInvoices.length === invoices.length ? 'All invoices' : 'Matching results'}
                      </p>
                    </div>
                  </div>
                  {filteredInvoices.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl shadow-sm hover:shadow-md transition-all" disabled>
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline font-semibold">Export</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md">
          <CardHeader className="pb-4 sm:pb-6 border-b bg-gradient-to-r from-slate-50 to-blue-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900">
                  {filteredInvoices.length === invoices.length ? 'All Invoices' : 'Filtered Results'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {filteredInvoices.length === invoices.length 
                    ? 'Complete list of your invoices' 
                    : `${filteredInvoices.length} ${filteredInvoices.length === 1 ? 'invoice' : 'invoices'} matching your filters`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <div className="text-center py-20">
                <div className="relative inline-flex">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200 border-t-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-slate-900 mt-6">Loading your invoices...</p>
                <p className="text-sm text-muted-foreground mt-2">Please wait a moment</p>
              </div>
            ) : filteredInvoices.length === 0 && clientIdFilter ? (
              <div className="text-center py-20 px-4">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 mb-6 shadow-lg">
                  <FileText className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900">No invoices for {decodeURIComponent(clientNameFilter || 'this client')}</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base">
                  This client doesn't have any invoices yet. Create one now to start tracking payments!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button onClick={clearClientFilter} variant="outline" size="lg" className="gap-2">
                    <FileText className="h-5 w-5" />
                    View All Invoices
                  </Button>
                  <Link href={`/builder?clientId=${clientIdFilter}`}>
                    <Button size="lg" className="gap-2 shadow-lg">
                      <Plus className="h-5 w-5" />
                      Create Invoice
                    </Button>
                  </Link>
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 mb-6 shadow-lg animate-bounce">
                  <FileText className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900">
                  {invoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}
                </h3>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-base sm:text-lg">
                  {invoices.length === 0 
                    ? 'Start creating professional invoices in minutes. Your first invoice is just a click away.' 
                    : 'Try adjusting your filters or search query to find what you\'re looking for.'}
                </p>
                {invoices.length === 0 ? (
                  <Link href="/builder">
                    <Button size="lg" className="gap-2 shadow-lg px-8 h-12 text-base">
                      <Plus className="h-5 w-5" />
                      Create Your First Invoice
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      if (clientIdFilter) clearClientFilter()
                    }}
                    variant="outline" 
                    size="lg" 
                    className="gap-2 px-8 h-12 text-base"
                  >
                    <X className="h-5 w-5" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredInvoices.map((invoice) => {
                  const overdueStatus = isOverdue(invoice)
                  const daysOverdue = overdueStatus ? getDaysOverdue(invoice) : 0
                  
                  return (
                  <Card
                    key={invoice._id}
                      className={`group transition-all duration-300 ${
                        overdueStatus 
                          ? 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-white shadow-md' 
                          : 'hover:shadow-xl hover:border-primary/40 hover:-translate-y-1'
                      }`}
                    >
                      <CardContent className="p-4 sm:p-5">
                        {/* Mobile Layout */}
                        <div className="sm:hidden space-y-3">
                          {/* Header: Invoice Number + Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="font-bold text-lg text-foreground mb-1.5 truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => router.push(`/builder?id=${invoice._id}`)}
                              >
                                {invoice.number}
                              </h3>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <User className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{invoice.clientName || 'No client'}</span>
                              </div>
                            </div>
                            
                            {/* Status Badge (no dropdown) */}
                            <Badge 
                              className={`text-xs font-bold px-3 py-1.5 cursor-default ${getStatusColor(invoice.status)}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {invoice.status === 'draft' && '📝 Draft'}
                              {invoice.status === 'sent' && '📤 Sent'}
                              {invoice.status === 'viewed' && '👁️ Viewed'}
                              {invoice.status === 'paid' && '✅ Paid'}
                              {invoice.status === 'overdue' && '⚠️ Overdue'}
                              {invoice.status === 'void' && '🚫 Void'}
                            </Badge>
                          </div>

                          {/* Row 2: Overdue Warning (if applicable) */}
                          {overdueStatus && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-red-700 flex-shrink-0" />
                              <span className="text-sm font-semibold text-red-900">
                                {daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`}
                              </span>
                            </div>
                          )}

                          {/* Row 3: Amount (prominent) */}
                          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              AMOUNT DUE
                            </p>
                            <p className={`text-2xl font-bold ${overdueStatus ? 'text-red-700' : 'text-foreground'}`}>
                              ${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                          </div>

                          {/* Row 4: Due Date + Payment Status */}
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground font-medium mb-0.5">
                                DUE DATE
                              </p>
                              <p className={`text-sm font-semibold ${overdueStatus ? 'text-red-700' : 'text-foreground'}`}>
                                {new Date(invoice.dueDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            
                            {invoice.payment?.enabled && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                <CreditCard className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs font-semibold text-green-700">Payment</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              onClick={() => router.push(`/builder?id=${invoice._id}`)}
                              className="gap-2 flex-1 h-10 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShare(invoice._id, invoice.number)}
                              className="gap-2 h-10 px-4 font-semibold border-2"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              ref={(el) => { if (!menuButtonRefs.current[`mobile-${invoice._id}`]) menuButtonRefs.current[`mobile-${invoice._id}`] = el }}
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (openMenuId === invoice._id) {
                                  setOpenMenuId(null)
                                  setMenuPosition(null)
                                } else {
                                  const button = menuButtonRefs.current[`mobile-${invoice._id}`]
                                  if (button) {
                                    const rect = button.getBoundingClientRect()
                                    const spaceBelow = window.innerHeight - rect.bottom
                                    const menuHeight = 400
                                    
                                    if (spaceBelow >= menuHeight) {
                                      setMenuPosition({
                                        top: rect.bottom + 8,
                                        right: window.innerWidth - rect.right
                                      })
                                    } else {
                                      setMenuPosition({
                                        top: Math.max(8, rect.top - menuHeight - 8),
                                        right: window.innerWidth - rect.right
                                      })
                                    }
                                  }
                                  setOpenMenuId(invoice._id)
                                }
                              }}
                              className="px-4 h-10 border-2"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:block">
                          <div className="flex items-center justify-between gap-6 mb-4">
                            {/* LEFT: Invoice Header */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 
                                    className="font-bold text-xl text-foreground hover:text-primary cursor-pointer transition-colors truncate"
                                    onClick={() => router.push(`/builder?id=${invoice._id}`)}
                                  >
                                    {invoice.number}
                                  </h3>
                                  <Badge 
                                    className={`text-xs font-bold px-3 py-1 ${getStatusColor(invoice.status)}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {invoice.status === 'draft' && '\ud83d\udcdd Draft'}
                                    {invoice.status === 'sent' && '\ud83d\udce4 Sent'}
                                    {invoice.status === 'viewed' && '\ud83d\udc41\ufe0f Viewed'}
                                    {invoice.status === 'paid' && '\u2705 Paid'}
                                    {invoice.status === 'overdue' && '\u26a0\ufe0f Overdue'}
                                    {invoice.status === 'void' && '\ud83d\udeab Void'}
                                  </Badge>
                                  {invoice.payment?.enabled && (
                                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs px-2 py-1">
                                      <CreditCard className="h-3 w-3 mr-1 inline" />
                                      Payment
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <User className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{invoice.clientName || 'No client specified'}</span>
                                </div>
                              </div>
                            </div>

                            {/* RIGHT: Quick Actions */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/builder?id=${invoice._id}`)}
                                className="gap-2 hover:bg-blue-50 hover:border-blue-400 transition-all"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShare(invoice._id, invoice.number)}
                                className="gap-2 hover:bg-purple-50 hover:border-purple-400 transition-all"
                              >
                                <Share2 className="h-4 w-4" />
                                Share
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicate(invoice._id, invoice.number)}
                                className="gap-2 hover:bg-green-50 hover:border-green-400 transition-all"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                ref={(el) => { menuButtonRefs.current[invoice._id] = el }}
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (openMenuId === invoice._id) {
                                    setOpenMenuId(null)
                                    setMenuPosition(null)
                                  } else {
                                    const button = menuButtonRefs.current[invoice._id]
                                    if (button) {
                                      const rect = button.getBoundingClientRect()
                                      const spaceBelow = window.innerHeight - rect.bottom
                                      const menuHeight = 400
                                      
                                      if (spaceBelow >= menuHeight) {
                                        setMenuPosition({
                                          top: rect.bottom + 8,
                                          right: window.innerWidth - rect.right
                                        })
                                      } else {
                                        setMenuPosition({
                                          top: rect.top - menuHeight - 8,
                                          right: window.innerWidth - rect.right
                                        })
                                      }
                                    }
                                    setOpenMenuId(invoice._id)
                                  }
                                }}
                                className="h-9 w-9 p-0 hover:bg-slate-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="space-y-3">
                            <div className="flex items-start gap-6">{/* Invoice Number & Client - now moved up */}
                          <div className="hidden">
                            <h3></h3>
                            <div></div>
                          </div>

                            {/* Overdue Warning */}
                            {overdueStatus && (
                              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-2 border-red-200 rounded-xl">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                <span className="text-sm font-bold text-red-900">
                                  {daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`}
                                </span>
                              </div>
                            )}

                            {/* Financial Info */}
                            <div className="flex items-center gap-8">
                              <div>
                                <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">
                                  Amount Due
                                </p>
                                <p className={`text-3xl font-bold ${overdueStatus ? 'text-red-700' : 'text-slate-900'}`}>
                                  ${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </p>
                              </div>
                              <div className="h-14 w-px bg-slate-200" />
                              <div>
                                <p className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Due Date
                                </p>
                                <p className={`text-sm font-bold ${overdueStatus ? 'text-red-700' : 'text-slate-700'}`}>
                                  {new Date(invoice.dueDate).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                                
                            </div>
                          </div>
                          </div>

                          {/* Dropdown Menu - Rendered via Portal */}
                            {openMenuId === invoice._id && menuPosition && typeof window !== 'undefined' && createPortal(
                              <>
                                {/* Backdrop to close menu */}
                                <div 
                                  className="fixed inset-0 z-[100]" 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMenuId(null)
                                    setMenuPosition(null)
                                  }}
                                />
                                
                                {/* Menu */}
                                <div 
                                  className="fixed z-[101] w-48 bg-white rounded-lg shadow-xl border overflow-hidden"
                                  style={{
                                    top: `${menuPosition.top}px`,
                                    ...(menuPosition.right !== undefined && { right: `${menuPosition.right}px` }),
                                    ...(menuPosition.left !== undefined && { left: `${menuPosition.left}px` }),
                                  }}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/builder?id=${invoice._id}`)
                                      setOpenMenuId(null)
                                      setMenuPosition(null)
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-3"
                                  >
                                    <Edit className="h-4 w-4 text-primary" />
                                    <span>View & Edit</span>
                                  </button>
                                  <div className="h-px bg-border" />
                                  
                                  {/* Change Status Submenu */}
                                  <div className="px-2 py-1.5 bg-slate-50">
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider px-2">Change Status</p>
                                  </div>
                                  {['draft', 'sent', 'viewed', 'paid', 'overdue', 'void'].map((status) => (
                                    <button
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleStatusChange(invoice._id, status)
                                        setOpenMenuId(null)
                                        setMenuPosition(null)
                                      }}
                                      className={`w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-3 ${
                                        invoice.status === status ? 'bg-blue-50 font-semibold' : ''
                                      }`}
                                    >
                                      {invoice.status === status && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                      {invoice.status !== status && <div className="h-4 w-4" />}
                                      <span className="capitalize">
                                        {status === 'draft' && '\ud83d\udcdd Draft'}
                                        {status === 'sent' && '\ud83d\udce4 Sent'}
                                        {status === 'viewed' && '\ud83d\udc41\ufe0f Viewed'}
                                        {status === 'paid' && '\u2705 Paid'}
                                        {status === 'overdue' && '\u26a0\ufe0f Overdue'}
                                        {status === 'void' && '\ud83d\udeab Void'}
                                      </span>
                                    </button>
                                  ))}
                                  <div className="h-px bg-border" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDuplicate(invoice._id, invoice.number)
                                      setOpenMenuId(null)
                                      setMenuPosition(null)
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-3"
                                  >
                                    <Copy className="h-4 w-4 text-purple-600" />
                                    <span>Duplicate Invoice</span>
                                  </button>
                                  <div className="h-px bg-border" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleShare(invoice._id, invoice.number)
                                      setOpenMenuId(null)
                                      setMenuPosition(null)
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-3"
                                  >
                                    <Share2 className="h-4 w-4 text-blue-600" />
                                    <span>Share Invoice</span>
                                  </button>
                                  {/* Enable Payment - Pro Only Feature */}
                                  {hasFeature(Feature.PAYMENT_INTEGRATION) && (
                                    <>
                                      <div className="h-px bg-border" />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEnablePayment(invoice._id, invoice.number)
                                        }}
                                        disabled={invoice.payment?.enabled || paymentLoading === invoice._id}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <CreditCard className="h-4 w-4 text-green-600" />
                                        <span>
                                          {paymentLoading === invoice._id 
                                            ? 'Enabling...' 
                                            : invoice.payment?.enabled 
                                              ? 'Payment Enabled ✓' 
                                              : 'Enable Payment'}
                                        </span>
                                      </button>
                                    </>
                                  )}
                                  <div className="h-px bg-border" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openDeleteDialog(invoice._id, invoice.number)
                                      setOpenMenuId(null)
                                      setMenuPosition(null)
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-destructive/10 transition-colors flex items-center gap-3 text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete Invoice</span>
                                  </button>
                                </div>
                              </>,
                              document.body
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <ConfirmDialog
          open={deleteDialog.open}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteConfirm}
          title="Delete Invoice"
          description={`Are you sure you want to delete invoice ${deleteDialog.invoiceNumber}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Online Payment Integration"
        description="Accept payments directly on your invoices and earn 1% platform fee. Upgrade to Pro to start getting paid online!"
      />
    </div>
  )
}


