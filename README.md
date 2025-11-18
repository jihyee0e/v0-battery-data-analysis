# 🔋 전기차 배터리 데이터 분석 및 시각화 시스템 

## 📋 프로젝트 개요

**프로젝트명:** 전기차 배터리 데이터 분석 및 시각화 대시보드

**개발 기간**: 2025년 10월 ~ 현재  
**개발 환경 및 언어**: Linux (Ubuntu), Docker, Node.js, TypeScript, JavaScript, CSS, Python, SQL 

**배경 및 목표:**

- **배경:**
  - 전기차 보급 확산에 따른 배터리 성능 모니터링 및 예측 수요 증가
  - 기존 배터리 관리 시스템은 단순 모니터링에 그치고 예측 분석 기능 부족
  - 배터리 성능 저하로 인한 안전사고 및 경제적 손실 방지 필요성 대두

- **목표:** 
  - InfluxDB를 활용한 시계열 배터리 데이터 수집 및 저장
  - 머신러닝/딥러닝 기반 SOH(State of Health) 예측 및 이상 탐지 시스템 구축
  - 실시간 대시보드를 통한 배터리 상태 모니터링 및 시각화
  - 차량별 성능 분석 및 운전 패턴 기반 최적화 제안

## 🔍 연구 질문 및 기대효과

### 연구 질문
- 배터리 SOC/SOH 데이터를 기반으로 성능 저하를 얼마나 정확하게 예측할 수 있는가?
- 운전 패턴과 배터리 성능 간의 상관관계를 분석하여 최적화 방안을 제시할 수 있는가?
- 실시간 데이터 시각화를 통해 사용자 경험을 개선할 수 있는가?

### 기대효과
- **안전성 향상**: 배터리 이상 상황 사전 감지로 안전사고 예방
- **경제적 효과**: 배터리 교체 시점 최적화로 비용 절감
- **사용자 편의성**: 직관적인 대시보드로 배터리 상태 한눈에 파악
- **데이터 기반 의사결정**: 운전 패턴 분석을 통한 효율적인 에너지 관리

## 🚀 차별성

- **실시간 시계열 분석**: InfluxDB 기반 고성능 데이터 수집 및 분석
- **다중 ML 모델 활용**: XGBoost(에너지 소비), Prophet(SOH 예측) 등 다양한 알고리즘 적용
- **직관적 시각화**: Recharts 기반 인터랙티브 차트로 복잡한 데이터를 쉽게 이해
- **종합적 분석**: 배터리 성능, 운전 패턴, 이상 탐지를 통합한 원스톱 솔루션

## 📊 데이터

### 데이터 소스
- **InfluxDB 시계열 데이터**: 전기차 배터리 관리 시스템(BMS) 데이터
- **측정 항목**: SOC, SOH, 팩 전압/전류, 모듈 온도, 주행 거리 등
- **데이터 범위**: 2022년 12월 ~ 2023년 8월 (약 8개월 수집)
- **차량 유형**: BONGO3, GV60, PORTER2 등 다양한 전기차 모델

### 데이터 처리 파이프라인
- **실시간 수집**: InfluxDB를 통한 연속적인 데이터 스트리밍
- **전처리**: 결측치 처리, 이상값 탐지, 데이터 정규화
- **특성 추출**: 시간별 집계, 이동평균, 트렌드 분석

## 🏗️ Repository Structure

