'use client'

import { ReactNode } from 'react'
import { useFeatures, Feature } from '@/contexts/features-context'
import { Button } from '@/components/ui/button'
import { Lock, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FeatureGateProps {
  feature: Feature
  children: ReactNode
  fallback?: ReactNode
  showUpgrade?: boolean
}

/**
 * Component to conditionally render content based on feature access
 * 
 * @example
 * ```tsx
 * <FeatureGate feature={Feature.SAVE_INVOICE}>
 *   <Button>Save Invoice</Button>
 * </FeatureGate>
 * ```
 * 
 * With custom fallback:
 * ```tsx
 * <FeatureGate 
 *   feature={Feature.SAVE_INVOICE}
 *   fallback={<UpgradePrompt />}
 * >
 *   <Button>Save Invoice</Button>
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgrade = false 
}: FeatureGateProps) {
  const { hasFeature } = useFeatures()
  const router = useRouter()

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showUpgrade) {
    return (
      <div className="relative group">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <Button
            size="sm"
            onClick={() => router.push('/pricing')}
            className="gap-2"
          >
            <Crown className="h-4 w-4" />
            Upgrade to unlock
          </Button>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Component to show a pro badge
 */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white ${className}`}>
      <Crown className="h-3 w-3" />
      PRO
    </span>
  )
}

/**
 * Component to show locked feature indicator
 */
export function LockedFeature({ 
  feature, 
  children 
}: { 
  feature: Feature
  children: ReactNode 
}) {
  const { hasFeature } = useFeatures()
  const router = useRouter()

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={() => router.push('/pricing')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          <Lock className="h-4 w-4" />
          <span className="font-semibold">Upgrade to Unlock</span>
        </button>
      </div>
    </div>
  )
}

