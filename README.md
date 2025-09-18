# AICAR - v0-battery

**메인은 `v0-battery`입니다. 나머지는 보조(오프라인 분석)입니다.**

## 📌 프로젝트 목적

Next.js 기반 대시보드로 PostgreSQL에 저장된 BMS/GPS 데이터를 시각화하고 간단한 API를 제공합니다.
- `scripts`와 루트의 Python 스크립트는 향후 DB 저장/시스템 반영을 위한 오프라인 분석용입니다.

## 📂 폴더 구조
```
aicar-preprocessing/
├── v0-battery/               # 메인: Next.js 대시보드
│   ├── app/                  # 페이지 및 API 라우트
│   ├── components/           # 대시보드 UI 컴포넌트
│   ├── scripts/              # 초기 스키마/시드 SQL
│   └── docker-compose.yml    # Postgres(5433)
├── final_data/               # 원천 CSV (bms/, gps/)
├── data_analysis.py          # 오프라인 분석(컬럼 통계/품질) → DB/ERD/ETL 근거
├── base_preprocessing.py     # 오프라인 전처리 유틸
└── requirements.txt
```

## 🧭 전체 흐름 요약
```
센서 원천(BMS/GPS)
  → 전처리/저장(PostgreSQL)
  → API(Route Handlers)
  → 대시보드 시각화(Next.js)
```

## 🚀 실행 순서
```
# 1) 데이터베이스 + 대시보드 (Docker 권장)
cd v0-battery
docker-compose up -d

# 2) Next.js 개발 서버
cd v0-battery
npm install  # 또는 pnpm install
npm run dev  # 또는 pnpm dev

# 3) (선택) 오프라인 분석/전처리
python3 -m venv venv && source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
python3 data_analysis.py       # 결과: analysis_results/* 에 저장
python3 base_preprocessing.py  # 필요 시 실행
```

## 🔌 API (예시)
- GET `/api/dashboard/overview`
- GET `/api/vehicles/[type]`
- GET `/api/analytics/trends`

## 🗄️ 데이터베이스 (ERD 일부)
<img width="1209" height="464" alt="Image" src="https://github.com/user-attachments/assets/1e6d8ca0-beb8-4322-aa97-f798f133c232" />