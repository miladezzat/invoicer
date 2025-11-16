'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  Home,
} from 'lucide-react'
import { UserDropdown } from './user-dropdown'
import { useFeatures } from '@/contexts/features-context'
import { Feature } from '@/contexts/features-context'
import { Badge } from './badge'

const navItems = [
  {
    href: '/app/invoices',
    label: 'Invoices',
    icon: FileText,
    feature: null,
  },
  {
    href: '/app/clients',
    label: 'Clients',
    icon: Users,
    feature: Feature.CLIENT_MANAGEMENT,
  },
  {
    href: '/app/analytics',
    label: 'Analytics',
    icon: BarChart3,
    feature: Feature.ANALYTICS,
  },
  {
    href: '/app/settings',
    label: 'Settings',
    icon: Settings,
    feature: null,
  },
]

export function AppNavigation() {
  const pathname = usePathname()
  const { hasFeature, isPro } = useFeatures()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const isActive = (href: string) => {
    if (href === '/app/invoices') {
      return pathname === '/app/invoices' || pathname === '/' || pathname === '/app'
    }
    return pathname?.startsWith(href)
  }

  const canAccessFeature = (feature: Feature | null) => {
    if (!feature) return true
    return isPro || hasFeature(feature)
  }

  return (
    <>
      <header className="border-b bg-white/90 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/app/invoices" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e293b] to-[#334155] flex items-center justify-center text-white font-black text-sm shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                IN
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent hidden sm:inline">
                Invoicer
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                const canAccess = canAccessFeature(item.feature)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : canAccess
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                    onClick={(e) => {
                      if (!canAccess) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {!canAccess && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">Pro</Badge>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6 text-slate-700" />
                ) : (
                  <Menu className="h-6 w-6 text-slate-700" />
                )}
              </button>

              {/* User Dropdown */}
              <UserDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Mobile Menu */}
          <div className="fixed top-16 left-0 right-0 bottom-0 bg-white z-40 md:hidden overflow-y-auto">
            <nav className="container mx-auto px-4 py-6">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  const canAccess = canAccessFeature(item.feature)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between gap-3 px-4 py-4 rounded-xl font-semibold transition-all ${
                        active
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                          : canAccess
                          ? 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        if (!canAccess) {
                          e.preventDefault()
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          active 
                            ? 'bg-white/20' 
                            : canAccess
                            ? 'bg-slate-200'
                            : 'bg-slate-100'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-lg">{item.label}</span>
                      </div>
                      {!canAccess && (
                        <Badge className="bg-amber-100 text-amber-700">Pro</Badge>
                      )}
                    </Link>
                  )
                })}
              </div>

              {/* Additional Quick Actions */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-4">
                  Quick Actions
                </h3>
                <Link
                  href="/builder"
                  className="flex items-center gap-3 px-4 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-lg">Create Invoice</span>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
