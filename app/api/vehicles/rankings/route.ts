import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get("car_type")
    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "100")

    const params: any[] = []
    const whereConditions: string[] = []

    if (carType && carType !== "all") {
      whereConditions.push(`vehicle_type = $${params.length + 1}`)
      params.push(carType.toUpperCase())
    }

    if (category && category !== "all") {
      whereConditions.push(`performance_category = $${params.length + 1}`)
      params.push(category)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const query = `
      SELECT 
        vehicle_id,
        vehicle_type,
        latest_soh,
        composite_health_index,
        cell_balance_index,
        overall_score,
        overall_rank,
        health_rank,
        soh_rank,
        performance_category
      FROM vehicle_rankings_mv
      ${whereClause}
      ORDER BY overall_rank
      LIMIT $${params.length + 1}
    `

    params.push(limit)

    const result = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: "Vehicle rankings data not found",
        message: "차량 랭킹 데이터를 찾을 수 없습니다.",
        filters_applied: {
          car_type: carType,
          category: category,
          limit: limit
        }
      }, { status: 404 })
    }

    // 카테고리별 통계
    const categoryStats = result.rows.reduce((acc: any, row: any) => {
      const category = row.performance_category
      if (!acc[category]) {
        acc[category] = { count: 0, avg_score: 0, avg_health: 0 }
      }
      acc[category].count++
      acc[category].avg_score += row.overall_score
      acc[category].avg_health += row.composite_health_index
      return acc
    }, {})

    // 평균값 계산
    Object.keys(categoryStats).forEach(category => {
      categoryStats[category].avg_score = Math.round(categoryStats[category].avg_score / categoryStats[category].count * 100) / 100
      categoryStats[category].avg_health = Math.round(categoryStats[category].avg_health / categoryStats[category].count * 100) / 100
    })

    return NextResponse.json({
      success: true,
      data: result.rows,
      total_count: result.rows.length,
      category_statistics: categoryStats,
      filters_applied: {
        car_type: carType,
        category: category,
        limit: limit
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Vehicle Rankings API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch vehicle rankings data",
      message: "차량 랭킹 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}
