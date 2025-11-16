'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { usersAPI } from '@/lib/api'

interface Plan {
  tier: 'free' | 'pro'
  seats: number
}

interface Subscription {
  customerId?: string
  subscriptionId?: string
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  priceId?: string
  interval?: 'month' | 'year'
}

interface User {
  id: string
  name: string
  email: string
  plan: Plan
  subscription?: Subscription
  createdAt?: string
  updatedAt?: string
}

interface SubscriptionContextType {
  user: User | null
  plan: Plan | null
  subscription: Subscription | null
  isPro: boolean
  isActive: boolean
  loading: boolean
  refreshUser: () => Promise<void>
  canSaveInvoices: boolean
  canUsePaymentIntegrations: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const response = await usersAPI.getProfile()
        setUser(response.data.user)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const refreshUser = async () => {
    setLoading(true)
    await loadUser()
  }

  const plan = user?.plan || null
  const subscription = user?.subscription || null
  
  const isPro = plan?.tier === 'pro'
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  
  const canSaveInvoices = isPro && isActive
  const canUsePaymentIntegrations = isPro && isActive

  const value = {
    user,
    plan,
    subscription,
    isPro,
    isActive,
    loading,
    refreshUser,
    canSaveInvoices,
    canUsePaymentIntegrations,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

