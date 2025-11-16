'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppNavigation } from '@/components/ui/app-navigation'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { useSubscription } from '@/contexts/subscription-context'
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
  User,
  Mail,
  Crown,
  Shield,
  Bell,
  Key,
  Globe,
  Palette,
  Settings as SettingsIcon,
  ChevronRight,
  Edit2,
  Save,
  X as XIcon,
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
  const { isPro } = useSubscription()
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
  const [activeTab, setActiveTab] = useState<'account' | 'billing' | 'payments' | 'preferences'>('account')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(user?.name || '')
  const [isSavingName, setIsSavingName] = useState(false)

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

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      })
      return
    }

    setIsSavingName(true)
    // TODO: Add API call to update user name
    setTimeout(() => {
      setIsSavingName(false)
      setIsEditingName(false)
      toast({
        title: 'Name updated',
        description: 'Your name has been updated successfully',
      })
    }, 500)
  }

  const settingsTabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'billing' as const, label: 'Billing', icon: Crown },
    { id: 'payments' as const, label: 'Payments', icon: CreditCard },
    { id: 'preferences' as const, label: 'Preferences', icon: SettingsIcon },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <AppNavigation />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 sm:gap-3">
            <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Settings
          </h1>
          <p className="text-sm sm:text-base text-slate-600">Manage your account, billing, and preferences</p>
        </div>

        {/* Mobile/Tablet: Horizontal Tabs */}
        <div className="lg:hidden mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Desktop: Sidebar Navigation */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  {settingsTabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{tab.label}</span>
                        {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <>
                {/* Profile Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>Update your personal details and account information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {isPro && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-lg">
                            <Crown className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-semibold text-slate-900">{user?.name}</h3>
                        <p className="text-sm text-slate-600 break-all sm:break-normal">{user?.email}</p>
                        <Badge variant={isPro ? "default" : "secondary"} className="mt-2">
                          {isPro ? 'Pro Plan' : 'Free Plan'}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                        <Edit2 className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Change Photo</span>
                        <span className="sm:hidden">Change</span>
                      </Button>
                    </div>

                    <div className="border-t pt-4 sm:pt-6 space-y-4 sm:space-y-5">
                      {/* Name Field */}
                      <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:space-y-0">
                        <label className="text-sm font-medium text-slate-700 sm:pt-3">Full Name</label>
                        <div className="sm:col-span-2">
                          {isEditingName ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="Enter your name"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleSaveName}
                                  disabled={isSavingName}
                                  size="sm"
                                  className="gap-2 flex-1 sm:flex-none"
                                >
                                  {isSavingName ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                  <span className="sm:inline">Save</span>
                                </Button>
                                <Button
                                  onClick={() => {
                                    setIsEditingName(false)
                                    setEditedName(user?.name || '')
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 sm:flex-none"
                                >
                                  <XIcon className="h-4 w-4" />
                                  <span className="sm:inline">Cancel</span>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                              <span className="font-medium text-slate-900">{user?.name}</span>
                              <Button
                                onClick={() => setIsEditingName(true)}
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center sm:space-y-0">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                              <span className="font-medium text-slate-900 truncate text-sm sm:text-base">{user?.email}</span>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">Verified</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Email cannot be changed for security reasons</p>
                        </div>
                      </div>

                      {/* Account Status */}
                      <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center sm:space-y-0">
                        <label className="text-sm font-medium text-slate-700">Account Status</label>
                        <div className="sm:col-span-2">
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 text-green-800">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="font-medium">Active</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      Security
                    </CardTitle>
                    <CardDescription>Manage your account security settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Password</h4>
                        <p className="text-sm text-slate-600 mt-1">Last changed 30 days ago</p>
                      </div>
                      <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                        Change Password
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-slate-600 mt-1">Add an extra layer of security</p>
                      </div>
                      <Badge variant="secondary" className="self-start sm:self-center">Coming Soon</Badge>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-600" />
                      Subscription Plan
                    </CardTitle>
                    <CardDescription>Manage your subscription and billing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    <div className={`p-4 sm:p-6 rounded-xl border-2 ${isPro ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{isPro ? 'Pro Plan' : 'Free Plan'}</h3>
                          {isPro && (
                            <p className="text-xs sm:text-sm text-slate-600 mt-1">Billed monthly • Next billing date: Dec 17, 2025</p>
                          )}
                        </div>
                        {isPro && (
                          <Badge className="bg-yellow-400 text-yellow-900 self-start">
                            <Crown className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>

                      {isPro ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>Unlimited invoices</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>Advanced analytics</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>Payment integration</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>API access</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>Priority support</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          Upgrade to Pro to unlock unlimited invoices, advanced analytics, payment integration, and more!
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                        {isPro ? (
                          <>
                            <Link href="/app/subscription" className="flex-1">
                              <Button variant="outline" className="w-full">
                                Manage Subscription
                              </Button>
                            </Link>
                            <Button variant="outline" disabled className="w-full sm:w-auto">
                              Cancel Plan
                            </Button>
                          </>
                        ) : (
                          <Link href="/pricing" className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                              <Crown className="h-4 w-4 mr-2" />
                              Upgrade to Pro
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Billing History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View your past invoices and payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-slate-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No billing history yet</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <>
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    {connectStatus.accountStatus !== 'active' && (
                      <Button 
                        onClick={handleConnectStripe} 
                        disabled={actionLoading}
                        variant="default"
                        className="flex-1 gap-2 w-full sm:w-auto"
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
                      className="flex-1 gap-2 w-full sm:w-auto"
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
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className="h-4 w-4 sm:mr-2" />
                      <span className="sm:inline">Refresh</span>
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
                        <div className="flex flex-col gap-3">
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
                            className="gap-2 border-yellow-300 hover:bg-yellow-100 w-full sm:w-auto sm:self-start"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Change Account
                          </Button>
                        </div>
                      </div>

                      {/* Disconnect */}
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex flex-col gap-3">
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
                            className="gap-2 border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 w-full sm:w-auto sm:self-start"
                          >
                            <Unlink className="h-4 w-4" />
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      General Preferences
                    </CardTitle>
                    <CardDescription>Customize your experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Language</h4>
                        <p className="text-sm text-slate-600 mt-1">Choose your preferred language</p>
                      </div>
                      <select className="px-3 py-2 border rounded-lg w-full sm:w-auto" disabled>
                        <option>English (US)</option>
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Time Zone</h4>
                        <p className="text-sm text-slate-600 mt-1">Automatically detected</p>
                      </div>
                      <select className="px-3 py-2 border rounded-lg w-full sm:w-auto" disabled>
                        <option>America/Los_Angeles</option>
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Currency Display</h4>
                        <p className="text-sm text-slate-600 mt-1">Default currency for new invoices</p>
                      </div>
                      <select className="px-3 py-2 border rounded-lg w-full sm:w-auto" disabled>
                        <option>USD ($)</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-blue-600" />
                      Notifications
                    </CardTitle>
                    <CardDescription>Manage how you receive notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Email Notifications</h4>
                        <p className="text-sm text-slate-600 mt-1">Receive updates via email</p>
                      </div>
                      <Badge variant="secondary" className="self-start sm:self-center">Coming Soon</Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Invoice Reminders</h4>
                        <p className="text-sm text-slate-600 mt-1">Automatic payment reminders</p>
                      </div>
                      <Badge variant="secondary" className="self-start sm:self-center">Coming Soon</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-blue-600" />
                      Appearance
                    </CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">Theme</h4>
                        <p className="text-sm text-slate-600 mt-1">Choose light or dark mode</p>
                      </div>
                      <select className="px-3 py-2 border rounded-lg w-full sm:w-auto" disabled>
                        <option>Light</option>
                        <option>Dark</option>
                        <option>System</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
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

