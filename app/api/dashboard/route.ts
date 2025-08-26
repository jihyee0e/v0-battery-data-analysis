import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    // 대시보드 통계 쿼리 (제공해주신 SQL 사용)
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT vehicle_id) as total_vehicles,
        ROUND(AVG(latest_soc), 1) as avg_soc,
        ROUND(AVG(latest_soh), 1) as avg_soh,
        COUNT(CASE WHEN last_updated > NOW() - INTERVAL '1 hour' THEN 1 END) as active_vehicles,
        COUNT(CASE WHEN is_charging = true THEN 1 END) as charging_vehicles,
        COUNT(CASE WHEN performance_grade = 'A' THEN 1 END) as grade_a,
        COUNT(CASE WHEN performance_grade = 'B' THEN 1 END) as grade_b,
        COUNT(CASE WHEN performance_grade = 'C' THEN 1 END) as grade_c,
        COUNT(CASE WHEN performance_grade = 'D' THEN 1 END) as grade_d
      FROM vehicle_performance_summary
    `

    const result = await pool.query(statsQuery)
    const stats = result.rows[0]

    return NextResponse.json({
      total_vehicles: Number.parseInt(stats.total_vehicles),
      avg_soc: Number.parseFloat(stats.avg_soc),
      avg_soh: Number.parseFloat(stats.avg_soh),
      active_vehicles: Number.parseInt(stats.active_vehicles),
      charging_vehicles: Number.parseInt(stats.charging_vehicles),
      grade_distribution: {
        A: Number.parseInt(stats.grade_a),
        B: Number.parseInt(stats.grade_b),
        C: Number.parseInt(stats.grade_c),
        D: Number.parseInt(stats.grade_d),
      },
    })
  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
