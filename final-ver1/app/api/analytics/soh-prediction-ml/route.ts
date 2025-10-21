import { NextResponse } from "next/server"
import { spawn } from 'child_process'
import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceNo = searchParams.get('device_no')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!deviceNo || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'device_no, start_date, end_date 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    // Python 스크립트 실행하여 Prophet 모델로 예측
    const pythonScript = path.join(process.cwd(), 'models', 'soh_prophet_predict.py')
    
    const pythonProcess = spawn('python3', [pythonScript, deviceNo, startDate, endDate])
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    // Python 프로세스 완료 대기
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`))
        }
      })
    })
    
    // JSON 결과 파싱
    const result = JSON.parse(stdout)
    
    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('ML SOH 예측 오류:', error)
    return NextResponse.json(
      { success: false, error: 'ML SOH 예측 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

