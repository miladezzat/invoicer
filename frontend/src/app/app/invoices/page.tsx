'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import { Plus, FileText, Trash2, Eye, MoreVertical, Edit, Share2, User, CreditCard, Settings, X, BarChart3, Search, Filter, Download, Copy, TrendingUp, DollarSign, Clock, CheckCircle2, AlertCircle, ArrowUpDown, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserDropdown } from '@/components/ui/user-dropdown'
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between">
            <Link href="/app/invoices" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-white font-black text-sm">
                IN
              </div>
              <span className="text-xl font-bold">Invoicer</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/app/clients">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Clients
                </Button>
              </Link>
              {hasFeature(Feature.ANALYTICS) && (
                <Link href="/app/analytics">
                  <Button variant="outline" size="sm" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                </Link>
              )}
              {hasFeature(Feature.API_ACCESS) && (
                <Link href="/app/developer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Developer
                  </Button>
                </Link>
              )}
              <Link href="/app/settings">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Link href="/builder">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Invoice
                </Button>
              </Link>
              <UserDropdown />
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-3">
              <Link href="/app/invoices" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-lg bg-[#1e293b] flex items-center justify-center text-white font-black text-xs">
                  IN
                </div>
                <span className="text-lg font-bold">Invoicer</span>
              </Link>
              <UserDropdown />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Link href="/builder" className="flex-1">
                <Button size="sm" className="gap-1.5 w-full">
                  <Plus className="h-4 w-4" />
                  <span>New Invoice</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header Section */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Invoices</h1>
          <p className="text-xs sm:text-base text-muted-foreground">
            Manage and track all your invoices
          </p>
        </div>

        {/* Statistics Cards */}
        {!loading && invoices.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Total Revenue */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1 truncate">Total</p>
                    <h3 className="text-base sm:text-2xl font-bold truncate">${(statistics.total / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{statistics.count} invoices</p>
                  </div>
                  <div className="p-1.5 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paid */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1 truncate">Paid</p>
                    <h3 className="text-base sm:text-2xl font-bold text-green-700 truncate">${(statistics.paid / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{statistics.paidCount} invoices</p>
                  </div>
                  <div className="p-1.5 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending */}
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1 truncate">Pending</p>
                    <h3 className="text-base sm:text-2xl font-bold text-yellow-700 truncate">${(statistics.pending / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{statistics.pendingCount} invoices</p>
                  </div>
                  <div className="p-1.5 sm:p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue */}
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1 truncate">Overdue</p>
                    <h3 className="text-base sm:text-2xl font-bold text-red-700 truncate">${(statistics.overdue / 1000).toFixed(1)}k</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{statistics.overdueCount} invoices</p>
                  </div>
                  <div className="p-1.5 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        {!loading && invoices.length > 0 && (
          <Card className="mb-4 sm:mb-6">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex gap-2">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="void">Void</option>
                  </select>

                  {/* Sort Options */}
                  <Button
                    variant={sortBy === 'date' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSort('date')}
                    className="gap-1.5 px-3"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Date</span>
                    {sortBy === 'date' && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant={sortBy === 'amount' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSort('amount')}
                    className="gap-1.5 px-3"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Amount</span>
                    {sortBy === 'amount' && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchQuery || statusFilter !== 'all' || clientIdFilter) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {searchQuery && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
                      <span>Search: {searchQuery}</span>
                      <button onClick={() => setSearchQuery('')} className="hover:text-primary">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {statusFilter !== 'all' && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
                      <span>Status: {statusFilter}</span>
                      <button onClick={() => setStatusFilter('all')} className="hover:text-primary">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
              {clientIdFilter && clientNameFilter && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
                      <User className="h-3 w-3" />
                      <span>Client: {decodeURIComponent(clientNameFilter)}</span>
                      <button onClick={clearClientFilter} className="hover:text-primary">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      if (clientIdFilter) clearClientFilter()
                    }}
                    className="text-sm text-muted-foreground hover:text-primary underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Results Count */}
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {filteredInvoices.length} of {invoices.length} invoices
            </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">
              {filteredInvoices.length === invoices.length ? 'All Invoices' : 'Filtered Invoices'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Loading your invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 && clientIdFilter ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No invoices for {decodeURIComponent(clientNameFilter || 'this client')}</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  This client doesn't have any invoices yet. Create one now!
                </p>
                <Button onClick={clearClientFilter} variant="outline" className="mr-2">
                  View All Invoices
                </Button>
                <Link href={`/builder?clientId=${clientIdFilter}`}>
                  <Button className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No invoices yet</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Start creating professional invoices in minutes. Your first invoice is just a click away.
                </p>
                <Link href="/builder">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Your First Invoice
                  </Button>
                </Link>
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
                          ? 'border-l-4 border-l-red-500 bg-red-50/30' 
                          : 'hover:shadow-md hover:border-primary/30'
                      }`}
                    >
                      <CardContent className="p-4 sm:p-5">
                        {/* Mobile Layout */}
                        <div className="sm:hidden space-y-4">
                          {/* Row 1: Invoice Number + Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="font-bold text-base text-foreground mb-1 truncate"
                    onClick={() => router.push(`/builder?id=${invoice._id}`)}
                  >
                                {invoice.number}
                              </h3>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <User className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{invoice.clientName || 'No client'}</span>
                              </div>
                            </div>
                            
                            <div onClick={(e) => e.stopPropagation()}>
                              <select
                                value={invoice.status}
                                onChange={(e) => handleStatusChange(invoice._id, e.target.value)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${getStatusColor(invoice.status)}`}
                              >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="viewed">Viewed</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                                <option value="void">Void</option>
                              </select>
                            </div>
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

                          {/* Row 5: Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/builder?id=${invoice._id}`)}
                              className="gap-1.5 flex-1 h-9"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="text-sm">View</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShare(invoice._id, invoice.number)}
                              className="gap-1.5 flex-1 h-9"
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="text-sm">Share</span>
                            </Button>
                            <Button
                              ref={(el) => { if (!menuButtonRefs.current[`mobile-${invoice._id}`]) menuButtonRefs.current[`mobile-${invoice._id}`] = el }}
                              variant="ghost"
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
                              className="px-3 h-9"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:block">
                      <div className="flex items-start justify-between gap-6">
                        {/* LEFT SECTION: Invoice Identity & Client */}
                        <div className="flex-1 min-w-0 space-y-3">
                              {/* Invoice Number & Client */}
                          <div>
                                <h3 
                                  className="font-bold text-xl text-foreground mb-1 hover:text-primary cursor-pointer transition-colors"
                                  onClick={() => router.push(`/builder?id=${invoice._id}`)}
                                >
                              {invoice.number}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{invoice.clientName || 'No client specified'}</span>
                            </div>
                          </div>

                              {/* Overdue Warning */}
                              {overdueStatus && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  <span className="text-sm font-medium text-red-700">
                                    {daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`}
                                  </span>
                                </div>
                              )}

                              {/* Financial Info */}
                              <div className="flex items-center gap-8">
                            <div>
                              <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
                                Amount
                              </p>
                                  <p className={`text-2xl font-bold ${overdueStatus ? 'text-red-700' : 'text-foreground'}`}>
                                ${invoice.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </p>
                            </div>
                            <div className="h-12 w-px bg-border" />
                            <div>
                              <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
                                Due Date
                              </p>
                                  <p className={`text-sm font-semibold ${overdueStatus ? 'text-red-700' : 'text-foreground'}`}>
                                {new Date(invoice.dueDate).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                                
                                {/* Payment Status Indicator */}
                                {invoice.payment?.enabled && (
                                  <>
                                    <div className="h-12 w-px bg-border" />
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                      <CreditCard className="h-4 w-4 text-green-600" />
                                      <span className="text-xs font-medium text-green-700">Payment Enabled</span>
                                    </div>
                                  </>
                                )}
                          </div>

                              {/* Quick Actions - Desktop */}
                              <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/builder?id=${invoice._id}`)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShare(invoice._id, invoice.number)}
                                  className="gap-2"
                                >
                                  <Share2 className="h-4 w-4" />
                                  Share
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDuplicate(invoice._id, invoice.number)}
                                  className="gap-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </Button>
                          </div>
                        </div>

                            {/* RIGHT SECTION: Status & Actions - Desktop Only */}
                        <div className="flex flex-col gap-3 items-end" onClick={(e) => e.stopPropagation()}>
                          {/* Status Dropdown */}
                          <select
                            value={invoice.status}
                            onChange={(e) => handleStatusChange(invoice._id, e.target.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer shadow-sm hover:shadow transition-shadow ${getStatusColor(invoice.status)}`}
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="viewed">Viewed</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                            <option value="void">Void</option>
                          </select>

                          {/* Actions Menu */}
                          <div className="relative">
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
                                    const menuHeight = 400 // approximate menu height
                                    
                                    // Position dropdown below or above button based on available space
                                    if (spaceBelow >= menuHeight) {
                                      // Position below
                                      setMenuPosition({
                                        top: rect.bottom + 8,
                                        right: window.innerWidth - rect.right
                                      })
                                    } else {
                                      // Position above
                                      setMenuPosition({
                                        top: rect.top - menuHeight - 8,
                                        right: window.innerWidth - rect.right
                                      })
                                    }
                                  }
                                  setOpenMenuId(invoice._id)
                                }
                              }}
                              className="h-8 w-8 p-0 hover:bg-secondary"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>

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
                          </div>
                        </div>
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


