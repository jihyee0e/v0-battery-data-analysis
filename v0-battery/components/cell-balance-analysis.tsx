"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/v0-battery/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/v0-battery/components/ui/select"
import { Badge } from "@/v0-battery/components/ui/badge"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Battery, TrendingUp, AlertTriangle, Activity } from "lucide-react"

interface CellBalanceData {
  balance_trends: Array<{
    date: string
    avg_balance_index: number
    balance_variability: number
    data_points: number
    high_imbalance_count: number
    moderate_imbalance_count: number
  }>
  balance_triggers: Array<{
    imbalance_trigger: string
    occurrence_count: number
    avg_imbalance_level: number
    avg_temperature: number
    avg_current: number
  }>
  vehicle_comparison: Array<{
    car_type: string
    avg_balance_index: number
    balance_variability: number
    total_records: number
    high_imbalance_records: number
    imbalance_percentage: number
  }>
}

export function CellBalanceAnalysis() {
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>("all")
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("30d")
  const [balanceData, setBalanceData] = useState<CellBalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCellBalanceData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        time_range: selectedTimeRange
      })
      
      if (selectedVehicleType !== "all") {
        params.append("car_type", selectedVehicleType)
      }

      const response = await fetch(`/api/analytics/cell-balance?${params}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch cell balance data")
      }

      const data = await response.json()
      setBalanceData(data.data)
    } catch (err) {
      console.error("Error fetching cell balance data:", err)
      setError("셀 밸런스 데이터를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCellBalanceData()
  }, [selectedVehicleType, selectedTimeRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Battery className="h-6 w-6" />
          <h2 className="text-2xl font-bold">셀 밸런스 분석</h2>
        </div>
        <div className="text-center py-8">데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Battery className="h-6 w-6" />
          <h2 className="text-2xl font-bold">셀 밸런스 분석</h2>
        </div>
        <div className="text-center py-8 text-red-500">{error}</div>
      </div>
    )
  }

  if (!balanceData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Battery className="h-6 w-6" />
          <h2 className="text-2xl font-bold">셀 밸런스 분석</h2>
        </div>
        <div className="text-center py-8">데이터가 없습니다</div>
      </div>
    )
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Battery className="h-6 w-6" />
          <h2 className="text-2xl font-bold">셀 밸런스 분석</h2>
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

      {/* 셀 밸런스 트렌드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>셀 밸런스 변화 추이</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={balanceData.balance_trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  value.toFixed(3),
                  name === 'avg_balance_index' ? '평균 밸런스 지수' : '변동성'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="avg_balance_index" 
                stroke="#0088FE" 
                strokeWidth={2}
                name="평균 밸런스 지수"
              />
              <Line 
                type="monotone" 
                dataKey="balance_variability" 
                stroke="#FF8042" 
                strokeWidth={2}
                name="변동성"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 밸런스 악화 트리거 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>밸런스 악화 트리거</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={balanceData.balance_triggers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="imbalance_trigger" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occurrence_count" fill="#8884D8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>차종별 밸런스 특성</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={balanceData.vehicle_comparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="car_type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg_balance_index" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 밸런스 지수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balanceData.balance_trends.length > 0 
                ? balanceData.balance_trends[0].avg_balance_index.toFixed(3)
                : "N/A"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              현재 평균 셀 밸런스 상태
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">높은 불균형 차량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balanceData.balance_trends.length > 0 
                ? balanceData.balance_trends[0].high_imbalance_count
                : "N/A"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              밸런스 지수 2.0 이상
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">가장 안정적인 차종</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balanceData.vehicle_comparison.length > 0 
                ? balanceData.vehicle_comparison[0].car_type
                : "N/A"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              가장 낮은 평균 밸런스 지수
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



