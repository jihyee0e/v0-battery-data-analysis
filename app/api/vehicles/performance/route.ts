import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleType = searchParams.get("type")
    const grade = searchParams.get("grade")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    const params: any[] = []
    const whereConditions: string[] = []

    if (vehicleType && vehicleType !== "all") {
      whereConditions.push(`vehicle_type = $${params.length + 1}`)
      params.push(vehicleType.toUpperCase())
    }

    if (grade && grade !== "all") {
      whereConditions.push(`performance_grade = $${params.length + 1}`)
      params.push(grade.toUpperCase())
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicle_performance_summary
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, params)
    const totalCount = Number.parseInt(countResult.rows[0].total)

    // Get paginated results
    const query = `
      SELECT 
        vehicle_id,
        vehicle_type,
        COALESCE(latest_soc, 0) as latest_soc,
        COALESCE(latest_soh, 0) as latest_soh,
        COALESCE(total_odometer, 0) as total_odometer,
        COALESCE(avg_efficiency, 0) as avg_efficiency,
        COALESCE(charging_efficiency, 0) as charging_efficiency,
        COALESCE(performance_grade, 'D') as performance_grade,
        last_updated,
        COALESCE(pack_volt, 0) as pack_volt,
        COALESCE(pack_current, 0) as pack_current,
        COALESCE(cell_temp_avg, 0) as cell_temp_avg,
        CASE 
          WHEN pack_current > 0 THEN true
          ELSE false
        END as is_charging
      FROM vehicle_performance_summary
      ${whereClause}
      ORDER BY latest_soh DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `

    params.push(limit, offset)
    const result = await pool.query(query, params)

    return NextResponse.json({
      vehicles: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
      summary: {
        total_filtered: totalCount,
        showing: result.rows.length,
      },
    })
  } catch (error) {
    console.error("Performance API Error:", error)
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}