```
v0-battery/
├── app/                          # Next.js 앱 라우터
│   ├── api/                      # RESTful API 엔드포인트
│   │   ├── analytics/            # 분석 API
│   │   │   ├── anomaly-detection/    # 이상 탐지 알고리즘
│   │   │   ├── soh-prediction/       # SOH 예측 모델
│   │   │   └── vehicle-scoring/      # 차량 성능 점수
│   │   ├── dashboard/            # 대시보드 데이터 API
│   │   └── vehicles/             # 차량별 데이터 API
│   ├── advanced-analysis/        # 고급 분석 페이지
│   └── utils/                    # 유틸리티 함수
├── components/                   # React 컴포넌트
│   ├── ui/                       # shadcn/ui 기반 UI 컴포넌트
│   ├── ev-dashboard.tsx         # 메인 대시보드
│   ├── soh-prediction-analysis.tsx  # SOH 예측 분석
│   ├── anomaly-detection-analysis.tsx # 이상 탐지 분석
│   └── vehicle-scoring-analysis.tsx # 차량 성능 분석
├── lib/                          # 핵심 라이브러리
│   ├── database.ts              # InfluxDB 연결 및 쿼리
│   ├── dashboard-utils.ts       # 대시보드 유틸리티
│   └── utils.ts                 # 공통 유틸리티
├── models/                       # 머신러닝 모델
│   ├── energy_consumption_xgboost.py  # XGBoost 에너지 소비 예측
│   ├── soh_prophet_model.py     # Prophet 기반 SOH 예측
│   ├── soh_prophet_predict.py   # SOH 예측 실행 스크립트
│   └── requirements.txt         # Python 의존성
├── context/                     # React Context
│   └── DashboardContext.tsx    # 대시보드 상태 관리
├── public/                      # 정적 자산
├── styles/                      # CSS 스타일
├── docker-compose.yml          # InfluxDB 컨테이너 설정
└── package.json                # 프로젝트 의존성
```

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** - React 기반 풀스택 프레임워크
- **React 19** - 최신 React 기능 활용
- **TypeScript** - 타입 안전성 보장
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크
- **shadcn/ui** - 모던 UI 컴포넌트 라이브러리
- **Recharts** - 데이터 시각화 차트 라이브러리

### Backend & Database
- **Next.js API Routes** - 서버리스 API 엔드포인트
- **InfluxDB 2.7** - 시계열 데이터베이스
- **Docker** - 컨테이너 기반 배포

### Machine Learning & Analytics
- **XGBoost** - 그래디언트 부스팅 기반 에너지 소비 예측
- **Prophet** - Facebook의 시계열 예측 라이브러리
- **Pandas/NumPy** - 데이터 처리 및 분석
- **Scikit-learn** - 머신러닝 파이프라인

## 🔧 주요 기능

### 📊 실시간 대시보드
- **배터리 상태 모니터링**: SOC/SOH 실시간 추이 시각화
- **차량별 성능 비교**: 다중 차량 동시 모니터링
- **알림 시스템**: 이상 상황 발생 시 즉시 알림

### 🔍 고급 분석 기능
- **이상 탐지**: 통계적 방법론 기반 배터리 이상 패턴 감지
- **SOH 예측**: Prophet 모델을 활용한 배터리 건강도 예측
- **차량 점수**: 종합적인 성능 평가 및 랭킹 시스템
- **주행 패턴 분석**: 운전 효율성 및 에너지 소비 패턴 분석

### 📈 데이터 시각화
- **시계열 차트**: 시간별 배터리 성능 추이
- **히트맵**: 온도 분포 및 이상 구간 시각화
- **분포도**: 성능 지표별 분포 분석
- **비교 분석**: 차량간 성능 비교 차트

## 🖼️ 주요 기능

### 📊 메인 대시보드
전체 차량 현황을 한눈에 파악할 수 있는 통합 대시보드

