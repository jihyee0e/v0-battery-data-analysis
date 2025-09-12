import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type') || 'all'
    const riskLevel = searchParams.get('risk_level') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    // 차종 필터
    let carTypeFilter = ''
    if (carType !== 'all') {
      carTypeFilter = `AND car_type = '${carType.toUpperCase()}'`
    }

    // 위험도 필터
    let riskFilter = ''
    if (riskLevel !== 'all') {
      riskFilter = `AND risk_level = '${riskLevel}'`
    }

    // 이상 탐지 데이터 조회
    const anomalyQuery = `
      SELECT 
        device_no,
        car_type,
        msg_time,
        soc,
        soh,
        anomaly_type,
        anomaly_severity,
        risk_level,
        CASE 
          WHEN anomaly_type = 'low_soh' THEN '저 SOH'
          WHEN anomaly_type = 'high_imbalance' THEN '고 불균형'
          WHEN anomaly_type = 'high_temperature' THEN '고온'
          WHEN anomaly_type = 'low_temperature' THEN '저온'
          WHEN anomaly_type = 'low_voltage' THEN '저전압'
          WHEN anomaly_type = 'high_voltage' THEN '고전압'
          WHEN anomaly_type = 'extreme_current' THEN '극한 전류'
          ELSE anomaly_type
        END as anomaly_type_korean
      FROM anomaly_detection_mv
      WHERE 1=1 ${carTypeFilter} ${riskFilter}
      ORDER BY anomaly_severity DESC, msg_time DESC
      LIMIT $1
    `

    const anomalyResult = await pool.query(anomalyQuery, [limit])

    // 위험도별 통계
    const statsQuery = `
      SELECT 
        risk_level,
        anomaly_type,
        COUNT(*) as count,
        ROUND(AVG(anomaly_severity), 2) as avg_severity,
        MAX(anomaly_severity) as max_severity
      FROM anomaly_detection_mv
      WHERE 1=1 ${carTypeFilter}
      GROUP BY risk_level, anomaly_type
      ORDER BY risk_level, count DESC
    `

    const statsResult = await pool.query(statsQuery)

    // 차종별 이상 패턴 요약
    const summaryQuery = `
      SELECT 
        car_type,
        COUNT(*) as total_anomalies,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_count,
        ROUND(AVG(anomaly_severity), 2) as avg_severity
      FROM anomaly_detection_mv
      WHERE 1=1 ${carTypeFilter}
      GROUP BY car_type
      ORDER BY total_anomalies DESC
    `

    const summaryResult = await pool.query(summaryQuery)

    return NextResponse.json({
      success: true,
      data: {
        anomalies: anomalyResult.rows,
        statistics: statsResult.rows,
        summary: summaryResult.rows,
        meta: {
          car_type: carType,
          risk_level: riskLevel,
          total_anomalies: anomalyResult.rows.length,
          limit: limit
        }
      }
    })

  } catch (error) {
    console.error("Anomaly Detection API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch anomaly detection data",
      message: "이상 탐지 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}