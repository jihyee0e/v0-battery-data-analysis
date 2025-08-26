import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET(request: Request, { params }: { params: { type: string } }) {
  try {
    const vehicleType = params.type

    // 특정 차종의 최신 데이터 조회
    const vehicleQuery = `
      SELECT 
        b.soc, b.soh, b.pack_volt, b.pack_current, b.odometer,
        b.batt_internal_temp, b.max_cell_volt, b.min_cell_volt,
        b.chrg_cable_conn, b.fast_chrg_port_conn, b.slow_chrg_port_conn,
        b.est_chrg_time, b.cumul_energy_chrgd,
        g.speed, g.fuel_pct, g.lat, g.lng, g.mode, g.state
      FROM bms_${vehicleType} b
      JOIN gps_${vehicleType} g ON b.vehicle_id = g.vehicle_id
      WHERE b.created_at = (
        SELECT MAX(created_at) FROM bms_${vehicleType} 
        WHERE vehicle_id = b.vehicle_id
      )
      LIMIT 1
    `

    const result = await pool.query(vehicleQuery)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vehicle data not found" }, { status: 404 })
    }

    const data = result.rows[0]

    return NextResponse.json({
      vehicle_type: vehicleType,
      bms: {
        soc: Number.parseFloat(data.soc),
        soh: Number.parseFloat(data.soh),
        pack_volt: Number.parseFloat(data.pack_volt),
        pack_current: Number.parseFloat(data.pack_current),
        odometer: Number.parseInt(data.odometer),
        batt_internal_temp: Number.parseFloat(data.batt_internal_temp),
        max_cell_volt: Number.parseFloat(data.max_cell_volt),
        min_cell_volt: Number.parseFloat(data.min_cell_volt),
        chrg_cable_conn: Number.parseInt(data.chrg_cable_conn),
        fast_chrg_port_conn: Number.parseInt(data.fast_chrg_port_conn),
        slow_chrg_port_conn: Number.parseInt(data.slow_chrg_port_conn),
        est_chrg_time: Number.parseInt(data.est_chrg_time),
        cumul_energy_chrgd: Number.parseFloat(data.cumul_energy_chrgd),
      },
      gps: {
        speed: Number.parseFloat(data.speed),
        fuel_pct: Number.parseFloat(data.fuel_pct),
        lat: Number.parseFloat(data.lat),
        lng: Number.parseFloat(data.lng),
        mode: data.mode,
        state: data.state,
      },
    })
  } catch (error) {
    console.error("Vehicle API Error:", error)
    return NextResponse.json({ error: "Failed to fetch vehicle data" }, { status: 500 })
  }
}
