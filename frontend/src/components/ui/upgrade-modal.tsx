'use client'

import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Sparkles, Check, ArrowRight } from 'lucide-react'
import { Button } from './button'
import { useRouter } from 'next/navigation'
import { stripeAPI } from '@/lib/api'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  feature?: string
  description?: string
}

interface Price {
  id: string
  amount: number
  currency: string
  interval?: string
  intervalCount?: number
}

interface PricingPlan {
  id: string
  name: string
  description: string
  isFree: boolean
  prices: Price[]
  features: string[]
  metadata: Record<string, any>
}

export function UpgradeModal({ 
  open, 
  onClose, 
  feature = 'this feature',
  description = 'Upgrade to Pro to unlock this feature and start earning from your invoices!'
}: UpgradeModalProps) {
  const router = useRouter()
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await stripeAPI.getPricingPlans()
        setPlans(response.data)
      } catch (error) {
        console.error('Failed to fetch pricing plans:', error)
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      fetchPlans()
    }
  }, [open])

  const handleUpgrade = () => {
    onClose()
    router.push('/pricing')
  }

  // Get the Pro plan (not free)
  const proPlan = plans.find(plan => !plan.isFree)
  const proFeatures = proPlan?.features || []
  
  // Get pricing info
  const monthlyPrice = proPlan?.prices.find(p => p.interval === 'month')
  const yearlyPrice = proPlan?.prices.find(p => p.interval === 'year')
  
  const formatPrice = (amount: number | undefined) => {
    if (!amount) return '0'
    return (amount / 100).toFixed(0)
  }
  
  const calculateYearlySavings = () => {
    if (!monthlyPrice || !yearlyPrice) return 0
    const monthlyTotal = (monthlyPrice.amount / 100) * 12
    const yearlyTotal = yearlyPrice.amount / 100
    const savings = ((monthlyTotal - yearlyTotal) / monthlyTotal) * 100
    return Math.round(savings)
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100 transition-colors z-10"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>

                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 pt-12 pb-8">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <Dialog.Title className="text-3xl font-bold text-white text-center mb-3">
                    Upgrade to Pro
                  </Dialog.Title>
                  <p className="text-blue-100 text-center text-lg">
                    {description}
                  </p>
                </div>

                {/* Content */}
                <div className="px-8 py-6">
                  {/* Feature Highlight */}
                  {feature !== 'this feature' && (
                    <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-blue-600 p-1 mt-0.5">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            You're trying to use: <span className="text-blue-600">{feature}</span>
                          </h3>
                          <p className="text-sm text-gray-600">
                            This premium feature is available on the Pro plan
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pro Features List */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      What you'll get with {proPlan?.name || 'Pro'}:
                    </h3>
                    {loading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Loading plans...</p>
                      </div>
                    ) : proFeatures.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {proFeatures.filter(f => !f.toLowerCase().includes('upcoming')).map((feat, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="rounded-full bg-green-100 p-1 mt-0.5 flex-shrink-0">
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </div>
                              <span className="text-sm text-gray-700">{feat}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Highlight upcoming features benefit */}
                        {proFeatures.some(f => f.toLowerCase().includes('upcoming')) && (
                          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-purple-600 p-1.5 mt-0.5 flex-shrink-0">
                                <Sparkles className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-purple-900">
                                  {proFeatures.find(f => f.toLowerCase().includes('upcoming'))}
                                </p>
                                <p className="text-xs text-purple-700 mt-1">
                                  Lock in this price forever and get all new features we release! 🚀
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Unable to load features. Please try again.
                      </p>
                    )}
                  </div>

                  {/* Pricing */}
                  {!loading && monthlyPrice && (
                    <div className="mb-6 rounded-xl bg-gray-50 p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Starting at</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">
                              ${formatPrice(monthlyPrice.amount)}
                            </span>
                            <span className="text-gray-600">/month</span>
                          </div>
                          {yearlyPrice && (
                            <p className="text-xs text-gray-500 mt-1">
                              or ${formatPrice(yearlyPrice.amount)}/year (save {calculateYearlySavings()}%)
                            </p>
                          )}
                        </div>
                        {yearlyPrice && (
                          <div className="text-right">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              <Sparkles className="h-3 w-3" />
                              Best Value
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="flex-1"
                    >
                      Maybe Later
                    </Button>
                    <Button
                      onClick={handleUpgrade}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white gap-2"
                    >
                      Upgrade to Pro
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-4">
                    🔒 Secure payment • Cancel anytime • 30-day money-back guarantee
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

