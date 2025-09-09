import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleType = searchParams.get("car_type")
    const riskLevel = searchParams.get("risk_level")
    const timeRange = searchParams.get("time_range") || "30d"

    const params: any[] = []
    const whereConditions: string[] = []

    if (vehicleType && vehicleType !== "all") {
      whereConditions.push(`car_type = $${params.length + 1}`)
      params.push(vehicleType.toUpperCase())
    }

    if (riskLevel && riskLevel !== "all") {
      whereConditions.push(`risk_level = $${params.length + 1}`)
      params.push(riskLevel)
    }

    // 시간 범위 설정
    let timeFilter = ""
    switch (timeRange) {
      case "7d":
        timeFilter = "AND msg_time >= CURRENT_DATE - INTERVAL '7 days'"
        break
      case "30d":
        timeFilter = "AND msg_time >= CURRENT_DATE - INTERVAL '30 days'"
        break
      case "90d":
        timeFilter = "AND msg_time >= CURRENT_DATE - INTERVAL '90 days'"
        break
      default:
        timeFilter = "AND msg_time >= CURRENT_DATE - INTERVAL '30 days'"
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // 이상 패턴 분포 분석
    const anomalyDistributionQuery = `
      SELECT 
        anomaly_type,
        risk_level,
        COUNT(*) as occurrence_count,
        AVG(anomaly_severity) as avg_severity,
        MAX(anomaly_severity) as max_severity,
        COUNT(DISTINCT device_no) as affected_vehicles
      FROM anomaly_detection_mv
      ${whereClause}
      ${timeFilter}
      GROUP BY anomaly_type, risk_level
      ORDER BY risk_level DESC, occurrence_count DESC
    `

    // 차종별 이상 패턴 분석
    const vehicleAnomalyQuery = `
      SELECT 
        b.car_type,
        a.anomaly_type,
        a.risk_level,
        COUNT(*) as occurrence_count,
        AVG(a.anomaly_severity) as avg_severity,
        COUNT(DISTINCT a.device_no) as affected_vehicles
      FROM anomaly_detection_mv a
      ${whereClause}
      ${timeFilter}
      GROUP BY b.car_type, a.anomaly_type, a.risk_level
      ORDER BY b.car_type, a.risk_level DESC, occurrence_count DESC
    `

    // 시간대별 이상 패턴 분석
    const timeBasedAnomalyQuery = `
      SELECT 
        EXTRACT(HOUR FROM a.msg_time) as hour_of_day,
        a.anomaly_type,
        a.risk_level,
        COUNT(*) as occurrence_count,
        AVG(a.anomaly_severity) as avg_severity
      FROM anomaly_detection_mv a
      ${whereClause}
      ${timeFilter}
      GROUP BY EXTRACT(HOUR FROM a.msg_time), a.anomaly_type, a.risk_level
      ORDER BY hour_of_day, a.risk_level DESC, occurrence_count DESC
    `

    // 이상 패턴 트렌드 분석
    const anomalyTrendsQuery = `
      SELECT 
        DATE_TRUNC('day', a.msg_time) as date,
        a.anomaly_type,
        COUNT(*) as daily_occurrences,
        AVG(a.anomaly_severity) as avg_daily_severity,
        COUNT(DISTINCT a.device_no) as daily_affected_vehicles
      FROM anomaly_detection_mv a
      ${whereClause}
      ${timeFilter}
      GROUP BY DATE_TRUNC('day', a.msg_time), a.anomaly_type
      ORDER BY date DESC, daily_occurrences DESC
      LIMIT 30
    `

    // 위험도별 상세 분석
    const riskLevelAnalysisQuery = `
      SELECT 
        risk_level,
        COUNT(*) as total_anomalies,
        COUNT(DISTINCT device_no) as unique_vehicles,
        AVG(anomaly_severity) as avg_severity,
        STDDEV(anomaly_severity) as severity_variability,
        -- 이상 패턴별 분포
        COUNT(CASE WHEN anomaly_type = 'low_soh' THEN 1 END) as low_soh_count,
        COUNT(CASE WHEN anomaly_type = 'high_imbalance' THEN 1 END) as high_imbalance_count,
        COUNT(CASE WHEN anomaly_type = 'high_temperature' THEN 1 END) as high_temp_count,
        COUNT(CASE WHEN anomaly_type = 'low_voltage' THEN 1 END) as low_voltage_count,
        COUNT(CASE WHEN anomaly_type = 'high_voltage' THEN 1 END) as high_voltage_count,
        COUNT(CASE WHEN anomaly_type = 'extreme_current' THEN 1 END) as extreme_current_count
      FROM anomaly_detection_mv
      ${whereClause}
      ${timeFilter}
      GROUP BY risk_level
      ORDER BY 
        CASE risk_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    `

    const [distributionResult, vehicleResult, timeResult, trendsResult, riskResult] = await Promise.all([
      pool.query(anomalyDistributionQuery, params),
      pool.query(vehicleAnomalyQuery, params),
      pool.query(timeBasedAnomalyQuery, params),
      pool.query(anomalyTrendsQuery, params),
      pool.query(riskLevelAnalysisQuery, params)
    ])

    return NextResponse.json({
      success: true,
      data: {
        anomaly_distribution: distributionResult.rows,
        vehicle_anomaly_analysis: vehicleResult.rows,
        time_based_anomaly: timeResult.rows,
        anomaly_trends: trendsResult.rows,
        risk_level_analysis: riskResult.rows,
        time_range: timeRange,
        filters_applied: {
          vehicle_type: vehicleType,
          risk_level: riskLevel,
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Anomaly Detection API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch anomaly detection data",
      message: "이상 패턴 탐지 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}

