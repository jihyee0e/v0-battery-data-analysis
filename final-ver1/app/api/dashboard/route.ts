import { NextResponse } from "next/server"
// import { influxDB, org, bucket } from "@/lib/database"
import { getVehicleCounts, getAvgSocSoh, calculateTotalStats } from "@/lib/dashboard-utils"

export async function GET() {
  try {
    // InfluxDB 연결 테스트
    console.log('InfluxDB 연결 정보:', {
      url: process.env.INFLUXDB_URL,
      org: process.env.INFLUXDB_ORG,
      bucket: process.env.INFLUXDB_BUCKET,
      hasToken: !!process.env.INFLUXDB_TOKEN
    })

    const carTypes = ['BONGO3', 'GV60', 'PORTER2']
    
    // 공통 함수 사용
    const detailedRecords = await getVehicleCounts(carTypes)
    const { totalBMS, totalGPS, totalSum } = calculateTotalStats(detailedRecords)
    const avgSocSohData = await getAvgSocSoh(carTypes)

    // 프론트엔드에서 기대하는 형식으로 데이터 반환
    return NextResponse.json({
      success: true,
      // 기존 dashboard 데이터
      total_vehicles: totalSum,
      online_5m_pct: totalSum > 0 ? 85.5 : 0,
      charging_now: 0,
      moving_now: 0,
      avg_soh: 0,
      avg_soc: 0,
      low_SOH_pct: 0,
      high_temp_pct: 0,
      high_imbalance_pct: 0,
      vehicle_types: {
        porter2: {
          count: detailedRecords['PORTER2']?.총합 || 0,
          online_5m_pct: 85.5,
          charging_now: 0,
          moving_now: 0,
          avg_soh: 0,
          avg_soc: 0,
          low_SOH_pct: 0,
          high_temp_pct: 0,
          high_imbalance_pct: 0
        },
        gv60: {
          count: detailedRecords['GV60']?.총합 || 0,
          online_5m_pct: 85.5,
          charging_now: 0,
          moving_now: 0,
          avg_soh: 0,
          avg_soc: 0,
          low_SOH_pct: 0,
          high_temp_pct: 0,
          high_imbalance_pct: 0
        },
        bongo3: {
          count: detailedRecords['BONGO3']?.총합 || 0,
          online_5m_pct: 85.5,
          charging_now: 0,
          moving_now: 0,
          avg_soh: 0,
          avg_soc: 0,
          low_SOH_pct: 0,
          high_temp_pct: 0,
          high_imbalance_pct: 0
        }
      },
      // overview 데이터 추가
      overview: {
        total: { BMS: totalBMS, GPS: totalGPS, 총합: totalSum },
        vehicles: detailedRecords,
        avgSocSoh: avgSocSohData
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ 
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
