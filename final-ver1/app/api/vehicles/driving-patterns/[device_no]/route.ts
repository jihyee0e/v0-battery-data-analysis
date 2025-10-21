import { NextResponse } from "next/server"
import { influxDB, org, bucket } from "@/lib/database"
import { runQuery } from "@/lib/dashboard-utils"

// 시간 포맷팅 함수
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${remainingSeconds}초`
  } else if (minutes > 0) {
    return `${minutes}분 ${remainingSeconds}초`
  } else {
    return `${remainingSeconds}초`
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ device_no: string }> }
) {
  try {
    const { device_no: deviceNo } = await params

    // ipynb의 get_driving_distance_by_device 함수를 TypeScript로 변환
    const getDrivingDistanceByDevice = async (deviceNo: string) => {
      const RESET_THRESHOLD = -50   // km
      const NOISE_THRESHOLD = -1    // km

      const query = `
        from(bucket: "${bucket}")
          |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "aicar_bms")
          |> filter(fn: (r) => r._field == "odometer")
          |> filter(fn: (r) => r.device_no == "${deviceNo}")
          |> filter(fn: (r) => exists r._value)
          |> sort(columns: ["_time"])
      `

      try {
        const result = await runQuery(query)
        const odometerValues: number[] = []
        const timestamps: Date[] = []
        
        for (const row of result) {
          odometerValues.push(Number(row._value))
          timestamps.push(new Date(row._time))
        }

        let totalDistance = 0.0
        const dailyDistances: Record<string, number> = {}
        const sessions: Array<{ distance: number, startTime: Date, endTime: Date }> = []
        let currentSession = 0.0
        let sessionStartTime: Date | null = null
        let actualDrivingTime = 0.0

        console.log(`Device ${deviceNo}: ${odometerValues.length} odometer records found`)
        
        if (odometerValues.length > 0) {
          for (let i = 1; i < odometerValues.length; i++) {
            const diff = odometerValues[i] - odometerValues[i - 1]
            const timeDiff = timestamps[i].getTime() - timestamps[i - 1].getTime()
            const timeDiffMinutes = timeDiff / (1000 * 60)

            if (diff > 0) {
              // 주행 중
              if (sessionStartTime === null) {
                sessionStartTime = timestamps[i - 1]
              }
              totalDistance += diff
              currentSession += diff
              const day = timestamps[i].toISOString().split('T')[0]
              dailyDistances[day] = (dailyDistances[day] || 0) + diff
            } else if (NOISE_THRESHOLD >= diff && diff > RESET_THRESHOLD) {
              // 소음: 무시
              continue
            } else if (diff <= RESET_THRESHOLD || timeDiffMinutes >= 3) {
              // 리셋 이벤트 또는 3분 이상 정지: 세션 종료
              if (currentSession > 0 && sessionStartTime) {
                sessions.push({
                  distance: currentSession,
                  startTime: sessionStartTime,
                  endTime: timestamps[i - 1]
                })
                actualDrivingTime += (timestamps[i - 1].getTime() - sessionStartTime.getTime()) / 1000
              }
              currentSession = 0.0
              sessionStartTime = null
            }
          }

          // 마지막 세션 처리
          if (currentSession > 0 && sessionStartTime) {
            sessions.push({
              distance: currentSession,
              startTime: sessionStartTime,
              endTime: timestamps[timestamps.length - 1]
            })
            actualDrivingTime += (timestamps[timestamps.length - 1].getTime() - sessionStartTime.getTime()) / 1000
          }
        }

        return {
          device_no: deviceNo,
          total_distance: totalDistance, // 소수점 그대로 유지
          sessions: sessions.map(s => s.distance), // 기존 호환성 유지
          session_details: sessions, // 상세 세션 정보
          min_odometer: odometerValues.length > 0 ? Math.min(...odometerValues) : 0,
          max_odometer: odometerValues.length > 0 ? Math.max(...odometerValues) : 0,
          daily: dailyDistances,
          session_count: sessions.length,
          driving_time: {
            total_seconds: actualDrivingTime, // 실제 주행 시간만
            formatted_time: formatDuration(actualDrivingTime)
          }
        }
      } catch (error) {
        console.error(`Error processing ${deviceNo}:`, error)
        return {
          device_no: deviceNo,
          total_distance: 0.0,
          sessions: [],
          min_odometer: 0.0,
          max_odometer: 0.0,
          daily: {},
          session_count: 0,
          driving_time: {
            total_seconds: 0,
            formatted_time: "0초"
          }
        }
      }
    }

    const drivingData = await getDrivingDistanceByDevice(deviceNo)

    return NextResponse.json({
      success: true,
      data: drivingData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Individual Vehicle Driving Analysis API Error:", error)
    return NextResponse.json({ 
      success: false,
      error: "InfluxDB 연결 실패",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}