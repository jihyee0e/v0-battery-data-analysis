"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Battery, Gauge, TrendingUp, MapPin, Thermometer } from "lucide-react"

const vehicleDetails = {
  porter2_001: {
    info: { model: "Porter 2", id: "porter2_001", location: "서울시 강남구", totalDistance: 89048 },
    current: { soc: 78.4, soh: 94.5, voltage: 458.1, current: -12.3, temp: 22.5, speed: 0 },
    trends: [
      { time: "00:00", soc: 85, soh: 94.5, efficiency: 6.2 },
      { time: "04:00", soc: 82, soh: 94.5, efficiency: 6.1 },
      { time: "08:00", soc: 78, soh: 94.4, efficiency: 6.3 },
      { time: "12:00", soc: 75, soh: 94.4, efficiency: 6.0 },
      { time: "16:00", soc: 78, soh: 94.5, efficiency: 6.2 },
      { time: "20:00", soc: 80, soh: 94.5, efficiency: 6.1 },
    ],
    charging: [
      { date: "2024-01", sessions: 45, efficiency: 92.3, avgTime: 85 },
      { date: "2024-02", sessions: 42, efficiency: 91.8, avgTime: 88 },
      { date: "2024-03", sessions: 48, efficiency: 93.1, avgTime: 82 },
      { date: "2024-04", sessions: 44, efficiency: 92.7, avgTime: 86 },
      { date: "2024-05", sessions: 46, efficiency: 93.4, avgTime: 81 },
      { date: "2024-06", sessions: 43, efficiency: 92.9, avgTime: 84 },
    ],
  },
}

export function VehicleDetails() {
  const [selectedVehicle, setSelectedVehicle] = useState("porter2_001")
  const data = vehicleDetails[selectedVehicle as keyof typeof vehicleDetails]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">차량 상세 정보</h2>
        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="porter2_001">Porter 2 - 001</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Battery className="w-4 h-4" />
              현재 SOC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.current.soc}%</div>
            <Progress value={data.current.soc} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              배터리 건강도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.current.soh}%</div>
            <Badge variant="outline" className="text-green-500 border-green-500 bg-green-500/10 mt-2">
              우수
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4" />총 주행거리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{data.info.totalDistance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">km</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              현재 위치
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{data.info.location}</div>
            <div className="text-xs text-muted-foreground mt-1">속도: {data.current.speed} km/h</div>
          </CardContent>
        </Card>
      </div>

      {/* 성능 트렌드 */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>일일 성능 트렌드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="soc" stroke="hsl(var(--primary))" strokeWidth={2} name="SOC (%)" />
                <Line type="monotone" dataKey="soh" stroke="hsl(var(--chart-3))" strokeWidth={2} name="SOH (%)" />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  name="효율 (km/kWh)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 충전 패턴 */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>월별 충전 패턴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charging}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  name="충전 횟수"
                />
                <Area
                  type="monotone"
                  dataKey="efficiency"
                  stackId="2"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.3}
                  name="충전 효율 (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>전기 시스템</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">팩 전압</span>
              <span className="font-mono">{data.current.voltage} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">팩 전류</span>
              <span className="font-mono">{data.current.current} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                배터리 온도
              </span>
              <span className="font-mono">{data.current.temp}°C</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>성능 지표</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">평균 효율</span>
              <span className="font-mono">6.2 km/kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">월 평균 충전</span>
              <span className="font-mono">45회</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">충전 효율</span>
              <span className="font-mono">92.8%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
