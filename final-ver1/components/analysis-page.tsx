"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnomalyDetectionAnalysis } from "./anomaly-detection-analysis"
import { SOHPredictionAnalysis } from "./soh-prediction-analysis"
import { Battery, TrendingUp, AlertTriangle, Activity, Car, Zap } from "lucide-react"

export function AnalysisPage() {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Battery className="h-6 w-6" />
          <h2 className="text-2xl font-bold">고급 배터리 분석</h2>
        </div>
      </div>

      <Tabs defaultValue="prediction" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200 p-1">
          <TabsTrigger 
            value="prediction" 
            className="flex items-center space-x-2 data-[state=active]:bg-green-500 data-[state=active]:text-white text-black hover:bg-gray-100 transition-all"
          >
            <TrendingUp className="h-4 w-4" />
            <span>예측</span>
          </TabsTrigger>
          <TabsTrigger 
            value="anomaly-detection" 
            className="flex items-center space-x-2 data-[state=active]:bg-green-500 data-[state=active]:text-white text-black hover:bg-gray-100 transition-all"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>이상탐지</span>
          </TabsTrigger>
          <TabsTrigger 
            value="vehicle-performance" 
            className="flex items-center space-x-2 data-[state=active]:bg-green-500 data-[state=active]:text-white text-black hover:bg-gray-100 transition-all"
          >
            <Battery className="h-4 w-4" />
            <span>차량성능</span>
          </TabsTrigger>
          <TabsTrigger 
            value="environmental-impact" 
            className="flex items-center space-x-2 data-[state=active]:bg-green-500 data-[state=active]:text-white text-black hover:bg-gray-100 transition-all"
          >
            <Activity className="h-4 w-4" />
            <span>환경영향</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prediction" className="space-y-6">
          <SOHPredictionAnalysis />
        </TabsContent>

        <TabsContent value="anomaly-detection" className="space-y-6">
          <AnomalyDetectionAnalysis />
        </TabsContent>

        <TabsContent value="vehicle-performance" className="space-y-6">
          <div className="text-center py-8 text-muted-foreground">
            차량 성능 분석 내용이 여기에 표시됩니다.
            <br />
            성능 스코어링, 군집분석
          </div>
        </TabsContent>

        <TabsContent value="environmental-impact" className="space-y-6">
          <div className="text-center py-8 text-muted-foreground">
            환경 영향 분석 내용이 여기에 표시됩니다.
            <br />
            계절별 SOH 변화, 온도 vs 성능 관계 분석
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
