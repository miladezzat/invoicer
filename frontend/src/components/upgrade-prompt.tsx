'use client'

import { useRouter } from 'next/navigation'
import { Lock, Sparkles } from 'lucide-react'

interface UpgradePromptProps {
  feature: string
  description?: string
  className?: string
}

export function UpgradePrompt({ feature, description, className = '' }: UpgradePromptProps) {
  const router = useRouter()

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white">
            <Lock className="h-6 w-6" />
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Upgrade to Pro to unlock {feature}
          </h3>
          {description && (
            <p className="text-slate-600 text-sm mb-4">{description}</p>
          )}
          <button
            onClick={() => router.push('/pricing')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  )
}

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
}

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Upgrade Required
          </h2>
          <p className="text-slate-600">
            {feature} is a Pro feature. Upgrade now to unlock this and many more features.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-slate-700">
            <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
            Save unlimited invoices
          </div>
          <div className="flex items-center text-sm text-slate-700">
            <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
            Client management
          </div>
          <div className="flex items-center text-sm text-slate-700">
            <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
            Payment integrations
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  )
}

