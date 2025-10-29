import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

export async function GET(
  request: Request,
  { params }: { params: { device_no: string } }
) {
  try {
    const { device_no: deviceNo } = await params

    // 🔋 배터리 성능 분석 API
    const getBatteryAnalysis = async (deviceNo: string) => {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.device_no == "${deviceNo}")
          |> filter(fn: (r) => 
              r._field == "soc" or 
              r._field == "soh" or 
              r._field == "pack_volt" or 
              r._field == "pack_current" or 
              r._field =~ /^mod_temp/ or         
              r._field == "mod_max_temp" or
              r._field == "mod_min_temp" or
              r._field == "batt_internal_temp" or
              r._field == "odometer"
          )
          |> filter(fn: (r) => exists r._value)
          |> sort(columns: ["_time"], desc: true)
      `

      try {
        const result = await runQuery(query)

        // 필드별 배열 분리
        const socData: Array<{ time: Date; value: number }> = []
        const sohData: Array<{ time: Date; value: number }> = []
        const voltageData: Array<{ time: Date; value: number }> = []
        const currentData: Array<{ time: Date; value: number }> = []
        const tempData: Array<{ time: Date; value: number }> = []
        const tempMaxData: Array<{ time: Date; value: number }> = []
        const tempMinData: Array<{ time: Date; value: number }> = []
        const tempInternalData: Array<{ time: Date; value: number }> = []
        const odometerData: Array<{ time: Date; value: number }> = []

        for (const row of result) {
          const time = new Date(row._time)
          
          // 안전한 숫자 변환 - 모든 타입 처리
          let value: number
          if (row._value === null || row._value === undefined) continue
          
          const strValue = String(row._value).trim()
          if (strValue === '' || strValue === 'null' || strValue === 'undefined') continue
          
          value = parseFloat(strValue)
          
          // NaN이거나 유효하지 않은 값은 스킵
          if (!Number.isFinite(value)) continue

          switch (true) {
            case row._field === "soc":
              socData.push({ time, value }); break;
            case row._field === "soh":
              sohData.push({ time, value }); break;
            case row._field === "pack_volt":
              voltageData.push({ time, value }); break;
            case row._field === "pack_current":
              currentData.push({ time, value }); break;
            case /^mod_temp/.test(row._field): 
              tempData.push({ time, value }); break;
            case row._field === "mod_max_temp":
              tempMaxData.push({ time, value }); break;
            case row._field === "mod_min_temp":
              tempMinData.push({ time, value }); break;
            case row._field === "batt_internal_temp":
              tempInternalData.push({ time, value }); break;
            case row._field === "odometer":
              odometerData.push({ time, value }); break;
          }
        }

        // ✅ 기본 통계 (평균)
        const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
        const avgSoc = avg(socData.map((d) => d.value))
        const avgSoh = avg(sohData.map((d) => d.value))
        const avgVoltage = avg(voltageData.map((d) => d.value))
        const avgCurrent = avg(currentData.map((d) => d.value))
        const avgTemp = tempData.length > 0 ? avg(tempData.map((d) => d.value)) : null
        
        // ✅ 최신값
        const latestSoc = socData.at(-1)?.value ?? null
        const latestSoh = sohData.at(-1)?.value ?? null
        const latestVoltage = voltageData.at(-1)?.value ?? null
        const latestCurrent = currentData.at(-1)?.value ?? null
        const latestTemp = tempData.at(-1)?.value ?? null

        // ✅ 배터리 건강도 평가
        const getBatteryHealth = (soh: number): string => {
          if (soh >= 95) return "우수"
          if (soh >= 85) return "양호"
          if (soh >= 70) return "보통"
          return "주의"
        }

        // ✅ 셀 밸런스 평가 (전압 분산 기준)
        const getCellBalance = (voltages: number[]): string => {
          if (voltages.length < 2) return "N/A"
          const mean = avg(voltages)
          if (mean === null) return "N/A"
          const variance = voltages.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / voltages.length
          const stdDev = Math.sqrt(variance)
          if (stdDev < 0.1) return "양호"
          if (stdDev < 0.5) return "보통"
          return "주의"
        }

        const batteryHealth = avgSoh !== null ? getBatteryHealth(avgSoh) : "N/A"
        const cellBalance = getCellBalance(voltageData.map((d) => d.value))

        // ✅ 온도 범위 분석
        const tempRanges = {
          optimal: tempData.filter((d) => d.value >= 15 && d.value <= 35).length,
          cold: tempData.filter((d) => d.value < 15).length,
          hot: tempData.filter((d) => d.value > 35).length,
        }

        // ✅ SOC 사용 패턴 분석
        const socRanges = {
          high: socData.filter((d) => d.value >= 80).length,
          medium: socData.filter((d) => d.value >= 20 && d.value < 80).length,
          low: socData.filter((d) => d.value < 20).length,
        }

        // 성능 최적화: 모든 데이터를 Map으로 변환 + 헬퍼 함수
        const odometerMap = new Map<number, number>()
        const currentMap = new Map<number, number>()
        const tempMaxMap = new Map<number, number>()
        const tempMinMap = new Map<number, number>()
        const tempInternalMap = new Map<number, number>()
        
        odometerData.forEach(d => odometerMap.set(d.time.getTime(), d.value))
        currentData.forEach(d => currentMap.set(d.time.getTime(), d.value))
        tempMaxData.forEach(d => tempMaxMap.set(d.time.getTime(), d.value))
        tempMinData.forEach(d => tempMinMap.set(d.time.getTime(), d.value))
        tempInternalData.forEach(d => tempInternalMap.set(d.time.getTime(), d.value))
        
        // 시간에 가장 가까운 값을 찾는 헬퍼 함수
        const findNearestValue = (map: Map<number, number>, targetTime: number, tolerance: number = 60000): number => {
          let minDiff = Infinity
          let nearestValue = 0
          
          for (const [time, value] of map.entries()) {
            const diff = Math.abs(time - targetTime)
            if (diff <= tolerance && diff < minDiff) {
              minDiff = diff
              nearestValue = value
            }
          }
          
          return nearestValue
        }

        // ✅ 효율성 계산 (ΔSOC / ΔTime, ΔSOC / ΔDistance)
        let drivingEfficiency = 0
        let chargingEfficiency = 0
        let driveCount = 0
        let chargeCount = 0

        for (let i = 1; i < socData.length; i++) {
          const deltaSoc = socData[i].value - socData[i - 1].value
          const deltaTime = (socData[i].time.getTime() - socData[i - 1].time.getTime()) / 60000 // 분 단위
          const odoPrev = findNearestValue(odometerMap, socData[i - 1].time.getTime())
          const odoCurr = findNearestValue(odometerMap, socData[i].time.getTime())
          const deltaDist = odoCurr - odoPrev
          const current = findNearestValue(currentMap, socData[i].time.getTime())

          if (deltaSoc < 0 && deltaDist > 0) {
            // 주행 효율
            drivingEfficiency += Math.abs(deltaSoc) / (deltaDist > 0 ? deltaDist : 1)
            driveCount++
          } else if (deltaSoc > 0 && current > 5) {
            // 충전 효율
            chargingEfficiency += deltaSoc / (deltaTime > 0 ? deltaTime : 1)
            chargeCount++
          }
        }

        const avgDrivingEfficiency = driveCount > 0 ? drivingEfficiency / driveCount : 0
        const avgChargingEfficiency = chargeCount > 0 ? chargingEfficiency / chargeCount : 0

        // ✅ 온도 분석 (평균, 최대, 최소, 편차)
        const avgTempMax = avg(tempMaxData.map((d) => d.value))
        const avgTempMin = avg(tempMinData.map((d) => d.value))
        const avgTempInternal = avg(tempInternalData.map((d) => d.value))
        const tempDeviation = avgTempMax !== null && avgTempMin !== null && avgTempMax > 0 && avgTempMin > 0 ? avgTempMax - avgTempMin : null
        
        // 온도 데이터를 시계열로 정렬 (시각화용) - Map 사용
        const tempTimeseries = tempData.map((d) => ({
          time: d.time,
          temp: d.value,
          tempMax: findNearestValue(tempMaxMap, d.time.getTime()) || d.value,
          tempMin: findNearestValue(tempMinMap, d.time.getTime()) || d.value,
          tempInternal: findNearestValue(tempInternalMap, d.time.getTime()) || d.value
        })).sort((a, b) => a.time.getTime() - b.time.getTime())

        // SOH 시계열 데이터 (수명 예측용)
        const sohTimeseries = sohData
          .filter(d => d.value > 0 && d.value <= 100)
          .map(d => ({
            time: d.time,
            soh: d.value
          }))
          .sort((a, b) => a.time.getTime() - b.time.getTime())

        // 온도 이벤트 감지 (이상 온도)
        const tempAnomalies = tempTimeseries.filter(d => 
          (d.tempMax - d.tempMin) > 5 || // 편차 5도 이상
          d.temp > 50 || // 평균 온도 50도 이상
          d.temp < -5 // 평균 온도 -5도 이하
        )

        // ✅ 상관관계 계산 (SOC vs 온도, 전류, SOH)
        function correlation(x: number[], y: number[]) {
          const n = Math.min(x.length, y.length)
          if (n < 2) return 0
          const meanX = avg(x)
          const meanY = avg(y)
          if (meanX === null || meanY === null) return 0
          const meanXNum = meanX as number
          const meanYNum = meanY as number
          const num = x
            .slice(0, n)
            .map((xi, i) => (xi - meanXNum) * (y[i] - meanYNum))
            .reduce((a, b) => a + b, 0)
          const den = Math.sqrt(
            x.map((xi) => Math.pow(xi - meanXNum, 2)).reduce((a, b) => a + b, 0) *
              y.map((yi) => Math.pow(yi - meanYNum, 2)).reduce((a, b) => a + b, 0)
          )
          return den === 0 ? 0 : num / den
        }

        const corrSocTemp = correlation(socData.map((d) => d.value), tempData.map((d) => d.value))
        const corrSocCurrent = correlation(socData.map((d) => d.value), currentData.map((d) => d.value))
        const corrSocSoh = correlation(socData.map((d) => d.value), sohData.map((d) => d.value))

        // ✅ 결과 반환
        return {
          device_no: deviceNo,
          // 평균값
          avg_soc: avgSoc,
          avg_soh: avgSoh,
          avg_voltage: avgVoltage,
          avg_current: avgCurrent,
          avg_temperature: avgTemp,
          // 최신값
          latest_soc: latestSoc,
          latest_soh: latestSoh,
          latest_voltage: latestVoltage,
          latest_current: latestCurrent,
          latest_temperature: latestTemp,
          // 평가
          battery_health: batteryHealth,
          cell_balance: cellBalance,
          // 효율성 분석
          efficiency: {
            avg_driving_efficiency: avgDrivingEfficiency, // ΔSOC / km
            avg_charging_efficiency: avgChargingEfficiency, // ΔSOC / min
          },
          // 상관분석
          correlations: {
            soc_temp: corrSocTemp,
            soc_current: corrSocCurrent,
            soc_soh: corrSocSoh,
          },
          // 패턴 분석
          temperature_ranges: tempRanges,
          soc_ranges: socRanges,
          // 온도 분석 (추가)
          temperature_analysis: {
            avg_temp_max: avgTempMax,
            avg_temp_min: avgTempMin,
            avg_temp_internal: avgTempInternal,
            temp_deviation: tempDeviation,
            timeseries: tempTimeseries.slice(0, 1000), // 최대 1000개만 반환
            anomalies: tempAnomalies.slice(0, 100), // 최대 100개만 반환
            anomaly_count: tempAnomalies.length
          },
          // SOH 시계열 (수명 예측용)
          soh_timeseries: sohTimeseries.slice(0, 1000), // 최대 1000개만 반환
          // 데이터 수
          data_points: {
            soc: socData.length,
            soh: sohData.length,
            voltage: voltageData.length,
            current: currentData.length,
            temperature: tempData.length,
            odometer: odometerData.length,
          },
        }
      } catch (error) {
        console.error(`Error processing battery data for ${deviceNo}:`, error)
        return {
          device_no: deviceNo,
          error: "데이터 처리 오류",
        }
      }
    }

    const batteryData = await getBatteryAnalysis(deviceNo)

    return NextResponse.json({
      success: true,
      data: batteryData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Individual Vehicle Battery Analysis API Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "InfluxDB 연결 실패",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
