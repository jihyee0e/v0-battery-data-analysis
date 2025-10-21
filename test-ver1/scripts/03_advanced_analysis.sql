-- 고급 배터리 분석 및 노화 예측 뷰들

-- 1. 셀 밸런스 트렌드 분석
CREATE MATERIALIZED VIEW cell_balance_trends_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_ts, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_ts, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_ts, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.porter2_bms_data
),
gps_all AS (
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.bongo3_gps_data
    UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.gv60_gps_data
    UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.porter2_gps_data
),
balance_data AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.msg_ts,
        b.soc,
        b.soh,
        b.pack_volt,
        b.pack_current,
        b.mod_avg_temp,
        (b.max_cell_volt - b.min_cell_volt) / b.pack_volt * 100 as balance_index,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        DATE_TRUNC('day', b.msg_ts) as date
    FROM bms_all b
    LEFT JOIN gps_all g ON b.device_no = g.device_no 
        AND ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time))) < 300
    WHERE b.max_cell_volt IS NOT NULL 
      AND b.min_cell_volt IS NOT NULL 
      AND b.pack_volt > 0
)
SELECT 
    date,
    car_type,
    COUNT(*) as data_points,
    AVG(balance_index) as avg_balance_index,
    STDDEV(balance_index) as balance_variability,
    MIN(balance_index) as min_balance_index,
    MAX(balance_index) as max_balance_index,
    AVG(soc) as avg_soc,
    AVG(soh) as avg_soh,
    AVG(mod_avg_temp) as avg_temp,
    AVG(speed) as avg_speed,
    AVG(fuel_pct) as avg_fuel_pct,
    -- 밸런스 상태 분류
    COUNT(CASE WHEN balance_index <= 0.5 THEN 1 END) as excellent_balance_count,
    COUNT(CASE WHEN balance_index > 0.5 AND balance_index <= 1.0 THEN 1 END) as good_balance_count,
    COUNT(CASE WHEN balance_index > 1.0 AND balance_index <= 2.0 THEN 1 END) as moderate_balance_count,
    COUNT(CASE WHEN balance_index > 2.0 THEN 1 END) as poor_balance_count
FROM balance_data
GROUP BY date, car_type
ORDER BY date DESC, car_type;

-- 2. 주행 패턴별 성능 분석
CREATE MATERIALIZED VIEW driving_pattern_performance_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_ts, soc, soh, pack_volt, pack_current,
           mod_avg_temp
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_ts, soc, soh, pack_volt, pack_current,
           mod_avg_temp
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_ts, soc, soh, pack_volt, pack_current,
           mod_avg_temp
    FROM public.porter2_bms_data
),
gps_all AS (
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.bongo3_gps_data
    UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.gv60_gps_data
    UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.porter2_gps_data
),
driving_patterns AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.msg_ts,
        b.soc,
        b.soh,
        b.pack_volt,
        b.pack_current,
        b.mod_avg_temp,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        -- 주행 패턴 분류
        CASE 
            WHEN g.speed >= 80 THEN 'highway'
            WHEN g.speed >= 50 THEN 'urban_highway'
            WHEN g.speed >= 20 THEN 'urban'
            WHEN g.speed >= 5 THEN 'slow_urban'
            ELSE 'stationary'
        END as driving_mode,
        -- 전력 계산
        ABS(b.pack_volt * b.pack_current) as power_w
    FROM bms_all b
    LEFT JOIN gps_all g ON b.device_no = g.device_no 
        AND ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time))) < 300
    WHERE b.pack_current < 0  -- 방전 중인 경우만
)
SELECT 
    driving_mode,
    car_type,
    COUNT(*) as data_points,
    AVG(soc) as avg_soc,
    AVG(soh) as avg_soh,
    AVG(power_w) as avg_power,
    STDDEV(power_w) as power_variability,
    AVG(mod_avg_temp) as avg_temp,
    MIN(mod_avg_temp) as min_temp,
    MAX(mod_avg_temp) as max_temp,
    AVG(speed) as avg_speed,
    AVG(fuel_pct) as avg_fuel_pct,
    -- SOC 효율성 (km당 SOC 소모)
    AVG(ABS(pack_current) / NULLIF(speed, 0)) as soc_consumption_rate,
    -- 온도 범위
    MAX(mod_avg_temp) - MIN(mod_avg_temp) as temp_range
FROM driving_patterns
WHERE speed > 0  -- 정지 상태 제외
GROUP BY driving_mode, car_type
ORDER BY driving_mode, car_type;

