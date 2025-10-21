import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type') || 'all'
    const timeRange = searchParams.get('time_range') || '30d'

    // 시간 범위 계산
    let dateFilter = ''
    switch (timeRange) {
      case '7d':
        dateFilter = `AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') >= NOW() - INTERVAL '7 days'`
        break
      case '30d':
        dateFilter = `AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') >= NOW() - INTERVAL '30 days'`
        break
      case '90d':
        dateFilter = `AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') >= NOW() - INTERVAL '90 days'`
        break
      default:
        dateFilter = ''
    }

    // 차종 필터
    let carTypeFilter = ''
    if (carType !== 'all') {
      carTypeFilter = `AND car_type = '${carType.toUpperCase()}'`
    }

    const query = `
      SELECT 
        driving_mode,
        car_type,
        COUNT(*) as data_points,
        ROUND(AVG(soc), 2) as avg_soc,
        ROUND(AVG(soh), 2) as avg_soh,
        ROUND(AVG(avg_power), 2) as avg_power,
        ROUND(STDDEV(avg_power), 2) as power_variability,
        ROUND(AVG(avg_temp), 2) as avg_temp,
        ROUND(MIN(avg_temp), 2) as min_temp,
        ROUND(MAX(avg_temp), 2) as max_temp,
        ROUND(AVG(avg_speed), 2) as avg_speed,
        ROUND(AVG(avg_fuel_pct), 2) as avg_fuel_pct,
        ROUND(AVG(soc_efficiency), 2) as soc_efficiency,
        ROUND(MAX(avg_temp) - MIN(avg_temp), 2) as temp_range
      FROM driving_pattern_performance_mv
      WHERE 1=1 ${carTypeFilter} ${dateFilter}
      GROUP BY driving_mode, car_type
      ORDER BY driving_mode, car_type
    `

    const result = await pool.query(query)

    // 차종별 요약 통계
    const summaryQuery = `
      SELECT 
        car_type,
        COUNT(DISTINCT driving_mode) as driving_modes_count,
        ROUND(AVG(avg_power), 2) as overall_avg_power,
        ROUND(AVG(avg_temp), 2) as overall_avg_temp,
        ROUND(AVG(soc_efficiency), 2) as overall_efficiency
      FROM driving_pattern_performance_mv
      WHERE 1=1 ${carTypeFilter} ${dateFilter}
      GROUP BY car_type
      ORDER BY car_type
    `

    const summaryResult = await pool.query(summaryQuery)

    return NextResponse.json({
      success: true,
      data: {
        patterns: result.rows,
        summary: summaryResult.rows,
        meta: {
          car_type: carType,
          time_range: timeRange,
          total_patterns: result.rows.length
        }
      }
    })

  } catch (error) {
    console.error("Driving Patterns API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch driving patterns",
      message: "주행 패턴 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}