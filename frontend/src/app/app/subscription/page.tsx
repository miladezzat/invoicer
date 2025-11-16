'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSubscription } from '@/contexts/subscription-context'
import { stripeAPI } from '@/lib/api'
import { UserDropdown } from '@/components/ui/user-dropdown'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useToast } from '@/hooks/use-toast'
import { Check, CreditCard, Calendar, AlertCircle, Loader2, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function SubscriptionPage() {
  const { user, plan, subscription, isPro, isActive, loading, refreshUser } = useSubscription()
  const { toast } = useToast()
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [reactivateLoading, setReactivateLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const response = await stripeAPI.createPortalSession()
      // Open in new tab
      window.open(response.data.url, '_blank')
      toast({
        title: 'Opening Stripe Portal',
        description: 'The subscription portal has been opened in a new tab.',
      })
    } catch (error) {
      console.error('Failed to open portal:', error)
      toast({
        title: 'Error',
        description: 'Failed to open subscription portal. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelLoading(true)
    try {
      const response = await stripeAPI.cancelSubscription()
      await refreshUser()
      setShowCancelModal(false)
      toast({
        title: 'Subscription Cancelled',
        description: response.data.message,
      })
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error)
      toast({
        title: 'Cancellation Failed',
        description: error.response?.data?.message || 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCancelLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setReactivateLoading(true)
    try {
      const response = await stripeAPI.reactivateSubscription()
      await refreshUser()
      toast({
        title: 'Subscription Reactivated! 🎉',
        description: response.data.message,
      })
    } catch (error: any) {
      console.error('Failed to reactivate subscription:', error)
      toast({
        title: 'Reactivation Failed',
        description: error.response?.data?.message || 'Failed to reactivate subscription. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setReactivateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    )
  }

  const currentPeriodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e293b] to-[#334155] flex items-center justify-center text-white font-black text-sm shadow-md group-hover:shadow-lg transition-shadow">
                IN
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Invoicer</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/app/invoices">
                <Button variant="outline" size="sm" className="hidden sm:flex">My Invoices</Button>
              </Link>
              <Link href="/builder" className="hidden md:block">
                <Button className="gap-2 shadow-sm" size="sm">
                  <Plus className="h-4 w-4" />
                  New Invoice
                </Button>
              </Link>
              <UserDropdown />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Subscription & Billing
          </h1>
          <p className="text-slate-600">Manage your subscription and billing preferences</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 mb-6 border border-slate-200/50">
          {/* Plan Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isPro 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' 
                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                }`}>
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {plan?.tier === 'pro' ? 'Pro' : 'Free'} Plan
                  </h2>
                  {isPro && (
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                      {subscription?.interval === 'year' ? 'Annual' : 'Monthly'} billing
                    </p>
                  )}
                </div>
              </div>
              
              {/* Manage Button - Aligned with Pro Plan */}
              {isPro && (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="group px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-md hover:shadow-lg disabled:shadow-md"
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Manage
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Status Badge - Under Plan Name */}
            <div className="flex items-center gap-3 ml-0">
            {isPro && (
                <div className={`px-4 py-2 rounded-full font-semibold text-sm shadow-sm inline-flex ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-emerald-500' : 'bg-yellow-500'
                    }`}></span>
                {isActive ? 'Active' : subscription?.status}
              </span>
                </div>
            )}
              
              {/* Reactivate Button - Inline with status */}
              {isPro && subscription?.cancelAtPeriodEnd && (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={reactivateLoading}
                  className="group px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm rounded-lg hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-md hover:shadow-lg disabled:shadow-md"
                >
                  {reactivateLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Reactivate
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Plan Features */}
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-slate-700 font-medium">Create unlimited invoices</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-slate-700 font-medium">Export as PDF</span>
            </div>
            {isPro ? (
              <>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Save unlimited invoices</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Client management</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 sm:col-span-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Payment integrations</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 opacity-60">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-slate-400 text-xs">✕</span>
                  </div>
                  <span className="text-slate-400 line-through">Save invoices</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 opacity-60">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-slate-400 text-xs">✕</span>
                  </div>
                  <span className="text-slate-400 line-through">Payment integrations</span>
                </div>
              </>
            )}
          </div>

          {/* Billing Info */}
          {isPro && subscription && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                Billing Information
              </h3>
              
              {subscription.cancelAtPeriodEnd && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300/50 rounded-xl p-5 mb-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-yellow-900 font-bold mb-1 text-lg">
                        Subscription Ending Soon
                      </p>
                      <p className="text-yellow-800 text-sm leading-relaxed">
                        Your subscription will end on{' '}
                        <span className="font-semibold">
                        {currentPeriodEnd && format(currentPeriodEnd, 'MMMM d, yyyy')}
                        </span>
                        . You'll lose access to Pro features after this date.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {currentPeriodEnd && (
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                        {subscription.cancelAtPeriodEnd ? 'Ends on' : 'Next billing date'}
                      </p>
                      <p className="font-semibold text-slate-900 truncate">
                        {format(currentPeriodEnd, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Payment Method
                    </p>
                    <p className="font-semibold text-slate-900">
                      Card on file
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          {!isPro && (
            <div className="border-t border-slate-200 pt-6 mt-6">
              <a
                href="/pricing"
                className="group inline-flex items-center justify-center w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl"
              >
                <span className="mr-2">✨</span>
                Upgrade to Pro
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          )}
          
          {/* Cancel link - Bottom Left, small */}
          {isPro && !subscription?.cancelAtPeriodEnd && (
            <div className="border-t border-slate-200 pt-4 mt-6">
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-slate-400 hover:text-red-600 transition-colors underline underline-offset-2"
              >
                Cancel subscription
              </button>
          </div>
          )}
        </div>

        {/* Help Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 sm:p-8 border border-blue-100 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2 text-lg">Need Help?</h3>
              <p className="text-blue-700 text-sm mb-4 leading-relaxed">
            {isPro
                  ? 'Manage your subscription, update payment method, or cancel at any time through the billing portal. All changes take effect immediately.'
                  : 'Upgrade to Pro to unlock all features including invoice saving, client management, and payment integrations. Start your journey today!'}
          </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600 font-medium">Questions?</span>
                <a href="mailto:support@invoiceapp.com" className="text-blue-600 hover:text-blue-700 underline font-semibold">
                  support@invoiceapp.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription?"
        message="Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period."
        confirmText="Yes, Cancel"
        cancelText="No, Keep It"
        type="danger"
        loading={cancelLoading}
      />
    </div>
  )
}

