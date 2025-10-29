import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
// import { runQuery } from "@/lib/dashboard-utils"

export async function GET() {
  try {
    const query = `
      import "influxdata/influxdb/schema"
      from(bucket: "${bucket}")
        |> range(start: 2022-12-01T00:00:00Z, stop: 2023-09-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        |> keep(columns: ["device_no"])
        |> group()
        |> distinct(column: "device_no")
    `

    const devices: string[] = []

    await new Promise<void>((resolve, reject) => {
      const queryApi = influxDB.getQueryApi(org)
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row)
          if (record.device_no && typeof record.device_no === "string") {
            devices.push(record.device_no)
          }
        },
        error: reject,
        complete: resolve,
      })
    })

    devices.sort()

    return NextResponse.json({ success: true, devices })
  } catch (error) {
    console.error('차량 목록 조회 오류:', error)
    return NextResponse.json({ success: false, error: '차량 목록 조회 실패' }, { status: 500 })
  }
}


