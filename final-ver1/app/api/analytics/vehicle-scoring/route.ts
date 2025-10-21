import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type') || null

    // InfluxDB 기반 차량 성능 스코어링 쿼리
    const scoringQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        ${carType ? `|> filter(fn: (r) => r.car_type == "${carType.toUpperCase()}")` : ''}
        |> filter(fn: (r) => r._field == "soc" or r._field == "soh" or r._field == "pack_volt" or r._field == "pack_current" or r._field == "mod_avg_temp" or r._field == "odometer" or r._field == "max_cell_volt" or r._field == "min_cell_volt")
        |> filter(fn: (r) => exists r._value)
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 10000)
    `

    const result = await runQuery(scoringQuery)
    
    // InfluxDB 데이터를 차량별로 그룹화하고 스코어링 계산
    const vehicleData: Record<string, any> = {}
    
    // 최신 데이터만 추출 (차량별로)
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
    
    // 스코어링 계산
    const scoredVehicles = Object.values(vehicleData).map((vehicle: any) => {
      const data = vehicle.data
      
      // 기본 지표들
      const soh = data.soh || 0
      const soc = data.soc || 0
      const packVolt = data.pack_volt || 0
      const packCurrent = data.pack_current || 0
      const modAvgTemp = data.mod_avg_temp || 0
      const odometer = data.odometer || 0
      const maxCellVolt = data.max_cell_volt || 0
      const minCellVolt = data.min_cell_volt || 0
      
      // 셀 밸런스 지수 계산
      const cellBalanceIndex = packVolt > 0 && maxCellVolt > 0 && minCellVolt > 0 
        ? ((maxCellVolt - minCellVolt) / packVolt) * 100 
        : 0
      
      // 복합 건강 지수 (간단한 계산)
      const compositeHealthIndex = (soh * 0.6) + (soc * 0.2) + (Math.max(0, 100 - cellBalanceIndex) * 0.2)
      
      // 개별 점수 계산
      const sohScore = soh >= 90 ? 100 : soh >= 80 ? 80 + (soh - 80) * 2 : soh >= 70 ? 60 + (soh - 70) * 2 : soh >= 60 ? 40 + (soh - 60) * 2 : soh * 0.67
      const healthScore = compositeHealthIndex >= 90 ? 100 : compositeHealthIndex >= 80 ? 80 + (compositeHealthIndex - 80) : compositeHealthIndex >= 70 ? 60 + (compositeHealthIndex - 70) : compositeHealthIndex >= 60 ? 40 + (compositeHealthIndex - 60) : compositeHealthIndex * 0.67
      const balanceScore = cellBalanceIndex <= 0.5 ? 100 : cellBalanceIndex <= 1.0 ? 90 - (cellBalanceIndex - 0.5) * 20 : cellBalanceIndex <= 2.0 ? 80 - (cellBalanceIndex - 1.0) * 10 : cellBalanceIndex <= 3.0 ? 70 - (cellBalanceIndex - 2.0) * 10 : Math.max(20, 60 - (cellBalanceIndex - 3.0) * 5)
      
      // 데이터 신선도 점수
      const daysSinceUpdate = (Date.now() - new Date(vehicle.last_updated).getTime()) / (1000 * 60 * 60 * 24)
      const freshnessScore = daysSinceUpdate <= 7 ? 100 : daysSinceUpdate <= 30 ? 80 : daysSinceUpdate <= 90 ? 60 : 40
      
      // 활동성 점수
      const activityScore = odometer >= 10000 ? 100 : odometer >= 5000 ? 80 + (odometer - 5000) / 5000 * 20 : odometer >= 1000 ? 60 + (odometer - 1000) / 4000 * 20 : odometer >= 100 ? 40 + (odometer - 100) / 900 * 20 : odometer / 100 * 40
      
      // 종합 점수
      const overallScore = Math.round((sohScore * 0.3 + healthScore * 0.25 + balanceScore * 0.2 + freshnessScore * 0.15 + activityScore * 0.1) * 100) / 100
      
      // 등급 분류
      const performanceGrade = overallScore >= 90 ? '우수' : overallScore >= 80 ? '양호' : overallScore >= 70 ? '보통' : overallScore >= 60 ? '주의' : '불량'
      
      return {
        device_no: vehicle.device_no,
        car_type: vehicle.car_type,
        soh,
        soc,
        pack_volt: packVolt,
        pack_current: packCurrent,
        mod_avg_temp: modAvgTemp,
        odometer,
        cell_balance_index: cellBalanceIndex,
        composite_health_index: compositeHealthIndex,
        last_updated: vehicle.last_updated,
        soh_score: Math.round(sohScore * 100) / 100,
        health_score: Math.round(healthScore * 100) / 100,
        balance_score: Math.round(balanceScore * 100) / 100,
        freshness_score: Math.round(freshnessScore * 100) / 100,
        activity_score: Math.round(activityScore * 100) / 100,
        overall_score: overallScore,
        performance_grade: performanceGrade
      }
    })
    
    // 점수순으로 정렬
    scoredVehicles.sort((a, b) => b.overall_score - a.overall_score)
    
    // 랭킹 추가
    const rankedVehicles = scoredVehicles.map((vehicle, index) => ({
      ...vehicle,
      rank: index + 1
    }))
    
    // 등급별 통계 계산
    const gradeStats = rankedVehicles.reduce((acc: any, vehicle: any) => {
      const grade = vehicle.performance_grade
      if (!acc[grade]) {
        acc[grade] = { count: 0, avg_score: 0, total_score: 0 }
      }
      acc[grade].count++
      acc[grade].total_score += vehicle.overall_score
      acc[grade].avg_score = acc[grade].total_score / acc[grade].count
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        vehicles: rankedVehicles,
        statistics: {
          total_vehicles: rankedVehicles.length,
          grade_distribution: gradeStats,
          score_range: {
            min: Math.min(...rankedVehicles.map((r: any) => r.overall_score)),
            max: Math.max(...rankedVehicles.map((r: any) => r.overall_score)),
            avg: rankedVehicles.reduce((sum: number, r: any) => sum + r.overall_score, 0) / rankedVehicles.length
          }
        }
      }
    })

  } catch (error) {
    console.error('차량 스코어링 분석 오류:', error)
    return NextResponse.json(
      { success: false, error: '차량 스코어링 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
