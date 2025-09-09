import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const months = parseInt(searchParams.get('months') || '12');
    const carType = searchParams.get('carType');

    let sql = `
      SELECT 
        device_no,
        month,
        avg_soh,
        avg_efficiency,
        avg_charging_eff,
        total_distance,
        trip_count,
        soh_change_rate,
        efficiency_change_rate,
        soh_trend,
        efficiency_trend
      FROM long_term_performance_trends_mv
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (vehicleId) {
      conditions.push('device_no = $' + (params.length + 1));
      params.push(vehicleId);
    }

    if (carType) {
      conditions.push('device_no IN (SELECT device_no FROM bongo3_bms_data WHERE car_type = $' + (params.length + 1) + ' UNION ALL SELECT device_no FROM gv60_bms_data WHERE car_type = $' + (params.length + 1) + ' UNION ALL SELECT device_no FROM porter2_bms_data WHERE car_type = $' + (params.length + 1) + ' LIMIT 1)');
      params.push(carType);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY month DESC LIMIT $' + (params.length + 1);
    params.push(months);

    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('성능 추이 데이터 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '성능 추이 데이터 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

