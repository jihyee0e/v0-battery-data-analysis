# AICAR - 전기차 배터리 데이터 분석 및 전처리 시스템

**[AICAR] 전기차 배터리 데이터 분석 및 전처리 시스템**

전기차의 BMS(Battery Management System)와 GPS 데이터를 통합하여 실시간 배터리 성능 모니터링, 이상 탐지, 운전 패턴 분석을 제공하는 웹 기반 대시보드 시스템

## 🚗 주요 기능

### 📊 실시간 대시보드
- 전체 차량 현황 모니터링 (온라인 상태, 충전 중, 주행 중)
- 배터리 상태 지표 (SOC, SOH, 온도, 불균형도)
- 차량별 성능 등급 및 순위

### 🔋 배터리 분석
- 셀 밸런스 분석 및 이상 탐지
- 배터리 노화 트렌드 분석
- 충전 세션 분석
- 온도 및 전압 모니터링

### 📈 고급 분석
- 운전 패턴 분석
- 이상 탐지 알고리즘
- 트렌드 분석 및 예측
- 차량별 성능 비교

### 🗺️ GPS 통합 분석
- 위치 기반 데이터 분석
- 주행 경로 및 패턴 분석

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** - React 기반 웹 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **Radix UI** - 컴포넌트 라이브러리
- **Recharts** - 데이터 시각화

### Backend
- **Python** - 데이터 처리 및 분석
- **FastAPI** - REST API 서버
- **Flask** - 웹 애플리케이션
- **Streamlit** - 데이터 분석 대시보드

### 데이터베이스
- **PostgreSQL** - 관계형 데이터베이스
- **InfluxDB** - 시계열 데이터베이스

### 데이터 처리
- **Pandas** - 데이터 조작
- **NumPy** - 수치 계산
- **Scikit-learn** - 머신러닝
- **Plotly** - 인터랙티브 차트

### AI/ML
- **PyTorch** - 딥러닝 프레임워크
- **Transformers** - 자연어 처리
- **Hugging Face Hub** - 모델 관리

## 🚀 설치 및 실행

### 1. Docker를 사용한 실행 (권장)
```bash
# PostgreSQL 데이터베이스 시작
docker-compose up -d

# 데이터베이스 초기화
./scripts/setup_database.sh
```

### 3. 로컬 개발 환경 설정

#### Frontend (Next.js)
```bash
# 의존성 설치
npm install
# 또는
pnpm install

# 개발 서버 시작
npm run dev
# 또는
pnpm dev
```

#### Backend (Python)
```bash
# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate     # Windows

# 의존성 설치
pip install -r requirements.txt

# Flask 앱 실행
python3 individual/backend1/app.py
```

## 📁 프로젝트 구조

```
v0-battery/
├── app/                      # Next.js 앱 라우터
│   ├── api/                  # API 엔드포인트
│   │   ├── analytics/        # 분석 API
│   │   ├── dashboard/        # 대시보드 API
│   │   └── vehicles/         # 차량 데이터 API
│   └── advanced-analysis/    # 고급 분석 페이지
├── components/               # React 컴포넌트
│   ├── ui/                   # 기본 UI 컴포넌트
│   ├── ev-dashboard.tsx      # 메인 대시보드
│   ├── battery-gauge.tsx     # 배터리 게이지
│   └── ...
├── scripts/                  # SQL 스크립트
│   ├── 01_setup_database.sql
│   ├── 02_analysis_database.sql
│   ├── 03_advanced_analysis.sql
│   └── ...
├── lib/                      # 유틸리티 함수
├── styles/                   # CSS 스타일
├── public/                   # 정적 파일
├── docker-compose.yml        # Docker 설정
├── package.json              # Node.js 의존성
├── requirements.txt          # Python 의존성
└── README.md
```

## 🔌 API 엔드포인트

### 대시보드 API
- `GET /api/dashboard/overview` - 전체 현황
- `GET /api/dashboard` - 대시보드 데이터

### 차량 데이터 API
- `GET /api/vehicles/[type]` - 차량 타입별 데이터
- `GET /api/vehicles/baseline` - 기준 데이터
- `GET /api/vehicles/charging` - 충전 데이터
- `GET /api/vehicles/performance` - 성능 데이터
- `GET /api/vehicles/rankings` - 순위 데이터

### 분석 API
- `GET /api/analytics/anomaly-detection` - 이상 탐지
- `GET /api/analytics/cell-balance` - 셀 밸런스 분석
- `GET /api/analytics/driving-patterns` - 운전 패턴 분석
- `GET /api/analytics/trends` - 트렌드 분석

## 📊 지원 차량

- **BONGO3** - 상용 전기차
- **GV60** - 크로스오버 SUV
- **PORTER2** - 소형 상용차

## 🔧 데이터 처리 파이프라인

1. **데이터 수집**: BMS 및 GPS 센서 데이터 수집
2. **전처리**: 데이터 정제 및 통합
3. **저장**: PostgreSQL 및 InfluxDB에 저장
4. **분석**: 실시간 분석 및 이상 탐지
5. **시각화**: 웹 대시보드를 통한 결과 표시

## 📈 주요 지표

- **SOC (State of Charge)**: 충전 상태
- **SOH (State of Health)**: 배터리 건강도
- **셀 밸런스**: 개별 셀 전압 균형
- **온도 분포**: 배터리 팩 온도 모니터링
- **충전 효율**: 충전 패턴 및 효율성
