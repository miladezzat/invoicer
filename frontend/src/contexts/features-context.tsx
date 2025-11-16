'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './auth-context'

/**
 * Feature flags enum - must match backend
 */
export enum Feature {
  // Invoice Features
  CREATE_INVOICE = 'create_invoice',
  SAVE_INVOICE = 'save_invoice',
  UNLIMITED_INVOICES = 'unlimited_invoices',
  EXPORT_PDF = 'export_pdf',
  SHARE_LINK = 'share_link',
  
  // Client Features
  MANAGE_CLIENTS = 'manage_clients',
  CLIENT_MANAGEMENT = 'client_management',
  CLIENT_PORTAL = 'client_portal',
  
  // Template Features
  USE_TEMPLATES = 'use_templates',
  CUSTOM_TEMPLATES = 'custom_templates',
  
  // Branding Features
  BASIC_BRANDING = 'basic_branding',
  ADVANCED_BRANDING = 'advanced_branding',
  CUSTOM_LOGO = 'custom_logo',
  
  // Payment Features
  PAYMENT_INTEGRATION = 'payment_integration',
  RECURRING_INVOICES = 'recurring_invoices',
  PAYMENT_REMINDERS = 'payment_reminders',
  
  // Analytics Features
  ANALYTICS = 'analytics',
  REPORTS = 'reports',
  
  // Support Features
  EMAIL_SUPPORT = 'email_support',
  PRIORITY_SUPPORT = 'priority_support',
  
  // API Features
  API_ACCESS = 'api_access',
}

interface FeaturesContextType {
  hasFeature: (feature: Feature) => boolean
  features: Feature[]
  isPro: boolean
}

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined)

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Get features from user object (populated by backend)
  const features: Feature[] = (user?.features || []) as Feature[]
  const isPro = user?.plan?.tier === 'pro'

  const hasFeature = (feature: Feature): boolean => {
    return features.includes(feature)
  }

  return (
    <FeaturesContext.Provider value={{ hasFeature, features, isPro }}>
      {children}
    </FeaturesContext.Provider>
  )
}

/**
 * Hook to check if a feature is available for the current user
 * 
 * @example
 * ```tsx
 * const { hasFeature } = useFeatures()
 * 
 * if (hasFeature(Feature.SAVE_INVOICE)) {
 *   // Show save button
 * }
 * ```
 */
export function useFeatures() {
  const context = useContext(FeaturesContext)
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeaturesProvider')
  }
  return context
}

