import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type') || null
    const anomalyType = searchParams.get('anomaly_type') || null

    // InfluxDB 기반 이상탐지 쿼리
    const anomalyQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        ${carType ? `|> filter(fn: (r) => r.car_type == "${carType.toUpperCase()}")` : ''}
        |> filter(fn: (r) => r._field == "soc" or r._field == "soh" or r._field == "pack_volt" or r._field == "pack_current" or r._field == "mod_avg_temp" or r._field == "max_cell_volt" or r._field == "min_cell_volt")
        |> filter(fn: (r) => exists r._value)
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 20000)
    `

    const result = await runQuery(anomalyQuery)
    
    // 차량별 데이터 그룹화
    const vehicleData: Record<string, any> = {}
    
    for (const row of result) {
      const deviceNo = row.device_no
      const field = row._field
      const value = Number(row._value)
      const time = row._time
      
      if (!vehicleData[deviceNo]) {
        vehicleData[deviceNo] = {
          device_no: deviceNo,
          car_type: row.car_type,
          last_updated: time,
          data: {}
        }
      }
      
      // 최신 데이터만 유지
      if (time > vehicleData[deviceNo].last_updated) {
        vehicleData[deviceNo].last_updated = time
      }
      
      if (Number.isFinite(value)) {
        vehicleData[deviceNo].data[field] = value
      }
    }
    
    // 차종별 기준값 계산
    const carTypeStats: Record<string, any> = {}
    
    Object.values(vehicleData).forEach((vehicle: any) => {
      const carType = vehicle.car_type
      if (!carTypeStats[carType]) {
        carTypeStats[carType] = {
          soh: [],
          health: [],
          balance: [],
          temp: []
        }
      }
      
      const data = vehicle.data
      const soh = data.soh || 0
      const soc = data.soc || 0
      const packVolt = data.pack_volt || 0
      const modAvgTemp = data.mod_avg_temp || 0
      const maxCellVolt = data.max_cell_volt || 0
      const minCellVolt = data.min_cell_volt || 0
      
      // 셀 밸런스 지수
      const cellBalanceIndex = packVolt > 0 && maxCellVolt && minCellVolt 
        ? ((maxCellVolt - minCellVolt) / packVolt) * 100 
        : 0
      
      // 복합 건강 지수
      const compositeHealthIndex = Math.max(0, Math.min(100, 
        (soh * 0.4) + 
        (soc * 0.2) + 
        (Math.max(0, 100 - Math.abs(modAvgTemp - 25) * 2) * 0.2) + 
        (Math.max(0, 100 - cellBalanceIndex * 10) * 0.2)
      ))
      
      if (soh > 0) carTypeStats[carType].soh.push(soh)
      if (compositeHealthIndex > 0) carTypeStats[carType].health.push(compositeHealthIndex)
      if (cellBalanceIndex > 0) carTypeStats[carType].balance.push(cellBalanceIndex)
      if (modAvgTemp > 0) carTypeStats[carType].temp.push(modAvgTemp)
    })
    
    // 차종별 평균과 표준편차 계산
    Object.keys(carTypeStats).forEach(carType => {
      const stats = carTypeStats[carType]
      stats.soh_avg = stats.soh.length > 0 ? stats.soh.reduce((a: number, b: number) => a + b, 0) / stats.soh.length : 0
      stats.soh_std = stats.soh.length > 1 ? Math.sqrt(stats.soh.reduce((sum: number, x: number) => sum + Math.pow(x - stats.soh_avg, 2), 0) / (stats.soh.length - 1)) : 0
      
      stats.health_avg = stats.health.length > 0 ? stats.health.reduce((a: number, b: number) => a + b, 0) / stats.health.length : 0
      stats.health_std = stats.health.length > 1 ? Math.sqrt(stats.health.reduce((sum: number, x: number) => sum + Math.pow(x - stats.health_avg, 2), 0) / (stats.health.length - 1)) : 0
      
      stats.balance_avg = stats.balance.length > 0 ? stats.balance.reduce((a: number, b: number) => a + b, 0) / stats.balance.length : 0
      stats.balance_std = stats.balance.length > 1 ? Math.sqrt(stats.balance.reduce((sum: number, x: number) => sum + Math.pow(x - stats.balance_avg, 2), 0) / (stats.balance.length - 1)) : 0
      
      stats.temp_avg = stats.temp.length > 0 ? stats.temp.reduce((a: number, b: number) => a + b, 0) / stats.temp.length : 0
      stats.temp_std = stats.temp.length > 1 ? Math.sqrt(stats.temp.reduce((sum: number, x: number) => sum + Math.pow(x - stats.temp_avg, 2), 0) / (stats.temp.length - 1)) : 0
    })
    
    // 이상 탐지
    const anomalies: any[] = []
    
    Object.values(vehicleData).forEach((vehicle: any) => {
      const data = vehicle.data
      const carType = vehicle.car_type
      const stats = carTypeStats[carType]
      
      if (!stats) return
      
      const soh = data.soh || 0
      const soc = data.soc || 0
      const packVolt = data.pack_volt || 0
      const modAvgTemp = data.mod_avg_temp || 0
      const maxCellVolt = data.max_cell_volt || 0
      const minCellVolt = data.min_cell_volt || 0
      
      // 셀 밸런스 지수
      const cellBalanceIndex = packVolt > 0 && maxCellVolt && minCellVolt 
        ? ((maxCellVolt - minCellVolt) / packVolt) * 100 
        : 0
      
      // 복합 건강 지수
      const compositeHealthIndex = Math.max(0, Math.min(100, 
        (soh * 0.4) + 
        (soc * 0.2) + 
        (Math.max(0, 100 - Math.abs(modAvgTemp - 25) * 2) * 0.2) + 
        (Math.max(0, 100 - cellBalanceIndex * 10) * 0.2)
      ))
      
      // Z-score 계산
      const sohZscore = stats.soh_std > 0 ? Math.abs((soh - stats.soh_avg) / stats.soh_std) : 0
      const healthZscore = stats.health_std > 0 ? Math.abs((compositeHealthIndex - stats.health_avg) / stats.health_std) : 0
      const balanceZscore = stats.balance_std > 0 ? Math.abs((cellBalanceIndex - stats.balance_avg) / stats.balance_std) : 0
      const tempZscore = stats.temp_std > 0 ? Math.abs((modAvgTemp - stats.temp_avg) / stats.temp_std) : 0
      
      const maxZscore = Math.max(sohZscore, healthZscore, balanceZscore, tempZscore)
      
      // 이상 유형 판별
      let anomalyType = 'normal'
      if (sohZscore > 2.5) anomalyType = 'soh_anomaly'
      else if (healthZscore > 2.5) anomalyType = 'health_anomaly'
      else if (balanceZscore > 2.5) anomalyType = 'balance_anomaly'
      else if (tempZscore > 2.5) anomalyType = 'temp_anomaly'
      
      // 위험도 분류
      let riskLevel = 'low'
      if (maxZscore > 3.0) riskLevel = 'critical'
      else if (maxZscore > 2.5) riskLevel = 'high'
      else if (maxZscore > 2.0) riskLevel = 'medium'
      
      // 이상 설명 생성
      let anomalyDescription = '정상 범위 내입니다.'
      if (anomalyType === 'soh_anomaly') {
        if (soh < stats.soh_avg) {
          anomalyDescription = `SOH가 동일 차종 평균(${stats.soh_avg.toFixed(1)}%)보다 ${(stats.soh_avg - soh).toFixed(1)}% 낮습니다.`
        } else {
          anomalyDescription = `SOH가 동일 차종 평균(${stats.soh_avg.toFixed(1)}%)보다 ${(soh - stats.soh_avg).toFixed(1)}% 높습니다.`
        }
      } else if (anomalyType === 'health_anomaly') {
        if (compositeHealthIndex < stats.health_avg) {
          anomalyDescription = `건강지수가 동일 차종 평균(${stats.health_avg.toFixed(1)})보다 ${(stats.health_avg - compositeHealthIndex).toFixed(1)} 낮습니다.`
        } else {
          anomalyDescription = `건강지수가 동일 차종 평균(${stats.health_avg.toFixed(1)})보다 ${(compositeHealthIndex - stats.health_avg).toFixed(1)} 높습니다.`
        }
      } else if (anomalyType === 'balance_anomaly') {
        if (cellBalanceIndex > stats.balance_avg) {
          anomalyDescription = `셀 밸런스가 동일 차종 평균(${stats.balance_avg.toFixed(1)}%)보다 ${(cellBalanceIndex - stats.balance_avg).toFixed(1)}% 불균형합니다.`
        } else {
          anomalyDescription = `셀 밸런스가 동일 차종 평균(${stats.balance_avg.toFixed(1)}%)보다 ${(stats.balance_avg - cellBalanceIndex).toFixed(1)}% 양호합니다.`
        }
      } else if (anomalyType === 'temp_anomaly') {
        if (modAvgTemp > stats.temp_avg) {
          anomalyDescription = `배터리 온도가 동일 차종 평균(${stats.temp_avg.toFixed(1)}°C)보다 ${(modAvgTemp - stats.temp_avg).toFixed(1)}°C 높습니다.`
        } else {
          anomalyDescription = `배터리 온도가 동일 차종 평균(${stats.temp_avg.toFixed(1)}°C)보다 ${(stats.temp_avg - modAvgTemp).toFixed(1)}°C 낮습니다.`
        }
      }
      
      if (anomalyType !== 'normal') {
        anomalies.push({
          device_no: vehicle.device_no,
          car_type: vehicle.car_type,
          soh,
          composite_health_index: Math.round(compositeHealthIndex * 100) / 100,
          cell_balance_index: Math.round(cellBalanceIndex * 100) / 100,
          mod_avg_temp: modAvgTemp,
          last_updated: vehicle.last_updated,
          soh_zscore: Math.round(sohZscore * 100) / 100,
          health_zscore: Math.round(healthZscore * 100) / 100,
          balance_zscore: Math.round(balanceZscore * 100) / 100,
          temp_zscore: Math.round(tempZscore * 100) / 100,
          baseline_soh: Math.round(stats.soh_avg * 100) / 100,
          baseline_health: Math.round(stats.health_avg * 100) / 100,
          baseline_balance: Math.round(stats.balance_avg * 100) / 100,
          baseline_temp: Math.round(stats.temp_avg * 100) / 100,
          anomaly_type: anomalyType,
          max_zscore: Math.round(maxZscore * 100) / 100,
          risk_level: riskLevel,
          anomaly_description: anomalyDescription
        })
      }
    })
    
    // 필터링 및 정렬
    let filteredAnomalies = anomalies
    if (anomalyType) {
      filteredAnomalies = anomalies.filter(a => a.anomaly_type === anomalyType)
    }
    
    filteredAnomalies.sort((a, b) => b.max_zscore - a.max_zscore)
    const limitedAnomalies = filteredAnomalies
    
    // 이상 유형별 통계
    const anomalyStats = limitedAnomalies.reduce((acc: any, anomaly: any) => {
      const type = anomaly.anomaly_type
      const risk = anomaly.risk_level
      
      if (!acc[type]) {
        acc[type] = { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
      }
      
      acc[type].total++
      acc[type][risk]++
      
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        anomalies: limitedAnomalies,
        statistics: {
          total_anomalies: limitedAnomalies.length,
          anomaly_distribution: anomalyStats,
          risk_distribution: limitedAnomalies.reduce((acc: any, anomaly: any) => {
            acc[anomaly.risk_level] = (acc[anomaly.risk_level] || 0) + 1
            return acc
          }, {})
        }
      }
    })

  } catch (error) {
    console.error('이상탐지 분석 오류:', error)
    return NextResponse.json(
      { success: false, error: '이상탐지 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
