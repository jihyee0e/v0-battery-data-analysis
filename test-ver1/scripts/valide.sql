-- 데이터 개수 확인
SELECT 'BMS 데이터 검증' as check_type, 'bongo3', COUNT(*) FROM bongo3_bms_data
UNION ALL
SELECT 'BMS 데이터 검증', 'gv60', COUNT(*) FROM gv60_bms_data
UNION ALL
SELECT 'BMS 데이터 검증', 'porter2', COUNT(*) FROM porter2_bms_data
UNION ALL
SELECT 'GPS 데이터 검증', 'bongo3', COUNT(*) FROM bongo3_gps_data
UNION ALL
SELECT 'GPS 데이터 검증', 'gv60', COUNT(*) FROM gv60_gps_data
UNION ALL
SELECT 'GPS 데이터 검증', 'porter2', COUNT(*) FROM porter2_gps_data;

-- NULL 값 체크
SELECT 'BMS NULL 체크' as check_type,
       COUNT(CASE WHEN soc IS NULL THEN 1 END),
       COUNT(CASE WHEN soh IS NULL THEN 1 END),
       COUNT(CASE WHEN pack_volt IS NULL THEN 1 END),
       COUNT(CASE WHEN max_cell_volt IS NULL THEN 1 END),
       COUNT(CASE WHEN min_cell_volt IS NULL THEN 1 END)
FROM bongo3_bms_data
UNION ALL
SELECT 'GPS NULL 체크',
       COUNT(CASE WHEN lat IS NULL THEN 1 END),
       COUNT(CASE WHEN lng IS NULL THEN 1 END),
       COUNT(CASE WHEN speed IS NULL THEN 1 END),
       COUNT(CASE WHEN time IS NULL THEN 1 END),
       0
FROM bongo3_gps_data;

-- 시간 범위
SELECT 'BMS 시간 범위', MIN(msg_time), MAX(msg_time), COUNT(DISTINCT DATE(msg_time))
FROM bongo3_bms_data
UNION ALL
SELECT 'GPS 시간 범위', MIN(time), MAX(time), COUNT(DISTINCT DATE(time))
FROM bongo3_gps_data;

-- 분석 뷰 확인
SELECT '고급 분석 뷰 테스트', COUNT(*) FROM cell_balance_analysis
UNION ALL
SELECT '주행 패턴 분석', COUNT(*) FROM driving_pattern_analysis
UNION ALL
SELECT 'BMS 반응 분석', COUNT(*) FROM bms_response_analysis
UNION ALL
SELECT '배터리 건강 지수', COUNT(*) FROM battery_health_index
UNION ALL
SELECT '이상 패턴 탐지', COUNT(*) FROM anomaly_detection
UNION ALL
SELECT '차량 성능 요약', COUNT(*) FROM vehicle_performance_summary
UNION ALL
SELECT '랭킹', COUNT(*) FROM vehicle_rankings
UNION ALL
SELECT '대시보드 통계', COUNT(*) FROM dashboard_stats;
