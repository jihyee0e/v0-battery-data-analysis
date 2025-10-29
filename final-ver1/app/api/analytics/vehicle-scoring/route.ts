import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get("car_type") || null

    const queryApi = influxDB.getQueryApi(org)

    const scoringQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        ${carType ? `|> filter(fn: (r) => r.car_type == "${carType.toUpperCase()}")` : ""}
        |> filter(fn: (r) => r._field == "soc" or r._field == "soh" or r._field == "pack_volt" or r._field == "pack_current" or r._field == "mod_avg_temp" or r._field == "odometer" or r._field == "max_cell_volt" or r._field == "min_cell_volt")
        |> filter(fn: (r) => exists r._value)
        |> sort(columns: ["_time"], desc: true)
    `

    const vehicleData: Record<string, any> = {}

    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows(scoringQuery, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row)
          if (!record || record._value == null || record._value === "NaN") return

          const deviceNo = record.device_no
          const field = record._field
          const value = Number(record._value)
          const time = record._time

          if (!vehicleData[deviceNo]) {
            vehicleData[deviceNo] = {
              device_no: deviceNo,
              car_type: record.car_type,
              last_updated: time,
              data: {},
            }
          }

          if (time > vehicleData[deviceNo].last_updated) {
            vehicleData[deviceNo].last_updated = time
          }

          if (Number.isFinite(value)) {
            vehicleData[deviceNo].data[field] = value
          }
        },
        error: (err) => reject(err),
        complete: () => resolve(),
      })
    })

    // 이하 계산 로직 동일
    const scoredVehicles = Object.values(vehicleData).map((vehicle: any) => {
      const data = vehicle.data

      const soh = data.soh || 0
      const soc = data.soc || 0
      const packVolt = data.pack_volt || 0
      const packCurrent = data.pack_current || 0
      const modAvgTemp = data.mod_avg_temp || 0
      const odometer = data.odometer || 0
      const maxCellVolt = data.max_cell_volt || 0
      const minCellVolt = data.min_cell_volt || 0

      const cellBalanceIndex =
        packVolt > 0 && maxCellVolt > 0 && minCellVolt > 0
          ? ((maxCellVolt - minCellVolt) / packVolt) * 100
          : 0

      const compositeHealthIndex =
        soh * 0.6 + soc * 0.2 + Math.max(0, 100 - cellBalanceIndex) * 0.2

      const sohScore =
        soh >= 90
          ? 100
          : soh >= 80
          ? 80 + (soh - 80) * 2
          : soh >= 70
          ? 60 + (soh - 70) * 2
          : soh >= 60
          ? 40 + (soh - 60) * 2
          : soh * 0.67

      const healthScore =
        compositeHealthIndex >= 90
          ? 100
          : compositeHealthIndex >= 80
          ? 80 + (compositeHealthIndex - 80)
          : compositeHealthIndex >= 70
          ? 60 + (compositeHealthIndex - 70)
          : compositeHealthIndex >= 60
          ? 40 + (compositeHealthIndex - 60)
          : compositeHealthIndex * 0.67

      const balanceScore =
        cellBalanceIndex <= 0.5
          ? 100
          : cellBalanceIndex <= 1.0
          ? 90 - (cellBalanceIndex - 0.5) * 20
          : cellBalanceIndex <= 2.0
          ? 80 - (cellBalanceIndex - 1.0) * 10
          : cellBalanceIndex <= 3.0
          ? 70 - (cellBalanceIndex - 2.0) * 10
          : Math.max(20, 60 - (cellBalanceIndex - 3.0) * 5)

      const daysSinceUpdate =
        (Date.now() - new Date(vehicle.last_updated).getTime()) /
        (1000 * 60 * 60 * 24)
      const freshnessScore =
        daysSinceUpdate <= 7
          ? 100
          : daysSinceUpdate <= 30
          ? 80
          : daysSinceUpdate <= 90
          ? 60
          : 40

      const activityScore =
        odometer >= 10000
          ? 100
          : odometer >= 5000
          ? 80 + ((odometer - 5000) / 5000) * 20
          : odometer >= 1000
          ? 60 + ((odometer - 1000) / 4000) * 20
          : odometer >= 100
          ? 40 + ((odometer - 100) / 900) * 20
          : (odometer / 100) * 40

      const overallScore = Math.round(
        (sohScore * 0.3 +
          healthScore * 0.25 +
          balanceScore * 0.2 +
          freshnessScore * 0.15 +
          activityScore * 0.1) *
          100
      ) / 100

      const performanceGrade =
        overallScore >= 90
          ? "우수"
          : overallScore >= 80
          ? "양호"
          : overallScore >= 70
          ? "보통"
          : overallScore >= 60
          ? "주의"
          : "불량"

      return {
        device_no: vehicle.device_no,
        car_type: vehicle.car_type,
        soh,
        soc,
        pack_volt: packVolt,
        pack_current: packCurrent,
        mod_avg_temp: modAvgTemp,
        odometer,
        cell_balance_index: cellBalanceIndex,
        composite_health_index: compositeHealthIndex,
        last_updated: vehicle.last_updated,
        overall_score: overallScore,
        performance_grade: performanceGrade,
      }
    })

    scoredVehicles.sort((a, b) => b.overall_score - a.overall_score)

    return NextResponse.json({ success: true, data: scoredVehicles })
  } catch (err) {
    console.error("차량 스코어링 분석 오류:", err)
    return NextResponse.json(
      { success: false, error: "차량 스코어링 분석 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
