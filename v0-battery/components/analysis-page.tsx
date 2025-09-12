"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CellBalanceAnalysis } from "./cell-balance-analysis"
import { DrivingPatternAnalysis } from "./driving-pattern-analysis"
import { AnomalyDetectionAnalysis } from "./anomaly-detection-analysis"
import { BatteryGauge } from "./battery-gauge"
import { Battery, TrendingUp, AlertTriangle, Activity, Car, Zap } from "lucide-react"

export function AnalysisPage() {
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>("all")
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("30d")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Battery className="h-6 w-6" />
          <h2 className="text-2xl font-bold">고급 배터리 분석</h2>
        </div>
        
        <div className="flex space-x-4">
          <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="차종 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="porter2">Porter2</SelectItem>
              <SelectItem value="gv60">GV60</SelectItem>
              <SelectItem value="bongo3">Bongo3</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7일</SelectItem>
              <SelectItem value="30d">30일</SelectItem>
              <SelectItem value="90d">90일</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="cell-balance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cell-balance" className="flex items-center space-x-2">
            <Battery className="h-4 w-4" />
            <span>셀 밸런스</span>
          </TabsTrigger>
          <TabsTrigger value="driving-patterns" className="flex items-center space-x-2">
            <Car className="h-4 w-4" />
            <span>주행 패턴</span>
          </TabsTrigger>
          <TabsTrigger value="anomaly-detection" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>이상 탐지</span>
          </TabsTrigger>
          <TabsTrigger value="performance-trends" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>성능 트렌드</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cell-balance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">셀 밸런스 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">고급</div>
                <p className="text-xs text-muted-foreground">
                  셀 간 전압 불균형 패턴 분석
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">트리거 탐지</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">실시간</div>
                <p className="text-xs text-muted-foreground">
                  밸런스 악화 원인 분석
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">차종별 특성</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">비교</div>
                <p className="text-xs text-muted-foreground">
                  차종별 밸런스 유지 능력
                </p>
              </CardContent>
            </Card>
          </div>
          
          <CellBalanceAnalysis />
        </TabsContent>

        <TabsContent value="driving-patterns" className="space-y-6">
          <DrivingPatternAnalysis />
        </TabsContent>

        <TabsContent value="anomaly-detection" className="space-y-6">
          <AnomalyDetectionAnalysis />
        </TabsContent>

        <TabsContent value="performance-trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">복합 건강 지수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">95.2</div>
                <p className="text-xs text-muted-foreground">
                  SOH + 밸런스 + 온도 종합 점수
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">성능 트렌드</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">상승</div>
                <p className="text-xs text-muted-foreground">
                  시간에 따른 성능 변화 추이
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">예측 모델</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">ML 기반</div>
                <p className="text-xs text-muted-foreground">
                  미래 성능 예측 및 유지보수 계획
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>성능 트렌드 분석</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                성능 트렌드 분석 컴포넌트가 여기에 표시됩니다.
                <br />
                복합 건강 지수 기반의 고급 성능 분석
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
