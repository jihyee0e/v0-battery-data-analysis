import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request, { params }: { params: { type: string } }) {
  try {
    const vehicleId = params.type

    const vehicleQuery = `
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
        COALESCE(latest_lat, 0) as latest_lat,
        COALESCE(latest_lng, 0) as latest_lng,
        COALESCE(latest_speed, 0) as latest_speed,
        -- 실시간 상태
        CASE 
          WHEN pack_current > 0 THEN 'charging'
          WHEN pack_current < -10 THEN 'discharging'
          ELSE 'idle'
        END as current_status,
        -- 마지막 업데이트로부터 경과 시간
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) as seconds_since_update
      FROM vehicle_performance_summary
      WHERE vehicle_id = $1
    `

    const result = await pool.query(vehicleQuery, [vehicleId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle data not found" }, { status: 404 })
    }

    const data = result.rows[0]

    const historyQuery = `
      SELECT 
        DATE(msg_time) as date,
        COALESCE(AVG(soc), 0) as avg_soc,
        COALESCE(AVG(soh), 0) as avg_soh,
        COALESCE(AVG(pack_volt), 0) as avg_pack_volt,
        COALESCE(AVG(pack_current), 0) as avg_pack_current,
        COALESCE(AVG(cell_temp_avg), 0) as avg_cell_temp,
        COALESCE(MAX(odometer) - MIN(odometer), 0) as daily_distance,
        COUNT(*) as record_count,
        -- 데이터 품질 지표
        CASE 
          WHEN COUNT(*) >= 100 THEN 'high'
          WHEN COUNT(*) >= 50 THEN 'medium'
          ELSE 'low'
        END as data_quality
      FROM bms_data
      WHERE device_no = $1 
        AND msg_time >= CURRENT_DATE - INTERVAL '30 days'
        AND soc IS NOT NULL 
        AND soh IS NOT NULL
      GROUP BY DATE(msg_time)
      ORDER BY date DESC
      LIMIT 30
    `

    const historyResult = await pool.query(historyQuery, [vehicleId])

    return NextResponse.json({
      vehicle: data,
      history: historyResult.rows,
      summary: {
        is_active: data.seconds_since_update < 3600, // Active if updated within 1 hour
        performance_status: data.performance_grade,
        charging_status: data.current_status,
      },
    })
  } catch (error) {
    console.error("Vehicle Details API Error:", error)
    return NextResponse.json({ error: "Failed to fetch vehicle data" }, { status: 500 })
  }
}
