'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react'

interface VehicleScore {
  device_no: string
  car_type: string
  soh: number
  composite_health_index: number
  cell_balance_index: number
  odometer: number
  last_updated: string
  soh_score: number
  health_score: number
  balance_score: number
  freshness_score: number
  activity_score: number
  overall_score: number
  performance_grade: string
  rank: number
}

interface ScoringData {
  vehicles: VehicleScore[]
  statistics: {
    total_vehicles: number
    grade_distribution: Record<string, { count: number; avg_score: number }>
    score_range: { min: number; max: number; avg: number }
  }
}

export function VehicleScoringAnalysis() {
  const [scoringData, setScoringData] = useState<ScoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCarType, setSelectedCarType] = useState<string>('ALL')

  useEffect(() => {
    fetchScoringData()
  }, [selectedCarType])

  const fetchScoringData = async () => {
    try {
      setLoading(true)
      const carTypeParam = selectedCarType === 'ALL' ? '' : `?car_type=${selectedCarType}`
      const response = await fetch(`/api/analytics/vehicle-scoring${carTypeParam}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setScoringData(data.data)
        }
      }
    } catch (error) {
      console.error('차량 스코어링 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case '우수': return 'bg-green-100 text-green-800 border-green-300'
      case '양호': return 'bg-blue-100 text-blue-800 border-blue-300'
      case '보통': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case '주의': return 'bg-orange-100 text-orange-800 border-orange-300'
      case '불량': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case '우수': return <Award className="w-4 h-4" />
      case '양호': return <TrendingUp className="w-4 h-4" />
      case '보통': return <AlertCircle className="w-4 h-4" />
      case '주의': return <AlertTriangle className="w-4 h-4" />
      case '불량': return <TrendingDown className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>
  }

  if (!scoringData) {
    return <div className="text-center text-gray-500">데이터를 불러올 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">차량 성능 스코어링</h2>
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
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 차량 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scoringData.statistics.total_vehicles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">평균 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {scoringData.statistics.score_range.avg.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">최고 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {scoringData.statistics.score_range.max.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">최저 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {scoringData.statistics.score_range.min.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 등급별 분포 */}
      <Card>
        <CardHeader>
          <CardTitle>등급별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(scoringData.statistics.grade_distribution).map(([grade, stats]) => (
              <div key={grade} className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${getGradeColor(grade)}`}>
                  {getGradeIcon(grade)}
                  <span className="font-medium">{grade}</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{stats.count}대</div>
                  <div className="text-sm text-gray-600">평균 {stats.avg_score.toFixed(1)}점</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 차량 랭킹 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>차량 성능 랭킹</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">순위</th>
                  <th className="text-left p-2">차량번호</th>
                  <th className="text-left p-2">차종</th>
                  <th className="text-left p-2">종합점수</th>
                  <th className="text-left p-2">등급</th>
                  <th className="text-left p-2">SOH</th>
                  <th className="text-left p-2">건강지수</th>
                  <th className="text-left p-2">셀밸런스</th>
                  <th className="text-left p-2">주행거리</th>
                </tr>
              </thead>
              <tbody>
                {scoringData.vehicles.map((vehicle, index) => (
                  <tr key={vehicle.device_no} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {vehicle.rank}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 font-medium">{vehicle.device_no}</td>
                    <td className="p-2">{vehicle.car_type}</td>
                    <td className="p-2">
                      <div className="font-bold text-lg">{vehicle.overall_score}</div>
                    </td>
                    <td className="p-2">
                      <Badge className={`${getGradeColor(vehicle.performance_grade)} border`}>
                        {vehicle.performance_grade}
                      </Badge>
                    </td>
                    <td className="p-2">{vehicle.soh.toFixed(1)}%</td>
                    <td className="p-2">{vehicle.composite_health_index.toFixed(1)}</td>
                    <td className="p-2">{vehicle.cell_balance_index.toFixed(2)}%</td>
                    <td className="p-2">{vehicle.odometer.toFixed(0)}km</td>
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
