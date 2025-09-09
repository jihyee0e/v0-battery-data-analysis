"use client"

import { Zap, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ChargingStatusProps {
  isCharging: boolean
  power: number
  timeRemaining: string
}

export function ChargingStatus({ isCharging, power, timeRemaining }: ChargingStatusProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-full ${isCharging ? "bg-primary/20" : "bg-muted"}`}>
          <Zap className={`w-4 h-4 ${isCharging ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div>
          <div className="text-sm font-medium">{isCharging ? "Charging" : "Not Charging"}</div>
          <div className="text-xs text-muted-foreground">{isCharging ? `${power} kW` : "Disconnected"}</div>
        </div>
      </div>

      {isCharging && (
        <>
          <Progress value={78.4} className="h-2" />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeRemaining} remaining</span>
          </div>
        </>
      )}
    </div>
  )
}
