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
        COALESCE(segment_id, 'unknown') as segment_id,
        -- 시간대별 통계 (NULL 값 처리)
        COALESCE(AVG(CASE WHEN EXTRACT(HOUR FROM msg_time) BETWEEN 6 AND 11 THEN soc END), 0) as morning_avg_soc,
        COALESCE(AVG(CASE WHEN EXTRACT(HOUR FROM msg_time) BETWEEN 12 AND 17 THEN soc END), 0) as afternoon_avg_soc,
        COALESCE(AVG(CASE WHEN EXTRACT(HOUR FROM msg_time) BETWEEN 18 AND 23 THEN soc END), 0) as evening_avg_soc,
        COALESCE(AVG(CASE WHEN EXTRACT(HOUR FROM msg_time) BETWEEN 0 AND 5 THEN soc END), 0) as night_avg_soc,
        
        -- 계절별 통계 (NULL 값 처리)
        COALESCE(AVG(CASE WHEN EXTRACT(QUARTER FROM msg_time) = 1 THEN soh END), 0) as spring_avg_soh,
        COALESCE(AVG(CASE WHEN EXTRACT(QUARTER FROM msg_time) = 2 THEN soh END), 0) as summer_avg_soh,
        COALESCE(AVG(CASE WHEN EXTRACT(QUARTER FROM msg_time) = 3 THEN soh END), 0) as fall_avg_soh,
        COALESCE(AVG(CASE WHEN EXTRACT(QUARTER FROM msg_time) = 4 THEN soh END), 0) as winter_avg_soh,
        
        -- 전체 통계 (NULL 값 처리)
        COALESCE(AVG(soc), 0) as overall_avg_soc,
        COALESCE(AVG(soh), 0) as overall_avg_soh,
        COALESCE(AVG(cell_temp_avg), 0) as overall_avg_temp,
        COUNT(*) as total_records,
        -- 데이터 품질 지표
        COUNT(CASE WHEN soc IS NOT NULL THEN 1 END) as valid_soc_count,
        COUNT(CASE WHEN soh IS NOT NULL THEN 1 END) as valid_soh_count,
        ROUND(COUNT(CASE WHEN soc IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as soc_data_quality,
        ROUND(COUNT(CASE WHEN soh IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as soh_data_quality
      FROM bms_data
      ${whereClause}
      AND msg_time >= CURRENT_DATE - INTERVAL '1 year'
      AND (soc IS NOT NULL OR soh IS NOT NULL)
      GROUP BY segment_id
      ORDER BY segment_id
    `

    const result = await pool.query(trendsQuery, params)

    const chargingPatternsQuery = `
      SELECT 
        EXTRACT(HOUR FROM msg_time) as hour,
        COUNT(CASE WHEN pack_current > 0 THEN 1 END) as charging_sessions,
        COALESCE(AVG(CASE WHEN pack_current > 0 THEN pack_current END), 0) as avg_charging_current,
        COALESCE(AVG(CASE WHEN pack_current > 0 THEN soc END), 0) as avg_charging_soc
      FROM bms_data
      ${whereClause}
      AND msg_time >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM msg_time)
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
