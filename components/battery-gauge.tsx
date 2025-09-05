"use client"

interface BatteryGaugeProps {
  percentage: number
}

export function BatteryGauge({ percentage }: BatteryGaugeProps) {
  const circumference = 2 * Math.PI * 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="batteryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" />
            <stop offset="100%" stopColor="hsl(var(--chart-2))" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background circle */}
        <circle cx="50" cy="50" r="45" stroke="hsl(var(--muted))" strokeWidth="6" fill="transparent" opacity="0.3" />
        {/* Progress circle with gradient and glow */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#batteryGradient)"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          strokeLinecap="round"
          filter="url(#glow)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{percentage}%</div>
          <div className="text-xs text-muted-foreground">Battery</div>
        </div>
      </div>
    </div>
  )
}
