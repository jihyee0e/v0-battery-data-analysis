"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Battery, Gauge, TrendingUp, MapPin, Thermometer } from "lucide-react"

interface VehicleData {
  vehicle: {
    vehicle_id: string
    vehicle_type: string
    latest_soc: number
    latest_soh: number
    performance_grade: string
    last_updated: string
    pack_volt: number
    pack_current: number
    mod_avg_temp: number
    avg_efficiency: number
    power_w: number
    vehicle_status: string
    speed: number | null
    lat: number | null
    lng: number | null
    fuel_pct: number | null
    seconds_since_update: number
  }
  history: Array<{
    date: string
    avg_soc: number
    avg_soh: number
    avg_pack_volt: number
    avg_pack_current: number
    avg_mod_temp: number
    record_count: number
    data_quality: string
  }>
  summary: {
    is_active: boolean
    performance_status: string
    charging_status: string
  }
}

export function VehicleDetails() {
  const [selectedVehicle, setSelectedVehicle] = useState("porter2_001")
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/vehicles/${selectedVehicle}`)
        if (response.ok) {
          const data = await response.json()
          setVehicleData(data)
        }
      } catch (error) {
        console.error('차량 데이터 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVehicleData()
  }, [selectedVehicle])

  if (loading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>
  }

  if (!vehicleData) {
    return <div className="flex items-center justify-center h-64">차량 데이터를 찾을 수 없습니다.</div>
  }

  const { vehicle, history, summary } = vehicleData

  return (
    <div className="space-y-6 bg-white text-black min-h-screen">
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
            <div className="text-2xl font-bold">{vehicle.latest_soc}%</div>
            <Progress value={vehicle.latest_soc} className="mt-2" />
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
            <div className="text-2xl font-bold">{vehicle.latest_soh}%</div>
            <Badge variant="outline" className="text-green-500 border-green-500 bg-green-500/10 mt-2">
              {vehicle.performance_grade}
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
            <div className="text-2xl font-bold font-mono">N/A</div>
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
            <div className="text-sm font-medium">
              {vehicle.lat && vehicle.lng ? `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              속도: {vehicle.speed ? `${vehicle.speed} km/h` : 'N/A'}
            </div>
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
              <LineChart data={history}>
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
                <Line type="monotone" dataKey="avg_soc" stroke="hsl(var(--primary))" strokeWidth={2} name="SOC (%)" />
                <Line type="monotone" dataKey="avg_soh" stroke="hsl(var(--chart-3))" strokeWidth={2} name="SOH (%)" />
                <Line
                  type="monotone"
                  dataKey="avg_mod_temp"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  name="온도 (°C)"
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
              <AreaChart data={history}>
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
                  dataKey="record_count"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  name="기록 수"
                />
                <Area
                  type="monotone"
                  dataKey="avg_pack_volt"
                  stackId="2"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.3}
                  name="평균 전압 (V)"
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
              <span className="font-mono">{vehicle.pack_volt} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">팩 전류</span>
              <span className="font-mono">{vehicle.pack_current} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                배터리 온도
              </span>
              <span className="font-mono">{vehicle.mod_avg_temp}°C</span>
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
