import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type')
    const grade = searchParams.get('grade')
    const dateRange = searchParams.get('date_range')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const sortBy = searchParams.get('sort') || 'soh'
    const order = searchParams.get('order') || 'desc'

    // 기본 쿼리
    let query = `
      SELECT 
        vehicle_id,
        vehicle_type,
        latest_soc,
        latest_soh,
        cell_balance_index as avg_efficiency,
        performance_grade,
        last_updated,
        pack_volt,
        pack_current,
        mod_avg_temp,
        (pack_volt * pack_current) as power_w,
        vehicle_status,
        speed,
        lat,
        lng,
        fuel_pct
      FROM vehicle_performance_mv
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    // 필터링 조건 추가
    if (carType && carType !== 'all') {
      query += ` AND vehicle_type = $${paramIndex}`
      params.push(carType)
      paramIndex++
    }

    if (grade && grade !== 'all') {
      query += ` AND performance_grade = $${paramIndex}`
      params.push(grade)
      paramIndex++
    }

    if (dateRange && dateRange !== 'all') {
      query += ` AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') >= '${dateRange}-01'::date AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') < '${dateRange}-01'::date + INTERVAL '1 month'`
    }

    // 정렬 조건 추가 (odometer 제거)
    const sortColumn = sortBy === 'efficiency' ? 'cell_balance_index' : 'latest_soh'
    
    query += ` ORDER BY ${sortColumn} ${order.toUpperCase()}`

    // 페이지네이션 추가
    const offset = (page - 1) * limit
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // 전체 개수 조회
    let countQuery = `
      SELECT COUNT(*) as total
      FROM vehicle_performance_mv
      WHERE 1=1
    `
    
    const countParams: any[] = []
    if (carType && carType !== 'all') {
      countQuery += ` AND vehicle_type = $1`
      countParams.push(carType)
    }
    if (grade && grade !== 'all') {
      countQuery += ` AND ${countParams.length > 0 ? 'AND' : ''} performance_grade = $${countParams.length + 1}`
      countParams.push(grade)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0]?.total || '0')

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_count: total,
        limit: limit
      },
      filters: {
        car_type: carType,
        grade: grade,
        sort_by: sortBy,
        order: order
      }
    })

  } catch (error) {
    console.error("Vehicle Performance API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch vehicle performance data",
      message: "차량 성능 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}
