'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSubscription } from '@/contexts/subscription-context'
import { stripeAPI } from '@/lib/api'
import { AppNavigation } from '@/components/ui/app-navigation'
import { UserDropdown } from '@/components/ui/user-dropdown'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useToast } from '@/hooks/use-toast'
import { Check, CreditCard, Calendar, AlertCircle, Loader2, Plus, Sparkles, Crown, Lock, ArrowRight, Mail } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
      <AppNavigation />

      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-6xl">
        {/* Page Header with Better Hierarchy */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Subscription & Billing
              </h1>
            </div>
          </div>
          <p className="text-slate-600 text-sm sm:text-base ml-13">Manage your plan, payments, and billing details</p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          
          {/* Left Column - Current Plan Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
              
              {/* Plan Header with Gradient */}
              <div className={`relative p-6 sm:p-8 ${
                isPro 
                  ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600' 
                  : 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700'
              }`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)',
                    backgroundSize: '40px 40px'
                  }}></div>
                </div>
                
                <div className="relative">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm ${
                        isPro 
                          ? 'bg-white/20 ring-2 ring-white/30' 
                          : 'bg-white/10 ring-2 ring-white/20'
                      }`}>
                        {isPro ? (
                          <Crown className="h-7 w-7 text-white drop-shadow-lg" />
                        ) : (
                          <Sparkles className="h-7 w-7 text-white/90" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                          {plan?.tier === 'pro' ? 'Pro' : 'Free'} Plan
                        </h2>
                        {isPro && (
                          <p className="text-sm text-white/90 flex items-center gap-2 mt-1">
                            {subscription?.interval === 'year' ? 'Annual' : 'Monthly'} billing
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    {isPro && (
                      <div className={`px-4 py-2 rounded-full font-semibold text-xs backdrop-blur-sm inline-flex ${
                        isActive 
                          ? 'bg-white/90 text-emerald-700 shadow-lg' 
                          : 'bg-white/90 text-yellow-700 shadow-lg'
                      }`}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-yellow-500'
                          } animate-pulse`}></span>
                          {isActive ? 'Active' : subscription?.status}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Cancellation Warning */}
                  {isPro && subscription?.cancelAtPeriodEnd && (
                    <div className="mt-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white font-semibold text-sm mb-1">
                            Subscription ends on {currentPeriodEnd && format(currentPeriodEnd, 'MMM d, yyyy')}
                          </p>
                          <p className="text-white/90 text-xs">
                            Reactivate to continue enjoying Pro features
                          </p>
                        </div>
                        <button
                          onClick={handleReactivateSubscription}
                          disabled={reactivateLoading}
                          className="px-4 py-2 bg-white text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-md hover:shadow-lg whitespace-nowrap"
                        >
                          {reactivateLoading ? (
                            <>
                              <Loader2 className="animate-spin h-4 w-4" />
                              <span className="hidden sm:inline">Reactivating...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="hidden sm:inline">Reactivate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Features - Cleaner Design */}
              <div className="p-6 sm:p-8">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                  Plan Features
                </h3>
                
                <div className="space-y-3">
                  {/* Always included features */}
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-medium">Create unlimited invoices</p>
                      <p className="text-xs text-slate-500 mt-0.5">Build as many invoices as you need</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-medium">Export as PDF</p>
                      <p className="text-xs text-slate-500 mt-0.5">Download professional PDFs instantly</p>
                    </div>
                  </div>
                  
                  {/* Pro features */}
                  {isPro ? (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 font-medium">Save unlimited invoices</p>
                          <p className="text-xs text-slate-500 mt-0.5">Never lose your data</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 font-medium">Client management</p>
                          <p className="text-xs text-slate-500 mt-0.5">Organize and track all clients</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 font-medium">Payment integrations</p>
                          <p className="text-xs text-slate-500 mt-0.5">Accept payments seamlessly</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="flex-1 opacity-60">
                          <p className="text-slate-600 font-medium">Save unlimited invoices</p>
                          <p className="text-xs text-slate-500 mt-0.5">Upgrade to unlock</p>
                        </div>
                      </div>
                      
                      <div className="relative flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="flex-1 opacity-60">
                          <p className="text-slate-600 font-medium">Client management</p>
                          <p className="text-xs text-slate-500 mt-0.5">Upgrade to unlock</p>
                        </div>
                      </div>
                      
                      <div className="relative flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="flex-1 opacity-60">
                          <p className="text-slate-600 font-medium">Payment integrations</p>
                          <p className="text-xs text-slate-500 mt-0.5">Upgrade to unlock</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* CTA or Cancel Action */}
              {!isPro ? (
                <div className="border-t border-slate-200 p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white">
                  <div className="text-center">
                    <p className="text-slate-600 text-sm mb-4">
                      Unlock all features and supercharge your invoicing
                    </p>
                    <a
                      href="/pricing"
                      className="group inline-flex items-center justify-center w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Upgrade to Pro
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              ) : (
                !subscription?.cancelAtPeriodEnd && (
                  <div className="border-t border-slate-200 px-6 sm:px-8 py-4 bg-slate-50/50">
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors underline underline-offset-2"
                    >
                      Cancel subscription
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
          
          {/* Right Column - Billing Info & Actions */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Billing Information Card */}
            {isPro && subscription && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                  Billing Details
                </h3>
                
                <div className="space-y-4">
                  {currentPeriodEnd && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing'}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {format(currentPeriodEnd, 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
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
                
                {/* Manage Subscription Button */}
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="group w-full mt-6 px-4 py-3 bg-slate-900 text-white text-sm rounded-xl hover:bg-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg"
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Manage Billing
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Help & Support Card */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl p-6 border border-blue-200/50 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-base">Need Help?</h3>
                </div>
              </div>
              
              <p className="text-blue-700 text-sm mb-4 leading-relaxed">
                {isPro
                  ? 'Manage your subscription, update payment method, or make changes through the billing portal.'
                  : 'Questions about upgrading? We\'re here to help you get started with Pro.'}
              </p>
              
              <a 
                href="mailto:support@invoiceapp.com" 
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
              >
                <Mail className="h-4 w-4" />
                <span className="underline underline-offset-2">support@invoiceapp.com</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            
            {/* Quick Stats for Pro Users */}
            {isPro && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                  Quick Stats
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Plan type</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      Pro {subscription?.interval === 'year' ? 'Annual' : 'Monthly'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Billing cycle</span>
                    <span className="font-semibold text-slate-900 text-sm capitalize">
                      {subscription?.interval || 'Monthly'}
                    </span>
                  </div>
                  
                  {subscription?.status && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-sm">Status</span>
                      <span className="font-semibold text-emerald-600 text-sm capitalize">
                        {subscription.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
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

