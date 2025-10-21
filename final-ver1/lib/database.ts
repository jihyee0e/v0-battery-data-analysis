import { InfluxDB } from '@influxdata/influxdb-client'

// InfluxDB 클라이언트 설정
const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL!,
  token: process.env.INFLUXDB_TOKEN!,
  timeout: 1200000  
})

const org = process.env.INFLUXDB_ORG!
const bucket = process.env.INFLUXDB_BUCKET!
const timeout = parseInt(process.env.INFLUXDB_TIMEOUT!) || 1200000
const batchSize = parseInt(process.env.DATA_BATCH_SIZE!) || 1000

export { influxDB, org, bucket, timeout, batchSize }


// InfluxDB 값을 적절한 타입으로 변환하는 유틸리티 함수
export const parseInfluxValue = (value: any): any => {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    // 숫자로 변환 가능한지 확인
    const num = parseFloat(value)
    if (!isNaN(num) && isFinite(num)) return num
    // boolean으로 변환 가능한지 확인
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
    // 그 외는 문자열 그대로
    return value
  }
  return value
}

// InfluxDB 쿼리 편의 함수
export const queryInflux = async (query: string) => {
  const queryApi = influxDB.getQueryApi(org)
  const results: any[] = []
  
  return new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row: string[], tableMeta: any) {
        const record = tableMeta.toObject(row)
        results.push(record)
      },
      error(error: any) {
        console.error('InfluxDB Query Error:', error)
        reject(error)
      },
      complete() {
        resolve(results)
      }
    })
  })
}