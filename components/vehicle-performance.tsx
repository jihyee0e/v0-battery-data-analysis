"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Battery, Zap, Gauge, Filter, Info } from "lucide-react"

const vehicleData = [
  { id: "porter2_001", model: "Porter 2", soc: 78.4, soh: 94.5, odometer: 89048, status: "PARKED", grade: "A" },
  { id: "porter2_002", model: "Porter 2", soc: 65.2, soh: 92.1, odometer: 95230, status: "DRIVING", grade: "A" },
  { id: "gv60_001", model: "GV60", soc: 85.2, soh: 96.8, odometer: 45230, status: "DRIVING", grade: "A" },
  { id: "gv60_002", model: "GV60", soc: 72.8, soh: 95.3, odometer: 52100, status: "CHARGING", grade: "A" },
  { id: "bongo3_001", model: "Bongo 3", soc: 42.1, soh: 91.2, odometer: 127845, status: "CHARGING", grade: "B" },
  { id: "bongo3_002", model: "Bongo 3", soc: 58.7, soh: 89.4, odometer: 134200, status: "PARKED", grade: "B" },
  { id: "porter2_003", model: "Porter 2", soc: 34.5, soh: 87.2, odometer: 156780, status: "PARKED", grade: "B" },
  { id: "gv60_003", model: "GV60", soc: 91.3, soh: 98.1, odometer: 28900, status: "DRIVING", grade: "A" },
  { id: "bongo3_003", model: "Bongo 3", soc: 67.9, soh: 85.6, odometer: 178450, status: "CHARGING", grade: "C" },
  { id: "porter2_004", model: "Porter 2", soc: 45.8, soh: 83.7, odometer: 189320, status: "PARKED", grade: "C" },
]

export function VehiclePerformance() {
  const [filterModel, setFilterModel] = useState<string>("all")
  const [filterGrade, setFilterGrade] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("soh")

  const filteredVehicles = vehicleData
    .filter((vehicle) => filterModel === "all" || vehicle.model === filterModel)
    .filter((vehicle) => filterGrade === "all" || vehicle.grade === filterGrade)
    .sort((a, b) => {
      if (sortBy === "soh") return b.soh - a.soh
      if (sortBy === "soc") return b.soc - a.soc
      if (sortBy === "odometer") return a.odometer - b.odometer
      return 0
    })

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-green-500 border-green-500 bg-green-500/10"
      case "B":
        return "text-yellow-500 border-yellow-500 bg-yellow-500/10"
      case "C":
        return "text-orange-500 border-orange-500 bg-orange-500/10"
      case "D":
        return "text-red-500 border-red-500 bg-red-500/10"
      default:
        return "text-muted-foreground border-muted-foreground bg-muted/10"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRIVING":
        return "text-primary border-primary bg-primary/10"
      case "CHARGING":
        return "text-chart-3 border-chart-3 bg-chart-3/10"
      case "PARKED":
        return "text-muted-foreground border-muted-foreground bg-muted/10"
      default:
        return "text-muted-foreground border-muted-foreground bg-muted/10"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">차량 성능 관리</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="차종" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="Porter 2">Porter 2</SelectItem>
                <SelectItem value="GV60">GV60</SelectItem>
                <SelectItem value="Bongo 3">Bongo 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="등급" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="A">A급</SelectItem>
              <SelectItem value="B">B급</SelectItem>
              <SelectItem value="C">C급</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soh">SOH 높은순</SelectItem>
              <SelectItem value="soc">SOC 높은순</SelectItem>
              <SelectItem value="odometer">주행거리 적은순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="w-4 h-4" />
              성능 등급 기준
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <Badge variant="outline" className="text-green-500 border-green-500 bg-green-500/10">
                A급
              </Badge>
              <span className="text-muted-foreground">SOH 90% 이상</span>
            </div>
            <div className="flex justify-between">
              <Badge variant="outline" className="text-yellow-500 border-yellow-500 bg-yellow-500/10">
                B급
              </Badge>
              <span className="text-muted-foreground">SOH 80-90%</span>
            </div>
            <div className="flex justify-between">
              <Badge variant="outline" className="text-orange-500 border-orange-500 bg-orange-500/10">
                C급
              </Badge>
              <span className="text-muted-foreground">SOH 70-80%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">필터링 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredVehicles.length}대</div>
            <div className="text-sm text-muted-foreground">
              {sortBy === "soh" && "SOH 높은순 정렬"}
              {sortBy === "soc" && "SOC 높은순 정렬"}
              {sortBy === "odometer" && "주행거리 적은순 정렬"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 성능</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">평균 SOH</span>
                <span className="font-mono">
                  {(filteredVehicles.reduce((sum, v) => sum + v.soh, 0) / filteredVehicles.length).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">평균 SOC</span>
                <span className="font-mono">
                  {(filteredVehicles.reduce((sum, v) => sum + v.soc, 0) / filteredVehicles.length).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">상태 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">주행중</span>
                <span className="font-mono">{filteredVehicles.filter((v) => v.status === "DRIVING").length}대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">충전중</span>
                <span className="font-mono">{filteredVehicles.filter((v) => v.status === "CHARGING").length}대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">주차중</span>
                <span className="font-mono">{filteredVehicles.filter((v) => v.status === "PARKED").length}대</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle) => (
          <Card
            key={vehicle.id}
            className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-colors cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{vehicle.model}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getGradeColor(vehicle.grade)}>
                    {vehicle.grade}급
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(vehicle.status)}>
                    {vehicle.status}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{vehicle.id}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Battery className="w-3 h-3" />
                    SOC
                  </div>
                  <div className="text-xl font-bold font-mono">{vehicle.soc.toFixed(1)}%</div>
                  <Progress value={vehicle.soc} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    SOH
                  </div>
                  <div className="text-xl font-bold font-mono">{vehicle.soh.toFixed(1)}%</div>
                  <Progress value={vehicle.soh} className="h-2" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Gauge className="w-3 h-3" />
                  주행거리
                </div>
                <div className="text-sm font-mono">{vehicle.odometer.toLocaleString()} km</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
