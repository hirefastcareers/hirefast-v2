import { cn } from '@/lib/utils'

interface HireFastLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function HireFastLogo({ size = 'md', className }: HireFastLogoProps) {
  const textSize = size === 'sm' ? '18px' : size === 'lg' ? '36px' : '24px'
  const chevronSize = size === 'sm' ? '16px' : size === 'lg' ? '32px' : '21px'
  const strokeWidth = size === 'sm' ? '2' : size === 'lg' ? '3.5' : '2.5'

  return (
    <div className={cn('flex items-center gap-[6px]', className)}>
      <svg
        width={chevronSize}
        height={chevronSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3b6ef5"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9,4 17,12 9,20" />
      </svg>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: textSize,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: '#f0f4ff' }}>Hire</span>
        <span style={{ color: '#3b6ef5' }}>Fast</span>
      </span>
    </div>
  )
}

export default HireFastLogo
