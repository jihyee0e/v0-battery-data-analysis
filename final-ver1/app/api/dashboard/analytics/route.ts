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
        |> sort(columns: ["_time"], desc: true)
    `

    // 충전 상태 데이터 가져오기
    const chargingStatusQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_bms")
        ${carType !== 'ALL' ? `|> filter(fn: (r) => r.car_type == "${carType}")` : ''}
        |> filter(fn: (r) => r._field == "chrg_cable_conn" or r._field == "fast_chrg_port_conn" or r._field == "slow_chrg_port_conn")
        |> filter(fn: (r) => exists r._value)
        |> sort(columns: ["_time"], desc: true)
    `

    // GPS 데이터 가져오기
    const latestGpsQuery = `
      from(bucket: "${bucket}")
        |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
        |> filter(fn: (r) => r._measurement == "aicar_gps")
        ${carType !== 'ALL' ? `|> filter(fn: (r) => r.car_type == "${carType}")` : ''}
        |> filter(fn: (r) => r._field == "speed" or r._field == "lat" or r._field == "lng")
        |> filter(fn: (r) => exists r._value)
        |> sort(columns: ["_time"], desc: true)
    `
    // 미리 기초 객체 생성
    const deviceData: Record<string, any> = {}
    const chargingData: Record<string, any> = {}
    const gpsData: Record<string, any> = {}

    // 스트리밍 방식으로 row 처리
    await Promise.all([
      runQuery(latestBatteryQuery, (row) => {
        const deviceNo = row.device_no
        const field = row._field
        const value = Number(row._value)
        const time = row._time
        const temp_fields = ['mod_avg_temp', 'mod_max_temp', 'mod_min_temp']

        if (!deviceData[deviceNo]) {
          deviceData[deviceNo] = { device_no: deviceNo, car_type: row.car_type, last_updated: time }
        }
        if (Number.isFinite(value)) {
          // 온도 필드
          if (temp_fields.includes(field)) {
            deviceData[deviceNo][field] = value
          } else if (['soc', 'soh', 'pack_volt', 'pack_current', 'odometer'].includes(field)) {
            deviceData[deviceNo][field] = value
          }
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
        if (Number.isFinite(value)) gpsData[deviceNo][field] = value
      })
    ])

    // 디바이스별 통합 데이터 생성
    const devices = Object.keys(deviceData).map(deviceNo => {
      const battery = deviceData[deviceNo] || {}
      const charging = chargingData[deviceNo] || {}
      const gps = gpsData[deviceNo] || {}
      
      // 공통 함수 사용
      const chargingStatus = getChargingStatus(
        battery.pack_current || 0,
        charging.chrg_cable_conn || 0,
        charging.fast_chrg_port_conn || 0,
        charging.slow_chrg_port_conn || 0
      )
      
      const vehicleStatus = getVehicleStatus(gps.speed || 0, chargingStatus.isCharging)
      
      return {
        vehicle_id: deviceNo,
        vehicle_type: battery.car_type,
        latest_soc: battery.soc || 0,
        latest_soh: battery.soh || 0,
        pack_volt: battery.pack_volt || 0,
        pack_current: battery.pack_current || 0,
        mod_avg_temp: battery.mod_avg_temp || 0,
        mod_max_temp: battery.mod_max_temp || 0,
        mod_min_temp: battery.mod_min_temp || 0,
        batt_internal_temp: battery.batt_internal_temp || 0,
        odometer: battery.odometer || 0,
        speed: gps.speed || 0,
        lat: gps.lat || null,
        lng: gps.lng || null,
        performance_grade: getPerformanceGrade(battery.soh || 0),
        last_updated: battery.last_updated,
        vehicle_status: vehicleStatus.vehicleStatus,
        charging_status: chargingStatus.chargingStatus,
        is_charging: chargingStatus.isCharging,
        is_fast_charging: chargingStatus.isFastCharging,
        is_slow_charging: chargingStatus.isSlowCharging,
        is_moving: vehicleStatus.isMoving,
        charging_power: chargingStatus.isCharging ? (battery.pack_volt * battery.pack_current / 1000) : 0, // kW
        avg_efficiency: 0, // TODO: 효율성 계산 로직 추가
        power_w: battery.pack_volt * Math.abs(battery.pack_current) // W
      }
    })

    // 전체 통계 계산
    const totalDevices = devices.length
    const chargingDevices = devices.filter(d => d.is_charging).length
    const movingDevices = devices.filter(d => d.is_moving).length
    const avgSoc = devices.length > 0 ? devices.reduce((sum, d) => sum + d.latest_soc, 0) / devices.length : 0
    const avgSoh = devices.length > 0 ? devices.reduce((sum, d) => sum + d.latest_soh, 0) / devices.length : 0
    // 온도 통계 계산 (모듈 온도 기준) - null/NaN 그대로 유지
    const avgTemp = devices.length > 0 ? devices.reduce((sum, d) => sum + d.mod_avg_temp, 0) / devices.length : 0
    const maxTemp = devices.length > 0 ? Math.max(...devices.map(d => d.mod_max_temp)) : 0
    const minTemp = devices.length > 0 ? Math.min(...devices.map(d => d.mod_min_temp)) : 0
    
    const avgVoltage = devices.length > 0 ? devices.reduce((sum, d) => sum + d.pack_volt, 0) / devices.length : 0
    const avgCurrent = devices.length > 0 ? devices.reduce((sum, d) => sum + Math.abs(d.pack_current), 0) / devices.length : 0
    const avgOdometer = devices.length > 0 ? devices.reduce((sum, d) => sum + d.odometer, 0) / devices.length : 0
    const avgSpeed = devices.length > 0 ? devices.reduce((sum, d) => sum + (d.speed || 0), 0) / devices.length : 0
    const avgPower = devices.length > 0 ? devices.reduce((sum, d) => sum + d.power_w, 0) / devices.length : 0

    return NextResponse.json({
      success: true,
      data: devices,
      summary: {
        total_devices: totalDevices,
        charging_devices: chargingDevices,
        moving_devices: movingDevices,
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
    console.error("Dashboard Analytics API Error:", error)
    return NextResponse.json({ 
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
