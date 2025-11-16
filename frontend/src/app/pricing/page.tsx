'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { stripeAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Check, Loader2 } from 'lucide-react'

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

export default function PricingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true)
        const response = await stripeAPI.getPricingPlans()
        setPlans(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch pricing plans:', err)
        setError('Failed to load pricing plans. Please try again later.')
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [])

  const handleUpgrade = async (selectedInterval: 'month' | 'year') => {
    if (!isAuthenticated) {
      router.push('/auth/signup')
      return
    }

    setLoading(true)
    try {
      const response = await stripeAPI.createCheckoutSession(selectedInterval)
      window.location.href = response.data.url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      toast({
        title: 'Checkout Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0'
    return (amount / 100).toFixed(0)
  }

  const freePlan = plans.find(p => p.isFree)
  const paidPlans = plans.filter(p => !p.isFree)
  const primaryPlan = paidPlans[0]

  const getPrice = (plan: PricingPlan, interval: 'month' | 'year') => {
    const price = plan.prices.find(p => p.interval === interval)
    return price
  }

  if (loadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading pricing plans...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Choose the plan that works best for you
          </p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setInterval('month')}
              className={`px-6 py-2 rounded-full transition-all ${
                interval === 'month'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-6 py-2 rounded-full transition-all ${
                interval === 'year'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          {freePlan && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-8">
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{freePlan.name}</h3>
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-slate-900">$0</span>
                <span className="text-slate-600 ml-2">/month</span>
              </div>
                {freePlan.description && (
                  <p className="text-slate-600 text-sm mt-2">{freePlan.description}</p>
                )}
            </div>

            <ul className="space-y-4 mb-8">
                {freePlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                <Check className="h-5 w-5 text-emerald-500 mr-3 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
              </li>
                ))}
            </ul>

            <button
              onClick={() => router.push('/builder')}
              className="w-full py-3 px-6 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
                Get Started Free
            </button>
          </div>
          )}

          {/* Paid Plan */}
          {primaryPlan && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl border-2 border-blue-500 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 px-4 py-1 text-sm font-semibold">
              POPULAR
            </div>

            <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{primaryPlan.name}</h3>
                {(() => {
                  const monthlyPrice = getPrice(primaryPlan, 'month')
                  const yearlyPrice = getPrice(primaryPlan, 'year')
                  const displayPrice = interval === 'month' ? monthlyPrice : yearlyPrice
                  const displayAmount = displayPrice ? formatPrice(displayPrice.amount) : '0'
                  const yearlyMonthlyEquivalent = yearlyPrice ? (yearlyPrice.amount / 12 / 100).toFixed(0) : '0'
                  
                  return (
                    <>
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-white">
                          ${interval === 'month' ? displayAmount : yearlyMonthlyEquivalent}
                </span>
                <span className="text-blue-100 ml-2">/month</span>
              </div>
                      {interval === 'year' && yearlyPrice && (
                <p className="text-blue-100 text-sm mt-1">
                          Billed ${formatPrice(yearlyPrice.amount)}/year
                </p>
                      )}
                    </>
                  )
                })()}
                {primaryPlan.description && (
                  <p className="text-blue-100 text-sm mt-2">{primaryPlan.description}</p>
              )}
            </div>

            <ul className="space-y-4 mb-8">
                {primaryPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                <Check className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                    <span className="text-white">{feature}</span>
              </li>
                ))}
            </ul>

            <button
              onClick={() => handleUpgrade(interval)}
              disabled={loading}
              className="w-full py-3 px-6 rounded-lg bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Loading...
                </>
              ) : (
                'Upgrade to Pro'
              )}
            </button>
          </div>
          )}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center text-slate-600">
          <p className="text-sm">
            🔒 Secure payment • Cancel anytime • 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}

