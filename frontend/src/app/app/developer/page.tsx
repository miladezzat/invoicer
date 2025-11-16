'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppNavigation } from '@/components/ui/app-navigation'
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
  Clock,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <AppNavigation />

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Code className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Developer Mode</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-0.5">
                  API keys, webhooks, and integrations
                </p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50/50 shadow-md">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-indigo-900 mb-2 text-lg">API Access Enabled</h3>
                  <p className="text-sm sm:text-base text-indigo-800 leading-relaxed">
                    Integrate your invoicing system with external applications using API keys and webhooks.
                    Automate workflows, sync data, and build custom integrations with our RESTful API.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                      <Zap className="h-3 w-3 mr-1" />
                      Real-time webhooks
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                      <Key className="h-3 w-3 mr-1" />
                      Secure API keys
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                      <Book className="h-3 w-3 mr-1" />
                      Full documentation
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="shadow-md overflow-hidden">
            <div className="flex gap-1 p-2 bg-slate-50 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'api-keys'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
                <span className="sm:hidden">Keys</span>
                {apiKeys.length > 0 && (
                  <Badge variant={activeTab === 'api-keys' ? 'secondary' : 'default'} className="ml-1">
                    {apiKeys.length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab('webhooks')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'webhooks'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <WebhookIcon className="h-4 w-4" />
                <span>Webhooks</span>
                {webhooks.length > 0 && (
                  <Badge variant={activeTab === 'webhooks' ? 'secondary' : 'default'} className="ml-1">
                    {webhooks.length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab('openapi')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'openapi'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <FileJson className="h-4 w-4" />
                <span className="hidden sm:inline">API Explorer</span>
                <span className="sm:hidden">Explorer</span>
              </button>
              <button
                onClick={() => setActiveTab('playground')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'playground'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Playground</span>
                <span className="sm:hidden">Play</span>
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'docs'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Book className="h-4 w-4" />
                <span className="hidden sm:inline">Documentation</span>
                <span className="sm:hidden">Docs</span>
              </button>
            </div>
          </Card>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative inline-flex">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200 border-t-indigo-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Code className="h-8 w-8 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-6">Loading developer tools...</p>
              <p className="text-sm text-muted-foreground mt-2">Please wait</p>
            </div>
          ) : (
            <>
              {/* API Keys Tab */}
              {activeTab === 'api-keys' && (
                <div className="space-y-6">
                  <Card className="shadow-md bg-gradient-to-r from-slate-50 to-indigo-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Key className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">API Keys</h2>
                            <p className="text-sm text-slate-600 mt-0.5">
                              Manage your API keys for programmatic access
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => setShowCreateKeyModal(true)}
                          className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">Create Key</span>
                          <span className="sm:hidden">Create</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {apiKeys.length === 0 ? (
                    <Card className="shadow-md">
                      <CardContent className="py-16">
                        <div className="text-center">
                          <div className="inline-flex p-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl mb-6">
                            <Key className="h-16 w-16 text-indigo-600" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-3">No API Keys Yet</h3>
                          <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
                            Create your first API key to start integrating with external applications and automate your workflows.
                          </p>
                          <Button 
                            onClick={() => setShowCreateKeyModal(true)}
                            size="lg"
                            className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                          >
                            <Plus className="h-5 w-5" />
                            Create Your First API Key
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {apiKeys.map((key) => (
                        <Card key={key.id} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-2 hover:border-indigo-200">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Key className="h-5 w-5 text-indigo-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-slate-900 truncate">{key.name}</h3>
                                  </div>
                                  {key.isActive ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Disabled
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-3">
                                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">API Key</p>
                                    <p className="font-mono text-sm text-slate-900">{key.prefix}_••••••••••••••••</p>
                                  </div>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Send className="h-4 w-4 text-slate-400" />
                                      <span className="text-slate-600">
                                        <span className="font-semibold text-slate-900">{key.usageCount}</span> requests
                                      </span>
                                    </div>
                                    {key.lastUsedAt && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600">
                                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleApiKey(key.id, key.isActive)}
                                  className="rounded-lg"
                                  title={key.isActive ? 'Disable key' : 'Enable key'}
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
                      <CardDescription>Overview of how to integrate with Invoicer</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">What you can do</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Invoicer exposes HTTP APIs and webhooks that let you manage your invoices, clients, and analytics from your own systems. Common use cases include:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Automatically creating invoices when orders are placed in your app.</li>
                          <li>Syncing your client database with Invoicer.</li>
                          <li>Pulling revenue and invoice analytics into your own dashboards.</li>
                          <li>Receiving webhook notifications when invoices or clients change.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Authentication</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Every request to the Invoicer API must be authenticated using an API key you create in the <span className="font-medium">API Keys</span> tab.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Send API keys using the <code>Authorization</code> header in the form <code>Bearer inv_...</code>.</li>
                          <li>Keep keys secret; do not embed them in publicly shipped client-side code.</li>
                          <li>Create separate keys for production, staging, and local development.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Base URL</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          All external API endpoints share a single base URL. Append the resource path (for example, <code>/invoices</code>) to this value in your integration.
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
                          The API uses JSON for both requests and responses.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Set <code>Content-Type: application/json</code> on requests with a body.</li>
                          <li>Request and response bodies use camelCase field names.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Response Format</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Responses are JSON objects that typically include:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><code>success</code>: whether the request was successful.</li>
                          <li><code>data</code>: the main payload (for example, an invoice or list of clients).</li>
                          <li><code>message</code>: a human-readable description of the outcome.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoices API */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoices API</CardTitle>
                      <CardDescription>Create, read, update, and delete invoices</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Endpoints</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Use the invoice endpoints when you want to create, read, update, or delete invoices from your own systems:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><code>GET /invoices</code> — list invoices with optional filtering and pagination.</li>
                          <li><code>GET /invoices/:id</code> — fetch a single invoice by its ID.</li>
                          <li><code>POST /invoices</code> — create a new invoice with client, line items, and metadata.</li>
                          <li><code>PUT /invoices/:id</code> — update invoice details such as status, dates, and notes.</li>
                          <li><code>DELETE /invoices/:id</code> — permanently delete an invoice.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Key fields</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          When creating or updating invoices, you will typically work with:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><code>clientId</code>, <code>clientName</code>, <code>clientEmail</code> — who the invoice is for.</li>
                          <li><code>issueDate</code>, <code>dueDate</code>, <code>currency</code> — billing details.</li>
                          <li><code>lineItems</code> — array of items with <code>description</code>, <code>quantity</code>, and <code>rate</code>.</li>
                          <li><code>status</code> — lifecycle state such as <code>draft</code>, <code>sent</code>, or <code>paid</code>.</li>
                          <li><code>notes</code> and other optional metadata fields.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Typical workflows</h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Generate invoices automatically after an order is placed in your app.</li>
                          <li>Update invoice status to <code>paid</code> when your payment provider confirms payment.</li>
                          <li>Render invoices in your own dashboard using the data returned by the API.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Clients API */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Clients API</CardTitle>
                      <CardDescription>Manage your client database programmatically</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Endpoints</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Use the clients endpoints to keep your customer data in sync with Invoicer:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><code>GET /clients</code> — list clients with optional search and pagination.</li>
                          <li><code>GET /clients/:id</code> — fetch a single client by ID.</li>
                          <li><code>POST /clients</code> — create a new client record.</li>
                          <li><code>PUT /clients/:id</code> — update client details.</li>
                          <li><code>DELETE /clients/:id</code> — delete a client.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Key fields</h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><code>name</code> and <code>company</code> — display information.</li>
                          <li><code>email</code> and <code>phone</code> — primary contact details.</li>
                          <li><code>address</code> — billing or mailing address.</li>
                          <li>Additional metadata and tags depending on your usage.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Typical workflows</h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Sync clients from your CRM into Invoicer.</li>
                          <li>Automatically create a client when a user signs up in your app.</li>
                          <li>Keep contact details up to date from a single source of truth.</li>
                        </ul>
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
                      <div>
                        <h3 className="font-semibold mb-2">Overview</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          The analytics API provides aggregated metrics about your invoices and revenue.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Track total and paid revenue over time.</li>
                          <li>Monitor outstanding and overdue invoices.</li>
                          <li>Identify top clients and currencies.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Endpoint</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">GET</span>
                          <code className="text-sm">/analytics</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Use this endpoint to retrieve aggregated analytics for your account. It supports period filters such as <code>30d</code>, <code>90d</code>, <code>1y</code>, or <code>all</code> via query parameters.
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          The response typically includes invoice stats, revenue over time, top clients, and currency breakdowns that you can use to power your own dashboards.
                        </p>
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
                        <h3 className="font-semibold mb-2">Available events</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.created</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.updated</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.deleted</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.sent</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.paid</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">invoice.overdue</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">client.created</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">client.updated</code>
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded">client.deleted</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Each event delivers a JSON payload with the relevant resource and metadata.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">How webhooks work</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Webhooks allow Invoicer to send HTTP POST requests to your server when certain events happen.
                        </p>
                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                          <li>You register a webhook URL in the <span className="font-medium">Webhooks</span> tab.</li>
                          <li>You choose which event types you want to subscribe to.</li>
                          <li>When an event occurs, Invoicer sends a JSON payload to your endpoint.</li>
                          <li>Your server processes the payload and responds with a 2xx status code.</li>
                        </ol>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Payload shape</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Payloads include an event type, timestamp, and the associated resource (such as an invoice or client). Use these values to drive your own workflows and auditing.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Security & reliability</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Use a unique, secret HTTPS endpoint URL.</li>
                          <li>Validate any shared secrets or authentication headers you configure.</li>
                          <li>Return a 2xx status quickly and process heavier work asynchronously.</li>
                          <li>Make your handler idempotent so duplicate deliveries are safe.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Error Handling & Rate Limits */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Error Handling & Rate Limits</CardTitle>
                      <CardDescription>Best practices for reliable integrations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">HTTP status codes</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          The API uses standard HTTP status codes to indicate success or failure.
                        </p>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto space-y-1">
                          <div className="flex justify-between">
                            <code>200 OK</code>
                            <span className="text-muted-foreground">Request succeeded</span>
                          </div>
                          <div className="flex justify-between">
                            <code>201 Created</code>
                            <span className="text-muted-foreground">Resource created successfully</span>
                          </div>
                          <div className="flex justify-between">
                            <code>400 Bad Request</code>
                            <span className="text-muted-foreground">Invalid parameters or payload</span>
                          </div>
                          <div className="flex justify-between">
                            <code>401 Unauthorized</code>
                            <span className="text-muted-foreground">Missing or invalid API key</span>
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

                      <div>
                        <h3 className="font-semibold mb-2">Rate limits</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          To keep the service reliable for everyone, API requests may be rate limited.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li>Use caching where appropriate for read-heavy workloads.</li>
                          <li>Back off and retry with exponential delays when you receive <code>429</code> responses.</li>
                          <li>Contact support if you need higher throughput for your use case.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tools & Workflows */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tools & Workflows</CardTitle>
                      <CardDescription>Ways to explore and integrate with the API</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">OpenAPI Explorer</h3>
                        <p className="text-sm text-muted-foreground">
                          Use the <span className="font-medium">API Explorer</span> tab to browse the full OpenAPI/Swagger documentation for every endpoint. You can inspect request and response schemas and try requests interactively with your own API key.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">API Playground</h3>
                        <p className="text-sm text-muted-foreground">
                          The <span className="font-medium">Playground</span> tab lets you send test requests directly from the browser. Choose an endpoint, select an API key, and inspect the live response without writing any code.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Production integrations</h3>
                        <p className="text-sm text-muted-foreground">
                          For production, call the HTTP APIs from your backend or serverless functions using your preferred HTTP client or SDK. Use API keys for authentication, handle non-2xx responses and rate limits, and combine APIs and webhooks to build reliable, event-driven workflows.
                        </p>
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
