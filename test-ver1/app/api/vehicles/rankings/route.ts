import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'overall'
    const carType = searchParams.get('car_type')
    const topN = parseInt(searchParams.get('top_n') || '20')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 기본 쿼리
    let query = `
      SELECT 
        vehicle_id,
        vehicle_type,
        latest_soh,
        latest_soc,
        avg_efficiency,
        overall_score,
        soh_rank,
        soc_rank,
        overall_rank,
        performance_category
      FROM vehicle_rankings_mv
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    // 차종 필터링
    if (carType && carType !== 'all') {
      query += ` AND vehicle_type = $${paramIndex}`
      params.push(carType)
      paramIndex++
    }

    // 정렬 기준에 따른 필터링
    switch (metric) {
      case 'soh':
        query += ` ORDER BY soh_rank ASC`
        break
      case 'efficiency':
        query += ` ORDER BY avg_efficiency DESC`
        break
      case 'overall':
      default:
        query += ` ORDER BY overall_rank ASC`
        break
    }

    // 상위 N개만 가져오기
    query += ` LIMIT $${paramIndex}`
    params.push(Math.min(topN, limit))

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      data: result.rows,
      meta: {
        metric,
        car_type: carType,
        top_n: topN,
        total_returned: result.rows.length
      }
    })

  } catch (error) {
    console.error("Vehicle Rankings API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch vehicle rankings",
      message: "차량 랭킹 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}