![전체 흐름](https://github.com/user-attachments/assets/b7be882a-85aa-495a-a8ff-8bef624fd33f)

![데이터 통계](https://github.com/user-attachments/assets/95bb115f-7b17-43c7-97e2-7fe8d8b5a550)

![데이터 필드](https://github.com/user-attachments/assets/979e19bb-0f59-4de3-8e4f-f31fce1cbb00)

![요약 기능 분석](https://github.com/user-attachments/assets/19c98d7e-3985-4cd5-89c3-26424626b0aa)

- 차종별 데이터 통계 (+등록 디바이스, 평균 soc, soh 추가)

![데이터 통계](https://github.com/user-attachments/assets/bbb15cb1-f5ec-436b-b8c5-84dffc78afb4)

**주요 기능:**
- 📈 데이터 통계: 전체 라인 수, 수집 기간, 차종별 데이터 수집 현황
- 🔋 배터리 상태: 실시간 SOC 모니터링
- ⚡ 충전 정보: 현재 충전 전력, 충전/미충전 상태, 케이블 연결 상태, 연결 해제 상태
- 🌡️ 온도 범위: 평균/최대/최소 온도
- 💚 배터리 건강도: SOH 표시
- 📝 데이터 필드 목록: 배터리 기본, 셀 전압, 모듈 온도, 충전, gps, 기타 필드

### 🚗 개별 차량 분석
차량별 상세 정보 및 성능 모니터링 페이지

**주요 기능:**
- 📋 **차종별 현황**: 차량 유형별 등록 현황 및 데이터 수집 상태
- 🆔 **디바이스 목록**: 차량 ID별 상세 정보 (SOC, SOH, 등급)
- 🔍 **상세보기**: 개별 차량의 상세 분석 페이지로 이동

① 📊 차량 상세 분석
특정 차량의 구간별 통계 및 주행 패턴 분석(+a) 페이지

![차량 상세 분석](https://github.com/user-attachments/assets/2904874f-b4d9-44e9-bb95-c53b85060ae8)

![차량 상세 분석2](https://github.com/user-attachments/assets/4fc267cd-e996-4dfe-816b-216ce8f923c9)

![차량 상세 분석3](https://github.com/user-attachments/assets/ebcadaca-7a7c-457a-a9c0-beadd6085700)

![차량 상세 분석4](https://github.com/user-attachments/assets/408aced6-25a4-4476-8ead-8b7324b5cb2a)

**주요 기능:**
- 📊 **구간별 통계**: 주요 활동, 부가 활동, 계절별 상세 로그
- 🔋 **배터리 데이터**: SOH, 팩 전압/전류, SOC 변화 추이
- 🚗 **주행 분석**: 총 주행거리, 주행 횟수, 주행 시간, 평균 효율

![주행 분석](https://github.com/user-attachments/assets/fb099d06-c4dd-48a0-a2cf-d677e7b48424)

- 📈 **주행 패턴**: 일별/월별/계절별 주행거리 시각화

### 🔬 데이터 분석
종합적인 데이터 분석 및 시각화 대시보드 

![데이터 분석 대시보드 예시](https://github.com/user-attachments/assets/c9fdfbaa-bb06-4004-bde7-621f7b7aa756)

**주요 기능:**
- 🫡 **SOH 예측**: 차량 선택 및 예측 기간 설정을 통한 배터리 건강도 예측
- ⛑️ **이상탐지**: 통계적 방법론 기반 배터리 이상 패턴 감지 및 위험도 분류
- 🚗 **차량성능**: 성능 스코어링 및 군집분석
- ⚙️ **환경영향**: 계절별 SOH 변화 및 온도 vs 성능 관계 분석

## 🗄️ 데이터베이스 설계

### InfluxDB 설정
- **URL**: `keti-ev1.iptime.org:8087`

### 주요 측정값 (Measurements)
- **aicar_bms**: 배터리 관리 시스템 데이터
  - `soc`: 충전 상태 (State of Charge)
  - `soh`: 배터리 건강도 (State of Health)
  - `pack_volt`: 팩 전압
  - `pack_current`: 팩 전류
  - `mod_avg_temp`: 모듈 평균 온도
  - `odometer`: 주행 거리

### 태그 (Tags)
- `device_no`: 차량 식별자
- `car_type`: 차량 모델 (BONGO3, GV60, PORTER2)

## 🔄 개발 워크플로우

### 데이터 분석 파이프라인
1. **데이터 수집**: InfluxDB에서 실시간 데이터 스트리밍
2. **전처리**: Python 스크립트로 데이터 정제 및 특성 추출
3. **모델 학습**: Jupyter 노트북에서 탐색적 분석 후 모델 훈련
4. **API 서빙**: Next.js API로 분석 결과 제공
5. **시각화**: React 컴포넌트로 인터랙티브 차트 구현

### 모델 학습 및 배포
1. **모델 개발**: `models/` 폴더에서 ML 모델 구현
2. **성능 검증**: 교차 검증 및 성능 지표 평가
3. **API 통합**: 학습된 모델을 REST API로 서빙
4. **실시간 예측**: 대시보드에서 실시간 예측 결과 제공

## 📊 성능 최적화

### 시스템 최적화
- **CPU 기반 처리**: GPU 없이도 효율적인 ML 모델 실행
- **병렬 처리**: multiprocessing을 활용한 대용량 데이터 처리
- **캐싱 전략**: API 응답 캐싱으로 응답 속도 향상
- **인덱싱**: InfluxDB 쿼리 최적화를 위한 적절한 인덱스 설계

### 데이터 처리 최적화
- **배치 처리**: 대용량 데이터의 효율적인 배치 처리
- **압축**: 시계열 데이터 압축으로 저장 공간 절약
- **샘플링**: 실시간 분석을 위한 적절한 데이터 샘플링