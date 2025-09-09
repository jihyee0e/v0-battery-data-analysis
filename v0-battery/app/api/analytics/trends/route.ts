import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "seasonal"
    const vehicleType = searchParams.get("car_type")
    const segmentId = searchParams.get("segment_id")

    const params: any[] = []
    const whereConditions: string[] = []

    if (vehicleType && vehicleType !== "all") {
      whereConditions.push(`car_type = $${params.length + 1}`)
      params.push(vehicleType.toUpperCase())
    }

    if (segmentId) {
      whereConditions.push(`segment_id = $${params.length + 1}`)
      params.push(segmentId)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const trendsQuery = `
      SELECT 
        car_type,
        -- 시간대별 통계
        AVG(CASE WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) BETWEEN 6 AND 11 THEN soc END) as morning_avg_soc,
        AVG(CASE WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) BETWEEN 12 AND 17 THEN soc END) as afternoon_avg_soc,
        AVG(CASE WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) BETWEEN 18 AND 23 THEN soc END) as evening_avg_soc,
        AVG(CASE WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) BETWEEN 0 AND 5 THEN soc END) as night_avg_soc,
        
        -- 계절별 통계
        AVG(CASE WHEN EXTRACT(QUARTER FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) = 1 THEN soh END) as spring_avg_soh,
        AVG(CASE WHEN EXTRACT(QUARTER FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) = 2 THEN soh END) as summer_avg_soh,
        AVG(CASE WHEN EXTRACT(QUARTER FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) = 3 THEN soh END) as fall_avg_soh,
        AVG(CASE WHEN EXTRACT(QUARTER FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) = 4 THEN soh END) as winter_avg_soh,
        
        -- 전체 통계
        AVG(soc) as overall_avg_soc,
        AVG(soh) as overall_avg_soh,
        AVG(mod_avg_temp) as overall_avg_temp,
        COUNT(*) as total_records,
        -- 데이터 품질 지표
        COUNT(CASE WHEN soc IS NOT NULL THEN 1 END) as valid_soc_count,
        COUNT(CASE WHEN soh IS NOT NULL THEN 1 END) as valid_soh_count,
        ROUND(COUNT(CASE WHEN soc IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as soc_data_quality,
        ROUND(COUNT(CASE WHEN soh IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as soh_data_quality
      FROM trends_mv
      ${whereClause}
      AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') >= CURRENT_DATE - INTERVAL '1 year'
      AND (soc IS NOT NULL OR soh IS NOT NULL)
      GROUP BY car_type
      ORDER BY car_type
    `

    const result = await pool.query(trendsQuery, params)

    const chargingPatternsQuery = `
      SELECT 
        EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) as hour,
        COUNT(CASE WHEN pack_current > 0 THEN 1 END) as charging_sessions,
        AVG(CASE WHEN pack_current > 0 THEN pack_current END) as avg_charging_current,
        AVG(CASE WHEN pack_current > 0 THEN soc END) as avg_charging_soc
      FROM charging_patterns_mv
      ${whereClause}
      AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS'))
      ORDER BY hour
    `

    const chargingResult = await pool.query(chargingPatternsQuery, params)

    return NextResponse.json({
      trends: result.rows,
      charging_patterns: chargingResult.rows,
      period_analyzed: period,
      filters_applied: {
        vehicle_type: vehicleType,
        segment_id: segmentId,
      },
    })
  } catch (error) {
    console.error("Analytics API Error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 })
  }
}
