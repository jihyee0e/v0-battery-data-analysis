import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    // 대시보드 통계 쿼리 (제공해주신 SQL 사용)
    const statsQuery = `
      SELECT 
        total_vehicles,
        COALESCE(avg_soc, 0) as avg_soc,
        COALESCE(avg_soh, 0) as avg_soh,
        COALESCE(avg_efficiency, 0) as avg_efficiency,
        COALESCE(active_vehicles, 0) as active_vehicles,
        COALESCE(charging_vehicles, 0) as charging_vehicles,
        COALESCE(grade_a_count, 0) as grade_a_count,
        COALESCE(grade_b_count, 0) as grade_b_count,
        COALESCE(grade_c_count, 0) as grade_c_count,
        COALESCE(grade_d_count, 0) as grade_d_count,
        COALESCE(bongo3_count, 0) as bongo3_count,
        COALESCE(gv60_count, 0) as gv60_count,
        COALESCE(porter2_count, 0) as porter2_count,
        COALESCE(bongo3_avg_soh, 0) as bongo3_avg_soh,
        COALESCE(gv60_avg_soh, 0) as gv60_avg_soh,
        COALESCE(porter2_avg_soh, 0) as porter2_avg_soh,
        last_updated
      FROM dashboard_stats
    `

    const result = await pool.query(statsQuery)
    const stats = result.rows[0]

    return NextResponse.json({
      total_vehicles: Number.parseInt(stats.total_vehicles) || 0,
      avg_soc: Number.parseFloat(stats.avg_soc) || 0,
      avg_soh: Number.parseFloat(stats.avg_soh) || 0,
      avg_efficiency: Number.parseFloat(stats.avg_efficiency) || 0,
      active_vehicles: Number.parseInt(stats.active_vehicles) || 0,
      charging_vehicles: Number.parseInt(stats.charging_vehicles) || 0,
      grade_distribution: {
        A: Number.parseInt(stats.grade_a_count) || 0,
        B: Number.parseInt(stats.grade_b_count) || 0,
        C: Number.parseInt(stats.grade_c_count) || 0,
        D: Number.parseInt(stats.grade_d_count) || 0,
      },
      vehicle_types: {
        bongo3: {
          count: Number.parseInt(stats.bongo3_count) || 0,
          avg_soh: Number.parseFloat(stats.bongo3_avg_soh) || 0,
        },
        gv60: {
          count: Number.parseInt(stats.gv60_count) || 0,
          avg_soh: Number.parseFloat(stats.gv60_avg_soh) || 0,
        },
        porter2: {
          count: Number.parseInt(stats.porter2_count) || 0,
          avg_soh: Number.parseFloat(stats.porter2_avg_soh) || 0,
        },
      },
      last_updated: stats.last_updated,
    })
  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
