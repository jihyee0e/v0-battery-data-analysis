#!/usr/bin/env python3
"""
SOH 예측을 위한 Prophet 모델 학습 및 저장
"""

import pandas as pd
import numpy as np
from prophet import Prophet
import pickle
import os
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

def load_and_prepare_data():
    """InfluxDB에서 SOH 데이터를 로드하고 Prophet 형식으로 변환"""
    print("InfluxDB에서 SOH 데이터 로드 중...")
    
    # InfluxDB 연결 설정
    from influxdb_client import InfluxDBClient, Point
    from influxdb_client.client.write_api import SYNCHRONOUS
    
    # InfluxDB 설정
    url = "http://localhost:8087"
    token = "aicar123"
    org = "keti"
    bucket = "aicar-bucket"
    
    client = InfluxDBClient(url=url, token=token, org=org)
    query_api = client.get_query_api()
    
    # SOH 데이터 쿼리
    query = f'''
    from(bucket: "{bucket}")
      |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
      |> filter(fn: (r) => r._measurement == "aicar_bms")
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
                'y': float(record.get_value()),
                'device_no': record.values.get('device_no'),
                'car_type': record.values.get('car_type')
            })
    
    if not data_points:
        print("SOH 데이터를 찾을 수 없습니다.")
        return None
    
    # DataFrame으로 변환
    df = pd.DataFrame(data_points)
    
    # 날짜별로 그룹화하여 평균 SOH 계산 (여러 차량의 평균)
    df['ds'] = pd.to_datetime(df['ds'])
    df_daily = df.groupby(df['ds'].dt.date).agg({
        'y': 'mean',
        'device_no': 'count'
    }).reset_index()
    
    df_daily.columns = ['ds', 'y', 'data_count']
    df_daily['ds'] = pd.to_datetime(df_daily['ds'])
    
    # 데이터 품질 필터링 (너무 적은 데이터 포인트 제거)
    df_daily = df_daily[df_daily['data_count'] >= 5]  # 최소 5개 차량 데이터
    
    print(f"데이터 준비 완료: {len(df_daily)}개 일별 데이터 포인트")
    print(f"SOH 범위: {df_daily['y'].min():.2f}% ~ {df_daily['y'].max():.2f}%")
    
    client.close()
    return df_daily

def train_prophet_model(df):
    """Prophet 모델 학습"""
    print("Prophet 모델 학습 중...")
    
    # Prophet 모델 설정
    model = Prophet(
        yearly_seasonality=True,    # 연간 계절성
        weekly_seasonality=False,   # 주간 계절성 (배터리는 주간 패턴이 적음)
        daily_seasonality=False,    # 일간 계절성
        seasonality_mode='additive', # 가법적 계절성
        changepoint_prior_scale=0.05, # 변화점 감도
        seasonality_prior_scale=10.0, # 계절성 강도
        holidays_prior_scale=10.0,    # 휴일 효과
        mcmc_samples=0,              # MCMC 샘플링 비활성화 (빠른 학습)
        interval_width=0.80,         # 예측 구간
        uncertainty_samples=1000     # 불확실성 샘플 수
    )
    
    # 모델 학습
    model.fit(df)
    
    print("모델 학습 완료")
    return model

def save_model(model, model_path):
    """학습된 모델 저장"""
    print(f"모델 저장 중: {model_path}")
    
    # 디렉토리 생성
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # 모델 저장
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print("모델 저장 완료")

def load_model(model_path):
    """저장된 모델 로드"""
    print(f"모델 로드 중: {model_path}")
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    print("모델 로드 완료")
    return model

def predict_soh(model, days=30):
    """SOH 예측"""
    print(f"{days}일 후 SOH 예측 중...")
    
    # 미래 날짜 생성
    future = model.make_future_dataframe(periods=days)
    
    # 예측
    forecast = model.predict(future)
    
    # 예측 결과 추출
    predictions = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(days)
    predictions.columns = ['date', 'predicted_soh', 'lower_bound', 'upper_bound']
    
    print("예측 완료")
    return predictions

def main():
    """메인 실행 함수"""
    print("=== SOH Prophet 모델 학습 시작 ===")
    
    # 1. 데이터 로드
    df = load_and_prepare_data()
    
    # 2. 모델 학습
    model = train_prophet_model(df)
    
    # 3. 모델 저장
    model_path = '/mnt/hdd1/jihye0e/aicar-preprocessing/v0-battery/models/soh_prophet_model.pkl'
    save_model(model, model_path)
    
    # 4. 예측 테스트
    predictions = predict_soh(model, days=30)
    print("\n=== 예측 결과 (처음 5일) ===")
    print(predictions.head())
    
    print("\n=== 모델 학습 완료 ===")

if __name__ == "__main__":
    main()
