import { influxDB, org, bucket } from "@/lib/database"

// Flux 쿼리 결과를 Promise 기반으로 받기 위한 헬퍼
export const runQuery = (query: string, onRow?: (row: any) => void) =>
  new Promise<any[]>((resolve, reject) => {
    const queryApi = influxDB.getQueryApi(org)
    const rows: any[] = []

    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const record = tableMeta.toObject(row)

        if (!record || record._value == null || record._value === "NaN") return
        
        // 콜백이 있으면 즉시 처리
        if (onRow) onRow(record)
        else rows.push(record)
      },
      error(err) {
        console.error("InfluxDB Query Error:", err)
        reject(err)
      },
      complete() {
        resolve(rows)
      },
    })
  })

// 차종별 BMS/GPS 카운트 가져오기
export const getVehicleCounts = async (carTypes: string[] = ['BONGO3', 'GV60', 'PORTER2']) => {
  const detailedRecords: Record<string, { BMS: number; GPS: number; 총합: number }> = {}

  for (const carType of carTypes) {
    const bmsQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        |> filter(fn: (r) => r.car_type == "${carType}")
        |> count()
    `

    const gpsQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_gps")
        |> filter(fn: (r) => r.car_type == "${carType}")
        |> count()
    `

    let bmsCount = 0
    let gpsCount = 0

    try {
      await runQuery(bmsQuery, (record) => {
        bmsCount += Number(record._value) || 0
      })
    } catch (e) {
      console.error(`BMS count error for ${carType}:`, e)
    }

    try {
      await runQuery(gpsQuery, (record) => {
        gpsCount += Number(record._value) || 0
      })
    } catch (e) {
      console.error(`GPS count error for ${carType}:`, e)
    }

    // try {
    //   const bmsResult = await runQuery(bmsQuery)
    //   for (const record of bmsResult) {
    //     bmsCount += Number(record._value) || 0
    //   }
    // } catch (e) {
    //   console.error(`BMS count error for ${carType}:`, e)
    // }

    // try {
    //   const gpsResult = await runQuery(gpsQuery)
    //   for (const record of gpsResult) {
    //     gpsCount += Number(record._value) || 0
    //   }
    // } catch (e) {
    //   console.error(`GPS count error for ${carType}:`, e)
    // }

    detailedRecords[carType] = {
      BMS: bmsCount,
      GPS: gpsCount,
      총합: bmsCount + gpsCount
    }
  }

  return detailedRecords
}

// 차종별 SOC/SOH 평균 계산
export const getAvgSocSoh = async (carTypes: string[] = ['BONGO3', 'GV60', 'PORTER2']) => {
  const avgSocSohData: Record<string, { avg_soc: number; avg_soh: number; device_count: number }> = {}
  
  for (const carType of carTypes) {
    try {
      let socSum = 0, sohSum = 0
      let socCount = 0, sohCount = 0
      const deviceSet = new Set<string>()

      // SOC & SOH 스트리밍 처리
      await runQuery(`
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => (r._field == "soc" or r._field == "soh"))
          |> filter(fn: (r) => r.car_type == "${carType}")
          |> filter(fn: (r) => exists r._value)
          |> keep(columns: ["_field", "_value"])
      `, (row) => {
        const val = Number(row._value)
        if (Number.isFinite(val) && val >= 0 && val <= 100) {
          if (row._field === "soc") { socSum += val; socCount++ }
          else if (row._field === "soh") { sohSum += val; sohCount++ }
        }
      })

      // 고유 디바이스 수 스트리밍 처리
      await runQuery(`
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.car_type == "${carType}")
          |> keep(columns: ["device_no"])
          |> distinct(column: "device_no")
      `, (row) => {
        if (row.device_no) deviceSet.add(row.device_no)
      })

      const avg_soc = socCount > 0 ? socSum / socCount : 0
      const avg_soh = sohCount > 0 ? sohSum / sohCount : 0
      const device_count = deviceSet.size

      avgSocSohData[carType] = { avg_soc, avg_soh, device_count }
    } catch (e) {
      console.error(`Error processing ${carType}:`, e)
      avgSocSohData[carType] = { avg_soc: 0, avg_soh: 0, device_count: 0 }
    }
  }
  return avgSocSohData
}

// 전체 통계 계산
export const calculateTotalStats = (detailedRecords: Record<string, { BMS: number; GPS: number; 총합: number }>) => {
  const totalBMS = Object.values(detailedRecords).reduce((sum, r) => sum + r.BMS, 0)
  const totalGPS = Object.values(detailedRecords).reduce((sum, r) => sum + r.GPS, 0)
  const totalSum = totalBMS + totalGPS
  
  return { totalBMS, totalGPS, totalSum }
}

// 차량 성능 등급 계산
export const getPerformanceGrade = (soh: number): string => {
  if (soh >= 95) return '우수'
  if (soh >= 85) return '양호'
  if (soh >= 70) return '보통'
  return '불량'
}

// 충전 상태 판단
export const getChargingStatus = (packCurrent: number, cableConnected: number, fastCharging: number, slowCharging: number) => {
  const isCharging = packCurrent > 0.5
  const isCableConnected = cableConnected === 1
  const isFastCharging = fastCharging === 1
  const isSlowCharging = slowCharging === 1
  
  return {
    isCharging,
    isCableConnected,
    isFastCharging,
    isSlowCharging,
    chargingStatus: isCharging ? '충전중' : isCableConnected ? '연결됨' : '연결안됨'
  }
}

// 차량 상태 판단
export const getVehicleStatus = (speed: number, isCharging: boolean) => {
  const isMoving = speed > 5
  return {
    isMoving,
    vehicleStatus: isMoving ? '주행중' : isCharging ? '충전중' : '정지'
  }
}
