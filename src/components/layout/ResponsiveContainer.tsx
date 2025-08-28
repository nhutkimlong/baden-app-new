import { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  centered?: boolean
  fluid?: boolean
}

const ResponsiveContainer = ({
  children,
  className,
  maxWidth = '5xl',
  padding = 'md',
  centered = true,
  fluid = false
}: ResponsiveContainerProps) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl'
  }

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12',
    xl: 'px-8 sm:px-12 lg:px-16'
  }

  return (
    <div
      className={cn(
        'w-full',
        !fluid && maxWidthClasses[maxWidth],
        centered && !fluid && 'mx-auto',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

export default ResponsiveContainer
