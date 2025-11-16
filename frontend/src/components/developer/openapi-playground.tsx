'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

interface OpenApiPlaygroundProps {
  apiKeys: any[]
}

export function OpenApiPlayground({ apiKeys }: OpenApiPlaygroundProps) {
  const [selectedApiKey, setSelectedApiKey] = useState<string>('')
  const [spec, setSpec] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get backend URL from env
  const getBackendUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    return apiUrl.replace('/api', '')
  }

  const backendUrl = getBackendUrl()
  const activeApiKeys = apiKeys.filter(key => key.isActive)

  // Fetch OpenAPI spec
  useEffect(() => {
    const fetchSpec = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${backendUrl}/api-docs-json`)
        if (!response.ok) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`)
        }
        
        const data = await response.json()
        setSpec(data)
      } catch (err: any) {
        console.error('Error fetching OpenAPI spec:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSpec()
  }, [backendUrl])

  // Request interceptor to add API key
  const requestInterceptor = (req: any) => {
    if (selectedApiKey) {
      req.headers['Authorization'] = `Bearer ${selectedApiKey}`
    }
    return req
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Failed to load API documentation</h3>
        <p className="text-red-600 text-sm">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          Make sure the backend server is running at {backendUrl}
        </p>
      </div>
    )
  }

  if (!spec) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No API specification available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* API Key Selection */}
      {activeApiKeys.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label htmlFor="playground-api-key" className="block text-sm font-medium text-blue-900 mb-2">
            Select API Key for Testing
          </label>
          <select
            id="playground-api-key"
            value={selectedApiKey}
            onChange={(e) => setSelectedApiKey(e.target.value)}
            className="w-full md:w-96 px-3 py-2 border border-blue-300 rounded-md bg-white"
          >
            <option value="">Select an API key (optional)</option>
            {activeApiKeys.map((key) => (
              <option key={key.id} value={key.key || ''}>
                {key.name} ({key.prefix}...)
              </option>
            ))}
          </select>
          {!activeApiKeys.some(k => k.key) && (
            <p className="text-xs text-blue-700 mt-2">
              Note: Existing keys only show the prefix. Create a new key or enter manually in the "Authorize" button below.
            </p>
          )}
        </div>
      )}

      {/* Swagger UI */}
      <div className="swagger-container bg-white rounded-lg border overflow-hidden">
        <SwaggerUI
          spec={spec}
          requestInterceptor={requestInterceptor}
          docExpansion="list"
          defaultModelsExpandDepth={1}
          displayRequestDuration={true}
          filter={true}
          persistAuthorization={true}
          tryItOutEnabled={true}
        />
      </div>

      <style jsx global>{`
        .swagger-container {
          font-size: 14px;
        }
        
        .swagger-ui .topbar {
          display: none;
        }
        
        .swagger-ui .info {
          margin: 20px 0;
        }
        
        .swagger-ui .scheme-container {
          background: #fafafa;
          padding: 10px;
          margin-bottom: 10px;
        }
        
        .swagger-ui .btn.authorize {
          background-color: #4990e2;
          border-color: #4990e2;
        }
        
        .swagger-ui .btn.authorize svg {
          fill: white;
        }
        
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #61affe;
        }
        
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #49cc90;
        }
        
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #fca130;
        }
        
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #f93e3e;
        }
        
        .swagger-ui .btn.execute {
          background-color: #4990e2;
          border-color: #4990e2;
          color: white;
        }
        
        .swagger-ui .btn.execute:hover {
          background-color: #3b7bc7;
          border-color: #3b7bc7;
        }
        
        .swagger-ui .response-col_status {
          font-size: 14px;
        }
        
        .swagger-ui .response-col_links {
          display: none;
        }
        
        /* Make it responsive */
        @media (max-width: 768px) {
          .swagger-ui .opblock-summary {
            flex-wrap: wrap;
          }
          
          .swagger-ui .opblock-summary-path {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}



