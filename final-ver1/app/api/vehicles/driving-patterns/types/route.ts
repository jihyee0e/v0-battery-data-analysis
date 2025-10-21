import { NextResponse } from "next/server"
import { runQuery, getAvgSocSoh } from "@/lib/dashboard-utils"
import { bucket } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type')

    // car_type 파라미터가 있으면 디바이스 목록 반환
    if (carType) {
      // 1) 차종별 고유 디바이스 목록
      const deviceQuery = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.car_type == "${carType}")
          |> keep(columns: ["device_no"])
          |> distinct(column: "device_no")
      `

      // 2) 각 디바이스의 최신 SOC
      const latestSocQuery = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.car_type == "${carType}")
          |> filter(fn: (r) => r._field == "soc")
          |> group(columns: ["device_no"]) |> last()
          |> keep(columns: ["device_no", "_value"]) 
      `

      // 3) 각 디바이스의 최신 SOH
      const latestSohQuery = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.car_type == "${carType}")
          |> filter(fn: (r) => r._field == "soh")
          |> group(columns: ["device_no"]) |> last()
          |> keep(columns: ["device_no", "_value"]) 
      `

      const [deviceRows, socRows, sohRows] = await Promise.all([
        runQuery(deviceQuery),
        runQuery(latestSocQuery),
        runQuery(latestSohQuery)
      ])

      const deviceSet = new Set<string>()
      for (const row of deviceRows) {
        if (row.device_no) deviceSet.add(String(row.device_no))
      }

      const latestSocByDevice = new Map<string, number>()
      for (const row of socRows) {
        if (row.device_no != null) latestSocByDevice.set(String(row.device_no), Number(row._value))
      }

      const latestSohByDevice = new Map<string, number>()
      for (const row of sohRows) {
        if (row.device_no != null) latestSohByDevice.set(String(row.device_no), Number(row._value))
      }

      const devices = Array.from(deviceSet).map((deviceNo) => {
        const soc = latestSocByDevice.get(deviceNo) ?? 0
        const soh = latestSohByDevice.get(deviceNo) ?? 0
        return {
          device_no: deviceNo,
          soc,
          soh,
          vehicle_status: 'UNKNOWN',
          performance_grade: soh >= 95 ? 'A' : soh >= 85 ? 'B' : soh >= 70 ? 'C' : 'D'
        }
      })

      return NextResponse.json({
        success: true,
        car_type: carType,
        count: devices.length,
        devices,
        timestamp: new Date().toISOString()
      })
    }

    // car_type 파라미터가 없으면 차종별 현황 반환
    const carTypes = ['BONGO3', 'GV60', 'PORTER2']
    const vehicleTypes = []

    for (const carType of carTypes) {
      try {
        // 각 차종별 고유 디바이스 수만 계산
        const deviceQuery = `
          from(bucket: "${bucket}")
            |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
            |> filter(fn: (r) => r._measurement == "aicar_bms")
            |> filter(fn: (r) => r.car_type == "${carType}")
            |> keep(columns: ["device_no"])
            |> distinct(column: "device_no")
        `

        const deviceResult = await runQuery(deviceQuery)
        const deviceCount = deviceResult.length

        vehicleTypes.push({
          carType,
          deviceCount,
          // 평균 SOC/SOH는 필요시에만 계산
          avgSoc: 0,
          avgSoh: 0,
          totalRecords: 0
        })
      } catch (error) {
        console.error(`Error processing ${carType}:`, error)
        vehicleTypes.push({
          carType,
          deviceCount: 0,
          avgSoc: 0,
          avgSoh: 0,
          totalRecords: 0
        })
      }
    }

    return NextResponse.json({
      success: true,
      vehicleTypes,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Vehicle Types API Error:", error)
    return NextResponse.json({
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
