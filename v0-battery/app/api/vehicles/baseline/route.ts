import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const carType = searchParams.get('carType');

    let sql = `
      SELECT 
        device_no,
        car_type,
        baseline_soh,
        baseline_efficiency,
        baseline_charging_eff,
        baseline_odometer,
        baseline_max_odometer,
        baseline_data_count
      FROM vehicle_baseline_performance
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (vehicleId) {
      conditions.push('device_no = $' + (params.length + 1));
      params.push(vehicleId);
    }

    if (carType) {
      conditions.push('car_type = $' + (params.length + 1));
      params.push(carType);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY baseline_soh DESC';

    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('기준값 데이터 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '기준값 데이터 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

