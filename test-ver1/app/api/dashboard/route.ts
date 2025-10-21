import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    // 대시보드 통계 쿼리
    const statsQuery = `
      SELECT 
        car_type,
        total_vehicles,
        online_5m_pct,
        charging_now,
        moving_now,
        avg_soc,
        avg_soh,
        low_SOH_pct,
        high_temp_pct,
        high_imbalance_pct,
        last_updated
      FROM dashboard_stats_mv
      ORDER BY 
        CASE WHEN car_type = 'TOTAL' THEN 1 ELSE 0 END,
        car_type
    `

    const result = await pool.query(statsQuery)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: "Dashboard data not found",
        message: "데이터베이스에 데이터가 없습니다."
      }, { status: 404 })
    }

    // 차종별 데이터와 전체 요약 데이터 분리
    const vehicleData = result.rows.filter(row => row.car_type !== 'TOTAL')
    const totalData = result.rows.find(row => row.car_type === 'TOTAL')

    // 차종별 통계 구성
    const vehicleTypes: any = {}
    vehicleData.forEach(vehicle => {
      const typeKey = vehicle.car_type.toLowerCase()
      vehicleTypes[typeKey] = {
        count: Number(vehicle.total_vehicles) || 0,
        online_5m_pct: Number(vehicle.online_5m_pct) || 0,
        charging_now: Number(vehicle.charging_now) || 0,
        moving_now: Number(vehicle.moving_now) || 0,
        avg_soh: Number(vehicle.avg_soh) || 0,
        avg_soc: Number(vehicle.avg_soc) || 0,
        low_SOH_pct: Number(vehicle.low_SOH_pct) || 0,
        high_temp_pct: Number(vehicle.high_temp_pct) || 0,
        high_imbalance_pct: Number(vehicle.high_imbalance_pct) || 0,
      }
    })

    return NextResponse.json({
      total_vehicles: Number(totalData?.total_vehicles) || 0,
      online_5m_pct: Number(totalData?.online_5m_pct) || 0,
      charging_now: Number(totalData?.charging_now) || 0,
      moving_now: Number(totalData?.moving_now) || 0,
      avg_soc: Number(totalData?.avg_soc) || 0,
      avg_soh: Number(totalData?.avg_soh) || 0,
      low_SOH_pct: Number(totalData?.low_SOH_pct) || 0,
      high_temp_pct: Number(totalData?.high_temp_pct) || 0,
      high_imbalance_pct: Number(totalData?.high_imbalance_pct) || 0,
      vehicle_types: vehicleTypes,
      last_updated: totalData?.last_updated,
    })
  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
