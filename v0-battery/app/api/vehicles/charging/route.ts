import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT 
        device_no,
        session_id,
        charge_start_time,
        charge_end_time,
        start_soc,
        end_soc,
        avg_charging_power,
        soc_per_hour,
        estimated_soh
      FROM charging_session_analysis
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (vehicleId) {
      conditions.push('device_no = $' + (params.length + 1));
      params.push(vehicleId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY charge_start_time DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      pagination: {
        limit,
        offset,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('충전 세션 데이터 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '충전 세션 데이터 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

