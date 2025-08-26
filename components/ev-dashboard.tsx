"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BatteryGauge } from "@/components/battery-gauge"
import { ChargingStatus } from "@/components/charging-status"
import { DataFlowDiagram } from "@/components/data-flow-diagram"
import { AnalyticsChart } from "@/components/analytics-chart"
import { Battery, Zap, Gauge, BarChart3, TrendingUp, Thermometer, Car } from "lucide-react"

const mockData = {
  porter2: {
    bms: {
      soc: 78.4,
      soh: 94.5,
      pack_volt: 458.1,
      pack_current: -12.3,
      odometer: 89048,
      batt_internal_temp: 22.5,
      max_cell_volt: 4.15,
      min_cell_volt: 4.12,
      chrg_cable_conn: 1,
      fast_chrg_port_conn: 0,
      slow_chrg_port_conn: 1,
      est_chrg_time: 135, // minutes
      cumul_energy_chrgd: 2847.5,
    },
    gps: {
      speed: 0,
      fuel_pct: 78.4,
      lat: 37.5665,
      lng: 126.978,
      mode: "ECO",
      state: "PARKED",
    },
  },
  gv60: {
    bms: {
      soc: 85.2,
      soh: 96.8,
      pack_volt: 412.7,
      pack_current: 0,
      odometer: 45230,
      batt_internal_temp: 24.1,
      max_cell_volt: 4.18,
      min_cell_volt: 4.16,
      chrg_cable_conn: 0,
      fast_chrg_port_conn: 0,
      slow_chrg_port_conn: 0,
      est_chrg_time: 0,
      cumul_energy_chrgd: 1892.3,
    },
    gps: {
      speed: 65,
      fuel_pct: 85.2,
      lat: 37.4979,
      lng: 127.0276,
      mode: "SPORT",
      state: "DRIVING",
    },
  },
  bongo3: {
    bms: {
      soc: 42.1,
      soh: 91.2,
      pack_volt: 385.9,
      pack_current: -45.7,
      odometer: 127845,
      batt_internal_temp: 28.3,
      max_cell_volt: 4.08,
      min_cell_volt: 4.02,
      chrg_cable_conn: 1,
      fast_chrg_port_conn: 1,
      slow_chrg_port_conn: 0,
      est_chrg_time: 78,
      cumul_energy_chrgd: 5234.8,
    },
    gps: {
      speed: 0,
      fuel_pct: 42.1,
      lat: 35.1796,
      lng: 129.0756,
      mode: "NORMAL",
      state: "CHARGING",
    },
  },
}

export function EVDashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState<keyof typeof mockData>("porter2")
  const currentData = mockData[selectedVehicle]
  const isCharging = currentData.bms.chrg_cable_conn === 1 || currentData.bms.fast_chrg_port_conn === 1
  const estimatedRange = Math.round(currentData.bms.soc * 6.64) // Rough calculation based on SOC

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">AI Car Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedVehicle} onValueChange={(value: keyof typeof mockData) => setSelectedVehicle(value)}>
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
