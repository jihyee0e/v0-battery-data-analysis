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

    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (vehicleType && vehicleType !== "all") {
      whereClause += ` AND vehicle_type = $${params.length + 1}`
      params.push(vehicleType)
    }

    if (grade && grade !== "all") {
      whereClause += ` AND performance_grade = $${params.length + 1}`
      params.push(grade)
    }

    const query = `
      SELECT 
        vehicle_id, vehicle_type, latest_soc, latest_soh,
        total_odometer, avg_efficiency, performance_grade,
        last_updated, is_charging
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
        total: result.rowCount,
      },
    })
  } catch (error) {
    console.error("Performance API Error:", error)
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}
