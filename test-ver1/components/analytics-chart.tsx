"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

const data = [
  { time: "00:00", consumption: 12.9 },
  { time: "04:00", consumption: 8.2 },
  { time: "08:00", consumption: 15.6 },
  { time: "12:00", consumption: 22.1 },
  { time: "16:00", consumption: 18.7 },
  { time: "20:00", consumption: 14.3 },
  { time: "24:00", consumption: 10.5 },
]

export function AnalyticsChart() {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Line
            type="monotone"
            dataKey="consumption"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
