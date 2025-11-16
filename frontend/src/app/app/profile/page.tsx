'use client'

import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useSubscription } from '@/contexts/subscription-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  User, Mail, Calendar, Crown, Loader2, CreditCard, Plus, 
  Settings, FileText, TrendingUp, Edit2, Shield, Bell, 
  Sparkles, ChevronRight, BarChart3, Code
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppNavigation } from '@/components/ui/app-navigation'
import { useFeatures } from '@/contexts/features-context'
import { Feature } from '@/contexts/features-context'
import { useState } from 'react'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const { user } = useAuth()
  const { isPro, loading } = useSubscription()
  const { hasFeature } = useFeatures()
  const [isEditingName, setIsEditingName] = useState(false)

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  const memberDuration = user.createdAt 
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <AppNavigation />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        {/* Hero Section with Profile Header */}
        <div className="mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white overflow-hidden relative">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <CardContent className="pt-8 pb-8 relative">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className="relative group">
                  <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm text-white text-3xl font-bold border-4 border-white/30 shadow-2xl group-hover:scale-105 transition-transform">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {isPro && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-lg">
                      <Crown className="h-4 w-4" />
                    </div>
                  )}
                </div>
                
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl sm:text-4xl font-bold">{user.name}</h1>
                    <Badge variant={isPro ? "default" : "secondary"} className={isPro ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500" : ""}>
                      {isPro ? (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Pro
                        </span>
                      ) : 'Free'}
                    </Badge>
                  </div>
                  <p className="text-blue-100 mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {memberDuration} days ago</span>
                    </div>
                    {isPro && (
                      <div className="flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                        <Shield className="h-4 w-4" />
                        <span>Premium Member</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="self-start bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Link href="/builder" className="group">
                    <div className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:shadow-md transition-all bg-gradient-to-br from-blue-50 to-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform">
                          <Plus className="h-5 w-5 text-blue-600" />
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1">New Invoice</h3>
                      <p className="text-xs text-slate-600">Create and send invoices</p>
                    </div>
                  </Link>

                  <Link href="/app/invoices" className="group">
                    <div className="p-4 rounded-lg border-2 border-slate-200 hover:border-purple-500 hover:shadow-md transition-all bg-gradient-to-br from-purple-50 to-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg group-hover:scale-110 transition-transform">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1">My Invoices</h3>
                      <p className="text-xs text-slate-600">View all invoices</p>
                    </div>
                  </Link>

                  <Link href="/app/clients" className="group">
                    <div className="p-4 rounded-lg border-2 border-slate-200 hover:border-green-500 hover:shadow-md transition-all bg-gradient-to-br from-green-50 to-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-green-600 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1">Clients</h3>
                      <p className="text-xs text-slate-600">Manage your clients</p>
                    </div>
                  </Link>

                  {hasFeature(Feature.ANALYTICS) && (
                    <Link href="/app/analytics" className="group">
                      <div className="p-4 rounded-lg border-2 border-slate-200 hover:border-orange-500 hover:shadow-md transition-all bg-gradient-to-br from-orange-50 to-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-orange-100 rounded-lg group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-5 w-5 text-orange-600" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">Analytics</h3>
                        <p className="text-xs text-slate-600">View insights</p>
                      </div>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-slate-600" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <User className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Full Name</span>
                    </div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <Mail className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Email</span>
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{user.email}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <Crown className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Plan</span>
                    </div>
                    <p className="font-semibold text-slate-900">{isPro ? 'Pro Plan' : 'Free Plan'}</p>
                  </div>

                  {user.createdAt && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Member Since</span>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Subscription Card */}
            <Card className={isPro ? "border-yellow-200 bg-gradient-to-br from-yellow-50 to-white" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className={isPro ? "h-5 w-5 text-yellow-600" : "h-5 w-5 text-slate-600"} />
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPro ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">You have access to all premium features:</p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-center gap-2 text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Unlimited invoices
                        </li>
                        <li className="flex items-center gap-2 text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Advanced analytics
                        </li>
                        <li className="flex items-center gap-2 text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          API access
                        </li>
                        <li className="flex items-center gap-2 text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Priority support
                        </li>
                      </ul>
                    </div>
                    <Link href="/app/subscription" className="block">
                      <Button variant="outline" className="w-full border-yellow-300 hover:bg-yellow-50">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Subscription
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Upgrade to Pro to unlock premium features and boost your productivity.
                    </p>
                    <Link href="/pricing" className="block">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to Pro
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Settings & Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings & Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/app/settings">
                  <Button variant="ghost" className="w-full justify-start hover:bg-slate-100">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </Button>
                </Link>
                {hasFeature(Feature.API_ACCESS) && (
                  <Link href="/app/developer">
                    <Button variant="ghost" className="w-full justify-start hover:bg-slate-100">
                      <Code className="mr-2 h-4 w-4" />
                      Developer Tools
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" className="w-full justify-start hover:bg-slate-100" disabled>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                  <Badge variant="secondary" className="ml-auto">Soon</Badge>
                </Button>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Our support team is here to help you with any questions.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:support@invoiceapp.com">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Support
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1e293b] to-[#334155] flex items-center justify-center text-white font-black text-xs">
                IN
              </div>
              <span className="text-sm text-slate-600">
                © 2024 Invoicer. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-slate-600 hover:text-slate-900 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-slate-600 hover:text-slate-900 transition-colors">
                Terms
              </Link>
              <a href="mailto:support@invoiceapp.com" className="text-slate-600 hover:text-slate-900 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

