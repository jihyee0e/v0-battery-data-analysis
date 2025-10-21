"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Battery, AlertTriangle, TrendingUp, Activity, CheckCircle, XCircle, Clock } from 'lucide-react'

interface CellBalanceData {
  device_no: string
  car_type: string
  msg_time: string
  soc: number
  pack_current: number
  mod_avg_temp: number
  cell_balance_index: number
  speed: number | null
  lat: number | null
  lng: number | null
  fuel_pct: number | null
  imbalance_trigger: string
}

interface BalanceStats {
  excellent_balance_count: number
  good_balance_count: number
  moderate_balance_count: number
  poor_balance_count: number
  total_count: number
}

export function CellBalanceAnalysis() {
  const [balanceData, setBalanceData] = useState<CellBalanceData[]>([])
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCarType, setSelectedCarType] = useState('all')
  const [selectedTrigger, setSelectedTrigger] = useState('all')

  const fetchBalanceData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        car_type: selectedCarType,
        trigger: selectedTrigger
      })

      const response = await fetch(`/api/analytics/cell-balance?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setBalanceData(data.data.balance_data || [])
          setBalanceStats(data.data.statistics || null)
        }
      }
    } catch (error) {
      console.error('셀 밸런스 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalanceData()
  }, [selectedCarType, selectedTrigger])

  const getBalanceStatus = (index: number) => {
    if (index <= 0.5) return { status: '우수', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4 text-green-600" /> }
    if (index <= 1.0) return { status: '양호', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="w-4 h-4 text-blue-600" /> }
    if (index <= 2.0) return { status: '보통', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4 text-yellow-600" /> }
    return { status: '불량', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4 text-red-600" /> }
  }

  const getTriggerDisplay = (trigger: string) => {
    switch (trigger) {
      case 'high_current_imbalance': return '고전류 불균형'
      case 'high_temp_imbalance': return '고온 불균형'
      case 'low_soc_imbalance': return '저SOC 불균형'
      case 'normal_condition': return '정상 상태'
      default: return trigger
    }
  }

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'high_current_imbalance': return 'bg-red-100 text-red-800'
      case 'high_temp_imbalance': return 'bg-orange-100 text-orange-800'
      case 'low_soc_imbalance': return 'bg-yellow-100 text-yellow-800'
      case 'normal_condition': return 'bg-green-100 text-green-800'
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
          <CardTitle>셀 밸런스 분석 필터</CardTitle>
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

            <Select value={selectedTrigger} onValueChange={(value) => setSelectedTrigger(value === 'ALL' ? 'all' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="트리거 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="high_current_imbalance">고전류 불균형</SelectItem>
                <SelectItem value="high_temp_imbalance">고온 불균형</SelectItem>
                <SelectItem value="low_soc_imbalance">저SOC 불균형</SelectItem>
                <SelectItem value="normal_condition">정상 상태</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 통계 요약 */}
      {balanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">우수</CardTitle>
              <Battery className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{balanceStats.excellent_balance_count}</div>
              <Progress 
                value={(balanceStats.excellent_balance_count / balanceStats.total_count) * 100} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                밸런스 ≤ 0.5%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">양호</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{balanceStats.good_balance_count}</div>
              <Progress 
                value={(balanceStats.good_balance_count / balanceStats.total_count) * 100} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                밸런스 0.5-1.0%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">보통</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{balanceStats.moderate_balance_count}</div>
              <Progress 
                value={(balanceStats.moderate_balance_count / balanceStats.total_count) * 100} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                밸런스 1.0-2.0%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">불량</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{balanceStats.poor_balance_count}</div>
              <Progress 
                value={(balanceStats.poor_balance_count / balanceStats.total_count) * 100} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                밸런스 > 2.0%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 상세 데이터 */}
      <Card>
        <CardHeader>
          <CardTitle>셀 밸런스 상세 데이터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">차량 ID</th>
                  <th className="text-left p-3">차종</th>
                  <th className="text-left p-3">SOC</th>
                  <th className="text-left p-3">밸런스 지수</th>
                  <th className="text-left p-3">상태</th>
                  <th className="text-left p-3">온도</th>
                  <th className="text-left p-3">트리거</th>
                  <th className="text-left p-3">시간</th>
                </tr>
              </thead>
              <tbody>
                {balanceData.slice(0, 20).map((item, index) => {
                  const balanceStatus = getBalanceStatus(item.cell_balance_index)
                  return (
                    <tr key={`${item.device_no}-${index}`} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.device_no}</td>
                      <td className="p-3">
                        <Badge variant="outline">{item.car_type}</Badge>
                      </td>
                      <td className="p-3">{item.soc.toFixed(1)}%</td>
                      <td className="p-3">
                        <div className="text-lg font-semibold">{item.cell_balance_index.toFixed(3)}%</div>
                      </td>
                      <td className="p-3">
                        <Badge className={balanceStatus.color}>
                          {balanceStatus.icon} {balanceStatus.status}
                        </Badge>
                      </td>
                      <td className="p-3">{item.mod_avg_temp.toFixed(1)}°C</td>
                      <td className="p-3">
                        <Badge className={getTriggerColor(item.imbalance_trigger)}>
                          {getTriggerDisplay(item.imbalance_trigger)}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {new Date(item.msg_time).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}