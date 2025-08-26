import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get("metric") || "overall"
    const vehicleType = searchParams.get("type")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const params: any[] = []
    let whereClause = ""
    let orderClause = ""

    if (vehicleType && vehicleType !== "all") {
      whereClause = `WHERE vehicle_type = $${params.length + 1}`
      params.push(vehicleType.toUpperCase())
    }

    // Determine ordering based on metric
    switch (metric) {
      case "soh":
        orderClause = "ORDER BY soh_rank ASC"
        break
      case "efficiency":
        orderClause = "ORDER BY efficiency_rank ASC"
        break
      default:
        orderClause = "ORDER BY overall_rank ASC"
    }

    const rankingQuery = `
      SELECT 
        vehicle_id,
        vehicle_type,
        COALESCE(latest_soh, 0) as latest_soh,
        COALESCE(avg_efficiency, 0) as avg_efficiency,
        COALESCE(charging_efficiency, 0) as charging_efficiency,
        COALESCE(overall_score, 0) as overall_score,
        soh_rank,
        efficiency_rank,
        overall_rank,
        COALESCE(performance_category, 'LOW_PERFORMANCE') as performance_category
      FROM vehicle_rankings
      ${whereClause}
      ${orderClause}
      LIMIT $${params.length + 1}
    `

    params.push(limit)
    const result = await pool.query(rankingQuery, params)

    // Separate queries for different ranking categories
    const topPerformersQuery = `
      SELECT 
        vehicle_id,
        vehicle_type,
        latest_soh,
        overall_score,
        overall_rank
      FROM vehicle_rankings
      ${whereClause}
      ORDER BY overall_rank ASC
      LIMIT 3
    `
    const topPerformers = await pool.query(topPerformersQuery, vehicleType ? [vehicleType.toUpperCase()] : [])

    return NextResponse.json({
      rankings: result.rows,
      top_performers: topPerformers.rows,
      metric_used: metric,
      total_shown: result.rows.length,
    })
  } catch (error) {
    console.error("Rankings API Error:", error)
    return NextResponse.json({ error: "Failed to fetch ranking data" }, { status: 500 })
  }
}
