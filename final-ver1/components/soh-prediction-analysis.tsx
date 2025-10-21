'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Calendar, Target } from 'lucide-react'

interface PredictionData {
  date: string
  predicted_soh: number
  days_from_now: number
}

interface HistoricalData {
  time: string
  soh: number
}

interface SOHPredictionData {
  device_no: string
  car_type: string
  current_soh: number
  prediction_days: number
  predictions: PredictionData[]
  historical_data: HistoricalData[]
  comparison: {
    average_degradation_rate: number
    current_vehicle_degradation_rate: number
    comparison: string
    total_vehicles_compared: number
  } | null
  analysis: {
    degradation_rate: number
    prediction_confidence: number
    recommendation: {
      message: string
      priority: string
      predicted_soh_after_30_days: number
    }
  }
}

export function SOHPredictionAnalysis() {
  const [predictionData, setPredictionData] = useState<SOHPredictionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [deviceNo, setDeviceNo] = useState('')
  const [predictionStartDate, setPredictionStartDate] = useState('2022-12-01')
  const [predictionEndDate, setPredictionEndDate] = useState('2023-09-01')
  const [availableDevices, setAvailableDevices] = useState<string[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)

  // 사용 가능한 차량 목록 가져오기
  useEffect(() => {
    fetchAvailableDevices()
  }, [])

  const fetchAvailableDevices = async () => {
    try {
      setDevicesLoading(true)
      const response = await fetch('/api/vehicles/list')
      
      if (response.ok) {
        const data = await response.json()
        const devices: string[] = data?.devices || data?.data?.devices || []
        setAvailableDevices(devices)
      }
    } catch (error) {
      console.error('차량 목록 로드 실패:', error)
    } finally {
      setDevicesLoading(false)
    }
  }

  const fetchPredictionData = async () => {
    if (!deviceNo.trim()) {
      alert('차량번호를 선택해주세요.')
      return
    }
    if (!predictionStartDate || !predictionEndDate) {
      alert('예측 기간을 선택해주세요.')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/soh-prediction-ml?device_no=${deviceNo}&start_date=${predictionStartDate}&end_date=${predictionEndDate}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPredictionData(data.data)
        } else {
          alert(data.error || '예측 데이터를 가져올 수 없습니다.')
        }
      } else {
        alert('서버 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('SOH 예측 데이터 로드 실패:', error)
      alert('데이터 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <TrendingDown className="w-4 h-4" />
      case 'low': return <CheckCircle className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const getComparisonColor = (comparison: string) => {
    switch (comparison) {
      case 'better': return 'text-green-600'
      case 'worse': return 'text-red-600'
      case 'average': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  // 차트 데이터 준비 (과거 + 예측)
  const chartData = predictionData ? [
    ...predictionData.historical_data.map(item => ({
      date: new Date(item.time).toLocaleDateString(),
      soh: item.soh,
      type: 'historical'
    })),
    ...predictionData.predictions.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      soh: item.predicted_soh,
      type: 'prediction'
    }))
  ] : []

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">SOH 예측 분석</h2>
      </div>

      {/* 입력 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>예측 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                차량번호
              </label>
              <select
                value={deviceNo}
                onChange={(e) => setDeviceNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={devicesLoading}
              >
                <option value="">차량을 선택하세요</option>
                {availableDevices.map(device => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예측 시작일
              </label>
              <input
                type="date"
                value={predictionStartDate}
                onChange={(e) => setPredictionStartDate(e.target.value)}
                min="2022-12-01"
                max="2023-09-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예측 종료일
              </label>
              <input
                type="date"
                value={predictionEndDate}
                onChange={(e) => setPredictionEndDate(e.target.value)}
                min="2022-12-01"
                max="2023-09-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchPredictionData}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '분석 중...' : '예측 분석'}
            </button>
          </div>
        </CardContent>
      </Card>

      {predictionData && (
        <>
          {/* 현재 상태 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">현재 SOH</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {predictionData.current_soh.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">예측 SOH</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {predictionData.analysis.recommendation.predicted_soh_after_30_days.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">30일 후</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">저하율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {(predictionData.analysis.degradation_rate * 100).toFixed(3)}%
                </div>
                <div className="text-sm text-gray-500">일일 저하율</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">예측 신뢰도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {(predictionData.analysis.prediction_confidence * 100).toFixed(0)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 권장사항 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                권장사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getPriorityColor(predictionData.analysis.recommendation.priority)}`}>
                {getPriorityIcon(predictionData.analysis.recommendation.priority)}
                <span className="font-medium">
                  {predictionData.analysis.recommendation.priority === 'high' ? '긴급' :
                   predictionData.analysis.recommendation.priority === 'medium' ? '주의' : '양호'}
                </span>
              </div>
              <p className="mt-3 text-gray-700">
                {predictionData.analysis.recommendation.message}
              </p>
            </CardContent>
          </Card>

          {/* 차종별 비교 */}
          {predictionData.comparison && (
            <Card>
              <CardHeader>
                <CardTitle>차종별 비교</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">평균 저하율</div>
                    <div className="text-lg font-bold">
                      {(predictionData.comparison.average_degradation_rate * 100).toFixed(3)}%/일
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">현재 차량 저하율</div>
                    <div className="text-lg font-bold">
                      {(predictionData.comparison.current_vehicle_degradation_rate * 100).toFixed(3)}%/일
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">비교 결과</div>
                    <div className={`text-lg font-bold ${getComparisonColor(predictionData.comparison.comparison)}`}>
                      {predictionData.comparison.comparison === 'better' ? '평균보다 양호' :
                       predictionData.comparison.comparison === 'worse' ? '평균보다 나쁨' : '평균 수준'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500 text-center">
                  비교 대상: {predictionData.comparison.total_vehicles_compared}대
                </div>
              </CardContent>
            </Card>
          )}

          {/* SOH 예측 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                SOH 예측 차트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${Number(value).toFixed(1)}%`, 
                        name === 'soh' ? 'SOH' : 'SOH'
                      ]}
                    />
                    <ReferenceLine y={80} stroke="orange" strokeDasharray="5 5" label="주의선" />
                    <ReferenceLine y={70} stroke="red" strokeDasharray="5 5" label="위험선" />
                    <Line 
                      type="monotone" 
                      dataKey="soh" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>과거 데이터</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full opacity-50"></div>
                  <span>예측 데이터</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 예측 결과 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>예측 결과 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">날짜</th>
                      <th className="text-left p-2">예측 SOH</th>
                      <th className="text-left p-2">현재로부터 (일)</th>
                      <th className="text-left p-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionData.predictions.slice(0, 10).map((prediction, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{new Date(prediction.date).toLocaleDateString()}</td>
                        <td className="p-2 font-medium">{prediction.predicted_soh.toFixed(1)}%</td>
                        <td className="p-2">{prediction.days_from_now}일</td>
                        <td className="p-2">
                          <Badge className={
                            prediction.predicted_soh >= 80 ? 'bg-green-100 text-green-800' :
                            prediction.predicted_soh >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {prediction.predicted_soh >= 80 ? '양호' :
                             prediction.predicted_soh >= 70 ? '주의' : '위험'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
