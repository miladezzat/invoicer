'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, TrendingUp, DollarSign, Receipt, MoreVertical, Edit, Trash2, Mail, Phone, Building, FileText, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserDropdown } from '@/components/ui/user-dropdown'
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
      setClients(response.data.clients || [])
      if (response.data.pagination) {
        setPagination(response.data.pagination)
      }
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
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/app/invoices" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-white font-black text-sm">
                    IN
                  </div>
                  <span className="text-xl font-bold">Invoicer</span>
                </Link>
                <h1 className="text-2xl font-bold text-muted-foreground">Clients</h1>
              </div>
              <UserDropdown />
            </div>
          </div>
        </header>

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/app/invoices" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-white font-black text-sm">
                  IN
                </div>
                <span className="text-xl font-bold">Invoicer</span>
              </Link>
              <h1 className="text-2xl font-bold">Clients</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/app/invoices">
                <Button variant="outline" size="sm">
                  <Receipt className="h-4 w-4 mr-2" />
                  Invoices
                </Button>
              </Link>
              <Link href="/app/settings">
                <Button variant="outline" size="sm">
                  Settings
                </Button>
              </Link>
              <UserDropdown />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button onClick={handleAddClient} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add your first client to get started with organized invoicing'}
            </p>
            {!searchQuery && (
              <Button onClick={handleAddClient} className="gap-2">
                <Plus className="h-5 w-5" />
                Add Your First Client
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => (
              <div
                key={client._id}
                className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewInvoices(client)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{client.name}</h3>
                    {client.company && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building className="h-3.5 w-3.5" />
                        {client.company}
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={openDropdownId === client._id ? dropdownRef : null}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleDropdown(client._id)
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {openDropdownId === client._id && (
                      <div className="absolute right-0 mt-1 w-56 bg-card border rounded-lg shadow-lg z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleCreateInvoice(client)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent rounded-t-lg"
                        >
                          <FileText className="h-4 w-4" />
                          Create Invoice
                        </button>
                        <button
                          onClick={() => handleViewInvoices(client)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                        >
                          <Eye className="h-4 w-4" />
                          View Invoices
                        </button>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {client.phone}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Invoices</p>
                    <p className="text-sm font-semibold">{client.invoiceCounter}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                    <p className="text-sm font-semibold text-orange-600">
                      ${client.totalInvoiced.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Paid</p>
                    <p className="text-sm font-semibold text-green-600">
                      ${client.totalPaid.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="mt-6">
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

