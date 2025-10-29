import { NextResponse } from "next/server"
// import { influxDB, org, bucket } from "@/lib/database"

export async function GET() {
  try {
    // InfluxDB 연결 확인
    // const queryApi = influxDB.getQueryApi(org)
    
    return NextResponse.json({
      success: true,
      message: "Date Ranges - InfluxDB 연결 성공",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Date Ranges API Error:", error)
    return NextResponse.json({ 
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}