import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    // 랭킹 데이터 조회 (제공해주신 SQL 사용)
    const rankingQuery = `
      SELECT 
        vehicle_id, vehicle_type, soh_rank, efficiency_rank,
        overall_score, performance_category,
        latest_soc, latest_soh, avg_efficiency
      FROM vehicle_rankings
      WHERE overall_rank <= 10
      ORDER BY overall_rank ASC
    `

    const result = await pool.query(rankingQuery)

    return NextResponse.json({
      top_vehicles: result.rows,
    })
  } catch (error) {
    console.error("Rankings API Error:", error)
    return NextResponse.json({ error: "Failed to fetch ranking data" }, { status: 500 })
  }
}
