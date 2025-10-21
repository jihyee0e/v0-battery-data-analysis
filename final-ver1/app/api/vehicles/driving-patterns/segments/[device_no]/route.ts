import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ device_no: string }> }
) {
  try {
    const { device_no: deviceNo } = await params

    // ipynb의 구간별 통계 분석 로직을 TypeScript로 변환
    const getSegmentAnalysis = async (deviceNo: string) => {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r.device_no == "${deviceNo}")
          |> filter(fn: (r) => r._field == "soc" or r._field == "soh" or r._field == "pack_volt" or r._field == "pack_current" or r._field == "odometer")
          |> filter(fn: (r) => exists r._value)
          |> sort(columns: ["_time"])
      `

      try {
        const result = await runQuery(query)
        
        // 디버깅: 실제 조회된 데이터 확인
        console.log(`Device ${deviceNo} - Total records: ${result.length}`)
        if (result.length > 0) {
          const firstTime = new Date(result[0]._time)
          const lastTime = new Date(result[result.length - 1]._time)
          console.log(`Data range: ${firstTime.toISOString()} to ${lastTime.toISOString()}`)
        }
        
        // 데이터를 시간순으로 정렬하고 필드별로 분류
        const socData: Array<{time: Date, value: number}> = []
        const sohData: Array<{time: Date, value: number}> = []
        const voltageData: Array<{time: Date, value: number}> = []
        const currentData: Array<{time: Date, value: number}> = []
        const odometerData: Array<{time: Date, value: number}> = []

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
          } else if (row._field === 'odometer') {
            odometerData.push({ time, value })
          }
        }

        // 구간 분석 (계절, 주행/충전/정차 구분)
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

        // 계절 판별 함수
        const getSeason = (date: Date): string => {
          const month = date.getMonth() + 1
          if (month >= 3 && month <= 5) return '봄'
          if (month >= 6 && month <= 8) return '여름'
          if (month >= 9 && month <= 11) return '가을'
          return '겨울'
        }

        // 구간 타입 판별 함수
        const getSegmentTypes = (socChange: number, current: number, distance: number) => {
          // 주요 활동 결정
          let mainActivity: string
          let subActivity: string
          
          if (distance > 0) {
            // 주행이 있는 경우
            mainActivity = '주행'
            // 거리 기준으로 단거리/장거리 구분
            const SHORT_DISTANCE_THRESHOLD = 50 // km
            subActivity = distance >= SHORT_DISTANCE_THRESHOLD ? '장거리' : '단거리'
          } else {
            // 정차인 경우
            mainActivity = '정차'
            // SOC 변화로 충전 여부 판단
            if (socChange > 0.05) {
              subActivity = '충전'
            } else {
              subActivity = '정지'
            }
          }
          
          return { mainActivity, subActivity }
        }

        // 월별로 데이터를 그룹화하여 각 월의 구간을 분석
        const monthlyData: { [key: string]: Array<{time: Date, value: number}> } = {}
        
        // SOC 데이터를 월별로 분류
        socData.forEach(soc => {
          const monthKey = `${soc.time.getFullYear()}-${String(soc.time.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = []
          }
          monthlyData[monthKey].push(soc)
        })
        
        // 각 월별로 구간 분석
        Object.keys(monthlyData).forEach(monthKey => {
          const monthSocData = monthlyData[monthKey]
          
          for (let i = 1; i < monthSocData.length; i++) {
            const prevSoc = monthSocData[i - 1].value
            const currSoc = monthSocData[i].value
            const socChange = currSoc - prevSoc
            const timeDiff = monthSocData[i].time.getTime() - monthSocData[i - 1].time.getTime()
            
            // 구간 시작/끝에 가장 가까운 odometer 값 찾기
            const nearestOdo = (t: Date) =>
              odometerData.find(d => Math.abs(d.time.getTime() - t.getTime()) < 5 * 60 * 1000)?.value ?? 0
            
            const odoStart = nearestOdo(monthSocData[i - 1].time)
            const odoEnd = nearestOdo(monthSocData[i].time)
            const odoDelta = Math.max(0, odoEnd - odoStart)
            
            // 의미있는 변화가 있는 구간만 분석 (SOC 변화 > 0.05% 또는 시간 차이 > 3분 또는 거리 변화 > 0)
            if (Math.abs(socChange) > 0.05 || timeDiff > 3 * 60 * 1000 || odoDelta > 0) {
              const startTime = monthSocData[i - 1].time
              const endTime = monthSocData[i].time
              const season = getSeason(startTime)
              
              // 해당 시간대의 다른 데이터 찾기
              const startSoh = sohData.find(d => Math.abs(d.time.getTime() - startTime.getTime()) < 5 * 60 * 1000)?.value || 0
              const startVolt = voltageData.find(d => Math.abs(d.time.getTime() - startTime.getTime()) < 5 * 60 * 1000)?.value || 0
              const startCurrent = currentData.find(d => Math.abs(d.time.getTime() - startTime.getTime()) < 5 * 60 * 1000)?.value || 0
              
              const endVolt = voltageData.find(d => Math.abs(d.time.getTime() - endTime.getTime()) < 5 * 60 * 1000)?.value || 0
              const endCurrent = currentData.find(d => Math.abs(d.time.getTime() - endTime.getTime()) < 5 * 60 * 1000)?.value || 0
              
              // 주행거리 계산 (ipynb 로직 적용)
              const RESET_THRESHOLD = -50   // km
              const NOISE_THRESHOLD = -1    // km
              
              // 해당 구간의 odometer 데이터만 필터링
              const segmentOdometerData = odometerData.filter(d => 
                d.time.getTime() >= startTime.getTime() && d.time.getTime() <= endTime.getTime()
              ).sort((a, b) => a.time.getTime() - b.time.getTime())
              
              let distance = 0
              if (segmentOdometerData.length > 1) {
                for (let i = 1; i < segmentOdometerData.length; i++) {
                  const diff = segmentOdometerData[i].value - segmentOdometerData[i - 1].value
                  
                  if (diff > 0) {
                    // 양수 차이만 주행거리로 합산
                    distance += diff
                  } else if (diff <= NOISE_THRESHOLD && diff > RESET_THRESHOLD) {
                    // 작은 음수 → 노이즈 무시
                    continue
                  } else if (diff <= RESET_THRESHOLD) {
                    // 큰 음수 → 리셋 이벤트 (주행거리 계산 중단)
                    break
                  }
                }
              }
              
              // 에너지 계산 (충전/방전)
              const avgVoltage = (startVolt + endVolt) / 2
              const avgCurrent = (startCurrent + endCurrent) / 2
              const durationHours = timeDiff / (1000 * 60 * 60)
              // 부호는 ΔSOC 기준으로 정의: 충전(ΔSOC>0)=+, 방전(ΔSOC<0)=-
              const rawEnergyKwh = (avgVoltage * avgCurrent * durationHours) / 1000
              let energyKwh = Math.abs(rawEnergyKwh)
              if (socChange < 0) {
                energyKwh = -energyKwh
              }
              
              const { mainActivity, subActivity } = getSegmentTypes(socChange, avgCurrent, distance)
              
              segments.push({
                main_activity: mainActivity,
                sub_activity: subActivity,
                season,
                start_time: startTime,
                end_time: endTime,
                soh: startSoh,
                pack_volt: avgVoltage,
                pack_current: avgCurrent,
                soc_start: prevSoc,
                soc_end: currSoc,
                soc_change: socChange,
                distance_km: distance,
                energy_kwh: energyKwh
              })
            }
          }
        })
        
        // 시간순으로 정렬
        segments.sort((a, b) => a.start_time.getTime() - b.start_time.getTime())

        // 디바이스 전체 기간 계산
        const firstTime = socData.length > 0 ? socData[0].time : new Date()
        const lastTime = socData.length > 0 ? socData[socData.length - 1].time : new Date()
        
        // 전체 주행거리 계산
        const totalDistance = odometerData.length > 0 ? 
          Math.max(...odometerData.map(d => d.value)) - Math.min(...odometerData.map(d => d.value)) : 0
        
        // 주행거리 기준으로 장거리/단거리 구분
        const LONG_DISTANCE_THRESHOLD = 100 // km
        const drivingType = totalDistance >= LONG_DISTANCE_THRESHOLD ? '장거리' : '단거리'

        return {
          device_no: deviceNo,
          segments: segments,
          // 디바이스 전체 기간
          device_period: {
            start_time: firstTime,
            end_time: lastTime,
            total_days: Math.ceil((lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60 * 24))
          },
          // 전체 주행 정보
          driving_summary: {
            total_distance: totalDistance,
            driving_type: drivingType,
            total_segments: segments.length
          },
          // 요약 통계
          summary_stats: {
            total_charging_sessions: segments.filter(s => s.sub_activity === '충전').length,
            total_driving_sessions: segments.filter(s => s.main_activity === '주행').length,
            total_idle_sessions: segments.filter(s => s.main_activity === '정차').length
          }
        }
      } catch (error) {
        console.error(`Error processing segment data for ${deviceNo}:`, error)
        return {
          device_no: deviceNo,
          segments: [],
          total_segments: 0
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
