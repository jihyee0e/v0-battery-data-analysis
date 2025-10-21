"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Car, Activity, TrendingUp, Zap } from 'lucide-react'

interface DrivingPatternData {
  driving_mode: string
  car_type: string
  data_points: number
  avg_soc: number
  avg_soh: number
  avg_power: number
  power_variability: number
  avg_temp: number
  min_temp: number
  max_temp: number
  avg_speed: number
  avg_fuel_pct: number
  soc_efficiency: number
  temp_range: number
}

interface PatternSummary {
  car_type: string
  driving_modes_count: number
  overall_avg_power: number
  overall_avg_temp: number
  overall_efficiency: number
}

export function DrivingPatternAnalysis() {
  const [patternData, setPatternData] = useState<DrivingPatternData[]>([])
  const [summaryData, setSummaryData] = useState<PatternSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCarType, setSelectedCarType] = useState('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')

  const fetchPatternData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        car_type: selectedCarType,
        time_range: selectedTimeRange
      })

      const response = await fetch(`/api/analytics/driving-patterns?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setPatternData(data.data.patterns || [])
          setSummaryData(data.data.summary || [])
        }
      }
    } catch (error) {
      console.error('주행 패턴 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatternData()
  }, [selectedCarType, selectedTimeRange])

  const getModeDisplay = (mode: string) => {
    switch (mode) {
      case 'highway': return '고속도로'
      case 'urban_highway': return '도시고속'
      case 'urban': return '도시'
      case 'slow_urban': return '저속도시'
      case 'stationary': return '정지'
      default: return mode
    }
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'highway': return 'bg-blue-100 text-blue-800'
      case 'urban_highway': return 'bg-green-100 text-green-800'
      case 'urban': return 'bg-yellow-100 text-yellow-800'
      case 'slow_urban': return 'bg-orange-100 text-orange-800'
      case 'stationary': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'highway': return '🛣️'
      case 'urban_highway': return '🚗'
      case 'urban': return '🏙️'
      case 'slow_urban': return '🚶'
      case 'stationary': return '⏸️'
      default: return '🚗'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      {/* 필터링 */}
      <Card>
        <CardHeader>
          <CardTitle>주행 패턴 분석 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedCarType} onValueChange={(value) => setSelectedCarType(value === 'ALL' ? 'all' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="차종 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="BONGO3">BONGO3</SelectItem>
                <SelectItem value="GV60">GV60</SelectItem>
                <SelectItem value="PORTER2">PORTER2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="기간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7일</SelectItem>
                <SelectItem value="30d">30일</SelectItem>
                <SelectItem value="90d">90일</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 차종별 요약 */}
      {summaryData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryData.map((summary) => (
            <Card key={summary.car_type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{summary.car_type}</CardTitle>
                <Car className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">주행 모드</span>
                    <span className="text-sm font-medium">{summary.driving_modes_count}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">평균 전력</span>
                    <span className="text-sm font-medium">{summary.overall_avg_power.toFixed(1)}W</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">평균 온도</span>
                    <span className="text-sm font-medium">{summary.overall_avg_temp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">효율성</span>
                    <span className="text-sm font-medium">{summary.overall_efficiency.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 주행 패턴 상세 분석 */}
      <Card>
        <CardHeader>
          <CardTitle>주행 패턴별 성능 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patternData.map((pattern, index) => (
              <Card key={`${pattern.driving_mode}-${pattern.car_type}-${index}`} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getModeIcon(pattern.driving_mode)}</span>
                      <div>
                        <h3 className="text-lg font-semibold">{getModeDisplay(pattern.driving_mode)}</h3>
                        <Badge className={getModeColor(pattern.driving_mode)}>
                          {pattern.car_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">데이터 포인트</div>
                      <div className="text-lg font-bold">{pattern.data_points.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-500">평균 속도</span>
                      </div>
                      <div className="text-lg font-semibold">{pattern.avg_speed.toFixed(1)} km/h</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-gray-500">평균 전력</span>
                      </div>
                      <div className="text-lg font-semibold">{pattern.avg_power.toFixed(1)}W</div>
                      <div className="text-xs text-gray-500">변동성: {pattern.power_variability.toFixed(1)}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-500">SOC 효율성</span>
                      </div>
                      <div className="text-lg font-semibold">{pattern.soc_efficiency.toFixed(2)}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <Activity className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-gray-500">온도 범위</span>
                      </div>
                      <div className="text-lg font-semibold">{pattern.temp_range.toFixed(1)}°C</div>
                      <div className="text-xs text-gray-500">
                        {pattern.min_temp.toFixed(1)}°C ~ {pattern.max_temp.toFixed(1)}°C
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">SOC 분포</div>
                      <Progress value={pattern.avg_soc} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">평균: {pattern.avg_soc.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">SOH 분포</div>
                      <Progress value={pattern.avg_soh} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">평균: {pattern.avg_soh.toFixed(1)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

