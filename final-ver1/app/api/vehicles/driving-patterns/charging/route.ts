import { NextRequest, NextResponse } from 'next/server';
import { influxDB, org, bucket } from '@/lib/database';
import { runQuery } from '@/lib/dashboard-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ device_no: string }> }
) {
  try {
    const { device_no: deviceNo } = await params

    // ipynb의 충전 분석 로직을 TypeScript로 변환
    const getChargingAnalysis = async (deviceNo: string) => {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.device_no == "${deviceNo}")
          |> filter(fn: (r) => r._field == "soc" or r._field == "pack_current" or r._field == "pack_volt")
          |> filter(fn: (r) => exists r._value)
          |> sort(columns: ["_time"])
      `

      try {
        const result = await runQuery(query)
        
        // 데이터를 시간순으로 정렬하고 필드별로 분류
        const socData: Array<{time: Date, value: number}> = []
        const currentData: Array<{time: Date, value: number}> = []
        const voltageData: Array<{time: Date, value: number}> = []

        for (const row of result) {
          const time = new Date(row._time)
          const value = Number(row._value)
          
          if (row._field === 'soc') {
            socData.push({ time, value })
          } else if (row._field === 'pack_current') {
            currentData.push({ time, value })
          } else if (row._field === 'pack_volt') {
            voltageData.push({ time, value })
          }
        }

        // 충전 세션 분석
        const chargingSessions: Array<{
          start_time: Date,
          end_time: Date,
          start_soc: number,
          end_soc: number,
          soc_increase: number,
          duration_minutes: number,
          avg_current: number,
          avg_voltage: number,
          energy_kwh: number,
          is_fast_charging: boolean
        }> = []

        let currentSession: any = null
        const CHARGING_THRESHOLD = 0.1 // SOC 증가 임계값
        const FAST_CHARGING_CURRENT = 50 // A

        for (let i = 1; i < socData.length; i++) {
          const prevSoc = socData[i - 1].value
          const currSoc = socData[i].value
          const timeDiff = (socData[i].time.getTime() - socData[i - 1].time.getTime()) / (1000 * 60) // 분

          // 충전 시작 감지 (SOC 증가)
          if (currSoc > prevSoc + CHARGING_THRESHOLD && !currentSession) {
            currentSession = {
              start_time: socData[i - 1].time,
              end_time: socData[i].time,
              start_soc: prevSoc,
              end_soc: currSoc,
              soc_increase: currSoc - prevSoc,
              duration_minutes: timeDiff,
              current_values: [],
              voltage_values: []
            }
          }
          // 충전 중
          else if (currentSession && currSoc > prevSoc) {
            currentSession.end_time = socData[i].time
            currentSession.end_soc = currSoc
            currentSession.soc_increase = currSoc - currentSession.start_soc
            currentSession.duration_minutes += timeDiff
          }
          // 충전 종료 감지
          else if (currentSession && (currSoc <= prevSoc || timeDiff > 30)) {
            // 해당 시간대의 전류/전압 데이터 찾기
            const sessionCurrents = currentData.filter(d => 
              d.time >= currentSession.start_time && d.time <= currentSession.end_time
            )
            const sessionVoltages = voltageData.filter(d => 
              d.time >= currentSession.start_time && d.time <= currentSession.end_time
            )

            const avgCurrent = sessionCurrents.length > 0 
              ? sessionCurrents.reduce((sum, d) => sum + d.value, 0) / sessionCurrents.length 
              : 0
            const avgVoltage = sessionVoltages.length > 0 
              ? sessionVoltages.reduce((sum, d) => sum + d.value, 0) / sessionVoltages.length 
              : 0

            // 에너지 계산 (kWh)
            const energyKwh = (avgCurrent * avgVoltage * currentSession.duration_minutes / 60) / 1000

            chargingSessions.push({
              start_time: currentSession.start_time,
              end_time: currentSession.end_time,
              start_soc: currentSession.start_soc,
              end_soc: currentSession.end_soc,
              soc_increase: currentSession.soc_increase,
              duration_minutes: currentSession.duration_minutes,
              avg_current: avgCurrent,
              avg_voltage: avgVoltage,
              energy_kwh: energyKwh,
              is_fast_charging: avgCurrent > FAST_CHARGING_CURRENT
            })

            currentSession = null
          }
        }

        // 통계 계산
        const totalSessions = chargingSessions.length
        const totalChargingTime = chargingSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
        const totalEnergy = chargingSessions.reduce((sum, s) => sum + s.energy_kwh, 0)
        const fastChargingSessions = chargingSessions.filter(s => s.is_fast_charging).length
        const slowChargingSessions = totalSessions - fastChargingSessions
        const avgChargingEfficiency = totalSessions > 0 ? (totalEnergy / totalSessions) : 0

        return {
          device_no: deviceNo,
          total_sessions: totalSessions,
          total_charging_time_hours: totalChargingTime / 60,
          total_energy_kwh: totalEnergy,
          fast_charging_sessions: fastChargingSessions,
          slow_charging_sessions: slowChargingSessions,
          avg_charging_efficiency: avgChargingEfficiency,
          sessions: chargingSessions
        }
      } catch (error) {
        console.error(`Error processing charging data for ${deviceNo}:`, error)
        return {
          device_no: deviceNo,
          total_sessions: 0,
          total_charging_time_hours: 0,
          total_energy_kwh: 0,
          fast_charging_sessions: 0,
          slow_charging_sessions: 0,
          avg_charging_efficiency: 0,
          sessions: []
        }
      }
    }

    const chargingData = await getChargingAnalysis(deviceNo)

    return NextResponse.json({
      success: true,
      data: chargingData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Individual Vehicle Charging Analysis API Error:', error);
    return NextResponse.json(
      { success: false, error: 'InfluxDB 연결 실패', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}