-- 3. 충전 효율성 분석 
CREATE MATERIALIZED VIEW charging_efficiency_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_ts, soc, pack_volt, pack_current, mod_avg_temp
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_ts, soc, pack_volt, pack_current, mod_avg_temp
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_ts, soc, pack_volt, pack_current, mod_avg_temp
    FROM public.porter2_bms_data
),
gps_all AS (
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.bongo3_gps_data
    UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.gv60_gps_data
    UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed, fuel_pct
    FROM public.porter2_gps_data
),
charging_sessions AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.msg_ts,
        b.soc,
        b.pack_volt,
        b.pack_current,
        b.mod_avg_temp,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        -- 충전 세션 시작/종료 감지
        CASE 
            WHEN b.pack_current >= 1 AND LAG(b.pack_current) OVER (PARTITION BY b.device_no ORDER BY b.msg_ts) < 1 
            THEN 'START'
            WHEN b.pack_current < 1 AND LAG(b.pack_current) OVER (PARTITION BY b.device_no ORDER BY b.msg_ts) >= 1 
            THEN 'END'
            ELSE 'CHARGING'
        END as session_status,
        -- 충전 전력 계산
        b.pack_volt * b.pack_current as power_w
    FROM bms_all b
    LEFT JOIN gps_all g ON b.device_no = g.device_no 
        AND ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time))) < 300
    WHERE b.pack_current > 0  -- 충전 중인 경우만
),
session_summary AS (
    SELECT 
        device_no,
        car_type,
        session_status,
        msg_ts,
        soc,
        power_w,
        mod_avg_temp,
        speed,
        lat,
        lng,
        fuel_pct,
        -- 세션별 그룹화
        SUM(CASE WHEN session_status = 'START' THEN 1 ELSE 0 END) OVER (PARTITION BY device_no ORDER BY msg_ts) as session_id
    FROM charging_sessions
)
SELECT 
    device_no,
    car_type,
    session_id,
    MIN(CASE WHEN session_status = 'START' THEN msg_ts END) as charge_start_time,
    MAX(CASE WHEN session_status = 'END' THEN msg_ts END) as charge_end_time,
    MIN(CASE WHEN session_status = 'START' THEN soc END) as start_soc,
    MAX(CASE WHEN session_status = 'END' THEN soc END) as end_soc,
    AVG(power_w) as avg_charging_power,
    AVG(mod_avg_temp) as avg_charging_temp,
    AVG(speed) as avg_speed,
    AVG(fuel_pct) as avg_fuel_pct,
    -- 충전 효율성 계산
    CASE 
        WHEN MAX(CASE WHEN session_status = 'END' THEN soc END) > MIN(CASE WHEN session_status = 'START' THEN soc END)
        THEN ROUND(
            (MAX(CASE WHEN session_status = 'END' THEN soc END) - MIN(CASE WHEN session_status = 'START' THEN soc END)) / 
            (EXTRACT(EPOCH FROM (MAX(CASE WHEN session_status = 'END' THEN msg_ts END) - MIN(CASE WHEN session_status = 'START' THEN TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') END))) / 3600), 2
        )
        ELSE 0
    END as soc_per_hour,  -- 시간당 SOC 증가량
    -- 충전 시간
    EXTRACT(EPOCH FROM (
        MAX(CASE WHEN session_status = 'END' THEN msg_ts END) - 
        MIN(CASE WHEN session_status = 'START' THEN msg_ts END)
    )) / 3600 as charging_hours
FROM session_summary
GROUP BY device_no, car_type, session_id
HAVING MIN(CASE WHEN session_status = 'START' THEN msg_ts END) IS NOT NULL;

-- 4. 온도-전압 상관관계 분석 
CREATE MATERIALIZED VIEW temperature_voltage_correlation_mv AS
WITH temp_volt_data AS (
    SELECT 
        device_no,
        car_type,
        msg_ts,
        soc,
        soh,
        pack_volt,
        pack_current,
        mod_avg_temp,
        max_cell_volt,
        min_cell_volt,
        -- 온도 변화율 (이전 값 대비)
        LAG(mod_avg_temp) OVER (PARTITION BY device_no ORDER BY msg_ts) as prev_temp,
        -- 전압 변화율 (이전 값 대비)
        LAG(pack_volt) OVER (PARTITION BY device_no ORDER BY msg_ts) as prev_volt
    FROM bongo3_bms_data
    WHERE mod_avg_temp IS NOT NULL AND pack_volt > 0
),
correlation_analysis AS (
    SELECT 
        device_no,
        car_type,
        msg_ts,
        soc,
        soh,
        pack_volt,
        pack_current,
        mod_avg_temp,
        max_cell_volt,
        min_cell_volt,
        -- 온도 변화율 (%)
        CASE 
            WHEN prev_temp IS NOT NULL AND prev_temp > 0
            THEN ((mod_avg_temp - prev_temp) / prev_temp) * 100
            ELSE 0
        END as temp_change_rate,
        -- 전압 변화율 (%)
        CASE 
            WHEN prev_volt IS NOT NULL AND prev_volt > 0
            THEN ((pack_volt - prev_volt) / prev_volt) * 100
            ELSE 0
        END as volt_change_rate,
        -- 온도-전압 상관계수 (이동 평균)
        AVG(mod_avg_temp * pack_volt) OVER (PARTITION BY device_no ORDER BY msg_ts ROWS BETWEEN 10 PRECEDING AND CURRENT ROW) as temp_volt_correlation
    FROM temp_volt_data
)
SELECT 
    device_no,
    car_type,
    msg_ts,
    soc,
    soh,
    pack_volt,
    mod_avg_temp,
    max_cell_volt,
    min_cell_volt,
    temp_change_rate,
    volt_change_rate,
    temp_volt_correlation,
    -- 온도 민감도 등급
    CASE 
        WHEN ABS(temp_change_rate) > 10 THEN 'high_sensitivity'
        WHEN ABS(temp_change_rate) > 5 THEN 'medium_sensitivity'
        ELSE 'low_sensitivity'
    END as temperature_sensitivity,
    -- 전압 안정성 등급
    CASE 
        WHEN ABS(volt_change_rate) > 5 THEN 'unstable'
        WHEN ABS(volt_change_rate) > 2 THEN 'moderate'
        ELSE 'stable'
    END as voltage_stability
FROM correlation_analysis
WHERE temp_change_rate IS NOT NULL AND volt_change_rate IS NOT NULL;

-- 5. 장기 성능 추이 분석 
CREATE MATERIALIZED VIEW long_term_performance_trends_mv AS
WITH monthly_performance AS (
    SELECT 
        device_no,
        car_type,
        DATE_TRUNC('month', msg_ts) as month,
        AVG(soh) as avg_soh,
        AVG(mod_avg_temp) as avg_temp,
        AVG((max_cell_volt - min_cell_volt) / pack_volt * 100) as avg_balance_index,
        COUNT(*) as data_points
    FROM bongo3_bms_data
    GROUP BY device_no, car_type, DATE_TRUNC('month', msg_ts)
),
performance_changes AS (
    SELECT 
        device_no,
        car_type,
        month,
        avg_soh,
        avg_temp,
        avg_balance_index,
        data_points,
        -- 이전 달 대비 변화율
        LAG(avg_soh) OVER (PARTITION BY device_no ORDER BY month) as prev_soh,
        LAG(avg_temp) OVER (PARTITION BY device_no ORDER BY month) as prev_temp,
        LAG(avg_balance_index) OVER (PARTITION BY device_no ORDER BY month) as prev_balance,
        -- SOH 변화율 (%)
        CASE 
            WHEN LAG(avg_soh) OVER (PARTITION BY device_no ORDER BY month) > 0
            THEN ((avg_soh - LAG(avg_soh) OVER (PARTITION BY device_no ORDER BY month)) / LAG(avg_soh) OVER (PARTITION BY device_no ORDER BY month)) * 100
            ELSE 0
        END as soh_change_rate,
        -- 온도 변화율 (%)
        CASE 
            WHEN LAG(avg_temp) OVER (PARTITION BY device_no ORDER BY month) > 0
            THEN ((avg_temp - LAG(avg_temp) OVER (PARTITION BY device_no ORDER BY month)) / LAG(avg_temp) OVER (PARTITION BY device_no ORDER BY month)) * 100
            ELSE 0
        END as temp_change_rate,
        -- 밸런스 변화율 (%)
        CASE 
            WHEN LAG(avg_balance_index) OVER (PARTITION BY device_no ORDER BY month) > 0
            THEN ((avg_balance_index - LAG(avg_balance_index) OVER (PARTITION BY device_no ORDER BY month)) / LAG(avg_balance_index) OVER (PARTITION BY device_no ORDER BY month)) * 100
            ELSE 0
        END as balance_change_rate
    FROM monthly_performance
)
SELECT 
    device_no,
    car_type,
    month,
    avg_soh,
    avg_temp,
    avg_balance_index,
    data_points,
    soh_change_rate,
    temp_change_rate,
    balance_change_rate,
    -- 성능 등급 변화
    CASE 
        WHEN soh_change_rate >= -1 THEN 'stable'
        WHEN soh_change_rate >= -3 THEN 'slight_degradation'
        WHEN soh_change_rate >= -5 THEN 'moderate_degradation'
        ELSE 'severe_degradation'
    END as soh_trend,
    CASE 
        WHEN temp_change_rate <= 5 THEN 'stable'
        WHEN temp_change_rate <= 10 THEN 'moderate_increase'
        ELSE 'rapid_increase'
    END as temp_trend,
    CASE 
        WHEN balance_change_rate <= 10 THEN 'stable'
        WHEN balance_change_rate <= 20 THEN 'moderate_imbalance'
        ELSE 'rapid_imbalance'
    END as balance_trend
FROM performance_changes
ORDER BY device_no, month;