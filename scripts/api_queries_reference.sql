-- API 쿼리 참조 파일 (확인용)
-- 01_setup_database.sql 실행 후 사용

-- ========================================
-- 1. 대시보드 개요 데이터
-- ========================================
-- GET /api/dashboard/overview (기본 버전)
SELECT 
    total_vehicles,
    avg_soc,
    avg_soh,
    avg_health_index,
    active_vehicles_7d,
    active_vehicles_14d,
    active_vehicles_30d,
    excellent_health,
    very_good_health,
    good_health,
    fair_health,
    needs_attention,
    critical_anomalies,
    high_risk_anomalies,
    medium_risk_anomalies,
    bongo3_avg_health,
    gv60_avg_health,
    porter2_avg_health,
    avg_cell_balance,
    high_imbalance_vehicles,
    last_updated
FROM dashboard_stats;

-- GET /api/dashboard/overview (캐싱 최적화 버전)
SELECT 
    total_vehicles,
    avg_soc,
    avg_soh,
    avg_health_index,
    active_vehicles_7d,
    active_vehicles_14d,
    active_vehicles_30d,
    excellent_health,
    very_good_health,
    good_health,
    fair_health,
    needs_attention,
    critical_anomalies,
    high_risk_anomalies,
    medium_risk_anomalies,
    bongo3_avg_health,
    gv60_avg_health,
    porter2_avg_health,
    avg_cell_balance,
    high_imbalance_vehicles,
    last_updated
FROM dashboard_stats
WHERE last_updated >= CURRENT_TIMESTAMP - INTERVAL '5 minutes';

-- ========================================
-- 2. 차량 성능 데이터
-- ========================================
-- GET /api/vehicles/performance (기본 버전)
WITH base AS (
  SELECT
    vehicle_id,
    vehicle_type,
    latest_soc,
    latest_soh,
    total_odometer,
    pack_volt,
    pack_current,
    (pack_volt * pack_current) AS power_w,
    mod_avg_temp,
    cell_balance_index,
    composite_health_index,
    health_grade,
    latest_lat,
    latest_lng,
    latest_speed,
    last_updated,
    anomaly_type,
    risk_level,
    -- vehicle_status 추론
    CASE
      WHEN pack_current >  0 THEN 'charging'
      WHEN pack_current <  0 AND latest_speed > 5 THEN 'driving'
      WHEN pack_current <  0 AND latest_speed <= 5 THEN 'idle'
      ELSE 'idle'
    END AS vehicle_status,
    -- data_quality: 최근성 기준
    CASE
      WHEN last_updated >= CURRENT_DATE - INTERVAL '7 days'  THEN 'HIGH'
      WHEN last_updated >= CURRENT_DATE - INTERVAL '30 days' THEN 'MEDIUM'
      ELSE 'LOW'
    END AS data_quality
  FROM vehicle_performance_summary
)
SELECT
  vehicle_id,
  vehicle_type,
  latest_soc,
  latest_soh,
  total_odometer,
  health_grade AS performance_grade,
  last_updated,
  pack_volt,
  pack_current,
  power_w,
  mod_avg_temp,
  cell_balance_index,
  composite_health_index,
  latest_lat,
  latest_lng,
  latest_speed,
  vehicle_status,
  data_quality,
  anomaly_type,
  risk_level
FROM base
WHERE 1=1
  AND ( :car_type_param  IS NULL OR vehicle_type       = :car_type_param )
  AND ( :grade_param     IS NULL OR health_grade       = :grade_param )
  AND ( :status_param    IS NULL OR vehicle_status     = :status_param )
  AND ( :quality_param   IS NULL OR data_quality       = :quality_param )
ORDER BY
  CASE :sort_by_param
    WHEN 'soh'     THEN latest_soh
    WHEN 'health'  THEN composite_health_index
    WHEN 'balance' THEN cell_balance_index
    WHEN 'updated' THEN EXTRACT(EPOCH FROM last_updated)
    WHEN 'power'   THEN power_w
    ELSE latest_soh
  END DESC
