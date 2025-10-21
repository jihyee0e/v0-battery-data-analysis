'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, Shield, CheckCircle, XCircle } from 'lucide-react'

interface AnomalyData {
  device_no: string
  car_type: string
  soh: number
  composite_health_index: number
  cell_balance_index: number
  mod_avg_temp: number
  last_updated: string
  soh_zscore: number
  health_zscore: number
  balance_zscore: number
  temp_zscore: number
  baseline_soh: number
  baseline_health: number
  baseline_balance: number
  baseline_temp: number
  anomaly_type: string
  max_zscore: number
  risk_level: string
  anomaly_description: string
}

interface AnomalyDetectionData {
  anomalies: AnomalyData[]
  statistics: {
    total_anomalies: number
    anomaly_distribution: Record<string, { total: number; critical: number; high: number; medium: number; low: number }>
    risk_distribution: Record<string, number>
  }
}

export function AnomalyDetectionAnalysis() {
  const [anomalyData, setAnomalyData] = useState<AnomalyDetectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCarType, setSelectedCarType] = useState<string>('ALL')
  const [selectedAnomalyType, setSelectedAnomalyType] = useState<string>('ALL')

  useEffect(() => {
    fetchAnomalyData()
  }, [selectedCarType, selectedAnomalyType])

  const fetchAnomalyData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCarType !== 'ALL') params.append('car_type', selectedCarType)
      if (selectedAnomalyType !== 'ALL') params.append('anomaly_type', selectedAnomalyType)
      
      const response = await fetch(`/api/analytics/anomaly-detection?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAnomalyData(data.data)
        }
      }
    } catch (error) {
      console.error('이상탐지 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="w-4 h-4" />
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <AlertCircle className="w-4 h-4" />
      case 'low': return <Shield className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const getAnomalyTypeColor = (type: string) => {
    switch (type) {
      case 'soh_anomaly': return 'bg-red-100 text-red-800'
      case 'health_anomaly': return 'bg-orange-100 text-orange-800'
      case 'balance_anomaly': return 'bg-yellow-100 text-yellow-800'
      case 'temp_anomaly': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAnomalyTypeName = (type: string) => {
    switch (type) {
      case 'soh_anomaly': return 'SOH 이상'
      case 'health_anomaly': return '건강지수 이상'
      case 'balance_anomaly': return '셀밸런스 이상'
      case 'temp_anomaly': return '온도 이상'
      default: return type
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>
  }

  if (!anomalyData) {
    return <div className="text-center text-gray-500">데이터를 불러올 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">이상탐지 분석</h2>
        <div className="flex gap-2">
          <select 
            value={selectedCarType} 
            onChange={(e) => setSelectedCarType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">전체 차종</option>
            <option value="BONGO3">봉고3</option>
            <option value="GV60">GV60</option>
            <option value="PORTER2">포터2</option>
          </select>
          <select 
            value={selectedAnomalyType} 
            onChange={(e) => setSelectedAnomalyType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">전체 이상</option>
            <option value="soh_anomaly">SOH 이상</option>
            <option value="health_anomaly">건강지수 이상</option>
            <option value="balance_anomaly">셀밸런스 이상</option>
            <option value="temp_anomaly">온도 이상</option>
          </select>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 이상 차량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{anomalyData.statistics.total_anomalies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {anomalyData.statistics.risk_distribution.critical || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {anomalyData.statistics.risk_distribution.high || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Medium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {anomalyData.statistics.risk_distribution.medium || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 이상 유형별 분포 */}
      <Card>
        <CardHeader>
          <CardTitle>이상 유형별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(anomalyData.statistics.anomaly_distribution).map(([type, stats]) => (
              <div key={type} className="text-center p-4 border rounded-lg">
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${getAnomalyTypeColor(type)}`}>
                  <span className="font-medium">{getAnomalyTypeName(type)}</span>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="text-lg font-bold">{stats.total}건</div>
                  <div className="text-sm text-gray-600">
                    Critical: {stats.critical} | High: {stats.high} | Medium: {stats.medium}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 이상 차량 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>이상 차량 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">차량번호</th>
                  <th className="text-left p-2">차종</th>
                  <th className="text-left p-2">이상유형</th>
                  <th className="text-left p-2">위험도</th>
                  <th className="text-left p-2">Z-Score</th>
                  <th className="text-left p-2">현재값</th>
                  <th className="text-left p-2">기준값</th>
                  <th className="text-left p-2">설명</th>
                </tr>
              </thead>
              <tbody>
                {anomalyData.anomalies.map((anomaly, index) => (
                  <tr key={`${anomaly.device_no}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{anomaly.device_no}</td>
                    <td className="p-2">{anomaly.car_type}</td>
                    <td className="p-2">
                      <Badge className={getAnomalyTypeColor(anomaly.anomaly_type)}>
                        {getAnomalyTypeName(anomaly.anomaly_type)}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge className={`${getRiskLevelColor(anomaly.risk_level)} border`}>
                        <div className="flex items-center gap-1">
                          {getRiskLevelIcon(anomaly.risk_level)}
                          <span className="uppercase">{anomaly.risk_level}</span>
                        </div>
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="font-bold text-lg">{anomaly.max_zscore.toFixed(2)}</div>
                    </td>
                    <td className="p-2">
                      <div className="space-y-1">
                        {anomaly.anomaly_type === 'soh_anomaly' && (
                          <div>SOH: {anomaly.soh.toFixed(1)}%</div>
                        )}
                        {anomaly.anomaly_type === 'health_anomaly' && (
                          <div>건강지수: {anomaly.composite_health_index.toFixed(1)}</div>
                        )}
                        {anomaly.anomaly_type === 'balance_anomaly' && (
                          <div>셀밸런스: {anomaly.cell_balance_index.toFixed(2)}%</div>
                        )}
                        {anomaly.anomaly_type === 'temp_anomaly' && (
                          <div>온도: {anomaly.mod_avg_temp.toFixed(1)}°C</div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="space-y-1">
                        {anomaly.anomaly_type === 'soh_anomaly' && (
                          <div>SOH: {anomaly.baseline_soh.toFixed(1)}%</div>
                        )}
                        {anomaly.anomaly_type === 'health_anomaly' && (
                          <div>건강지수: {anomaly.baseline_health.toFixed(1)}</div>
                        )}
                        {anomaly.anomaly_type === 'balance_anomaly' && (
                          <div>셀밸런스: {anomaly.baseline_balance.toFixed(2)}%</div>
                        )}
                        {anomaly.anomaly_type === 'temp_anomaly' && (
                          <div>온도: {anomaly.baseline_temp.toFixed(1)}°C</div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 max-w-xs">
                      <div className="text-sm text-gray-700">{anomaly.anomaly_description}</div>
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