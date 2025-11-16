'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, TrendingUp, DollarSign, Receipt, MoreVertical, Edit, Trash2, Mail, Phone, Building, FileText, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppNavigation } from '@/components/ui/app-navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import { Pagination } from '@/components/ui/pagination'
import { useAuth } from '@/contexts/auth-context'
import { useFeatures } from '@/contexts/features-context'
import { Feature } from '@/contexts/features-context'
import { clientsAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { ClientDialog } from '@/components/clients/client-dialog'

interface Client {
  _id: string
  clientType?: 'personal' | 'company'
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  taxId?: string
  notes?: string
  invoiceCounter: number
  totalInvoiced: number
  totalPaid: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <ClientsContent />
    </ProtectedRoute>
  )
}

function ClientsContent() {
  const { user, logout } = useAuth()
  const { hasFeature, isPro } = useFeatures()
  const { toast } = useToast()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState({
    totalClients: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
  })
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  // Check if user has client management feature (Pro plan users always have access)
  const canManageClients = isPro || hasFeature(Feature.CLIENT_MANAGEMENT)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null)
      }
    }

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1 on search
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!canManageClients) {
      setShowUpgradeModal(true)
    } else {
      fetchClients()
    }
  }, [canManageClients, pagination.page, debouncedSearch])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await clientsAPI.list({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
      })
      const clientsData = response.data.clients || []
      setClients(clientsData)
      if (response.data.pagination) {
        setPagination(response.data.pagination)
      }
      
      // Calculate statistics
      const totalInvoiced = clientsData.reduce((sum, c) => sum + c.totalInvoiced, 0)
      const totalPaid = clientsData.reduce((sum, c) => sum + c.totalPaid, 0)
      setStats({
        totalClients: response.data.pagination?.total || clientsData.length,
        totalInvoiced,
        totalPaid,
        totalPending: totalInvoiced - totalPaid,
      })
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const toggleDropdown = (clientId: string) => {
    setOpenDropdownId(openDropdownId === clientId ? null : clientId)
  }

  const handleAddClient = () => {
    if (!canManageClients) {
      setShowUpgradeModal(true)
      return
    }
    setSelectedClient(null)
    setDialogOpen(true)
  }

  const handleEditClient = (client: Client) => {
    if (!canManageClients) {
      setShowUpgradeModal(true)
      return
    }
    setOpenDropdownId(null)
    setSelectedClient(client)
    setDialogOpen(true)
  }

  const handleDeleteClient = (client: Client) => {
    if (!canManageClients) {
      setShowUpgradeModal(true)
      return
    }
    setOpenDropdownId(null)
    setDeleteDialog({ open: true, client })
  }

  const handleCreateInvoice = (client: Client) => {
    setOpenDropdownId(null)
    // Navigate to invoice builder with clientId in URL
    // Builder will fetch fresh client data from API
    router.push(`/builder?clientId=${client._id}`)
  }

  const handleViewInvoices = (client: Client) => {
    setOpenDropdownId(null)
    // Navigate to invoices page filtered by this client
    router.push(`/app/invoices?clientId=${client._id}&clientName=${encodeURIComponent(client.name)}`)
  }

  const confirmDelete = async () => {
    if (!deleteDialog.client) return

    try {
      await clientsAPI.delete(deleteDialog.client._id)
      toast({
        title: 'Client deleted',
        description: `${deleteDialog.client.name} has been deleted`,
      })
      fetchClients()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete client',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialog({ open: false, client: null })
    }
  }

  const handleClientSaved = () => {
    setDialogOpen(false)
    setSelectedClient(null)
    fetchClients()
  }

  if (!canManageClients) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <AppNavigation />

        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="Client Management"
          description="Upgrade to Pro to manage clients, track invoices per client, and get unique invoice numbering for each client."
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <AppNavigation />

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Clients</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-0.5">
                Manage your client relationships
              </p>
            </div>
          </div>
          <Button onClick={handleAddClient} className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Client</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Statistics Cards */}
        {!loading && clients.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Clients</CardTitle>
                <div className="p-2 bg-blue-100 rounded-xl shadow-sm">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground mt-1">Active clients</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Total Invoiced</CardTitle>
                <div className="p-2 bg-purple-100 rounded-xl shadow-sm">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">${stats.totalInvoiced.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-green-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Paid</CardTitle>
                <div className="p-2 bg-green-100 rounded-xl shadow-sm">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-green-700">${stats.totalPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalInvoiced > 0 ? Math.round((stats.totalPaid / stats.totalInvoiced) * 100) : 0}% collected
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-yellow-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Pending</CardTitle>
                <div className="p-2 bg-yellow-100 rounded-xl shadow-sm">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-yellow-700">${stats.totalPending.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Bar */}
        <Card className="shadow-md mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                />
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    Searching: {searchQuery}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative inline-flex">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200 border-t-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <p className="text-lg font-semibold text-slate-900 mt-6">Loading clients...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait</p>
          </div>
        ) : clients.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="text-center py-16">
              <div className="inline-flex p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl mb-6">
                <Users className="h-16 w-16 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {searchQuery ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
                {searchQuery
                  ? `No clients match "${searchQuery}". Try adjusting your search terms.`
                  : 'Get started by adding your first client. You can then create invoices and track payments easily.'}
              </p>
              {searchQuery ? (
                <Button onClick={() => setSearchQuery('')} variant="outline" className="gap-2 rounded-xl">
                  Clear Search
                </Button>
              ) : (
                <Button onClick={handleAddClient} size="lg" className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all">
                  <Plus className="h-5 w-5" />
                  Add Your First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => {
                const outstandingAmount = client.totalInvoiced - client.totalPaid
                const collectionRate = client.totalInvoiced > 0 
                  ? Math.round((client.totalPaid / client.totalInvoiced) * 100)
                  : 0
                
                return (
                  <Card
                    key={client._id}
                    className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden border-2 hover:border-blue-200"
                    onClick={() => handleViewInvoices(client)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md flex-shrink-0">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                              {client.name}
                            </h3>
                            {client.company && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{client.company}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative" ref={openDropdownId === client._id ? dropdownRef : null}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleDropdown(client._id)
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {openDropdownId === client._id && (
                            <div className="absolute right-0 mt-1 w-56 bg-white border-2 border-slate-200 rounded-xl shadow-2xl z-10" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleCreateInvoice(client)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-blue-50 rounded-t-xl transition-colors"
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span>Create Invoice</span>
                              </button>
                              <button
                                onClick={() => handleViewInvoices(client)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-purple-50 transition-colors"
                              >
                                <Eye className="h-4 w-4 text-purple-600" />
                                <span>View Invoices</span>
                              </button>
                              <button
                                onClick={() => handleEditClient(client)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors"
                              >
                                <Edit className="h-4 w-4 text-slate-600" />
                                <span>Edit Client</span>
                              </button>
                              <div className="border-t" />
                              <button
                                onClick={() => handleDeleteClient(client)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-b-xl transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete Client</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Contact Info */}
                      {(client.email || client.phone) && (
                        <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                          {client.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-700 truncate">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-700">{client.phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Financial Stats */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-slate-700">Invoices</span>
                          </div>
                          <Badge variant="secondary" className="font-bold">
                            {client.invoiceCounter}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Paid</p>
                            <p className="text-lg font-bold text-green-700">
                              ${client.totalPaid.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-lg">
                            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-1">Pending</p>
                            <p className="text-lg font-bold text-yellow-700">
                              ${outstandingAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Collection Rate Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">Collection Rate</span>
                            <span className="font-bold text-slate-900">{collectionRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-500 to-green-600"
                              style={{ width: `${collectionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Hint */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-center text-muted-foreground group-hover:text-blue-600 transition-colors font-medium">
                          Click to view invoices →
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>

      {/* Client Dialog */}
      <ClientDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
        onSaved={handleClientSaved}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, client: null })}
        onConfirm={confirmDelete}
        title="Delete Client"
        description={`Are you sure you want to delete ${deleteDialog.client?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Client Management"
        description="Upgrade to Pro to manage clients, track invoices per client, and get unique invoice numbering for each client."
      />
    </div>
  )
}

