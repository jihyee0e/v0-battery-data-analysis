import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery, getPerformanceGrade, getChargingStatus, getVehicleStatus } from "@/lib/dashboard-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const carType = searchParams.get('car_type') || 'ALL'
    
    // const queryApi = influxDB.getQueryApi(org)

    // 최신 배터리 상태 데이터 가져오기
    const latestBatteryQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        ${carType !== 'ALL' ? `|> filter(fn: (r) => r.car_type == "${carType}")` : ''}
        |> filter(fn: (r) => r._field == "soc" or r._field == "soh" or r._field == "pack_volt" or r._field == "pack_current" or r._field == "mod_avg_temp" or r._field == "mod_temp" or r._field == "mod_max_temp" or r._field == "mod_min_temp" or r._field == "batt_internal_temp" or r._field == "odometer")
        |> filter(fn: (r) => exists r._value)
    `

    // 충전 상태 데이터 가져오기
    const chargingStatusQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        ${carType !== 'ALL' ? `|> filter(fn: (r) => r.car_type == "${carType}")` : ''}
        |> filter(fn: (r) => r._field == "chrg_cable_conn" or r._field == "fast_chrg_port_conn" or r._field == "slow_chrg_port_conn")
        |> filter(fn: (r) => exists r._value)
    `

    // GPS 데이터 가져오기
    const latestGpsQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_gps")
        ${carType !== 'ALL' ? `|> filter(fn: (r) => r.car_type == "${carType}")` : ''}
        |> filter(fn: (r) => r._field == "speed" or r._field == "lat" or r._field == "lng")
        |> filter(fn: (r) => exists r._value)
    `
    // 미리 기초 객체 생성
    const deviceData: Record<string, any> = {}
    const chargingData: Record<string, any> = {}
    const gpsData: Record<string, any> = {}

    // 전역 누적 통계 변수 (기간 전체 집계용)
    let tempAvgSum = 0
    let tempAvgCount = 0
    let tempMax = -Infinity
    let tempMin = Infinity
    let voltSum = 0
    let voltCount = 0
    let currentSum = 0
    let currentCount = 0
    let socSum = 0
    let socCount = 0
    let sohSum = 0
    let sohCount = 0
    let odometerSum = 0
    let odometerCount = 0
    let speedSum = 0
    let speedCount = 0
    let powerSum = 0
    let powerCount = 0

    // 스트리밍 방식으로 row 처리
    await Promise.all([
      runQuery(latestBatteryQuery, (row) => {
        const deviceNo = row.device_no
        const field = row._field
        const value = Number(row._value)
        const temp_fields = ['mod_avg_temp', 'mod_max_temp', 'mod_min_temp']

        if (!deviceData[deviceNo]) deviceData[deviceNo] = { device_no: deviceNo, car_type: row.car_type }
        if (!Number.isFinite(value)) return

        // 온도 필드 - 전역 누적 갱신
        if (temp_fields.includes(field)) {
          deviceData[deviceNo][field] = value
          if (field === 'mod_avg_temp') {
            tempAvgSum += value
            tempAvgCount += 1
          } else if (field === 'mod_max_temp') {
            if (value > tempMax) tempMax = value
          } else if (field === 'mod_min_temp') {
            if (value < tempMin) tempMin = value
          }
        } else if (['soc', 'soh', 'pack_volt', 'pack_current', 'odometer'].includes(field)) {
          deviceData[deviceNo][field] = value
          // 전역 누적 갱신
          if (field === 'soc') { socSum += value; socCount += 1 }
          else if (field === 'soh') { sohSum += value; sohCount += 1 }
          else if (field === 'pack_volt') { voltSum += value; voltCount += 1 }
          else if (field === 'pack_current') { currentSum += value; currentCount += 1 }
          else if (field === 'odometer') { odometerSum += value; odometerCount += 1 }
        }
      }),

      runQuery(chargingStatusQuery, (row) => {
        const deviceNo = row.device_no
        const field = row._field
        const value = Number(row._value)
        if (!chargingData[deviceNo]) chargingData[deviceNo] = {}
        if (Number.isFinite(value)) chargingData[deviceNo][field] = value
      }),

      runQuery(latestGpsQuery, (row) => {
        const deviceNo = row.device_no
        const field = row._field
        const value = Number(row._value)
        if (!gpsData[deviceNo]) gpsData[deviceNo] = {}
        if (Number.isFinite(value)) {
          gpsData[deviceNo][field] = value
          // 전역 누적 갱신
          if (field === 'speed') { speedSum += value; speedCount += 1 }
        }
      })
    ])

    // 디바이스별 통합 데이터 생성
    const devices = Object.keys(deviceData).map(deviceNo => {
      const battery = deviceData[deviceNo] || {}
      const charging = chargingData[deviceNo] || {}
      const gps = gpsData[deviceNo] || {}
      
      // 공통 함수 사용
      const chargingStatus = getChargingStatus(
        // battery.pack_current || 0,
        // charging.chrg_cable_conn || 0,
        // charging.fast_chrg_port_conn || 0,
        // charging.slow_chrg_port_conn || 0
        battery.pack_current,
        charging.chrg_cable_conn,
        charging.fast_chrg_port_conn,
        charging.slow_chrg_port_conn
      )
      
      // const vehicleStatus = getVehicleStatus(gps.speed || 0, chargingStatus.isCharging)
      const vehicleStatus = getVehicleStatus(gps.speed, chargingStatus.isCharging)
      
      return {
        vehicle_id: deviceNo,
        vehicle_type: battery.car_type,
        // latest_soc: battery.soc || 0,
        // latest_soh: battery.soh || 0,
        // pack_volt: battery.pack_volt || 0,
        // pack_current: battery.pack_current || 0,
        // mod_avg_temp: battery.mod_avg_temp || 0,
        // mod_max_temp: battery.mod_max_temp || 0,
        // mod_min_temp: battery.mod_min_temp || 0,
        // batt_internal_temp: battery.batt_internal_temp || 0,
        // odometer: battery.odometer || 0,
        // speed: gps.speed || 0,
        // lat: gps.lat || null,
        // lng: gps.lng || null,
        // performance_grade: getPerformanceGrade(battery.soh || 0),
        latest_soc: battery.soc,
        latest_soh: battery.soh,
        pack_volt: battery.pack_volt,
        pack_current: battery.pack_current,
        mod_avg_temp: battery.mod_avg_temp,
        mod_max_temp: battery.mod_max_temp,
        mod_min_temp: battery.mod_min_temp,
        batt_internal_temp: battery.batt_internal_temp,
        odometer: battery.odometer,
        speed: gps.speed,
        lat: gps.lat,
        lng: gps.lng,
        performance_grade: getPerformanceGrade(battery.soh),
        last_updated: battery.last_updated,
        vehicle_status: vehicleStatus.vehicleStatus,
        charging_status: chargingStatus.chargingStatus,
        is_charging: chargingStatus.isCharging,
        is_fast_charging: chargingStatus.isFastCharging,
        is_slow_charging: chargingStatus.isSlowCharging,
        is_cable_connected: chargingStatus.isCableConnected,
        is_moving: vehicleStatus.isMoving,
        charging_power: chargingStatus.isCharging ? (battery.pack_volt * battery.pack_current / 1000) : 0, // kW
        avg_efficiency: 0, // TODO: 효율성 계산 로직 추가
        power_w: battery.pack_volt * battery.pack_current // W (부호 유지)
      }
    })

    // devices 배열에서 power_w 누적 계산
    devices.forEach(d => {
      if (d.pack_volt != null && d.pack_current != null && Number.isFinite(d.pack_volt) && Number.isFinite(d.pack_current)) {
        const power = d.pack_volt * d.pack_current
        powerSum += power
        powerCount += 1
      }
    })

    // 전체 통계 계산
    const totalDevices = devices.length
    const chargingDevices = devices.filter(d => d.is_charging === true).length
    const movingDevices = devices.filter(d => d.is_moving === true).length
    const cableOnlyDevices = devices.filter(d => d.is_cable_connected === true && d.is_charging !== true).length
    const disconnectedDevices = devices.filter(d => d.is_cable_connected === false && d.is_charging !== true).length
    const unknownDevices = devices.filter(d => d.is_cable_connected == null).length
    
    // 누적 기반 평균/최대/최소 계산
    const avgSoc = socCount > 0 ? (socSum / socCount) : null
    const avgSoh = sohCount > 0 ? (sohSum / sohCount) : null
    const avgTemp = tempAvgCount > 0 ? (tempAvgSum / tempAvgCount) : null
    const maxTemp = tempMax !== -Infinity ? tempMax : null
    const minTemp = tempMin !== Infinity ? tempMin : null
    const avgVoltage = voltCount > 0 ? (voltSum / voltCount) : null
    const avgCurrent = currentCount > 0 ? (currentSum / currentCount) : null
    const avgOdometer = odometerCount > 0 ? (odometerSum / odometerCount) : null
    const avgSpeed = speedCount > 0 ? (speedSum / speedCount) : null
    const avgPower = powerCount > 0 ? (powerSum / powerCount) : null

    return NextResponse.json({
      success: true,
      data: devices,
      summary: {
        total_devices: totalDevices,
        charging_devices: chargingDevices,
        moving_devices: movingDevices,
        cable_only_devices: cableOnlyDevices,
        disconnected_devices: disconnectedDevices,
        unknown_devices: unknownDevices,
        avg_soc: avgSoc,
        avg_soh: avgSoh,
        avg_temp: avgTemp,
        avg_voltage: avgVoltage,
        avg_current: avgCurrent,
        avg_odometer: avgOdometer,
        avg_speed: avgSpeed,
        avg_power: avgPower,
        max_temp: maxTemp,
        min_temp: minTemp
      },
      car_type: carType,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
