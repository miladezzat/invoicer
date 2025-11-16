'use client'

import { useState } from 'react'
import { Mail, X } from 'lucide-react'
import { Input } from './input'
import { Label } from './label'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (email: string) => Promise<void>
  defaultEmail?: string
  loading?: boolean
}

export function EmailModal({
  isOpen,
  onClose,
  onSend,
  defaultEmail = '',
  loading = false,
}: EmailModalProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [localLoading, setLocalLoading] = useState(false)

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      return
    }
    
    setLocalLoading(true)
    try {
      await onSend(email)
      onClose()
    } finally {
      setLocalLoading(false)
    }
  }

  if (!isOpen) return null

  const isLoading = loading || localLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-green-100">
            <Mail className="h-10 w-10 text-green-600" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Send Invoice via Email
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            The invoice PDF will be attached to the email
          </p>
        </div>

        {/* Email Input */}
        <div className="mb-6">
          <Label htmlFor="email" className="text-left block mb-2">
            Client Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                handleSend()
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !email || !email.includes('@')}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}

