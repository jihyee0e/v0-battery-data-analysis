-- EV 배터리 성능 분석을 위한 PostgreSQL VIEW 생성
-- 사용자 요구사항에 맞는 3개 핵심 VIEW

-- 1. 차량 성능 요약 VIEW
CREATE OR REPLACE VIEW vehicle_performance_summary AS
WITH latest_bms AS (
    SELECT 
        device_no,
        car_type,
        soc,
        soh,
        pack_volt,
        pack_current,
        odometer,
        cell_temp_avg,
        msg_time,
        ROW_NUMBER() OVER (PARTITION BY device_no ORDER BY msg_time DESC) as rn
    FROM bms_data
),
latest_gps AS (
    SELECT 
        device_no,
        lat,
        lng,
        speed,
        msg_time,
        ROW_NUMBER() OVER (PARTITION BY device_no ORDER BY msg_time DESC) as rn
    FROM gps_data
),
efficiency_calc AS (
    SELECT 
        b.device_no,
        b.car_type,
        -- 거리당 kW 소모량 계산 (Wh/km)
        CASE 
            WHEN b.odometer > 0 THEN 
                (b.pack_volt * ABS(b.pack_current) * 1000) / NULLIF(b.odometer, 0)
            ELSE 0 
        END as avg_efficiency,
        -- 충전 효율 계산 (충전 시간 대비 SOC 증가)
        CASE 
            WHEN b.pack_current > 0 THEN 
                (b.soc * b.pack_volt * 1000) / (b.pack_current * 3600) -- Wh/h
            ELSE 0 
        END as charging_efficiency
    FROM latest_bms b
    WHERE b.rn = 1
)
SELECT 
    b.device_no as vehicle_id,
    b.car_type as vehicle_type,
    b.soc as latest_soc,
    b.soh as latest_soh,
    b.odometer as total_odometer,
    e.avg_efficiency,
    e.charging_efficiency,
    -- 성능 등급 분류
    CASE 
        WHEN b.soh >= 90 THEN 'A'
        WHEN b.soh >= 80 THEN 'B'
        WHEN b.soh >= 70 THEN 'C'
        ELSE 'D'
    END as performance_grade,
    b.msg_time as last_updated,
    b.pack_volt,
    b.pack_current,
    b.cell_temp_avg,
    g.lat as latest_lat,
    g.lng as latest_lng,
    g.speed as latest_speed
FROM latest_bms b
LEFT JOIN latest_gps g ON b.device_no = g.device_no AND g.rn = 1
LEFT JOIN efficiency_calc e ON b.device_no = e.device_no
WHERE b.rn = 1;

-- 2. 랭킹 VIEW
CREATE OR REPLACE VIEW vehicle_rankings AS
WITH performance_scores AS (
    SELECT 
        vehicle_id,
        vehicle_type,
        latest_soh,
        avg_efficiency,
        charging_efficiency,
        -- 종합 성능 점수 계산 (SOH 60%, 효율 25%, 충전효율 15%)
        (latest_soh * 0.6 + 
         GREATEST(0, 100 - (avg_efficiency - 150) / 2) * 0.25 + 
         GREATEST(0, 100 - (charging_efficiency - 80) / 2) * 0.15) as overall_score
    FROM vehicle_performance_summary
),
rankings AS (
    SELECT 
        vehicle_id,
        vehicle_type,
        latest_soh,
        avg_efficiency,
        charging_efficiency,
        overall_score,
        -- SOH 기준 랭킹
        ROW_NUMBER() OVER (ORDER BY latest_soh DESC) as soh_rank,
        -- 효율성 기준 랭킹 (낮을수록 좋음)
        ROW_NUMBER() OVER (ORDER BY avg_efficiency ASC) as efficiency_rank,
        -- 종합 성능 랭킹
        ROW_NUMBER() OVER (ORDER BY overall_score DESC) as overall_rank
    FROM performance_scores
)
SELECT 
    vehicle_id,
    vehicle_type,
    latest_soh,
    avg_efficiency,
    charging_efficiency,
    overall_score,
    soh_rank,
    efficiency_rank,
    overall_rank,
    -- 성능 카테고리
    CASE 
        WHEN overall_rank <= 10 THEN 'TOP_10'
        WHEN overall_rank <= 25 THEN 'HIGH_PERFORMANCE'
        WHEN overall_rank <= 50 THEN 'AVERAGE'
        ELSE 'LOW_PERFORMANCE'
    END as performance_category
FROM rankings;

-- 3. 통계요약 VIEW
CREATE OR REPLACE VIEW dashboard_stats AS
WITH grade_stats AS (
    SELECT 
        performance_grade,
        COUNT(*) as grade_count
    FROM vehicle_performance_summary
    GROUP BY performance_grade
),
charging_vehicles AS (
    SELECT 
        COUNT(DISTINCT vehicle_id) as charging_count
    FROM vehicle_performance_summary
    WHERE pack_current > 0
),
active_vehicles AS (
    SELECT 
        COUNT(DISTINCT vehicle_id) as active_count
    FROM vehicle_performance_summary
    WHERE last_updated >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
    -- 전체 통계
    (SELECT COUNT(*) FROM vehicle_performance_summary) as total_vehicles,
    (SELECT AVG(latest_soc) FROM vehicle_performance_summary) as avg_soc,
    (SELECT AVG(latest_soh) FROM vehicle_performance_summary) as avg_soh,
    (SELECT AVG(avg_efficiency) FROM vehicle_performance_summary) as avg_efficiency,
    
    -- 활성 차량
    (SELECT active_count FROM active_vehicles) as active_vehicles,
    
    -- 충전 중인 차량
    (SELECT charging_count FROM charging_vehicles) as charging_vehicles,
    
    -- 등급별 분포
    (SELECT grade_count FROM grade_stats WHERE performance_grade = 'A') as grade_a_count,
    (SELECT grade_count FROM grade_stats WHERE performance_grade = 'B') as grade_b_count,
    (SELECT grade_count FROM grade_stats WHERE performance_grade = 'C') as grade_c_count,
    (SELECT grade_count FROM grade_stats WHERE performance_grade = 'D') as grade_d_count,
    
    -- 차종별 통계
    (SELECT COUNT(*) FROM vehicle_performance_summary WHERE vehicle_type = 'BONGO3') as bongo3_count,
    (SELECT COUNT(*) FROM vehicle_performance_summary WHERE vehicle_type = 'GV60') as gv60_count,
    (SELECT COUNT(*) FROM vehicle_performance_summary WHERE vehicle_type = 'PORTER2') as porter2_count,
    
    -- 차종별 평균 SOH
    (SELECT AVG(latest_soh) FROM vehicle_performance_summary WHERE vehicle_type = 'BONGO3') as bongo3_avg_soh,
    (SELECT AVG(latest_soh) FROM vehicle_performance_summary WHERE vehicle_type = 'GV60') as gv60_avg_soh,
    (SELECT AVG(latest_soh) FROM vehicle_performance_summary WHERE vehicle_type = 'PORTER2') as porter2_avg_soh,
    
    -- 업데이트 시간
    CURRENT_TIMESTAMP as last_updated;
