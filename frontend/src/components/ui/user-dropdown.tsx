'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { User, CreditCard, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export function UserDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-secondary/50 hover:bg-secondary/70 rounded-lg transition-colors"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-semibold">
          {user.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="text-sm font-medium hidden md:inline">{user.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-12 z-20 w-56 bg-white rounded-lg shadow-lg border overflow-hidden">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/app/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-slate-700"
              >
                <User className="h-4 w-4 text-slate-500" />
                <span>View Profile</span>
              </Link>

              <Link
                href="/app/subscription"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-slate-700"
              >
                <CreditCard className="h-4 w-4 text-slate-500" />
                <span>Subscription</span>
              </Link>

              <div className="h-px bg-slate-200 my-1" />

              <button
                onClick={() => {
                  setIsOpen(false)
                  logout()
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-red-600 w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

