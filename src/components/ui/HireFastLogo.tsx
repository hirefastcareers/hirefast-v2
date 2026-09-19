import { cn } from '@/lib/utils'

interface HireFastLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function HireFastLogo({ size = 'md', className }: HireFastLogoProps) {
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-4xl' : 'text-2xl'
  const chevronSize = size === 'sm' ? 16 : size === 'lg' ? 32 : 21
  const strokeWidth = size === 'sm' ? '2' : size === 'lg' ? '3.5' : '2.5'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <svg
        width={chevronSize}
        height={chevronSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="text-blue-600"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="9,4 17,12 9,20" />
      </svg>
      <span
        className={cn(
          'font-bold leading-none tracking-tight',
          textSize,
        )}
      >
        <span className="text-slate-900">Hire</span>
        <span className="text-blue-600">Fast</span>
      </span>
    </div>
  )
}

export default HireFastLogo
