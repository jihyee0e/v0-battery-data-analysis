#!/usr/bin/env python3
"""
학습된 Prophet 모델을 사용하여 SOH 예측
"""

import sys
import json
import pickle
import pandas as pd
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient

def load_model():
    """학습된 Prophet 모델 로드"""
    model_path = '/mnt/hdd1/jihye0e/aicar-preprocessing/v0-battery/models/soh_prophet_model.pkl'
    
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        return model
    except FileNotFoundError:
        print(json.dumps({"error": "모델 파일을 찾을 수 없습니다. 먼저 모델을 학습시켜주세요."}))
        sys.exit(1)

def get_vehicle_soh_history(device_no):
    """특정 차량의 SOH 히스토리 가져오기"""
    # InfluxDB 연결 설정
    url = "http://localhost:8087"
    token = "aicar123"
    org = "keti"
    bucket = "aicar-bucket"
    
    client = InfluxDBClient(url=url, token=token, org=org)
    query_api = client.get_query_api()
    
    # 특정 차량의 SOH 데이터 쿼리
    query = f'''
    from(bucket: "{bucket}")
      |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
      |> filter(fn: (r) => r._measurement == "aicar_bms")
      |> filter(fn: (r) => r.device_no == "{device_no}")
      |> filter(fn: (r) => r._field == "soh")
      |> filter(fn: (r) => exists r._value)
      |> sort(columns: ["_time"])
    '''
    
    # 데이터 조회
    result = query_api.query(query)
    
    # 데이터 변환
    data_points = []
    for table in result:
        for record in table.records:
            data_points.append({
                'ds': record.get_time(),
                'y': float(record.get_value())
            })
    
    client.close()
    
    if not data_points:
        return None
    
    # DataFrame으로 변환
    df = pd.DataFrame(data_points)
    df['ds'] = pd.to_datetime(df['ds'])
    
    return df

def predict_soh(model, device_no, days):
    """SOH 예측 실행"""
    # 차량별 SOH 히스토리 가져오기
    soh_history = get_vehicle_soh_history(device_no)
    
    if soh_history is None or len(soh_history) < 10:
        return {
            "error": "예측을 위한 충분한 SOH 데이터가 없습니다.",
            "device_no": device_no,
            "data_points": len(soh_history) if soh_history is not None else 0
        }
    
    # 현재 SOH
    current_soh = soh_history['y'].iloc[-1]
    last_date = soh_history['ds'].iloc[-1]
    
    # 미래 날짜 생성
    future_dates = pd.date_range(
        start=last_date + timedelta(days=1), 
        periods=days, 
        freq='D'
    )
    
    # Prophet 예측
    future = pd.DataFrame({'ds': future_dates})
    forecast = model.predict(future)
    
    # 예측 결과 정리
    predictions = []
    for i, row in forecast.iterrows():
        predictions.append({
            'date': row['ds'].strftime('%Y-%m-%d'),
            'predicted_soh': round(max(0, min(100, row['yhat'])), 2),
            'lower_bound': round(max(0, min(100, row['yhat_lower'])), 2),
            'upper_bound': round(max(0, min(100, row['yhat_upper'])), 2),
            'days_from_now': i + 1
        })
    
    # 저하율 계산
    if len(soh_history) >= 2:
        first_soh = soh_history['y'].iloc[0]
        last_soh = soh_history['y'].iloc[-1]
        days_diff = (soh_history['ds'].iloc[-1] - soh_history['ds'].iloc[0]).days
        degradation_rate = (first_soh - last_soh) / days_diff if days_diff > 0 else 0
    else:
        degradation_rate = 0
    
    # 예측 신뢰도 (데이터 포인트 수 기반)
    confidence = min(1.0, len(soh_history) / 100)  # 100개 데이터 포인트 = 100% 신뢰도
    
    # 권장사항
    final_predicted_soh = predictions[-1]['predicted_soh']
    if final_predicted_soh < 70:
        recommendation = "배터리 교체가 필요할 것으로 예상됩니다. 정비 센터 방문을 권장합니다."
        priority = "high"
    elif final_predicted_soh < 80:
        recommendation = "배터리 성능 저하가 예상됩니다. 정기 점검을 권장합니다."
        priority = "medium"
    else:
        recommendation = "현재 배터리 상태는 양호합니다. 정기 점검을 유지하세요."
        priority = "low"
    
    return {
        "device_no": device_no,
        "current_soh": round(current_soh, 2),
        "prediction_days": days,
        "predictions": predictions,
        "degradation_rate": round(degradation_rate, 4),
        "prediction_confidence": round(confidence, 2),
        "recommendation": {
            "message": recommendation,
            "priority": priority,
            "predicted_soh_after_30_days": final_predicted_soh
        },
        "historical_data_points": len(soh_history)
    }

def main():
    """메인 실행 함수"""
    if len(sys.argv) != 4:
        print(json.dumps({"error": "사용법: python soh_prophet_predict.py <device_no> <start_date> <end_date>"}))
        sys.exit(1)
    
    device_no = sys.argv[1]
    start_date = sys.argv[2]
    end_date = sys.argv[3]
    
    # 날짜 차이 계산
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    days = (end - start).days
    
    try:
        # 모델 로드
        model = load_model()
        
        # 예측 실행
        result = predict_soh(model, device_no, days)
        
        # JSON 결과 출력
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"error": f"예측 중 오류 발생: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()