LIMIT :limit_param OFFSET :offset_param;

-- GET /api/vehicles/performance (페이지네이션 최적화 버전)
WITH filtered_vehicles AS (
    SELECT 
        vehicle_id,
        vehicle_type,
        latest_soc,
        latest_soh,
        total_odometer,
        composite_health_index,
        cell_balance_index,
        health_grade,
        last_updated,
        pack_volt,
        pack_current,
        (pack_volt * pack_current) as power_w,
        mod_avg_temp,
        latest_lat,
        latest_lng,
        latest_speed,
        anomaly_type,
        risk_level,
        -- vehicle_status 추론
        CASE
            WHEN pack_current > 0 THEN 'charging'
            WHEN pack_current < 0 AND latest_speed > 5 THEN 'driving'
            WHEN pack_current < 0 AND latest_speed <= 5 THEN 'idle'
            ELSE 'idle'
        END AS vehicle_status,
        -- data_quality: 최근성 기준
        CASE
            WHEN last_updated >= CURRENT_DATE - INTERVAL '7 days' THEN 'HIGH'
            WHEN last_updated >= CURRENT_DATE - INTERVAL '30 days' THEN 'MEDIUM'
            ELSE 'LOW'
        END AS data_quality,
        ROW_NUMBER() OVER (
            ORDER BY 
                CASE :sort_by_param
                    WHEN 'soh' THEN latest_soh
                    WHEN 'health' THEN composite_health_index
                    WHEN 'balance' THEN cell_balance_index
                    WHEN 'updated' THEN last_updated
                    ELSE latest_soh
                END DESC
        ) as row_num
    FROM vehicle_performance_summary
    WHERE 1=1
        AND (:car_type_param IS NULL OR vehicle_type = :car_type_param)
        AND (:grade_param IS NULL OR health_grade = :grade_param)
        AND (:status_param IS NULL OR 
            CASE
                WHEN pack_current > 0 THEN 'charging'
                WHEN pack_current < 0 AND latest_speed > 5 THEN 'driving'
                WHEN pack_current < 0 AND latest_speed <= 5 THEN 'idle'
                ELSE 'idle'
            END = :status_param)
        AND (:quality_param IS NULL OR 
            CASE
                WHEN last_updated >= CURRENT_DATE - INTERVAL '7 days' THEN 'HIGH'
                WHEN last_updated >= CURRENT_DATE - INTERVAL '30 days' THEN 'MEDIUM'
                ELSE 'LOW'
            END = :quality_param)
)
SELECT 
    vehicle_id,
    vehicle_type,
    latest_soc,
    latest_soh,
    total_odometer,
    composite_health_index,
    cell_balance_index,
    health_grade,
    last_updated,
    pack_volt,
    pack_current,
    power_w,
    mod_avg_temp,
    latest_lat,
    latest_lng,
    latest_speed,
    anomaly_type,
    risk_level,
    vehicle_status,
    data_quality
FROM filtered_vehicles
WHERE row_num BETWEEN (:page_param - 1) * :limit_param + 1 AND :page_param * :limit_param
ORDER BY row_num;

-- ========================================
-- 3. 차량 랭킹 데이터
-- ========================================
-- GET /api/vehicles/rankings
SELECT 
    vehicle_id,
    vehicle_type,
    latest_soh,
    composite_health_index,
    cell_balance_index,
    overall_score,
    soh_rank,
    health_rank,
    overall_rank,
    performance_category
FROM vehicle_rankings
WHERE 1=1
    AND (:car_type_param IS NULL OR vehicle_type = :car_type_param)
    AND (:category_param IS NULL OR performance_category = :category_param)
ORDER BY overall_rank
LIMIT :limit_param;

-- ========================================
-- 4. 분석 데이터 (뷰 기반)
-- ========================================
-- GET /api/analytics/cell-balance
SELECT * FROM cell_balance_analysis;

