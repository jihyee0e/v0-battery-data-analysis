import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleType = searchParams.get("car_type")
    const timeRange = searchParams.get("time_range") || "30d"

    const params: any[] = []
    const whereConditions: string[] = []

    if (vehicleType && vehicleType !== "all") {
      whereConditions.push(`car_type = $${params.length + 1}`)
      params.push(vehicleType.toUpperCase())
    }

    // 시간 범위 설정 (실제 데이터 범위: 2022-11-30 ~ 2023-08-31)
    const toTs = "TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')"
    let timeFilter = ""
    switch (timeRange) {
      case "7d":
        timeFilter = `AND ${toTs} >= '2023-08-24' AND ${toTs} <= '2023-08-31'`
        break
      case "30d":
        timeFilter = `AND ${toTs} >= '2023-08-01' AND ${toTs} <= '2023-08-31'`
        break
      case "90d":
        timeFilter = `AND ${toTs} >= '2023-06-01' AND ${toTs} <= '2023-08-31'`
        break
      default:
        timeFilter = `AND ${toTs} >= '2023-08-01' AND ${toTs} <= '2023-08-31'`
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // 디버깅용: 간단한 쿼리로 시작
    console.log("Debug - timeFilter:", timeFilter)
    console.log("Debug - whereClause:", whereClause)

    // 셀 밸런스 트렌드 분석 (단순화)
    const balanceTrendsQuery = `
      SELECT 
        '2023-08-01'::date AS date,
        AVG(cell_balance_index) AS avg_balance_index,
        0 AS balance_variability,
        COUNT(*) AS data_points,
        COUNT(CASE WHEN cell_balance_index > 2.0 THEN 1 END) AS high_imbalance_count,
        COUNT(CASE WHEN cell_balance_index > 1.5 THEN 1 END) AS moderate_imbalance_count
      FROM cell_balance_mv
      ${whereClause}
      ${timeFilter}
      GROUP BY 1
      ORDER BY date DESC
      LIMIT 30
    `

    const balanceTriggersQuery = `
      SELECT 
        imbalance_trigger,
        COUNT(*) as occurrence_count,
        AVG(cell_balance_index) as avg_imbalance_level,
        AVG(mod_avg_temp) as avg_temperature,
        AVG(ABS(pack_current)) as avg_current
      FROM cell_balance_mv
      ${whereClause}
      ${timeFilter}
      GROUP BY imbalance_trigger
      ORDER BY occurrence_count DESC
      LIMIT 10
    `

    // 차종별 밸런스 특성 비교 (MATERIALIZED VIEW 사용)
    const vehicleComparisonQuery = `
      SELECT 
        car_type,
        AVG(cell_balance_index) as avg_balance_index,
        AVG(cell_balance_index * cell_balance_index) - AVG(cell_balance_index) * AVG(cell_balance_index) as balance_variability,
        COUNT(*) as total_records,
        COUNT(CASE WHEN cell_balance_index > 2.0 THEN 1 END) as high_imbalance_records,
        ROUND(COUNT(CASE WHEN cell_balance_index > 2.0 THEN 1 END) * 100.0 / COUNT(*), 2) as imbalance_percentage
      FROM cell_balance_mv
      WHERE 1=1
      ${timeFilter}
      GROUP BY car_type
      ORDER BY avg_balance_index
      LIMIT 5
    `

    // // 디버깅용: 가장 간단한 쿼리부터 테스트
    // console.log("Debug - Executing queries...")
    
    const testQuery = `SELECT COUNT(*) FROM cell_balance_mv WHERE 1=1 ${timeFilter}`
    // console.log("Debug - Test query:", testQuery)
    
    const testResult = await pool.query(testQuery, params)
    // console.log("Debug - Test result count:", testResult.rows[0]?.count)
    
    const [trendsResult, triggersResult, comparisonResult] = await Promise.all([
      pool.query(balanceTrendsQuery, params),
      pool.query(balanceTriggersQuery, params),
      pool.query(vehicleComparisonQuery, params)
    ])

    return NextResponse.json({
      success: true,
      data: {
        balance_trends: trendsResult.rows,
        balance_triggers: triggersResult.rows,
        vehicle_comparison: comparisonResult.rows,
        time_range: timeRange,
        filters_applied: {
          vehicle_type: vehicleType,
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Cell Balance Analysis API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch cell balance analysis data",
      message: "셀 밸런스 분석 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}

