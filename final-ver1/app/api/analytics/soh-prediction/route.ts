import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceNo = searchParams.get('device_no')
    const carType = searchParams.get('car_type') || null
    const predictionDays = parseInt(searchParams.get('days') || '30')

    if (!deviceNo) {
      return NextResponse.json(
        { success: false, error: 'device_no 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 특정 차량의 SOH 시계열 데이터 가져오기
    const sohHistoryQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        |> filter(fn: (r) => r.device_no == "${deviceNo}")
        |> filter(fn: (r) => r._field == "soh")
        |> filter(fn: (r) => exists r._value)
        |> sort(columns: ["_time"])
    `

    const sohHistory = await runQuery(sohHistoryQuery)
    
    if (sohHistory.length === 0) {
      return NextResponse.json(
        { success: false, error: '해당 차량의 SOH 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // SOH 데이터를 시간순으로 정렬하고 전처리
    const sohData = sohHistory
      .map(row => ({
        time: new Date(row._time),
        soh: Number(row._value)
      }))
      .filter(item => !isNaN(item.soh) && item.soh > 0)
      .sort((a, b) => a.time.getTime() - b.time.getTime())

    if (sohData.length < 10) {
      return NextResponse.json(
        { success: false, error: '예측을 위한 충분한 데이터가 없습니다. (최소 10개 데이터 필요)' },
        { status: 400 }
      )
    }

    // 선형 회귀를 이용한 SOH 예측
    const predictions = calculateSOHPrediction(sohData, predictionDays)
    
    // 차종별 평균 SOH 저하율과 비교
    const carTypeComparison = await getCarTypeComparison(carType, deviceNo)

    return NextResponse.json({
      success: true,
      data: {
        device_no: deviceNo,
        car_type: carType,
        current_soh: sohData[sohData.length - 1].soh,
        prediction_days: predictionDays,
        predictions: predictions,
        historical_data: sohData.slice(-30), // 최근 30개 데이터만 반환
        comparison: carTypeComparison,
        analysis: {
          degradation_rate: calculateDegradationRate(sohData),
          prediction_confidence: calculateConfidence(sohData),
          recommendation: generateRecommendation(predictions, carTypeComparison)
        }
      }
    })

  } catch (error) {
    console.error('SOH 예측 분석 오류:', error)
    return NextResponse.json(
      { success: false, error: 'SOH 예측 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 선형 회귀를 이용한 SOH 예측 계산
function calculateSOHPrediction(sohData: any[], predictionDays: number) {
  const n = sohData.length
  const x = sohData.map((_, index) => index) // 시간 인덱스
  const y = sohData.map(item => item.soh) // SOH 값

  // 선형 회귀 계산 (y = ax + b)
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // 예측값 계산
  const predictions = []
  const lastTime = sohData[sohData.length - 1].time
  const daysPerDataPoint = (lastTime.getTime() - sohData[0].time.getTime()) / (n - 1) / (1000 * 60 * 60 * 24)

  for (let i = 1; i <= predictionDays; i++) {
    const futureIndex = n - 1 + (i / daysPerDataPoint)
    const predictedSoh = slope * futureIndex + intercept
    const futureDate = new Date(lastTime.getTime() + i * 24 * 60 * 60 * 1000)
    
    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      predicted_soh: Math.max(0, Math.min(100, predictedSoh)), // 0-100 범위로 제한
      days_from_now: i
    })
  }

  return predictions
}

// 차종별 평균 SOH 저하율과 비교
async function getCarTypeComparison(carType: string | null, deviceNo: string) {
  try {
    const comparisonQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        ${carType ? `|> filter(fn: (r) => r.car_type == "${carType.toUpperCase()}")` : ''}
        |> filter(fn: (r) => r._field == "soh")
        |> filter(fn: (r) => exists r._value)
        |> sort(columns: ["_time"])
    `

    const allSohData = await runQuery(comparisonQuery)
    
    // 차량별로 그룹화
    const vehicleData: Record<string, any[]> = {}
    allSohData.forEach(row => {
      const deviceNo = row.device_no
      if (!vehicleData[deviceNo]) {
        vehicleData[deviceNo] = []
      }
      vehicleData[deviceNo].push({
        time: new Date(row._time),
        soh: Number(row._value)
      })
    })

    // 각 차량의 저하율 계산
    const degradationRates = Object.entries(vehicleData)
      .map(([device, data]) => {
        if (data.length < 2) return null
        const sortedData = data.sort((a, b) => a.time.getTime() - b.time.getTime())
        const firstSoh = sortedData[0].soh
        const lastSoh = sortedData[sortedData.length - 1].soh
        const daysDiff = (sortedData[sortedData.length - 1].time.getTime() - sortedData[0].time.getTime()) / (1000 * 60 * 60 * 24)
        const degradationRate = (firstSoh - lastSoh) / daysDiff // 일일 저하율
        return { device, degradationRate, firstSoh, lastSoh, daysDiff }
      })
      .filter(item => item !== null && item!.degradationRate > 0)

    if (degradationRates.length === 0) {
      return null
    }

    const avgDegradationRate = degradationRates.reduce((sum, item) => sum + item!.degradationRate, 0) / degradationRates.length
    const currentVehicle = degradationRates.find(item => item!.device === deviceNo)

    return {
      average_degradation_rate: avgDegradationRate,
      current_vehicle_degradation_rate: currentVehicle?.degradationRate || 0,
      comparison: currentVehicle ? 
        (currentVehicle.degradationRate > avgDegradationRate * 1.2 ? 'worse' :
         currentVehicle.degradationRate < avgDegradationRate * 0.8 ? 'better' : 'average') : 'unknown',
      total_vehicles_compared: degradationRates.length
    }

  } catch (error) {
    console.error('차종별 비교 분석 오류:', error)
    return null
  }
}

// SOH 저하율 계산
function calculateDegradationRate(sohData: any[]) {
  if (sohData.length < 2) return 0
  
  const firstSoh = sohData[0].soh
  const lastSoh = sohData[sohData.length - 1].soh
  const daysDiff = (sohData[sohData.length - 1].time.getTime() - sohData[0].time.getTime()) / (1000 * 60 * 60 * 24)
  
  return (firstSoh - lastSoh) / daysDiff // 일일 저하율
}

// 예측 신뢰도 계산
function calculateConfidence(sohData: any[]) {
  if (sohData.length < 10) return 0.3
  
  // 데이터 일관성 체크 (표준편차 기반)
  const sohValues = sohData.map(item => item.soh)
  const mean = sohValues.reduce((a, b) => a + b, 0) / sohValues.length
  const variance = sohValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / sohValues.length
  const stdDev = Math.sqrt(variance)
  
  // 데이터 포인트 수에 따른 신뢰도
  const dataPointsConfidence = Math.min(1, sohData.length / 50)
  
  // 데이터 일관성에 따른 신뢰도 (표준편차가 작을수록 높음)
  const consistencyConfidence = Math.max(0.1, 1 - (stdDev / 10))
  
  return Math.round((dataPointsConfidence * 0.6 + consistencyConfidence * 0.4) * 100) / 100
}

// 권장사항 생성
function generateRecommendation(predictions: any[], comparison: any) {
  const lastPrediction = predictions[predictions.length - 1]
  const predictedSoh = lastPrediction.predicted_soh
  
  let recommendation = ''
  let priority = 'low'
  
  if (predictedSoh < 70) {
    recommendation = '배터리 교체가 필요할 것으로 예상됩니다. 정비 센터 방문을 권장합니다.'
    priority = 'high'
  } else if (predictedSoh < 80) {
    recommendation = '배터리 성능 저하가 예상됩니다. 정기 점검을 권장합니다.'
    priority = 'medium'
  } else if (comparison && comparison.comparison === 'worse') {
    recommendation = '동일 차종 대비 빠른 성능 저하가 관찰됩니다. 조기 점검을 권장합니다.'
    priority = 'medium'
  } else {
    recommendation = '현재 배터리 상태는 양호합니다. 정기 점검을 유지하세요.'
    priority = 'low'
  }
  
  return {
    message: recommendation,
    priority: priority,
    predicted_soh_after_30_days: predictedSoh
  }
}