-- GET /api/analytics/driving-patterns
SELECT * FROM driving_pattern_analysis;

-- GET /api/analytics/bms-response
SELECT * FROM bms_response_analysis;

-- GET /api/analytics/anomaly-detection
SELECT * FROM anomaly_detection;

-- GET /api/analytics/battery-health
SELECT * FROM battery_health_index;

-- ========================================
-- 5. 고급 분석 쿼리들
-- ========================================
-- 차량별 상세 성능 비교
SELECT 
    vehicle_id,
    vehicle_type,
    latest_soc,
    latest_soh,
    composite_health_index,
    cell_balance_index,
    health_grade,
    anomaly_type,
    risk_level,
    last_updated
FROM vehicle_performance_summary
WHERE vehicle_type = :car_type_param
ORDER BY composite_health_index DESC;

-- 차종별 성능 비교
SELECT 
    car_type,
    COUNT(*) as vehicle_count,
    AVG(latest_soh) as avg_soh,
    AVG(composite_health_index) as avg_health_index,
    AVG(cell_balance_index) as avg_balance_index,
    COUNT(CASE WHEN health_grade = 'excellent' THEN 1 END) as excellent_count,
    COUNT(CASE WHEN health_grade = 'needs_attention' THEN 1 END) as needs_attention_count
FROM vehicle_performance_summary
GROUP BY car_type
ORDER BY avg_health_index DESC;

-- 시간대별 성능 분석
SELECT 
    EXTRACT(HOUR FROM msg_time) as hour_of_day,
    AVG(soc) as avg_soc,
    AVG(soh) as avg_soh,
    AVG(mod_avg_temp) as avg_temp,
    COUNT(*) as data_points
FROM bongo3_bms_data
WHERE msg_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM msg_time)
ORDER BY hour_of_day;

-- 충전 패턴 분석
SELECT 
    EXTRACT(HOUR FROM msg_time) as hour_of_day,
    COUNT(CASE WHEN pack_current > 0 THEN 1 END) as charging_sessions,
    AVG(CASE WHEN pack_current > 0 THEN pack_current END) as avg_charging_current,
    AVG(CASE WHEN pack_current > 0 THEN soc END) as avg_charging_soc
FROM bongo3_bms_data
WHERE msg_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM msg_time)
ORDER BY hour_of_day;

-- 셀 밸런스 트렌드
SELECT 
    DATE_TRUNC('day', msg_time) as date,
    AVG((max_cell_volt - min_cell_volt) / pack_volt * 100) as avg_balance_index,
    STDDEV((max_cell_volt - min_cell_volt) / pack_volt * 100) as balance_variability,
    COUNT(*) as data_points
FROM bongo3_bms_data
WHERE max_cell_volt IS NOT NULL AND min_cell_volt IS NOT NULL AND pack_volt > 0
    AND msg_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', msg_time)
ORDER BY date DESC;

-- 이상 패턴 통계
SELECT 
    anomaly_type,
    risk_level,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT vehicle_id) as affected_vehicles,
    AVG(anomaly_severity) as avg_severity
FROM anomaly_detection
GROUP BY anomaly_type, risk_level
ORDER BY risk_level DESC, occurrence_count DESC;

-- 성능 등급별 분포
SELECT 
    health_grade,
    COUNT(*) as vehicle_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM vehicle_performance_summary), 2) as percentage
FROM vehicle_performance_summary
GROUP BY health_grade
ORDER BY 
    CASE health_grade
        WHEN 'excellent' THEN 1
        WHEN 'very_good' THEN 2
        WHEN 'good' THEN 3
        WHEN 'fair' THEN 4
        WHEN 'needs_attention' THEN 5
        ELSE 6
    END;

SELECT '고급 분석 뷰 테스트' as test_type,
       COUNT(*) as view_record_count
FROM cell_balance_analysis
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