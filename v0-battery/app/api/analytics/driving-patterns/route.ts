import { NextResponse } from "next/server"
import { pool } from "@/v0-battery/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleType = searchParams.get("car_type")
    const timeRange = searchParams.get("time_range") || "30d"

    const params: any[] = []
    const whereConditions: string[] = []

    if (vehicleType && vehicleType !== "all") {
      whereConditions.push(`b.car_type = $${params.length + 1}`)
      params.push(vehicleType.toUpperCase())
    }

    // 시간 범위 설정
    let timeFilter = ""
    switch (timeRange) {
      case "7d":
        timeFilter = "AND b.msg_time >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case "30d":
        timeFilter = "AND b.msg_time >= CURRENT_DATE - INTERVAL '30 days'"
        break
      case "90d":
        timeFilter = "AND b.msg_time >= CURRENT_DATE - INTERVAL '90 days'"
        break
      default:
        timeFilter = "AND b.msg_time >= CURRENT_DATE - INTERVAL '30 days'"
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // 주행 모드별 성능 분석 (집계된 데이터 사용)
    const drivingModeAnalysisQuery = `
      SELECT 
        driving_mode,
        car_type,
        COUNT(*) AS total_cycles,
        AVG(avg_power) AS avg_power,
        AVG(power_variability) AS power_variability,
        AVG(avg_temp) AS avg_temp,
        AVG(temp_range) AS temp_range,
        AVG(soc_efficiency) AS avg_soc_efficiency,
        AVG(data_points) AS avg_data_points
      FROM driving_patterns_mv b
      ${whereClause}
      GROUP BY driving_mode, car_type
      ORDER BY driving_mode, car_type
    `

    // 시간대별 주행 패턴 분석
    const timeBasedAnalysisQuery = `
      WITH bms_all AS (
        SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt, mod_avg_temp
        FROM public.bongo3_bms_data
        UNION ALL
        SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt, mod_avg_temp
        FROM public.gv60_bms_data
        UNION ALL
        SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt, mod_avg_temp
        FROM public.porter2_bms_data
      ),
      gps_all AS (
        SELECT device_no, car_type, time, speed
        FROM public.bongo3_gps_data
        UNION ALL
        SELECT device_no, car_type, time, speed
        FROM public.gv60_gps_data
        UNION ALL
        SELECT device_no, car_type, time, speed
        FROM public.porter2_gps_data
      ),
      integrated_data AS (
        SELECT 
          b.device_no,
          b.car_type,
          b.msg_time,
          b.soc,
          b.pack_current,
          b.pack_volt,
          b.mod_avg_temp,
          g.speed
        FROM bms_all b
        LEFT JOIN gps_all g ON b.device_no = g.device_no 
          AND ABS(EXTRACT(EPOCH FROM (TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') - g.time))) < 300
        WHERE b.soc IS NOT NULL AND g.speed IS NOT NULL
      )
      SELECT 
        EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) as hour_of_day,
        CASE 
          WHEN speed > 80 THEN 'highway'
          WHEN speed > 40 THEN 'urban_highway'
          WHEN speed > 20 THEN 'urban'
          WHEN speed > 5 THEN 'slow_urban'
          ELSE 'stationary'
        END as driving_mode,
        COUNT(*) as trip_count,
        AVG(speed) as avg_speed,
        AVG(soc) as avg_soc,
        AVG(mod_avg_temp) as avg_temp
      FROM integrated_data
      ${whereClause}
      ${timeFilter}
      GROUP BY EXTRACT(HOUR FROM TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')), driving_mode
      ORDER BY hour_of_day, driving_mode
    `

    // 주행 조건별 BMS 반응 분석 (원본 BMS/GPS 데이터 사용)
    const bmsResponseQuery = `
      WITH bms_all AS (
        SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt, mod_avg_temp, max_cell_volt, min_cell_volt
        FROM public.bongo3_bms_data
        UNION ALL
        SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt, mod_avg_temp, max_cell_volt, min_cell_volt
        FROM public.gv60_bms_data
        UNION ALL
        SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt, mod_avg_temp, max_cell_volt, min_cell_volt
        FROM public.porter2_bms_data
      ),
      gps_all AS (
        SELECT device_no, car_type, time, speed
        FROM public.bongo3_gps_data
        UNION ALL
        SELECT device_no, car_type, time, speed
        FROM public.gv60_gps_data
        UNION ALL
        SELECT device_no, car_type, time, speed
        FROM public.porter2_gps_data
      ),
      integrated_data AS (
        SELECT 
          b.device_no,
          b.car_type,
          b.msg_time,
          b.soc,
          b.pack_current,
          b.pack_volt,
          b.mod_avg_temp,
          b.max_cell_volt,
          b.min_cell_volt,
          g.speed
        FROM bms_all b
        LEFT JOIN gps_all g ON b.device_no = g.device_no 
          AND ABS(EXTRACT(EPOCH FROM (TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') - g.time))) < 300
        WHERE b.soc IS NOT NULL AND g.speed IS NOT NULL
      )
      SELECT 
        CASE 
          WHEN speed > 80 THEN 'highway'
          WHEN speed > 40 THEN 'urban_highway'
          WHEN speed > 20 THEN 'urban'
          WHEN speed > 5 THEN 'slow_urban'
          ELSE 'stationary'
        END as driving_mode,
        CASE 
          WHEN pack_current > 0 THEN 'charging'
          WHEN pack_current < 0 THEN 'discharging'
          ELSE 'idle'
        END as operation_mode,
        COUNT(*) as data_points,
        AVG((max_cell_volt - min_cell_volt) / pack_volt * 100) as avg_voltage_balance,
        STDDEV((max_cell_volt - min_cell_volt) / pack_volt * 100) as voltage_balance_variability,
        AVG(mod_avg_temp) as avg_temp,
        STDDEV(mod_avg_temp) as temp_variability
      FROM integrated_data
      ${whereClause}
      ${timeFilter}
      GROUP BY driving_mode, operation_mode
      ORDER BY driving_mode, operation_mode
    `

    const [modeResult, timeResult, responseResult] = await Promise.all([
      pool.query(drivingModeAnalysisQuery, params),
      pool.query(timeBasedAnalysisQuery, params),
      pool.query(bmsResponseQuery, params)
    ])

    return NextResponse.json({
      success: true,
      data: {
        driving_mode_analysis: modeResult.rows,
        time_based_analysis: timeResult.rows,
        bms_response_analysis: responseResult.rows,
        time_range: timeRange,
        filters_applied: {
          vehicle_type: vehicleType,
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Driving Pattern Analysis API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch driving pattern analysis data",
      message: "주행 패턴 분석 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}

