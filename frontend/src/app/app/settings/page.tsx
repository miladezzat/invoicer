'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserDropdown } from '@/components/ui/user-dropdown'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { useFeatures } from '@/contexts/features-context'
import { Feature } from '@/contexts/features-context'
import { stripeConnectAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { 
  Link as LinkIcon, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Loader2,
  DollarSign,
  CreditCard,
  Unlink,
  RefreshCw,
} from 'lucide-react'

interface ConnectStatus {
  connected: boolean
  accountId?: string
  accountStatus?: 'pending' | 'active' | 'restricted' | 'disabled'
  detailsSubmitted?: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  requirements?: any
  message?: string
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}

function SettingsContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { hasFeature } = useFeatures()
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [showChangeAccountModal, setShowChangeAccountModal] = useState(false)
  const [disconnectLoading, setDisconnectLoading] = useState(false)

  useEffect(() => {
    fetchConnectStatus()
  }, [])

  const fetchConnectStatus = async () => {
    try {
      const response = await stripeConnectAPI.getStatus()
      setConnectStatus(response.data)
    } catch (error) {
      console.error('Failed to fetch Connect status:', error)
      setConnectStatus({ connected: false, message: 'Not connected' })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    // Check if user has the feature
    if (!hasFeature(Feature.PAYMENT_INTEGRATION)) {
      setShowUpgradeModal(true)
      return
    }

    setActionLoading(true)
    try {
      // Create account if not exists
      if (!connectStatus?.connected) {
        await stripeConnectAPI.createAccount()
      }

      // Get onboarding link
      const response = await stripeConnectAPI.getOnboardingLink()
      window.location.href = response.data.url
    } catch (error: any) {
      toast({
        title: 'Connection Error',
        description: error.response?.data?.message || 'Failed to initiate Stripe Connect',
        variant: 'destructive',
      })
      setActionLoading(false)
    }
  }

  const handleViewDashboard = async () => {
    setActionLoading(true)
    try {
      const response = await stripeConnectAPI.getDashboardLink()
      window.open(response.data.url, '_blank')
    } catch (error: any) {
      toast({
        title: 'Dashboard Error',
        description: error.response?.data?.message || 'Failed to open dashboard',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefreshStatus = async () => {
    setActionLoading(true)
    try {
      await stripeConnectAPI.refreshStatus()
      await fetchConnectStatus()
      toast({
        title: 'Status Updated',
        description: 'Stripe Connect status has been refreshed',
      })
    } catch (error: any) {
      toast({
        title: 'Refresh Error',
        description: error.response?.data?.message || 'Failed to refresh status',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnectLoading(true)
    try {
      await stripeConnectAPI.disconnect()
      await fetchConnectStatus()
      setShowDisconnectModal(false)
      toast({
        title: 'Account Disconnected',
        description: 'Your Stripe account has been disconnected successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Disconnect Error',
        description: error.response?.data?.message || 'Failed to disconnect account',
        variant: 'destructive',
      })
    } finally {
      setDisconnectLoading(false)
    }
  }

  const handleChangeAccount = async () => {
    setDisconnectLoading(true)
    try {
      // First disconnect current account
      await stripeConnectAPI.disconnect()
      setShowChangeAccountModal(false)
      
      // Then immediately start connection flow for new account
      await stripeConnectAPI.createAccount()
      const response = await stripeConnectAPI.getOnboardingLink()
      window.location.href = response.data.url
    } catch (error: any) {
      setDisconnectLoading(false)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to change account',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = () => {
    if (!connectStatus?.connected) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
          <XCircle className="h-4 w-4" />
          Not Connected
        </span>
      )
    }

    if (connectStatus.accountStatus === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
          <CheckCircle2 className="h-4 w-4" />
          Active
        </span>
      )
    }

    if (connectStatus.accountStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
          <AlertCircle className="h-4 w-4" />
          Pending
        </span>
      )
    }

    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
          <XCircle className="h-4 w-4" />
          {connectStatus.accountStatus || 'Inactive'}
        </span>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/app/invoices" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-white font-black text-sm">
                  IN
                </div>
                <span className="text-xl font-bold">Invoicer</span>
              </Link>
            </div>
            <UserDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
        <h1 className="text-2xl font-bold text-muted-foreground mb-6">Settings</h1>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and subscription status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-base mt-1">{user?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-base mt-1">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Plan</label>
                <p className="text-base mt-1 capitalize">{user?.plan?.tier || 'Free'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Connect */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Stripe Connect
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Connect your Stripe account to accept online payments from your clients
                  </CardDescription>
                </div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  getStatusBadge()
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !connectStatus?.connected ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Why Connect Stripe?</h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <CreditCard className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Accept credit and debit card payments directly on your invoices</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Automatic payment tracking and invoice status updates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Fast payouts directly to your bank account</span>
                      </li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleConnectStripe} 
                    disabled={actionLoading}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4" />
                        Connect Stripe Account
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By connecting, you'll be redirected to Stripe to complete the setup process.
                    This is secure and only takes a few minutes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connection Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                      <p className="text-sm mt-1 font-mono truncate">{connectStatus.accountId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-sm mt-1 capitalize">{connectStatus.accountStatus}</p>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Capabilities</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`flex items-center gap-2 text-sm ${connectStatus.chargesEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {connectStatus.chargesEnabled ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span>Accept Payments</span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${connectStatus.payoutsEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {connectStatus.payoutsEnabled ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span>Receive Payouts</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning if not fully setup */}
                  {connectStatus.accountStatus !== 'active' && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-yellow-900">Action Required</h4>
                          <p className="text-sm text-yellow-800 mt-1">
                            Your Stripe account setup is incomplete. Complete the setup to start accepting payments.
                          </p>
                          {connectStatus.requirements && connectStatus.requirements.currently_due && connectStatus.requirements.currently_due.length > 0 && (
                            <p className="text-xs text-yellow-700 mt-2">
                              Missing: {connectStatus.requirements.currently_due.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Actions */}
                  <div className="flex gap-3">
                    {connectStatus.accountStatus !== 'active' && (
                      <Button 
                        onClick={handleConnectStripe} 
                        disabled={actionLoading}
                        variant="default"
                        className="flex-1 gap-2"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4" />
                            Complete Setup
                          </>
                        )}
                      </Button>
                    )}

                    <Button 
                      onClick={handleViewDashboard} 
                      disabled={actionLoading}
                      variant="outline"
                      className={connectStatus.accountStatus !== 'active' ? 'flex-1 gap-2' : 'flex-1 gap-2'}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          View Dashboard
                        </>
                      )}
                    </Button>

                    <Button 
                      onClick={handleRefreshStatus} 
                      disabled={actionLoading}
                      variant="outline"
                    >
                      Refresh
                    </Button>
                  </div>

                  {/* Platform Fee Notice */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Platform Fee:</strong> A 1% platform fee is automatically deducted from each payment
                      to support the invoice platform. Stripe also charges their standard processing fees.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone - Only show when connected */}
          {!loading && connectStatus?.connected && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Destructive actions that will affect your Stripe integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Change Account */}
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Change Stripe Account</h4>
                      <p className="text-sm text-gray-600">
                        Disconnect your current Stripe account and connect a different one. 
                        All existing payment links will stop working until you complete the new connection.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowChangeAccountModal(true)} 
                      disabled={actionLoading}
                      variant="outline"
                      className="gap-2 border-yellow-300 hover:bg-yellow-100 whitespace-nowrap"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Change Account
                    </Button>
                  </div>
                </div>

                {/* Disconnect */}
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Disconnect Stripe Account</h4>
                      <p className="text-sm text-gray-600">
                        Permanently disconnect your Stripe account. All payment links on your invoices will immediately stop working. 
                        You can reconnect at any time, but existing links will remain broken.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowDisconnectModal(true)} 
                      disabled={actionLoading}
                      variant="outline"
                      className="gap-2 border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 whitespace-nowrap"
                    >
                      <Unlink className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Stripe Connect Integration"
        description="Connect your Stripe account to accept payments on your invoices and start earning! Upgrade to Pro to unlock payment integration."
      />

      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Stripe Account?"
        message="Are you sure you want to disconnect your Stripe account? All existing payment links on your invoices will stop working. You can reconnect the same account or a different one at any time."
        confirmText="Disconnect"
        cancelText="Cancel"
        type="danger"
        loading={disconnectLoading}
      />

      {/* Change Account Confirmation Modal */}
      <ConfirmModal
        isOpen={showChangeAccountModal}
        onClose={() => setShowChangeAccountModal(false)}
        onConfirm={handleChangeAccount}
        title="Change Stripe Account?"
        message="This will disconnect your current Stripe account and redirect you to connect a different one. All existing payment links will stop working until you complete the new connection."
        confirmText="Change Account"
        cancelText="Cancel"
        type="warning"
        loading={disconnectLoading}
      />
    </div>
  )
}

