"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Shield, AlertCircle, CheckCircle } from 'lucide-react'

interface AnomalyData {
  device_no: string
  car_type: string
  msg_time: string
  soc: number
  soh: number
  anomaly_type: string
  anomaly_severity: number
  risk_level: string
  anomaly_type_korean: string
}

interface AnomalyStats {
  risk_level: string
  anomaly_type: string
  count: number
  avg_severity: number
  max_severity: number
}

interface AnomalySummary {
  car_type: string
  total_anomalies: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  avg_severity: number
}

export function AnomalyDetectionAnalysis() {
  const [anomalyData, setAnomalyData] = useState<AnomalyData[]>([])
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats[]>([])
  const [anomalySummary, setAnomalySummary] = useState<AnomalySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCarType, setSelectedCarType] = useState('all')
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all')

  const fetchAnomalyData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        car_type: selectedCarType,
        risk_level: selectedRiskLevel,
        limit: '100'
      })

      const response = await fetch(`/api/analytics/anomaly-detection?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setAnomalyData(data.data.anomalies || [])
          setAnomalyStats(data.data.statistics || [])
          setAnomalySummary(data.data.summary || [])
        }
      }
    } catch (error) {
      console.error('이상 탐지 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnomalyData()
  }, [selectedCarType, selectedRiskLevel])

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'medium': return <Shield className="h-4 w-4 text-yellow-500" />
      case 'low': return <CheckCircle className="h-4 w-4 text-blue-500" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getAnomalyTypeColor = (type: string) => {
    switch (type) {
      case 'low_soh': return 'bg-red-100 text-red-800'
      case 'high_imbalance': return 'bg-orange-100 text-orange-800'
      case 'high_temperature': return 'bg-yellow-100 text-yellow-800'
      case 'low_temperature': return 'bg-blue-100 text-blue-800'
      case 'low_voltage': return 'bg-purple-100 text-purple-800'
      case 'high_voltage': return 'bg-pink-100 text-pink-800'
      case 'extreme_current': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
          <CardTitle>이상 탐지 분석 필터</CardTitle>
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

            <Select value={selectedRiskLevel} onValueChange={(value) => setSelectedRiskLevel(value === 'ALL' ? 'all' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="위험도 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 차종별 요약 */}
      {anomalySummary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {anomalySummary.map((summary) => (
            <Card key={summary.car_type} className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{summary.car_type}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">총 이상</span>
                    <span className="text-lg font-bold text-red-600">{summary.total_anomalies}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-red-600">Critical:</span>
                      <span className="font-medium">{summary.critical_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-600">High:</span>
                      <span className="font-medium">{summary.high_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Medium:</span>
                      <span className="font-medium">{summary.medium_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Low:</span>
                      <span className="font-medium">{summary.low_count}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">평균 심각도</span>
                    <span className="text-sm font-medium">{summary.avg_severity.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 이상 유형별 통계 */}
      {anomalyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>이상 유형별 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalyStats.map((stat, index) => (
                <div key={`${stat.risk_level}-${stat.anomaly_type}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getRiskLevelIcon(stat.risk_level)}
                    <div>
                      <div className="font-medium">{stat.anomaly_type_korean}</div>
                      <div className="text-sm text-gray-500">{stat.anomaly_type}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-lg font-bold">{stat.count}</div>
                      <div className="text-xs text-gray-500">건수</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{stat.avg_severity.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">평균 심각도</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{stat.max_severity.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">최대 심각도</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상세 이상 데이터 */}
      <Card>
        <CardHeader>
          <CardTitle>이상 탐지 상세 데이터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">차량 ID</th>
                  <th className="text-left p-3">차종</th>
                  <th className="text-left p-3">SOC</th>
                  <th className="text-left p-3">SOH</th>
                  <th className="text-left p-3">이상 유형</th>
                  <th className="text-left p-3">심각도</th>
                  <th className="text-left p-3">위험도</th>
                  <th className="text-left p-3">시간</th>
                </tr>
              </thead>
              <tbody>
                {anomalyData.slice(0, 20).map((item, index) => (
                  <tr key={`${item.device_no}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{item.device_no}</td>
                    <td className="p-3">
                      <Badge variant="outline">{item.car_type}</Badge>
                    </td>
                    <td className="p-3">{item.soc.toFixed(1)}%</td>
                    <td className="p-3">{item.soh.toFixed(1)}%</td>
                    <td className="p-3">
                      <Badge className={getAnomalyTypeColor(item.anomaly_type)}>
                        {item.anomaly_type_korean}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-lg font-semibold">{item.anomaly_severity.toFixed(1)}</div>
                    </td>
                    <td className="p-3">
                      <Badge className={getRiskLevelColor(item.risk_level)}>
                        {getRiskLevelIcon(item.risk_level)}
                        <span className="ml-1">{item.risk_level.toUpperCase()}</span>
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-gray-500">
                      {new Date(item.msg_time).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

