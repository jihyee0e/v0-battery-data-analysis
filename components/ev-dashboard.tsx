"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BatteryGauge } from "@/components/battery-gauge"
import { ChargingStatus } from "@/components/charging-status"
import { DataFlowDiagram } from "@/components/data-flow-diagram"
import { AnalyticsChart } from "@/components/analytics-chart"
import { Battery, Zap, Gauge, BarChart3, TrendingUp, Thermometer, Car } from "lucide-react"

interface VehicleData {
  vehicle_type: "porter2" | "gv60" | "bongo3"
  bms: {
    soc: number
    soh: number
    pack_volt: number
    pack_current: number
    odometer: number
    batt_internal_temp: number
    max_cell_volt: number
    min_cell_volt: number
    chrg_cable_conn: number
    fast_chrg_port_conn: number
    slow_chrg_port_conn: number
    est_chrg_time: number
    cumul_energy_chrgd: number
  }
  gps: {
    speed: number
    fuel_pct: number
    lat: number
    lng: number
    mode: string
    state: string
  }
}

export function EVDashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState<"porter2" | "gv60" | "bongo3">("porter2")
  const [currentData, setCurrentData] = useState<VehicleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicleData = async (vehicleType: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/vehicles/${vehicleType}`)

      if (!response.ok) {
        throw new Error("Failed to fetch vehicle data")
      }

      const data = await response.json()
      setCurrentData(data)
      setError(null)
    } catch (err) {
      console.error("Error fetching vehicle data:", err)
      setError("Failed to load vehicle data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicleData(selectedVehicle)
  }, [selectedVehicle])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading vehicle data...</p>
        </div>
      </div>
    )
  }

  if (error || !currentData) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "No data available"}</p>
          <button
            onClick={() => fetchVehicleData(selectedVehicle)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const isCharging = currentData.bms.chrg_cable_conn === 1 || currentData.bms.fast_chrg_port_conn === 1
  const estimatedRange = Math.round(currentData.bms.soc * 6.64)

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">AI Car Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedVehicle}
            onValueChange={(value: "porter2" | "gv60" | "bongo3") => setSelectedVehicle(value)}
          >
            <SelectTrigger className="w-32">
              <Car className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="porter2">Porter 2</SelectItem>
              <SelectItem value="gv60">GV60</SelectItem>
              <SelectItem value="bongo3">Bongo 3</SelectItem>
            </SelectContent>
          </Select>
          <Badge
            variant="outline"
            className={`${currentData.gps.state === "DRIVING" ? "text-primary border-primary bg-primary/10" : currentData.gps.state === "CHARGING" ? "text-chart-3 border-chart-3 bg-chart-3/10" : "text-muted-foreground border-muted-foreground bg-muted/10"}`}
          >
            <Zap className="w-4 h-4 mr-1" />
            {currentData.gps.state}
          </Badge>
        </div>
      </div>

      {/* Data Flow Section */}
      <DataFlowDiagram />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Battery Status */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battery Status</CardTitle>
            <Battery className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <BatteryGauge percentage={currentData.bms.soc} />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SOC</span>
                <span className="text-foreground font-mono">{currentData.bms.soc.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Range</span>
                <span className="text-foreground font-mono">{estimatedRange} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Voltage</span>
                <span className="text-foreground font-mono">{currentData.bms.pack_volt.toFixed(1)} V</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current</span>
                <span className="text-foreground font-mono">{currentData.bms.pack_current.toFixed(1)} A</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charging Status */}
        <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Charging</CardTitle>
            <Zap className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <ChargingStatus
              isCharging={isCharging}
              power={Math.abs((currentData.bms.pack_current * currentData.bms.pack_volt) / 1000)}
              timeRemaining={
                currentData.bms.est_chrg_time > 0
                  ? `${Math.floor(currentData.bms.est_chrg_time / 60)}h ${currentData.bms.est_chrg_time % 60}m`
                  : "N/A"
              }
            />
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cable</span>
                <span className={currentData.bms.chrg_cable_conn ? "text-primary" : "text-muted-foreground"}>
                  {currentData.bms.chrg_cable_conn ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fast Charge</span>
                <span className={currentData.bms.fast_chrg_port_conn ? "text-primary" : "text-muted-foreground"}>
                  {currentData.bms.fast_chrg_port_conn ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Odometer */}
        <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Odometer</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{currentData.bms.odometer.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">km</p>
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">Speed</div>
              <div className="text-lg font-semibold text-primary">{currentData.gps.speed} km/h</div>
            </div>
          </CardContent>
        </Card>

        {/* SOH (State of Health) */}
        <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battery Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentData.bms.soh.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">State of Health</p>
            <div className="mt-2">
              <Progress value={currentData.bms.soh} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Energy Consumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart />
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  Battery Temp
                </div>
                <div className="text-lg font-semibold font-mono">{currentData.bms.batt_internal_temp.toFixed(1)}°C</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Cell Voltage</div>
                <div className="text-lg font-semibold font-mono">
                  {currentData.bms.min_cell_volt.toFixed(2)}-{currentData.bms.max_cell_volt.toFixed(2)}V
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total Energy</div>
                <div className="text-lg font-semibold font-mono">
                  {currentData.bms.cumul_energy_chrgd.toFixed(1)} kWh
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Mode</div>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                  {currentData.gps.mode}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
