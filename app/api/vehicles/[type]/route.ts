import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request, { params }: { params: { type: string } }) {
  try {
    const vehicleId = params.type

    const vehicleQuery = `
      SELECT 
        vehicle_id,
        vehicle_type,
        latest_soc,
        latest_soh,
        performance_grade,
        last_updated,
        pack_volt,
        pack_current,
        mod_avg_temp,
        cell_balance_index as avg_efficiency,
        (pack_volt * pack_current) as power_w,
        vehicle_status,
        speed,
        lat,
        lng,
        fuel_pct,
        -- 마지막 업데이트로부터 경과 시간
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) as seconds_since_update
      FROM vehicle_performance_mv
      WHERE vehicle_type = $1
    `

    const result = await pool.query(vehicleQuery, [vehicleId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle data not found" }, { status: 404 })
    }

    const data = result.rows[0]

    const historyQuery = `
      SELECT 
        DATE(TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) as date,
        AVG(soc) as avg_soc,
        AVG(soh) as avg_soh,
        AVG(pack_volt) as avg_pack_volt,
        AVG(pack_current) as avg_pack_current,
        AVG(mod_avg_temp) as avg_mod_temp,
        COUNT(*) as record_count,
        -- 데이터 품질 지표
        CASE 
          WHEN COUNT(*) >= 100 THEN 'high'
          WHEN COUNT(*) >= 50 THEN 'medium'
          ELSE 'low'
        END as data_quality
      FROM trends_mv
      WHERE device_no = $1 
        AND TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') >= CURRENT_DATE - INTERVAL '30 days'
        AND soc IS NOT NULL 
        AND soh IS NOT NULL
      GROUP BY DATE(TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS'))
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
        charging_status: data.vehicle_status,
      },
    })
  } catch (error) {
    console.error("Vehicle Details API Error:", error)
    return NextResponse.json({ error: "Failed to fetch vehicle data" }, { status: 500 })
  }
}
