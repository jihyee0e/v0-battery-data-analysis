#!/usr/bin/env python3
"""
에너지 소비 예측을 위한 XGBoost 모델 학습 및 저장
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

def load_and_prepare_data():
    """InfluxDB에서 에너지 소비 데이터를 로드하고 XGBoost 형식으로 변환"""
    print("InfluxDB에서 에너지 소비 데이터 로드 중...")
    
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
    
    # 에너지 소비 관련 데이터 쿼리
    query = f'''
    from(bucket: "{bucket}")
      |> range(start: 2022-01-01T00:00:00Z, stop: 2024-01-01T00:00:00Z)
      |> filter(fn: (r) => r._measurement == "aicar_bms")
      |> filter(fn: (r) => r._field == "soc" or r._field == "soh" or r._field == "pack_volt" or r._field == "pack_current" or r._field == "mod_avg_temp" or r._field == "odometer")
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
                'time': record.get_time(),
                'field': record.get_field(),
                'value': float(record.get_value()),
                'device_no': record.values.get('device_no'),
                'car_type': record.values.get('car_type')
            })
    
    if not data_points:
        print("에너지 소비 데이터를 찾을 수 없습니다.")
        return None
    
    # DataFrame으로 변환
    df = pd.DataFrame(data_points)
    
    # 피벗 테이블로 변환 (시간별로 각 필드값을 컬럼으로)
    df_pivot = df.pivot_table(
        index=['time', 'device_no', 'car_type'], 
        columns='field', 
        values='value', 
        aggfunc='mean'
    ).reset_index()
    
    # 컬럼명 정리
    df_pivot.columns.name = None
    
    # 에너지 소비량 계산 (kWh)
    # 에너지 = 전압 * 전류 * 시간 (여기서는 순간 전력으로 근사)
    df_pivot['instant_power_w'] = df_pivot['pack_volt'] * df_pivot['pack_current']
    df_pivot['instant_power_kw'] = df_pivot['instant_power_w'] / 1000
    
    # 시간대별 특성 추가
    df_pivot['time'] = pd.to_datetime(df_pivot['time'])
    df_pivot['hour'] = df_pivot['time'].dt.hour
    df_pivot['day_of_week'] = df_pivot['time'].dt.dayofweek
    df_pivot['month'] = df_pivot['time'].dt.month
    df_pivot['season'] = df_pivot['month'].map({
        12: 0, 1: 0, 2: 0,  # 겨울
        3: 1, 4: 1, 5: 1,   # 봄
        6: 2, 7: 2, 8: 2,   # 여름
        9: 3, 10: 3, 11: 3  # 가을
    })
    
    # 차종별 인코딩
    df_pivot['car_type_encoded'] = df_pivot['car_type'].map({
        'BONGO3': 0,
        'GV60': 1,
        'PORTER2': 2
    })
    
    # 결측값 처리
    df_pivot = df_pivot.dropna()
    
    print(f"데이터 준비 완료: {len(df_pivot)}개 데이터 포인트")
    print(f"전력 범위: {df_pivot['instant_power_kw'].min():.3f}kW ~ {df_pivot['instant_power_kw'].max():.3f}kW")
    
    client.close()
    return df_pivot

def train_xgboost_model(df):
    """XGBoost 모델 학습"""
    print("XGBoost 모델 학습 중...")
    
    # 특성과 타겟 분리
    feature_columns = [
        'soc', 'soh', 'pack_volt', 'pack_current', 'mod_avg_temp', 'odometer',
        'hour', 'day_of_week', 'month', 'season', 'car_type_encoded'
    ]
    
    X = df[feature_columns]
    y = df['instant_power_kw']
    
    # XGBoost 모델 설정
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    
    # 모델 학습
    model.fit(X, y)
    
    # 특성 중요도 출력
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("특성 중요도:")
    print(feature_importance)
    
    print("모델 학습 완료")
    return model, feature_columns

def save_model(model, feature_columns, model_path):
    """학습된 모델과 특성 정보 저장"""
    print(f"모델 저장 중: {model_path}")
    
    # 디렉토리 생성
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # 모델과 메타데이터 저장
    model_data = {
        'model': model,
        'feature_columns': feature_columns,
        'trained_at': datetime.now(),
        'model_type': 'XGBoost'
    }
    
    with open(model_path, 'wb') as f:
        pickle.dump(model_data, f)
    
    print("모델 저장 완료")

def load_model(model_path):
    """저장된 모델 로드"""
    print(f"모델 로드 중: {model_path}")
    
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
    
    print("모델 로드 완료")
    return model_data

def predict_energy_consumption(model_data, features):
    """에너지 소비 예측"""
    print("에너지 소비 예측 중...")
    
    model = model_data['model']
    feature_columns = model_data['feature_columns']
    
    # 특성 데이터 준비
    X = pd.DataFrame([features], columns=feature_columns)
    
    # 예측
    prediction = model.predict(X)[0]
    
    print("예측 완료")
    return prediction

def main():
    """메인 실행 함수"""
    print("=== 에너지 소비 XGBoost 모델 학습 시작 ===")
    
    # 1. 데이터 로드
    df = load_and_prepare_data()
    if df is None:
        print("데이터 로드 실패")
        return
    
    # 2. 모델 학습
    model, feature_columns = train_xgboost_model(df)
    
    # 3. 모델 저장
    model_path = '/mnt/hdd1/jihye0e/aicar-preprocessing/v0-battery/models/energy_consumption_xgboost.pkl'
    save_model(model, feature_columns, model_path)
    
    # 4. 예측 테스트
    test_features = {
        'soc': 80.0,
        'soh': 85.0,
        'pack_volt': 400.0,
        'pack_current': -50.0,  # 방전
        'mod_avg_temp': 25.0,
        'odometer': 10000.0,
        'hour': 14,
        'day_of_week': 1,
        'month': 6,
        'season': 2,
        'car_type_encoded': 1
    }
    
    model_data = load_model(model_path)
    prediction = predict_energy_consumption(model_data, test_features)
    print(f"\n=== 예측 결과 ===")
    print(f"예상 전력 소비: {prediction:.3f}kW")
    
    print("\n=== 모델 학습 완료 ===")

if __name__ == "__main__":
    main()

