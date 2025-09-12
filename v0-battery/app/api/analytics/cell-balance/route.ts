import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type') || 'all'
    const trigger = searchParams.get('trigger') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')

    // 차종 필터
    let carTypeFilter = ''
    if (carType !== 'all') {
      carTypeFilter = `AND car_type = '${carType.toUpperCase()}'`
    }

    // 트리거 필터
    let triggerFilter = ''
    if (trigger !== 'all') {
      triggerFilter = `AND imbalance_trigger = '${trigger}'`
    }

    // 셀 밸런스 데이터 조회
    const balanceQuery = `
      SELECT 
        device_no,
        car_type,
        msg_time,
        soc,
        pack_current,
        mod_avg_temp,
        cell_balance_index,
        speed,
        lat,
        lng,
        fuel_pct,
        imbalance_trigger
      FROM cell_balance_mv
      WHERE 1=1 ${carTypeFilter} ${triggerFilter}
      ORDER BY cell_balance_index DESC, msg_time DESC
      LIMIT $1
    `

    const balanceResult = await pool.query(balanceQuery, [limit])

    // 밸런스 상태별 통계
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN cell_balance_index <= 0.5 THEN 1 END) as excellent_balance_count,
        COUNT(CASE WHEN cell_balance_index > 0.5 AND cell_balance_index <= 1.0 THEN 1 END) as good_balance_count,
        COUNT(CASE WHEN cell_balance_index > 1.0 AND cell_balance_index <= 2.0 THEN 1 END) as moderate_balance_count,
        COUNT(CASE WHEN cell_balance_index > 2.0 THEN 1 END) as poor_balance_count,
        COUNT(*) as total_count,
        ROUND(AVG(cell_balance_index), 3) as avg_balance_index,
        ROUND(STDDEV(cell_balance_index), 3) as balance_variability
      FROM cell_balance_mv
      WHERE 1=1 ${carTypeFilter}
    `

    const statsResult = await pool.query(statsQuery)

    // 트리거별 통계
    const triggerStatsQuery = `
      SELECT 
        imbalance_trigger,
        COUNT(*) as count,
        ROUND(AVG(cell_balance_index), 3) as avg_balance_index,
        ROUND(AVG(mod_avg_temp), 2) as avg_temp,
        ROUND(AVG(soc), 2) as avg_soc
      FROM cell_balance_mv
      WHERE 1=1 ${carTypeFilter}
      GROUP BY imbalance_trigger
      ORDER BY count DESC
    `

    const triggerStatsResult = await pool.query(triggerStatsQuery)

    return NextResponse.json({
      success: true,
      data: {
        balance_data: balanceResult.rows,
        statistics: statsResult.rows[0] || {},
        trigger_statistics: triggerStatsResult.rows,
        meta: {
          car_type: carType,
          trigger: trigger,
          total_records: balanceResult.rows.length,
          limit: limit
        }
      }
    })

  } catch (error) {
    console.error("Cell Balance API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch cell balance data",
      message: "셀 밸런스 데이터를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}