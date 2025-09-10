'use client'

import React from 'react'

interface FuturisticButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger' | 'warning'
  disabled?: boolean
  className?: string
}

export function FuturisticButton({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  disabled = false,
  className = '' 
}: FuturisticButtonProps) {
  const baseClasses = 'relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 border border-cyan-500/30',
    secondary: 'bg-slate-700/80 hover:bg-slate-600/80 text-slate-200 border border-slate-600/50 hover:border-slate-500/50',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg hover:shadow-xl hover:shadow-red-500/20 border border-red-500/30',
    warning: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg hover:shadow-xl hover:shadow-amber-500/20 border border-amber-500/30'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      <span className="relative z-10">{children}</span>
    </button>
  )
}

interface FuturisticInputProps {
  type?: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  className?: string
  label?: string
}

export function FuturisticInput({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  required = false,
  className = '',
  label
}: FuturisticInputProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-700/70 transition-all duration-300 focus:shadow-lg focus:shadow-cyan-500/10"
        />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </div>
  )
}

interface FuturisticCardProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function FuturisticCard({ children, title, className = '' }: FuturisticCardProps) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-cyan-500/5 ${className}`}>
      {title && (
        <div className="border-b border-slate-700/50 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'error'
  children: React.ReactNode
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusClasses = {
    online: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    offline: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30'
  }

  const dotClasses = {
    online: 'bg-emerald-400',
    offline: 'bg-slate-400',
    warning: 'bg-amber-400',
    error: 'bg-red-400'
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-medium ${statusClasses[status]}`}>
      <div className={`w-2 h-2 rounded-full animate-pulse ${dotClasses[status]}`} />
      <span>{children}</span>
    </div>
  )
}

interface DataTableProps {
  headers: string[]
  children: React.ReactNode
}

export function DataTable({ headers, children }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50">
      <table className="w-full">
        <thead className="bg-slate-800/80">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-slate-700/30 divide-y divide-slate-700/50">
          {children}
        </tbody>
      </table>
    </div>
  )
}