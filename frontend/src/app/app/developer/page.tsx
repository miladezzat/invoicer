'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserDropdown } from '@/components/ui/user-dropdown'
import { FeatureGate } from '@/components/feature-gate'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { OpenApiPlayground } from '@/components/developer/openapi-playground'
import { apiKeysAPI, webhooksAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Feature } from '@/contexts/features-context'
import { 
  Key, 
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  Copy,
  Power,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Code,
  Zap,
  Book,
  Send,
  FileJson,
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  prefix: string
  key?: string
  permissions: string[]
  isActive: boolean
  lastUsedAt?: string
  usageCount: number
  createdAt: string
}

interface Webhook {
  id: string
  url: string
  description?: string
  events: string[]
  isActive: boolean
  successCount: number
  failureCount: number
  lastTriggeredAt?: string
  createdAt: string
}

// Get backend URL from env
const getBackendUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  // Remove /api suffix if present to get base URL
  return apiUrl.replace('/api', '')
}

// API Playground Component
function ApiPlayground({ apiKeys }: { apiKeys: ApiKey[] }) {
  const { toast } = useToast()
  const [selectedEndpoint, setSelectedEndpoint] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('GET')
  const [selectedKeyId, setSelectedKeyId] = useState('')
  const [selectedApiKey, setSelectedApiKey] = useState('')
  const [manualApiKey, setManualApiKey] = useState('')
  const [useManualKey, setUseManualKey] = useState(false)
  const [requestBody, setRequestBody] = useState('')
  const [queryParams, setQueryParams] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const backendUrl = getBackendUrl()

  const endpoints = [
    { method: 'GET', path: '/invoices', description: 'List all invoices' },
    { method: 'GET', path: '/invoices/:id', description: 'Get invoice by ID' },
    { method: 'POST', path: '/invoices', description: 'Create new invoice' },
    { method: 'PUT', path: '/invoices/:id', description: 'Update invoice' },
    { method: 'DELETE', path: '/invoices/:id', description: 'Delete invoice' },
    { method: 'GET', path: '/clients', description: 'List all clients' },
    { method: 'GET', path: '/clients/:id', description: 'Get client by ID' },
    { method: 'POST', path: '/clients', description: 'Create new client' },
    { method: 'PUT', path: '/clients/:id', description: 'Update client' },
    { method: 'DELETE', path: '/clients/:id', description: 'Delete client' },
    { method: 'GET', path: '/analytics', description: 'Get analytics data' },
  ]

  const activeApiKeys = apiKeys.filter(key => key.isActive)

  const validateJSON = (text: string) => {
    if (!text.trim()) {
      setJsonError(null)
      return true
    }
    try {
      JSON.parse(text)
      setJsonError(null)
      return true
    } catch (e: any) {
      setJsonError(e.message)
      return false
    }
  }

  const formatJSON = () => {
    if (!requestBody.trim()) return
    try {
      const parsed = JSON.parse(requestBody)
      setRequestBody(JSON.stringify(parsed, null, 2))
      setJsonError(null)
      toast({ title: 'JSON formatted successfully' })
    } catch (e: any) {
      toast({ 
        title: 'Invalid JSON', 
        description: e.message,
        variant: 'destructive' 
      })
    }
  }

  const handleSendRequest = async () => {
    const apiKey = useManualKey ? manualApiKey : selectedApiKey
    if (!apiKey) {
      toast({ 
        title: 'Error', 
        description: 'Please select or enter an API key',
        variant: 'destructive' 
      })
      return
    }
    if (!selectedEndpoint) {
      toast({ 
        title: 'Error', 
        description: 'Please select an endpoint',
        variant: 'destructive' 
      })
      return
    }

    // Validate JSON body for POST/PUT
    if ((selectedMethod === 'POST' || selectedMethod === 'PUT') && requestBody.trim()) {
      if (!validateJSON(requestBody)) {
        toast({ 
          title: 'Invalid JSON', 
          description: jsonError || 'Please fix JSON syntax errors',
          variant: 'destructive' 
        })
        return
      }
    }

    setLoading(true)
    setResponse(null)
    setResponseTime(null)

    try {
      const startTime = performance.now()
      
      // Build URL using backend URL from env
      let url = `${backendUrl}/public/apis/v1${selectedEndpoint}`
      if (queryParams && queryParams.trim()) {
        url += `?${queryParams.trim()}`
      }

      console.log('Making request to:', url)
      console.log('Method:', selectedMethod)
      console.log('API Key:', apiKey.substring(0, 20) + '...')

      // Build request options
      const options: RequestInit = {
        method: selectedMethod,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }

      // Add body for POST/PUT requests
      if ((selectedMethod === 'POST' || selectedMethod === 'PUT') && requestBody.trim()) {
        options.body = requestBody
        console.log('Request body:', requestBody)
      }

      // Make request
      const res = await fetch(url, options)
      
      // Try to parse as JSON, but handle errors gracefully
      let data
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        data = { 
          error: true, 
          message: 'Non-JSON response received',
          rawResponse: text.substring(0, 500) // First 500 chars
        }
      }
      
      const endTime = performance.now()
      setResponseTime(Math.round(endTime - startTime))

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: data,
      })

      if (!res.ok) {
        toast({
          title: `Error ${res.status}`,
          description: data.message || res.statusText,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('Request error:', error)
      setResponse({
        error: true,
        message: error.message,
        stack: error.stack,
      })
      toast({
        title: 'Request Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800'
      case 'POST': return 'bg-blue-100 text-blue-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            API Playground
          </CardTitle>
          <CardDescription>
            Test your API endpoints directly from the browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key Selection */}
          <div className="space-y-2">
            <label htmlFor="api-key" className="text-sm font-medium">API Key</label>
            {activeApiKeys.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No active API keys. Create one in the API Keys tab.
              </div>
            ) : (
              <>
                <select
                  id="api-key"
                  value={selectedKeyId}
                  onChange={(e) => {
                    const selectedId = e.target.value
                    setSelectedKeyId(selectedId)
                    
                    if (selectedId) {
                      const key = activeApiKeys.find(k => k.id === selectedId)
                      if (key && key.key) {
                        setSelectedApiKey(key.key)
                        toast({ 
                          title: 'API Key Selected',
                          description: `Using key: ${key.name}` 
                        })
                      } else {
                        setSelectedApiKey('')
                        toast({ 
                          title: 'Warning',
                          description: 'This key was created before. Please use manual entry or create a new key.',
                          variant: 'destructive'
                        })
                      }
                    } else {
                      setSelectedApiKey('')
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select an API key</option>
                  {activeApiKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.prefix}...)
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="use-manual-key"
                    checked={useManualKey}
                    onChange={(e) => setUseManualKey(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="use-manual-key" className="text-sm text-muted-foreground cursor-pointer">
                    Enter API key manually
                  </label>
                </div>
                {useManualKey && (
                  <input
                    type="text"
                    placeholder="inv_xxxxx_xxxxxxxxxxxxxxxx"
                    value={manualApiKey}
                    onChange={(e) => setManualApiKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm mt-2"
                  />
                )}
                {!useManualKey && !activeApiKeys.some(k => k.key) && (
                  <p className="text-xs text-amber-600">
                    Note: Existing keys only show the prefix. Create a new key or use manual entry.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Endpoint Selection */}
          <div className="space-y-2">
            <label htmlFor="endpoint" className="text-sm font-medium">Endpoint</label>
            <select
              id="endpoint"
              value={selectedEndpoint ? `${selectedMethod}:${selectedEndpoint}` : ''}
              onChange={(e) => {
                const value = e.target.value
                if (value) {
                  // Parse the combined value (METHOD:PATH)
                  const [method, ...pathParts] = value.split(':')
                  const path = pathParts.join(':') // Handle paths that might contain ':'
                  setSelectedMethod(method)
                  setSelectedEndpoint(path)
                } else {
                  setSelectedEndpoint('')
                  setSelectedMethod('GET')
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Select an endpoint</option>
              {endpoints.map((endpoint) => (
                <option 
                  key={`${endpoint.method}:${endpoint.path}`} 
                  value={`${endpoint.method}:${endpoint.path}`}
                >
                  {endpoint.method} {endpoint.path}
                </option>
              ))}
            </select>
          </div>

          {/* Query Parameters */}
          <div className="space-y-2">
            <label htmlFor="query-params" className="text-sm font-medium">Query Parameters (e.g., status=paid&limit=10)</label>
            <input
              type="text"
              id="query-params"
              value={queryParams}
              onChange={(e) => setQueryParams(e.target.value)}
              placeholder="status=paid&limit=10"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Request Body */}
          {(selectedMethod === 'POST' || selectedMethod === 'PUT') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="request-body" className="text-sm font-medium">Request Body (JSON)</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatJSON}
                  disabled={!requestBody.trim()}
                >
                  <Code className="h-4 w-4 mr-1" />
                  Format
                </Button>
              </div>
              <textarea
                id="request-body"
                value={requestBody}
                onChange={(e) => {
                  setRequestBody(e.target.value)
                  validateJSON(e.target.value)
                }}
                placeholder='{\n  "clientName": "Acme Corp",\n  "amount": 1000\n}'
                rows={10}
                className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${
                  jsonError ? 'border-red-500' : ''
                }`}
              />
              {jsonError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {jsonError}
                </div>
              )}
            </div>
          )}

          {/* Send Button */}
          <Button 
            onClick={handleSendRequest} 
            disabled={loading || (!selectedApiKey && !manualApiKey) || !selectedEndpoint}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Response
              </span>
              {responseTime !== null && (
                <span className="text-sm font-normal text-muted-foreground">
                  {responseTime}ms
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            {response.status && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <span className={`px-2 py-1 text-sm font-bold rounded ${
                  response.status >= 200 && response.status < 300 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {response.status} {response.statusText}
                </span>
              </div>
            )}

            {/* Response Data */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Response Body:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(response.data || response, null, 2))
                    toast({ title: 'Copied to clipboard' })
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-96 overflow-y-auto">
                {JSON.stringify(response.data || response, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function DeveloperPage() {
  return (
    <ProtectedRoute>
      <FeatureGate feature={Feature.API_ACCESS}>
        <DeveloperContent />
      </FeatureGate>
    </ProtectedRoute>
  )
}

function DeveloperContent() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'api-keys' | 'webhooks' | 'playground' | 'openapi' | 'docs'>('api-keys')
  const [loading, setLoading] = useState(true)
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  
  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [availableEvents, setAvailableEvents] = useState<string[]>([])
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    description: '',
    events: [] as string[],
  })
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'api-keys' || activeTab === 'playground' || activeTab === 'openapi') {
        const response = await apiKeysAPI.list()
        setApiKeys(response.data.data)
      } else if (activeTab === 'webhooks') {
        const [webhooksRes, eventsRes] = await Promise.all([
          webhooksAPI.list(),
          webhooksAPI.listEvents(),
        ])
        setWebhooks(webhooksRes.data.data)
        setAvailableEvents(eventsRes.data.data)
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // API Keys functions
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a key name',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await apiKeysAPI.create({ name: newKeyName })
      setCreatedKey(response.data.data.key!)
      setNewKeyName('')
      fetchData()
      toast({
        title: 'API Key Created',
        description: 'Make sure to copy your API key now. You won\'t be able to see it again!',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create API key',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteApiKey = async () => {
    if (!deleteKeyId) return

    try {
      await apiKeysAPI.delete(deleteKeyId)
      setDeleteKeyId(null)
      fetchData()
      toast({
        title: 'API Key Deleted',
        description: 'The API key has been permanently deleted',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete API key',
        variant: 'destructive',
      })
    }
  }

  const handleToggleApiKey = async (keyId: string, isActive: boolean) => {
    try {
      await apiKeysAPI.toggle(keyId, !isActive)
      fetchData()
      toast({
        title: isActive ? 'API Key Disabled' : 'API Key Enabled',
        description: `The API key has been ${isActive ? 'disabled' : 'enabled'}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to toggle API key',
        variant: 'destructive',
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: 'API key copied to clipboard',
    })
  }

  // Webhooks functions
  const handleCreateWebhook = async () => {
    if (!newWebhook.url.trim() || newWebhook.events.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter a URL and select at least one event',
        variant: 'destructive',
      })
      return
    }

    try {
      await webhooksAPI.create(newWebhook)
      setNewWebhook({ url: '', description: '', events: [] })
      setShowCreateWebhookModal(false)
      fetchData()
      toast({
        title: 'Webhook Created',
        description: 'Your webhook has been registered successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create webhook',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteWebhook = async () => {
    if (!deleteWebhookId) return

    try {
      await webhooksAPI.delete(deleteWebhookId)
      setDeleteWebhookId(null)
      fetchData()
      toast({
        title: 'Webhook Deleted',
        description: 'The webhook has been permanently deleted',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete webhook',
        variant: 'destructive',
      })
    }
  }

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      await webhooksAPI.toggle(webhookId, !isActive)
      fetchData()
      toast({
        title: isActive ? 'Webhook Disabled' : 'Webhook Enabled',
        description: `The webhook has been ${isActive ? 'disabled' : 'enabled'}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to toggle webhook',
        variant: 'destructive',
      })
    }
  }

  const toggleWebhookEvent = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

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
        <div className="mb-6">
            {/* <h1 className="text-2xl font-bold text-muted-foreground mb-6">Developer Mode</h1> */}
            <h1 className="text-base sm:text-2xl font-bold text-muted-foreground truncate">
                <span className="hidden sm:inline">Developer Mode</span>
                <span className="sm:hidden">Developer</span>
              </h1>
        </div>
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Info Banner */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Code className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">API Access Enabled</h3>
                  <p className="text-sm text-blue-800">
                    Integrate your invoicing system with external applications using API keys and webhooks.
                    Automate workflows, sync data, and build custom integrations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'api-keys'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
                <span className="sm:hidden">Keys</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'webhooks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <WebhookIcon className="h-4 w-4" />
                Webhooks
              </div>
            </button>
            <button
              onClick={() => setActiveTab('openapi')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'openapi'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                <span className="hidden sm:inline">API Explorer</span>
                <span className="sm:hidden">Explorer</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('playground')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'playground'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Playground</span>
                <span className="sm:hidden">Play</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                <span className="hidden sm:inline">Documentation</span>
                <span className="sm:hidden">Docs</span>
              </div>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* API Keys Tab */}
              {activeTab === 'api-keys' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">API Keys</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Manage your API keys for programmatic access
                      </p>
                    </div>
                    <Button onClick={() => setShowCreateKeyModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Key
                    </Button>
                  </div>

                  {apiKeys.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                          <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No API keys yet. Create one to get started!</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map((key) => (
                        <Card key={key.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold truncate">{key.name}</h3>
                                  {key.isActive ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                      <CheckCircle className="h-3 w-3" />
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                                      <XCircle className="h-3 w-3" />
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm">
                                  <p className="text-muted-foreground">
                                    <span className="font-mono">{key.prefix}_••••••••</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Usage: {key.usageCount} requests
                                    {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleApiKey(key.id, key.isActive)}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteKeyId(key.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Webhooks Tab */}
              {activeTab === 'webhooks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Webhooks</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Receive real-time notifications for events
                      </p>
                    </div>
                    <Button onClick={() => setShowCreateWebhookModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Webhook
                    </Button>
                  </div>

                  {webhooks.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                          <WebhookIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No webhooks configured. Add one to receive event notifications!</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {webhooks.map((webhook) => (
                        <Card key={webhook.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold truncate">{webhook.url}</h3>
                                  {webhook.isActive ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full flex-shrink-0">
                                      <CheckCircle className="h-3 w-3" />
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full flex-shrink-0">
                                      <XCircle className="h-3 w-3" />
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                {webhook.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{webhook.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {webhook.events.map((event) => (
                                    <span
                                      key={event}
                                      className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                                    >
                                      {event}
                                    </span>
                                  ))}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="text-green-600">{webhook.successCount} successful</span>
                                  {webhook.failureCount > 0 && (
                                    <span className="text-red-600"> • {webhook.failureCount} failed</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleWebhook(webhook.id, webhook.isActive)}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteWebhookId(webhook.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* OpenAPI Explorer Tab */}
              {activeTab === 'openapi' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">Interactive API Explorer</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Explore and test API endpoints using OpenAPI/Swagger UI
                      </p>
                    </div>
                  </div>
                  <OpenApiPlayground apiKeys={apiKeys} />
                </div>
              )}

              {/* Playground Tab */}
              {activeTab === 'playground' && (
                <ApiPlayground apiKeys={apiKeys} />
              )}

              {/* Documentation Tab */}
              {activeTab === 'docs' && (
                <div className="space-y-4">
                  {/* Getting Started */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Getting Started</CardTitle>
                      <CardDescription>Learn how to integrate with the Invoicer API</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Authentication</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Include your API key in the Authorization header:
                        </p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`Authorization: Bearer inv_your_api_key_here`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Base URL</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          External API endpoints use a separate base URL:
                        </p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`${getBackendUrl()}/public/apis/v1`}
                        </pre>
                        <p className="text-xs text-muted-foreground mt-2">
                          Current backend: {getBackendUrl()}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Content Type</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          All requests must include:
                        </p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`Content-Type: application/json`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Response Format</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          All API responses are in JSON format:
                        </p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": { ... },
  "message": "Success"
}`}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoices API */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoices API</CardTitle>
                      <CardDescription>Manage invoices programmatically</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* List Invoices */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">GET</span>
                          <code className="text-sm">/invoices</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">List all your invoices</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET \\
  ${getBackendUrl()}/public/apis/v1/invoices \\
  -H "Authorization: Bearer inv_your_api_key" \\
  -H "Content-Type: application/json"`}
                        </pre>
                      </div>

                      {/* Get Invoice */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">GET</span>
                          <code className="text-sm">/invoices/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Get a specific invoice by ID</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET \\
  ${getBackendUrl()}/public/apis/v1/invoices/invoice_id \\
  -H "Authorization: Bearer inv_your_api_key"`}
                        </pre>
                      </div>

                      {/* Create Invoice */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">POST</span>
                          <code className="text-sm">/invoices</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Create a new invoice</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST \\
  ${getBackendUrl()}/public/apis/v1/invoices \\
  -H "Authorization: Bearer inv_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "client_id",
    "clientName": "Acme Corp",
    "clientEmail": "client@acme.com",
    "issueDate": "2025-11-02",
    "dueDate": "2025-12-02",
    "currency": "USD",
    "lineItems": [
      {
        "description": "Web Development",
        "quantity": 40,
        "rate": 100
      }
    ],
    "notes": "Thank you for your business!"
  }'`}
                        </pre>
                      </div>

                      {/* Update Invoice */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">PUT</span>
                          <code className="text-sm">/invoices/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Update an existing invoice</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X PUT \\
  ${getBackendUrl()}/public/apis/v1/invoices/invoice_id \\
  -H "Authorization: Bearer inv_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "sent",
    "notes": "Updated notes"
  }'`}
                        </pre>
                      </div>

                      {/* Delete Invoice */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">DELETE</span>
                          <code className="text-sm">/invoices/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Delete an invoice</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X DELETE \\
  ${getBackendUrl()}/public/apis/v1/invoices/invoice_id \\
  -H "Authorization: Bearer inv_your_api_key"`}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Clients API */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Clients API</CardTitle>
                      <CardDescription>Manage your client database</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* List Clients */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">GET</span>
                          <code className="text-sm">/clients</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">List all clients with optional search</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET \\
  ${getBackendUrl()}/public/apis/v1/clients?search=acme \\
  -H "Authorization: Bearer inv_your_api_key"`}
                        </pre>
                      </div>

                      {/* Get Client */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">GET</span>
                          <code className="text-sm">/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Get a specific client by ID</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET \\
  ${getBackendUrl()}/public/apis/v1/clients/client_id \\
  -H "Authorization: Bearer inv_your_api_key"`}
                        </pre>
                      </div>

                      {/* Create Client */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">POST</span>
                          <code className="text-sm">/clients</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Create a new client</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST \\
  ${getBackendUrl()}/public/apis/v1/clients \\
  -H "Authorization: Bearer inv_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "company": "Acme Corp",
    "address": "123 Business St, City, State 12345",
    "phone": "+1234567890"
  }'`}
                        </pre>
                      </div>

                      {/* Update Client */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">PUT</span>
                          <code className="text-sm">/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Update client information</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X PUT \\
  ${getBackendUrl()}/public/apis/v1/clients/client_id \\
  -H "Authorization: Bearer inv_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "newemail@acme.com",
    "phone": "+1987654321"
  }'`}
                        </pre>
                      </div>

                      {/* Delete Client */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">DELETE</span>
                          <code className="text-sm">/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Delete a client</p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X DELETE \\
  ${getBackendUrl()}/public/apis/v1/clients/client_id \\
  -H "Authorization: Bearer inv_your_api_key"`}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analytics API */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Analytics API</CardTitle>
                      <CardDescription>Access your business analytics data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Get Analytics */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">GET</span>
                          <code className="text-sm">/analytics</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Get analytics data for a specific period</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          <strong>Query Parameters:</strong> period (30d, 90d, 1y, all)
                        </p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET \\
  ${getBackendUrl()}/public/apis/v1/analytics?period=30d \\
  -H "Authorization: Bearer inv_your_api_key"`}
                        </pre>
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Response:</p>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "invoiceStats": {
      "total": 45,
      "paid": 30,
      "pending": 10,
      "overdue": 5,
      "totalRevenue": 125000,
      "paidRevenue": 95000
    },
    "revenueOverTime": [...],
    "topClients": [...],
    "currencyBreakdown": {
      "USD": 100000,
      "EUR": 25000
    }
  }
}`}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Webhooks */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Webhooks</CardTitle>
                      <CardDescription>Receive real-time event notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Available Events</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.created</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.updated</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.deleted</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.sent</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.viewed</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.paid</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">client.created</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">client.updated</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">payment.received</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">payment.failed</code>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Webhook Payload</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          When an event occurs, we'll POST to your webhook URL:
                        </p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "event": "invoice.paid",
  "timestamp": "2025-11-02T10:30:00Z",
  "data": {
    "id": "invoice_id",
    "number": "INV-001",
    "status": "paid",
    "total": 5000,
    "clientName": "Acme Corp",
    ...
  }
}`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Signature Verification</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          All webhooks include an HMAC-SHA256 signature in the <code>X-Webhook-Signature</code> header:
                        </p>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`const crypto = require('crypto');

// Verify webhook signature
const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);

const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

if (signature === expectedSignature) {
  // Webhook is authentic
  console.log('Webhook verified!');
} else {
  // Invalid signature
  console.error('Invalid webhook signature');
}`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Best Practices</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Always verify the webhook signature</li>
                          <li>Return a 200 status code quickly (process asynchronously)</li>
                          <li>Implement idempotency (webhooks may be sent multiple times)</li>
                          <li>Use HTTPS for your webhook endpoint</li>
                          <li>Handle webhook failures gracefully</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Error Handling */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Error Handling</CardTitle>
                      <CardDescription>Understanding API errors</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Error Response Format</h3>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": false,
  "message": "Invoice not found",
  "error": "NOT_FOUND"
}`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">HTTP Status Codes</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <code>200 OK</code>
                            <span className="text-muted-foreground">Request successful</span>
                          </div>
                          <div className="flex justify-between">
                            <code>201 Created</code>
                            <span className="text-muted-foreground">Resource created</span>
                          </div>
                          <div className="flex justify-between">
                            <code>400 Bad Request</code>
                            <span className="text-muted-foreground">Invalid request data</span>
                          </div>
                          <div className="flex justify-between">
                            <code>401 Unauthorized</code>
                            <span className="text-muted-foreground">Invalid or missing API key</span>
                          </div>
                          <div className="flex justify-between">
                            <code>403 Forbidden</code>
                            <span className="text-muted-foreground">Insufficient permissions</span>
                          </div>
                          <div className="flex justify-between">
                            <code>404 Not Found</code>
                            <span className="text-muted-foreground">Resource not found</span>
                          </div>
                          <div className="flex justify-between">
                            <code>429 Too Many Requests</code>
                            <span className="text-muted-foreground">Rate limit exceeded</span>
                          </div>
                          <div className="flex justify-between">
                            <code>500 Server Error</code>
                            <span className="text-muted-foreground">Internal server error</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SDKs and Libraries */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Code Examples</CardTitle>
                      <CardDescription>Integration examples in different languages</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">JavaScript / Node.js</h3>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`const axios = require('axios');

const apiKey = 'inv_your_api_key';
const baseURL = '${getBackendUrl()}/public/apis/v1';

async function listInvoices() {
  try {
    const response = await axios.get(\`\${baseURL}/invoices\`, {
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

listInvoices();`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Python</h3>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import requests

api_key = 'inv_your_api_key'
base_url = '${getBackendUrl()}/public/apis/v1'

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

# List invoices
response = requests.get(f'{base_url}/invoices', headers=headers)
print(response.json())

# Create invoice
invoice_data = {
    'clientName': 'Acme Corp',
    'issueDate': '2025-11-02',
    'lineItems': [
        {'description': 'Service', 'quantity': 1, 'rate': 1000}
    ]
}

response = requests.post(
    f'{base_url}/invoices',
    headers=headers,
    json=invoice_data
)
print(response.json())`}
                        </pre>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">PHP</h3>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`<?php
$apiKey = 'inv_your_api_key';
$baseURL = '${getBackendUrl()}/public/apis/v1';

$ch = curl_init("$baseURL/invoices");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
?>`}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create API Key</CardTitle>
              <CardDescription>Generate a new API key for programmatic access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {createdKey ? (
                <>
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-900 mb-1">Save Your API Key</p>
                        <p className="text-sm text-yellow-800">
                          Make sure to copy your API key now. You won't be able to see it again!
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Your API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={createdKey}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm bg-gray-50"
                      />
                      <Button onClick={() => copyToClipboard(createdKey)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setCreatedKey(null)
                        setShowCreateKeyModal(false)
                      }}
                      className="flex-1"
                    >
                      Done
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Key Name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Production Server"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreateKeyModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateApiKey} className="flex-1">
                      Create
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader>
              <CardTitle>Add Webhook</CardTitle>
              <CardDescription>Register a webhook endpoint to receive event notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Endpoint URL</label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://your-api.com/webhooks/invoicer"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                <input
                  type="text"
                  value={newWebhook.description}
                  onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                  placeholder="Production webhook for invoices"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Events to Listen</label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={() => toggleWebhookEvent(event)}
                        className="rounded"
                      />
                      <span className="text-sm">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateWebhookModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateWebhook} className="flex-1">
                  Create Webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete API Key Confirmation */}
      <ConfirmModal
        isOpen={!!deleteKeyId}
        onClose={() => setDeleteKeyId(null)}
        onConfirm={handleDeleteApiKey}
        title="Delete API Key?"
        message="This will permanently delete the API key. Any applications using this key will immediately lose access. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Delete Webhook Confirmation */}
      <ConfirmModal
        isOpen={!!deleteWebhookId}
        onClose={() => setDeleteWebhookId(null)}
        onConfirm={handleDeleteWebhook}
        title="Delete Webhook?"
        message="This will permanently delete the webhook. You will no longer receive event notifications at this endpoint."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}

