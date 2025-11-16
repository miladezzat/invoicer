'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, User, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { clientsAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface Client {
  _id: string
  name: string
  email?: string
  company?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

interface ClientSelectorProps {
  selectedClient?: {
    id?: string
    name?: string
  }
  onSelect: (client: Client | null) => void
  onManualInput?: (name: string) => void
  disabled?: boolean
}

export function ClientSelector({ selectedClient, onSelect, onManualInput, disabled = false }: ClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const { toast } = useToast()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch clients when search query changes
  useEffect(() => {
    const fetchClients = async () => {
      if (manualMode) return
      
      try {
        setLoading(true)
        const response = await clientsAPI.list({
          page: 1,
          limit: 10,
          search: searchQuery,
        })
        setClients(response.data.clients || [])
        setShowDropdown(true)
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

    if (searchQuery.length > 0 || showDropdown) {
      const timer = setTimeout(fetchClients, 300)
      return () => clearTimeout(timer)
    } else {
      setClients([])
    }
  }, [searchQuery, showDropdown, manualMode])

  const handleSelectClient = (client: Client) => {
    onSelect(client)
    setSearchQuery(client.name)
    setShowDropdown(false)
  }

  const handleClearSelection = () => {
    onSelect(null)
    setSearchQuery('')
    setManualMode(false)
    inputRef.current?.focus()
  }

  const handleManualMode = () => {
    setManualMode(true)
    setShowDropdown(false)
    onSelect(null)
  }

  const handleSearchMode = () => {
    setManualMode(false)
    setSearchQuery('')
  }

  if (manualMode) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="clientName">Client Name</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSearchMode}
            disabled={disabled}
            className="h-6 text-xs"
          >
            <Search className="h-3 w-3 mr-1" />
            Search Clients
          </Button>
        </div>
        <Input
          id="clientName"
          value={selectedClient?.name || ''}
          onChange={(e) => onManualInput?.(e.target.value)}
          placeholder="Enter client name manually"
          disabled={disabled}
        />
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor="clientSearch">Client Name</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleManualMode}
          disabled={disabled}
          className="h-6 text-xs"
        >
          Enter Manually
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="clientSearch"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => !disabled && setShowDropdown(true)}
          placeholder={selectedClient?.name || "Search or select a client..."}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {(searchQuery || selectedClient?.id) && !disabled && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && !selectedClient?.id && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No clients found' : 'Start typing to search clients'}
            </div>
          ) : (
            <div className="py-1">
              {clients.map((client) => (
                <button
                  key={client._id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-start gap-2"
                >
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{client.name}</div>
                    {client.company && (
                      <div className="text-xs text-muted-foreground truncate">
                        {client.company}
                      </div>
                    )}
                    {client.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {client.email}
                      </div>
                    )}
                  </div>
                  {selectedClient?.id === client._id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Client Info */}
      {selectedClient?.id && (
        <div className="mt-2 p-2 bg-accent rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Client selected</span>
          </div>
        </div>
      )}
    </div>
  )
}

