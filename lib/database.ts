import { Pool, types } from "pg"

// PostgreSQL numeric 타입을 숫자로 파싱하도록 설정
types.setTypeParser(types.builtins.NUMERIC, (value) => {
  return value === null ? null : Number(value)
})

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

export { pool }

// 편의 함수: pool.query 래퍼
export const query = (text: string, params?: any[]) => pool.query(text, params)

// 데이터 타입 정의
export interface VehicleData {
  vehicle_type: "porter2" | "gv60" | "bongo3"
  bms: {
    soc: number
    soh: number
    pack_volt: number
    pack_current: number
    odometer: number
    batt_internal_temp: number
    max_cell_volt: number
    min_cell_volt: number
    chrg_cable_conn: number
    fast_chrg_port_conn: number
    slow_chrg_port_conn: number
    est_chrg_time: number
    cumul_energy_chrgd: number
  }
  gps: {
    speed: number
    fuel_pct: number
    lat: number
    lng: number
    mode: string
    state: string
  }
}

export interface DashboardStats {
  total_vehicles: number
  avg_soc: number
  avg_soh: number
  active_vehicles: number
  charging_vehicles: number
  grade_distribution: {
    A: number
    B: number
    C: number
    D: number
  }
}
