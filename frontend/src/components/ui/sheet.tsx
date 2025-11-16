'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
}

export function Sheet({ open, onClose, children, side = 'bottom', className }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  const sideStyles = {
    left: 'inset-y-0 left-0 w-3/4 max-w-sm',
    right: 'inset-y-0 right-0 w-3/4 max-w-sm',
    top: 'inset-x-0 top-0 h-auto max-h-[85vh]',
    bottom: 'inset-x-0 bottom-0 h-auto max-h-[85vh] rounded-t-2xl',
  }

  const animationStyles = {
    left: open ? 'translate-x-0' : '-translate-x-full',
    right: open ? 'translate-x-0' : 'translate-x-full',
    top: open ? 'translate-y-0' : '-translate-y-full',
    bottom: open ? 'translate-y-0' : 'translate-y-full',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed z-50 bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          sideStyles[side],
          animationStyles[side],
          className
        )}
      >
        {children}
      </div>
    </>
  )
}

interface SheetHeaderProps {
  children: React.ReactNode
  className?: string
}

export function SheetHeader({ children, className }: SheetHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between p-6 border-b', className)}>
      {children}
    </div>
  )
}

interface SheetTitleProps {
  children: React.ReactNode
  className?: string
}

export function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-slate-900', className)}>
      {children}
    </h2>
  )
}

interface SheetCloseProps {
  onClose: () => void
  className?: string
}

export function SheetClose({ onClose, className }: SheetCloseProps) {
  return (
    <button
      onClick={onClose}
      className={cn(
        'rounded-lg p-2 hover:bg-slate-100 transition-colors',
        className
      )}
      aria-label="Close"
    >
      <X className="h-5 w-5" />
    </button>
  )
}

interface SheetContentProps {
  children: React.ReactNode
  className?: string
}

export function SheetContent({ children, className }: SheetContentProps) {
  return (
    <div className={cn('p-6 overflow-y-auto', className)}>
      {children}
    </div>
  )
}
