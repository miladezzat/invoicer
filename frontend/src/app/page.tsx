'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, FileText, Zap, Shield, Globe, Check, Sparkles, TrendingUp, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { stripeAPI } from '@/lib/api'

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

export default function HomePage() {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  // Fetch pricing plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await stripeAPI.getPricingPlans()
        setPlans(response.data)
      } catch (err) {
        console.error('Failed to fetch pricing plans:', err)
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [])

  // Redirect authenticated users to their invoices page
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/app/invoices')
    }
  }, [isAuthenticated, router])

  // Show loading or nothing while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#334155] flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:shadow-xl transition-shadow">
                IN
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Invoicer
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="lg" className="font-semibold">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg" className="font-semibold shadow-lg hover:shadow-xl transition-shadow">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 px-4 overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto text-center max-w-5xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Professional Invoicing Made Simple</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            Create Professional<br />
            <span className="bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Invoices in Minutes
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Fast, beautiful, and easy to use. Start creating invoices without signing up,
            or create an account to save and track everything in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/builder">
              <Button size="lg" className="gap-2 h-14 px-8 text-base font-semibold shadow-xl hover:shadow-2xl transition-all">
                <Zap className="h-5 w-5" />
                Try as Guest
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold border-2">
                Create Account
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Free forever</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-32 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Everything you need to manage invoices
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make invoicing simple and professional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Zap className="h-6 w-6" />,
                title: "Lightning Fast",
                description: "Create invoices in seconds with our intuitive builder",
                color: "from-yellow-500 to-orange-500"
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Guest Mode",
                description: "No signup required. Create invoices immediately",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: <Globe className="h-6 w-6" />,
                title: "Share Easily",
                description: "Generate shareable links and print-ready PDFs",
                color: "from-green-500 to-emerald-500"
              },
              {
                icon: <FileText className="h-6 w-6" />,
                title: "Track Status",
                description: "Monitor draft, sent, paid, and overdue invoices",
                color: "from-purple-500 to-pink-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-32 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to create your invoice
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Fill in the details",
                description: "Add your business info, client details, and line items",
                icon: <FileText className="h-8 w-8" />
              },
              {
                step: "02",
                title: "Customize your invoice",
                description: "Choose colors, add your logo, and preview in real-time",
                icon: <Sparkles className="h-8 w-8" />
              },
              {
                step: "03",
                title: "Share or Download",
                description: "Print, download PDF, or share a link with your client",
                icon: <TrendingUp className="h-8 w-8" />
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-white mb-6 shadow-lg">
                    {item.icon}
                  </div>
                  <div className="text-6xl font-bold text-primary/10 absolute top-0 left-1/2 -translate-x-1/2 -z-10">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-xl mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 right-0 translate-x-1/2">
                    <ArrowRight className="h-6 w-6 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 sm:py-32 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>

          {loadingPlans ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading plans...</p>
            </div>
          ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {plans.map((plan, index) => {
                const monthlyPrice = plan.prices.find(p => p.interval === 'month')
                const displayPrice = monthlyPrice ? (monthlyPrice.amount / 100).toFixed(0) : '0'
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative border-2 hover:shadow-xl transition-shadow ${!plan.isFree ? 'border-primary' : ''}`}
                  >
                    {!plan.isFree && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                          POPULAR
                        </span>
                      </div>
                    )}
              <CardContent className="p-8">
                <div className="mb-6">
                        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-5xl font-bold">${plan.isFree ? '0' : displayPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                        {plan.description && (
                  <p className="text-muted-foreground">
                            {plan.description}
                  </p>
                        )}
                </div>

                      {plan.isFree ? (
                <Link href="/auth/signup" className="block mb-6">
                  <Button className="w-full h-12 text-base" variant="outline">
                    Get Started Free
                  </Button>
                </Link>
                      ) : (
                        <Link href="/pricing" className="block mb-6">
                          <Button className="w-full h-12 text-base">
                            Upgrade Now
                          </Button>
                        </Link>
                      )}

                <div className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center gap-3">
                            <Check className={`h-5 w-5 flex-shrink-0 ${plan.isFree ? 'text-green-600' : 'text-primary'}`} />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
                )
              })}
              </div>
          )}

          {/* Trust Section */}
          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-6">
              Trusted by freelancers and businesses worldwide
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              <div className="text-2xl font-bold">500+ Users</div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-2xl font-bold">10K+ Invoices</div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-2xl font-bold">$2M+ Processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 px-4 bg-gradient-to-br from-primary to-blue-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg sm:text-xl mb-10 opacity-90">
            Join thousands of professionals creating beautiful invoices every day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/builder">
              <Button 
                size="lg" 
                className="h-14 px-8 text-base font-semibold shadow-2xl bg-white text-primary hover:bg-gray-100 hover:scale-105 transition-transform"
              >
                <Clock className="h-5 w-5 mr-2" />
                Start Now - It's Free
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 text-base font-semibold border-2 border-white bg-transparent text-white hover:bg-white hover:text-primary transition-all"
              >
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e293b] to-[#334155] flex items-center justify-center text-white font-black text-xs">
                IN
              </div>
              <span className="font-bold text-lg">Invoicer</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2025 Invoicer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

