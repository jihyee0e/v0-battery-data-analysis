import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ device_no: string }> }
) {
  try {
    const { device_no: deviceNo } = await params

    // ipynb의 배터리 분석 로직을 TypeScript로 변환
    const getBatteryAnalysis = async (deviceNo: string) => {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.device_no == "${deviceNo}")
          |> filter(fn: (r) => r._field == "soc" or r._field == "soh" or r._field == "pack_volt" or r._field == "pack_current" or r._field == "mod_avg_temp")
          |> filter(fn: (r) => exists r._value)
          |> sort(columns: ["_time"])
      `

      try {
        const result = await runQuery(query)
        
        // 데이터를 시간순으로 정렬하고 필드별로 분류
        const socData: Array<{time: Date, value: number}> = []
        const sohData: Array<{time: Date, value: number}> = []
        const voltageData: Array<{time: Date, value: number}> = []
        const currentData: Array<{time: Date, value: number}> = []
        const tempData: Array<{time: Date, value: number}> = []

        for (const row of result) {
          const time = new Date(row._time)
          const value = Number(row._value)
          
          if (row._field === 'soc') {
            socData.push({ time, value })
          } else if (row._field === 'soh') {
            sohData.push({ time, value })
          } else if (row._field === 'pack_volt') {
            voltageData.push({ time, value })
          } else if (row._field === 'pack_current') {
            currentData.push({ time, value })
          } else if (row._field === 'mod_avg_temp') {
            tempData.push({ time, value })
          }
        }

        // 배터리 통계 계산
        const avgSoc = socData.length > 0 ? socData.reduce((sum, d) => sum + d.value, 0) / socData.length : 0
        const avgSoh = sohData.length > 0 ? sohData.reduce((sum, d) => sum + d.value, 0) / sohData.length : 0
        const avgVoltage = voltageData.length > 0 ? voltageData.reduce((sum, d) => sum + d.value, 0) / voltageData.length : 0
        const avgCurrent = currentData.length > 0 ? currentData.reduce((sum, d) => sum + d.value, 0) / currentData.length : 0
        const avgTemp = tempData.length > 0 ? tempData.reduce((sum, d) => sum + d.value, 0) / tempData.length : 0

        // 최신 값들
        const latestSoc = socData.length > 0 ? socData[socData.length - 1].value : 0
        const latestSoh = sohData.length > 0 ? sohData[sohData.length - 1].value : 0
        const latestVoltage = voltageData.length > 0 ? voltageData[voltageData.length - 1].value : 0
        const latestCurrent = currentData.length > 0 ? currentData[currentData.length - 1].value : 0
        const latestTemp = tempData.length > 0 ? tempData[tempData.length - 1].value : 0

        // 배터리 건강도 평가
        const getBatteryHealth = (soh: number): string => {
          if (soh >= 95) return '우수'
          if (soh >= 85) return '양호'
          if (soh >= 70) return '보통'
          return '주의'
        }

        // 셀 밸런스 평가 (전압 분산 기준)
        const getCellBalance = (voltages: number[]): string => {
          if (voltages.length < 2) return 'N/A'
          const variance = voltages.reduce((sum, v) => sum + Math.pow(v - avgVoltage, 2), 0) / voltages.length
          const stdDev = Math.sqrt(variance)
          if (stdDev < 0.1) return '양호'
          if (stdDev < 0.5) return '보통'
          return '주의'
        }

        const batteryHealth = getBatteryHealth(avgSoh)
        const cellBalance = getCellBalance(voltageData.map(d => d.value))

        // 온도 범위 분석
        const tempRanges = {
          optimal: tempData.filter(d => d.value >= 15 && d.value <= 35).length,
          cold: tempData.filter(d => d.value < 15).length,
          hot: tempData.filter(d => d.value > 35).length
        }

        // SOC 사용 패턴 분석
        const socRanges = {
          high: socData.filter(d => d.value >= 80).length,
          medium: socData.filter(d => d.value >= 20 && d.value < 80).length,
          low: socData.filter(d => d.value < 20).length
        }

        return {
          device_no: deviceNo,
          // 평균값들
          avg_soc: avgSoc,
          avg_soh: avgSoh,
          avg_voltage: avgVoltage,
          avg_current: avgCurrent,
          avg_temperature: avgTemp,
          // 최신값들
          latest_soc: latestSoc,
          latest_soh: latestSoh,
          latest_voltage: latestVoltage,
          latest_current: latestCurrent,
          latest_temperature: latestTemp,
          // 평가
          battery_health: batteryHealth,
          cell_balance: cellBalance,
          // 패턴 분석
          temperature_ranges: tempRanges,
          soc_ranges: socRanges,
          // 데이터 포인트 수
          data_points: {
            soc: socData.length,
            soh: sohData.length,
            voltage: voltageData.length,
            current: currentData.length,
            temperature: tempData.length
          }
        }
      } catch (error) {
        console.error(`Error processing battery data for ${deviceNo}:`, error)
        return {
          device_no: deviceNo,
          avg_soc: 0,
          avg_soh: 0,
          avg_voltage: 0,
          avg_current: 0,
          avg_temperature: 0,
          latest_soc: 0,
          latest_soh: 0,
          latest_voltage: 0,
          latest_current: 0,
          latest_temperature: 0,
          battery_health: 'N/A',
          cell_balance: 'N/A',
          temperature_ranges: { optimal: 0, cold: 0, hot: 0 },
          soc_ranges: { high: 0, medium: 0, low: 0 },
          data_points: { soc: 0, soh: 0, voltage: 0, current: 0, temperature: 0 }
        }
      }
    }

    const batteryData = await getBatteryAnalysis(deviceNo)

    return NextResponse.json({
      success: true,
      data: batteryData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Individual Vehicle Battery Analysis API Error:", error)
    return NextResponse.json({
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
