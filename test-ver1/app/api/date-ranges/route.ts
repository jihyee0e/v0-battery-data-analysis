import { NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT 
        TO_CHAR(TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS'), 'YYYY-MM') as date_range
      FROM (
        SELECT msg_time FROM bongo3_bms_data
        UNION ALL
        SELECT msg_time FROM gv60_bms_data
        UNION ALL
        SELECT msg_time FROM porter2_bms_data
      ) all_data
      WHERE msg_time IS NOT NULL
      ORDER BY date_range
    `

    const result = await pool.query(query)
    
    const dateRanges = result.rows.map(row => row.date_range)

    return NextResponse.json({
      success: true,
      data: dateRanges,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Date Ranges API Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch date ranges",
      message: "날짜 범위를 가져오는데 실패했습니다."
    }, { status: 500 })
  }
}
