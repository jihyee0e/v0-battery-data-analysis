import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

export async function GET(
  request: Request,
  { params }: { params: { device_no: string } }
) {
  try {
    const { device_no: deviceNo } = await params

    // 구간별(주행/정차/충전) 통합 분석
    const getSegmentAnalysis = async (deviceNo: string) => {
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
              r._field == "odometer"
          )
          |> filter(fn: (r) => exists r._value)
          |> sort(columns: ["_time"], desc: true)
      `

      try {
        const result = await runQuery(query)

        // 필드별 분리
        const socData: Array<{time: Date, value: number}> = []
        const sohData: Array<{time: Date, value: number}> = []
        const voltageData: Array<{time: Date, value: number}> = []
        const currentData: Array<{time: Date, value: number}> = []
        const odometerData: Array<{time: Date, value: number}> = []

        for (const row of result) {
          const time = new Date(row._time)
          const value = Number(row._value)
          switch (row._field) {
            case "soc":         socData.push({ time, value }); break
            case "soh":         sohData.push({ time, value }); break
            case "pack_volt":   voltageData.push({ time, value }); break
            case "pack_current":currentData.push({ time, value }); break
            case "odometer":    odometerData.push({ time, value }); break
          }
        }

        // 계절 판별
        const getSeason = (date: Date): string => {
          const m = date.getMonth() + 1
          if (m >= 3 && m <= 5) return "봄"
          if (m >= 6 && m <= 8) return "여름"
          if (m >= 9 && m <= 11) return "가을"
          return "겨울"
        }

        // 최근접 값(±60초) 찾기
        const nearestWithin = (
          arr: Array<{time: Date, value: number}>,
          t: Date,
          windowMs = 60_000
        ): number => {
          let best: number | null = null
          let bestDt = windowMs + 1
          for (const d of arr) {
            const dt = Math.abs(d.time.getTime() - t.getTime())
            if (dt <= windowMs && dt < bestDt) {
              best = d.value; bestDt = dt
            }
          }
          return best ?? 0
        }

        // 월별 그룹(유지) — 단, 판정 기준은 강화
        const monthlySoc: Record<string, Array<{time: Date, value: number}>> = {}
        for (const s of socData) {
          const key = `${s.time.getFullYear()}-${String(s.time.getMonth()+1).padStart(2,"0")}`
          ;(monthlySoc[key] ||= []).push(s)
        }

        const segments: Array<{
          main_activity: string,
          sub_activity: string,
          season: string,
          start_time: Date,
          end_time: Date,
          soh: number,
          pack_volt: number,
          pack_current: number,
          soc_start: number,
          soc_end: number,
          soc_change: number,
          distance_km: number,
          energy_kwh: number
        }> = []

        // 거리 계산 보정값
        const RESET_THRESHOLD = -50   // km (OD 리셋)
        const NOISE_THRESHOLD = -1    // km (작은 음수는 노이즈)
        const SHORT_DISTANCE_THRESHOLD = 100 // km (장/단거리 기준)
        const CHG_SOC_THRESHOLD = 0.1 // %
        const CHG_CURR_START = 5      // A (충전 시작)
        const CHG_CURR_END = 1        // A (충전 종료)
        const SOC_NOISE_EPS = 0.05    // %
        const MIN_SEG_MINUTES = 2     // 분 (최소 구간 지속시간)
        const PARKING_TIME_THRESHOLD = 5 // 분 (주차 판정 기준)

        // 월별 분석
        for (const monthKey of Object.keys(monthlySoc)) {
          const series = monthlySoc[monthKey].sort((a,b)=>a.time.getTime()-b.time.getTime())
          if (series.length < 2) continue

          for (let i = 1; i < series.length; i++) {
            const prev = series[i-1]
            const curr = series[i]
            const startTime = prev.time
            const endTime = curr.time

            const socStart = prev.value
            const socEnd = curr.value
            const socChange = socEnd - socStart

            const timeDiffMs = endTime.getTime() - startTime.getTime()
            const timeDiffMin = timeDiffMs / 60000

            // 🔹 SOC 노이즈(±0.05%) 무시
            if (Math.abs(socChange) < SOC_NOISE_EPS) continue
            // 🔹 최소 지속시간(2분) 미만 무시
            if (timeDiffMin < MIN_SEG_MINUTES) continue

            // 해당 구간의 주행거리 계산 (구간 내 OD 시계열 사용)
            const segmentOdo = odometerData
              .filter(d => d.time.getTime() >= startTime.getTime() && d.time.getTime() <= endTime.getTime())
              .sort((a,b)=>a.time.getTime()-b.time.getTime())

            let distance = 0
            if (segmentOdo.length > 1) {
              for (let k = 1; k < segmentOdo.length; k++) {
                const diff = segmentOdo[k].value - segmentOdo[k-1].value
                if (diff > 0) {
                  distance += diff
                } else if (diff <= NOISE_THRESHOLD && diff > RESET_THRESHOLD) {
                  // 작은 음수 노이즈 무시
                  continue
                } else if (diff <= RESET_THRESHOLD) {
                  // 리셋 감지 → 해당 구간은 여기까지
                  break
                }
              }
            } else {
              // 구간 양 끝의 최근접 OD로 근사 (±60초)
              const odoStart = nearestWithin(odometerData, startTime, 60_000)
              const odoEnd   = nearestWithin(odometerData, endTime, 60_000)
              distance = Math.max(0, odoEnd - odoStart)
            }

            // 동기화(±60초)로 전압/전류/soh 근사
            const vStart = nearestWithin(voltageData, startTime)
            const vEnd   = nearestWithin(voltageData, endTime)
            const iStart = nearestWithin(currentData, startTime)
            const iEnd   = nearestWithin(currentData, endTime)
            const soh    = nearestWithin(sohData, startTime)

            const avgVolt = (vStart + vEnd) / 2
            // const avgCurr = (iStart + iEnd) / 2
            const segmentCurr = currentData
              .filter(d => d.time >= startTime && d.time <= endTime)
              .map(d => d.value)
            const avgCurr = segmentCurr.length
              ? segmentCurr.sort((a,b)=>a-b)[Math.floor(segmentCurr.length/2)] // median
              : (nearestWithin(currentData, startTime) + nearestWithin(currentData, endTime)) / 2
            // 에너지(kWh) 근사: 부호는 ΔSOC 기준 (충전 +, 방전 -)
            const durationHours = timeDiffMs / 3_600_000
            const rawEnergyKwh = (avgVolt * avgCurr * durationHours) / 1000
            // const energyKwh = (socChange >= 0) ? Math.abs(rawEnergyKwh) : -Math.abs(rawEnergyKwh)
            const energyKwh = rawEnergyKwh

            // 🔸 활동 판정
            let mainActivity = "정차"
            let subActivity = "정지"

            // if (distance > 0 && socChange < 0) {
            //   mainActivity = "주행"
            //   subActivity = (distance >= SHORT_DISTANCE_THRESHOLD) ? "장거리" : "단거리"
            // }

            const DRIVE_MIN_DISTANCE = 0.05 // 50m 이상 움직여야 주행으로 간주
            if (distance > DRIVE_MIN_DISTANCE && socChange < 0) {
              mainActivity = "주행"
              subActivity = (distance >= SHORT_DISTANCE_THRESHOLD) ? "장거리" : "단거리"
            }
            // 충전: SOC 증가가 0.1% 이상 **그리고** 전류가 양(>5A)
            else if (socChange > CHG_SOC_THRESHOLD && avgCurr < -CHG_CURR_START) {
              mainActivity = "정차"
              subActivity = "충전"
            }
            // 정차 중: 시간에 따라 정지/주차 구분
            else if (mainActivity === "정차" && subActivity === "정지") {
              if (timeDiffMin >= PARKING_TIME_THRESHOLD) {
                subActivity = "주차"
              }
            }
            // (참고) 충전 종료 신호는 세션 합치기 단계에서 쓰지만,
            // 여기선 개별 세그먼트 판정이므로 전류<=1A이거나 SOC 정체는 '정지'로 남김

            const season = getSeason(startTime)

            segments.push({
              main_activity: mainActivity,
              sub_activity: subActivity,
              season,
              start_time: startTime,
              end_time: endTime,
              soh,
              pack_volt: avgVolt,
              pack_current: avgCurr,
              soc_start: socStart,
              soc_end: socEnd,
              soc_change: socChange,
              distance_km: distance,
              energy_kwh: energyKwh
            })
          }
        }

        // 시간순 정렬
        segments.sort((a,b)=>a.start_time.getTime() - b.start_time.getTime())

        // segments의 첫 번째와 마지막 사용
        const firstTime = segments.length > 0 ? segments[0].start_time : new Date()
        const lastTime  = segments.length > 0 ? segments[segments.length-1].end_time : new Date()

        // 전체 주행거리 (범위 차)
        const totalDistance = odometerData.length
          ? Math.max(...odometerData.map(d=>d.value)) - Math.min(...odometerData.map(d=>d.value))
          : 0

        const drivingType = totalDistance >= SHORT_DISTANCE_THRESHOLD ? "장거리" : "단거리"

        return {
          device_no: deviceNo,
          segments,
          device_period: {
            start_time: firstTime,
            end_time: lastTime,
            total_days: Math.ceil((lastTime.getTime() - firstTime.getTime()) / 86_400_000)
          },
          driving_summary: {
            total_distance: totalDistance,
            driving_type: drivingType,
            total_segments: segments.length
          },
          summary_stats: {
            total_charging_sessions: segments.filter(s => s.sub_activity === "충전").length,
            total_driving_sessions:  segments.filter(s => s.main_activity === "주행").length,
            total_idle_sessions:     segments.filter(s => s.main_activity === "정차" && s.sub_activity === "정지").length,
            total_parking_sessions:  segments.filter(s => s.main_activity === "정차" && s.sub_activity === "주차").length
          }
        }
      } catch (error) {
        console.error(`Error processing segment data for ${deviceNo}:`, error)
        return {
          device_no: deviceNo,
          segments: [],
          device_period: { start_time: null, end_time: null, total_days: 0 },
          driving_summary: { total_distance: 0, driving_type: "단거리", total_segments: 0 },
          summary_stats: { total_charging_sessions: 0, total_driving_sessions: 0, total_idle_sessions: 0, total_parking_sessions: 0 }
        }
      }
    }

    const segmentData = await getSegmentAnalysis(deviceNo)

    return NextResponse.json({
      success: true,
      data: segmentData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Individual Vehicle Segment Analysis API Error:", error)
    return NextResponse.json({
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}