import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    const query = `
      SELECT 
        car_type,
        total_vehicles,
        avg_soc,
        avg_soh,
        avg_cell_balance,
        active_vehicles_7d,
        charging_vehicles,
        avg_pack_volt,
        avg_pack_current,
        avg_temp,
        avg_speed,
        avg_fuel_pct,
        moving_vehicles,
        last_updated
      FROM dashboard_stats_mv
      ORDER BY 
        CASE WHEN car_type = 'TOTAL' THEN 1 ELSE 0 END,
        car_type
    `

    const result = await pool.query(query)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: "Dashboard data not found",
        message: "데이터베이스에 데이터가 없습니다. 먼저 데이터를 로드해주세요."
      }, { status: 404 })
    }

    // 차종별 데이터와 전체 요약 데이터 분리
    const vehicleData = result.rows.filter(row => row.car_type !== 'TOTAL')
    const totalData = result.rows.find(row => row.car_type === 'TOTAL')

    return NextResponse.json({
      success: true,
      data: {
        total: totalData,
        vehicles: vehicleData
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch dashboard data",
      message: "대시보드 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}
