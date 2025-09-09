import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carType = searchParams.get('carType');

    let sql = `
      SELECT 
        car_type,
        vehicle_count,
        actual_avg_soh,
        actual_avg_power,
        actual_avg_temp,
        actual_avg_cell_balance,
        avg_pack_volt,
        avg_pack_current,
        avg_soc,
        estimated_battery_capacity_kwh,
        estimated_range_km,
        actual_efficiency_kmkwh,
        efficiency_degradation_rate,
        battery_life_prediction
      FROM vehicle_spec_comparison_mv
    `;

    const params: any[] = [];
    
    if (carType) {
      sql += ' WHERE car_type = $1';
      params.push(carType);
    }

    sql += ' ORDER BY efficiency_degradation_rate ASC';

    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('제원 비교 데이터 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '제원 비교 데이터 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

