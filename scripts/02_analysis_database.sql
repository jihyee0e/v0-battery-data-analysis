-- =========================
-- MATERIALIZED VIEW (성능 최적화)
-- =========================

SET search_path TO public;

-- SELECT msg_time
-- FROM gv60_bms_data 
-- GROUP BY msg_time 
-- LIMIT 2 ;  -- 23-01-03 11:58:13

-- 대시보드 통계
CREATE MATERIALIZED VIEW dashboard_stats_mv AS
WITH bms_all AS (
  SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
         mod_avg_temp, max_cell_volt, min_cell_volt
  FROM public.bongo3_bms_data
  UNION ALL
  SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
         mod_avg_temp, max_cell_volt, min_cell_volt
  FROM public.gv60_bms_data
  UNION ALL
  SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
         mod_avg_temp, max_cell_volt, min_cell_volt
  FROM public.porter2_bms_data
),
bms_pre AS (
  SELECT
    device_no,
    car_type,
    msg_time,
    TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') AS msg_ts,
    soc,
    soh,
    pack_volt,
    pack_current,
    mod_avg_temp,
    CASE 
      WHEN pack_volt > 0 AND max_cell_volt IS NOT NULL AND min_cell_volt IS NOT NULL 
      THEN (max_cell_volt - min_cell_volt) / pack_volt * 100 
      ELSE 0 
    END AS cell_balance_index
  FROM bms_all
  WHERE soc IS NOT NULL AND soh IS NOT NULL AND pack_volt > 0
),
-- 차종별 기준 시각 (데이터셋의 마지막 시각)
car_type_base_ts AS (
  SELECT 
    car_type,
    MAX(msg_ts) AS base_ts
  FROM bms_pre
  GROUP BY car_type
),
-- 차종별 최신 데이터 (차량별 최신 1건씩)
vehicle_latest AS (
  SELECT 
    b.*,
    c.base_ts,
    ROW_NUMBER() OVER (PARTITION BY b.car_type, b.device_no ORDER BY b.msg_ts DESC) AS rn
  FROM bms_pre b
  JOIN car_type_base_ts c ON b.car_type = c.car_type
),
-- 차종별 최신 데이터만 필터링
vehicle_latest_filtered AS (
  SELECT *
  FROM vehicle_latest
  WHERE rn = 1
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
-- 시간 정합된 통합 데이터 
vehicle_integrated AS (
  SELECT 
    v.*,
    g.time AS gps_time,
    g.lat,
    g.lng,
    g.speed,
    g.fuel_pct,
    CASE 
      WHEN ABS(EXTRACT(EPOCH FROM (v.msg_ts - g.time))) <= 60 THEN g.speed
      ELSE NULL 
    END AS valid_speed,
    CASE 
      WHEN ABS(EXTRACT(EPOCH FROM (v.msg_ts - g.time))) <= 60 THEN g.fuel_pct
      ELSE NULL 
    END AS valid_fuel_pct
  FROM vehicle_latest_filtered v
  LEFT JOIN LATERAL (
    SELECT g.*
    FROM gps_all g
    WHERE g.car_type = v.car_type
      AND g.device_no = v.device_no
      AND ABS(EXTRACT(EPOCH FROM (v.msg_ts - g.time))) <= 60
    ORDER BY ABS(EXTRACT(EPOCH FROM (v.msg_ts - g.time)))
    LIMIT 1
  ) g ON TRUE
),
-- 차종별 집계
vehicle_stats AS (
  SELECT 
    car_type,
    base_ts,
    COUNT(DISTINCT device_no) AS total_vehicles,
    -- 온라인 비율 (base_ts 기준 5분 이내)
    COUNT(DISTINCT CASE WHEN msg_ts >= base_ts - INTERVAL '5 minutes' THEN device_no END) AS online_5m_count,
    ROUND(
      COUNT(DISTINCT CASE WHEN msg_ts >= base_ts - INTERVAL '5 minutes' THEN device_no END) * 100.0 / 
      COUNT(DISTINCT device_no), 2
    ) AS online_5m_pct,
    -- 충전 중 대수 (base_ts 기준 5분 이내)
    COUNT(DISTINCT CASE WHEN msg_ts >= base_ts - INTERVAL '5 minutes' AND pack_current > 0 THEN device_no END) AS charging_now,
    -- 주행 중 대수 (base_ts 기준 5분 이내, 시간 정합된 데이터만)
    COUNT(DISTINCT CASE WHEN msg_ts >= base_ts - INTERVAL '5 minutes' AND valid_speed > 0 THEN device_no END) AS moving_now,
    -- 평균 SOC, SOH
    ROUND(AVG(soc), 2) AS avg_soc,
    ROUND(AVG(soh), 2) AS avg_soh,
    -- 리스크 비율들
    ROUND(
      COUNT(CASE WHEN soh < 80 THEN 1 END) * 100.0 / COUNT(*), 2
    ) AS low_SOH_pct,
    ROUND(
      COUNT(CASE WHEN mod_avg_temp > 45 THEN 1 END) * 100.0 / COUNT(*), 2
    ) AS high_temp_pct,
    ROUND(
      COUNT(CASE WHEN cell_balance_index > 1.5 THEN 1 END) * 100.0 / COUNT(*), 2
    ) AS high_imbalance_pct
  FROM vehicle_integrated
  GROUP BY car_type, base_ts
),
-- 전체 집계 (가중평균)
total_stats AS (
  SELECT 
    'TOTAL' AS car_type,
    MAX(base_ts) AS base_ts,
    SUM(total_vehicles) AS total_vehicles,
    SUM(online_5m_count) AS online_5m_count,
    ROUND(SUM(online_5m_count) * 100.0 / SUM(total_vehicles), 2) AS online_5m_pct,
    SUM(charging_now) AS charging_now,
    SUM(moving_now) AS moving_now,
    ROUND(SUM(avg_soc * total_vehicles) / SUM(total_vehicles), 2) AS avg_soc,
    ROUND(SUM(avg_soh * total_vehicles) / SUM(total_vehicles), 2) AS avg_soh,
    ROUND(SUM(low_SOH_pct * total_vehicles) / SUM(total_vehicles), 2) AS low_SOH_pct,
    ROUND(SUM(high_temp_pct * total_vehicles) / SUM(total_vehicles), 2) AS high_temp_pct,
    ROUND(SUM(high_imbalance_pct * total_vehicles) / SUM(total_vehicles), 2) AS high_imbalance_pct
  FROM vehicle_stats
)
SELECT 
  car_type,
  total_vehicles,
  online_5m_pct,
  charging_now,
  moving_now,
  avg_soc,
  avg_soh,
  low_SOH_pct,
  high_temp_pct,
  high_imbalance_pct,
  base_ts AS last_updated
FROM vehicle_stats
UNION ALL
SELECT 
  car_type,
  total_vehicles,
  online_5m_pct,
  charging_now,
  moving_now,
  avg_soc,
  avg_soh,
  low_SOH_pct,
  high_temp_pct,
  high_imbalance_pct,
  base_ts AS last_updated
FROM total_stats;

-- 차량 성능 요약
CREATE MATERIALIZED VIEW vehicle_performance_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
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
latest_bms AS (
    SELECT 
        device_no,
        car_type,
        msg_time, 
        soc,
        soh,
        pack_volt,
        pack_current,
        mod_avg_temp,
        (max_cell_volt - min_cell_volt) / pack_volt * 100 AS cell_balance_index,
        ROW_NUMBER() OVER (PARTITION BY device_no ORDER BY TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') DESC) AS rn
    FROM bms_all
    WHERE soc IS NOT NULL AND soh IS NOT NULL
),
latest_gps AS (
    SELECT 
        device_no,
        car_type,
        time,
        lat,
        lng,
        speed,
        fuel_pct,
        ROW_NUMBER() OVER (PARTITION BY device_no ORDER BY time DESC) AS rn
    FROM gps_all
    WHERE speed IS NOT NULL
),
vehicle_integrated AS (
    SELECT 
        b.device_no AS vehicle_id,
        b.car_type AS vehicle_type,
        b.soc AS latest_soc,
        b.soh AS latest_soh,
        b.pack_volt,
        b.pack_current,
        b.mod_avg_temp,
        b.cell_balance_index,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        b.msg_time,
        g.time as gps_time
    FROM latest_bms b
    LEFT JOIN latest_gps g ON b.device_no = g.device_no
)
SELECT 
    vehicle_id,
    vehicle_type,
    latest_soc,
    latest_soh,
    pack_volt,
    pack_current,
    mod_avg_temp,
    cell_balance_index,
    speed,
    lat,
    lng,
    fuel_pct,
    CASE 
        WHEN latest_soh >= 90 THEN '우수'
        WHEN latest_soh >= 80 THEN '양호'
        WHEN latest_soh >= 70 THEN '보통'
        ELSE '불량'
    END AS performance_grade,
    CASE 
        WHEN pack_current > 0 THEN 'charging'
        WHEN pack_current < -10 THEN 'discharging'
        ELSE 'idle'
    END AS vehicle_status,
    CURRENT_TIMESTAMP AS last_updated
FROM vehicle_integrated;

-- 셀 밸런스 분석 
CREATE MATERIALIZED VIEW cell_balance_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
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
integrated_data AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.msg_time,
        b.soc,
        b.pack_current,
        b.mod_avg_temp,
        (b.max_cell_volt - b.min_cell_volt) / b.pack_volt * 100 AS cell_balance_index,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        CASE 
            WHEN ABS(b.pack_current) > 10 AND (b.max_cell_volt - b.min_cell_volt) / b.pack_volt > 1.5 THEN 'high_current_imbalance'
            WHEN b.mod_avg_temp > 45 AND (b.max_cell_volt - b.min_cell_volt) / b.pack_volt > 1.0 THEN 'high_temp_imbalance'
            WHEN b.soc < 20 AND (b.max_cell_volt - b.min_cell_volt) / b.pack_volt > 1.8 THEN 'low_soc_imbalance'
            ELSE 'normal_condition'
        END AS imbalance_trigger
    FROM bms_all b
    LEFT JOIN gps_all g ON b.device_no = g.device_no 
        AND ABS(EXTRACT(EPOCH FROM (TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') - g.time))) < 300
    WHERE b.max_cell_volt IS NOT NULL AND b.min_cell_volt IS NOT NULL AND b.pack_volt > 0
)
SELECT 
    device_no,
    car_type,
    msg_time,
    soc,
    pack_current,
    mod_avg_temp,
    cell_balance_index,
    speed,
    lat,
    lng,
    fuel_pct,
    imbalance_trigger
FROM integrated_data;

-- 트렌드 분석 
CREATE MATERIALIZED VIEW trends_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
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
integrated_data AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.msg_time,
        b.soc,
        b.soh,
        b.pack_volt,
        b.pack_current,
        b.mod_avg_temp,
        b.max_cell_volt,
        b.min_cell_volt,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct
    FROM bms_all b
    LEFT JOIN gps_all g ON b.device_no = g.device_no 
        AND ABS(EXTRACT(EPOCH FROM (TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') - g.time))) < 300
    WHERE b.soc IS NOT NULL OR b.soh IS NOT NULL
)
SELECT 
    device_no,
    car_type,
    msg_time,
    soc,
    soh,
    pack_volt,
    pack_current,
    mod_avg_temp,
    max_cell_volt,
    min_cell_volt,
    speed,
    lat,
    lng,
    fuel_pct
FROM integrated_data;

-- 충전 패턴 분석
CREATE MATERIALIZED VIEW charging_patterns_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt
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
integrated_data AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.msg_time,
        b.soc,
        b.pack_current,
        b.pack_volt,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        CASE 
            WHEN b.pack_current > 0 THEN 'charging'
            WHEN b.pack_current < 0 THEN 'discharging'
            ELSE 'idle'
        END AS charging_status
    FROM bms_all b
    LEFT JOIN gps_all g ON b.device_no = g.device_no 
        AND ABS(EXTRACT(EPOCH FROM (TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') - g.time))) < 300
    WHERE b.pack_current IS NOT NULL
)
SELECT 
    device_no,
    car_type,
    msg_time,
    soc,
    pack_current,
    pack_volt,
    speed,
    lat,
    lng,
    fuel_pct,
    charging_status
FROM integrated_data;

-- 주행 패턴 분석
CREATE MATERIALIZED VIEW driving_patterns_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt,
           mod_avg_temp 
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt,
           mod_avg_temp
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt,
           mod_avg_temp 
    FROM public.porter2_bms_data
),
gps_all AS (
    SELECT device_no, car_type, time, lat, lng, speed
FROM public.bongo3_gps_data
UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed
    FROM public.gv60_gps_data
    UNION ALL
    SELECT device_no, car_type, time, lat, lng, speed
    FROM public.porter2_gps_data
),
driving_cycles AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.msg_time,
        b.soc,
        b.pack_current,
        b.pack_volt,
        b.mod_avg_temp,
        g.speed,
        g.lat,
        g.lng,
        CASE 
            WHEN g.speed > 80 THEN 'highway'
            WHEN g.speed > 40 THEN 'urban_highway'
            WHEN g.speed > 20 THEN 'urban'
            WHEN g.speed > 5  THEN 'slow_urban'
            ELSE 'stationary'
        END AS driving_mode,
        ROUND((b.pack_volt * b.pack_current), 2) AS power_w,
        LAG(b.soc) OVER (PARTITION BY b.device_no ORDER BY TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS')) AS prev_soc
    FROM bms_all b
    LEFT JOIN gps_all g 
      ON b.device_no = g.device_no 
     AND ABS(EXTRACT(EPOCH FROM (TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') - g.time))) < 300
    WHERE b.soc IS NOT NULL AND g.speed IS NOT NULL
),
pattern_performance AS (
    SELECT 
        device_no,
        car_type,
        driving_mode,
        AVG(power_w) AS avg_power,
        STDDEV(power_w) AS power_variability,
        AVG(mod_avg_temp) AS avg_temp,
        (MAX(mod_avg_temp) - MIN(mod_avg_temp)) AS temp_range,
        AVG( CASE WHEN prev_soc IS NOT NULL AND prev_soc > soc 
                  THEN (prev_soc - soc) / NULLIF(ABS(power_w), 0) * 1000
                  ELSE NULL END ) AS soc_efficiency,
        COUNT(*) AS data_points
    FROM driving_cycles
    GROUP BY device_no, car_type, driving_mode
)
SELECT 
    device_no,
    car_type,
    driving_mode,
    avg_power,
    power_variability,
    avg_temp,
    temp_range,
    soc_efficiency,
    data_points,
    CASE 
        WHEN power_variability < 1000 AND temp_range < 10 THEN 'stable'
        WHEN power_variability < 2000 AND temp_range < 15 THEN 'moderate'
        ELSE 'variable'
    END AS performance_stability
FROM pattern_performance
WHERE data_points >= 5;

-- BMS 반응 분석
CREATE MATERIALIZED VIEW bms_response_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt,
           mod_avg_temp , max_cell_volt, min_cell_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.gv60_bms_data
UNION ALL
    SELECT device_no, car_type, msg_time, soc, pack_current, pack_volt,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.porter2_bms_data
),
bms_reactions AS (
    SELECT 
        device_no,
        car_type,
        msg_time,
        soc,
        pack_current,
        pack_volt,
        mod_avg_temp,
        max_cell_volt,
        min_cell_volt,
        CASE 
            WHEN pack_current > 0 THEN 'charging'
            WHEN pack_current < 0 THEN 'discharging'
            ELSE 'idle'
        END AS operation_mode,
        (max_cell_volt - min_cell_volt) / pack_volt * 100 AS voltage_balance,
        LAG(mod_avg_temp) OVER (PARTITION BY device_no ORDER BY TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS')) AS prev_temp
    FROM bms_all
    WHERE soc IS NOT NULL AND pack_volt > 0
),
response_patterns AS (
    SELECT 
        device_no,
        car_type,
        operation_mode,
        AVG(voltage_balance) AS avg_voltage_balance,
        STDDEV(voltage_balance) AS voltage_balance_variability,
        AVG(mod_avg_temp) AS avg_temp,
        AVG(ABS(mod_avg_temp - prev_temp)) AS temp_response_sensitivity,
        COUNT(*) AS operation_count
    FROM bms_reactions
    GROUP BY device_no, car_type, operation_mode
)
SELECT 
    device_no,
    car_type,
    operation_mode,
    avg_voltage_balance,
    voltage_balance_variability,
    avg_temp,
    temp_response_sensitivity,
    operation_count,
    CASE 
        WHEN voltage_balance_variability < 0.5 AND temp_response_sensitivity < 2 THEN 'excellent'
        WHEN voltage_balance_variability < 1.0 AND temp_response_sensitivity < 5 THEN 'good'
        WHEN voltage_balance_variability < 2.0 AND temp_response_sensitivity < 10 THEN 'moderate'
        ELSE 'poor'
    END AS bms_response_quality
FROM response_patterns
WHERE operation_count >= 10;

-- 복합 건강 지수
CREATE MATERIALIZED VIEW battery_health_mv AS
WITH bms_all AS (
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, car_type, msg_time, soc, soh, pack_volt, pack_current,
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
health_components AS (
    SELECT 
        b.device_no,
        b.car_type,
        b.soc,
        b.soh,
        b.pack_volt,
        b.pack_current,
        b.mod_avg_temp,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        CASE 
            WHEN b.max_cell_volt IS NOT NULL AND b.min_cell_volt IS NOT NULL AND b.pack_volt > 0 THEN
                GREATEST(0, 100 - ((b.max_cell_volt - b.min_cell_volt) / b.pack_volt * 1000))
            ELSE 100 
        END AS balance_score,
        CASE 
            WHEN b.mod_avg_temp BETWEEN 15 AND 35 THEN 100
            WHEN b.mod_avg_temp BETWEEN 10 AND 40 THEN 80
            WHEN b.mod_avg_temp BETWEEN 5  AND 45 THEN 60
            ELSE 40 
        END AS temperature_score,
        CASE 
            WHEN b.pack_volt > 0 THEN
                GREATEST(0, 100 - (STDDEV(b.pack_volt) OVER (
                    PARTITION BY b.device_no
                                    ORDER BY TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS')
                ROWS BETWEEN 10 PRECEDING AND CURRENT ROW
            ) * 10))
        ELSE 100 
    END AS voltage_stability_score,
    ROW_NUMBER() OVER (PARTITION BY b.device_no ORDER BY TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') DESC) AS rn
    FROM bms_all b
    LEFT JOIN gps_all g ON b.device_no = g.device_no 
        AND ABS(EXTRACT(EPOCH FROM (TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') - g.time))) < 300
    WHERE b.soh IS NOT NULL
),
health_calculation AS (
    SELECT 
        device_no,
        car_type,
        soc,
        soh,
        speed,
        lat,
        lng,
        fuel_pct,
        ROUND(
            (soh * 0.40) + 
            (balance_score * 0.25) + 
            (temperature_score * 0.20) + 
            (voltage_stability_score * 0.15), 2
        ) AS composite_health_index,
        balance_score,
        temperature_score,
        voltage_stability_score
    FROM health_components
)
SELECT 
    device_no,
    car_type,
    soc,
    soh,
    speed,
    lat,
    lng,
    fuel_pct,
    composite_health_index,
    balance_score,
    temperature_score,
    voltage_stability_score,
    CASE 
        WHEN composite_health_index >= 95 THEN 'excellent'
        WHEN composite_health_index >= 90 THEN 'very_good'
        WHEN composite_health_index >= 85 THEN 'good'
        WHEN composite_health_index >= 80 THEN 'fair'
        ELSE 'needs_attention'
    END AS health_grade
FROM health_calculation;

-- 이상 패턴 탐지 (MATERIALIZED VIEW로 변경)
CREATE MATERIALIZED VIEW anomaly_detection_mv AS
WITH bms_all AS (
    SELECT device_no, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.bongo3_bms_data
    UNION ALL
    SELECT device_no, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.gv60_bms_data
    UNION ALL
    SELECT device_no, msg_time, soc, soh, pack_volt, pack_current,
           mod_avg_temp, max_cell_volt, min_cell_volt
    FROM public.porter2_bms_data
),
anomaly_indicators AS (
    SELECT 
        device_no,
        msg_time,
        soc,
        soh,
        pack_volt,
        pack_current,
        mod_avg_temp,
        max_cell_volt,
        min_cell_volt,
        CASE 
            WHEN soh < 90 THEN 'low_soh'
            WHEN pack_volt > 0 AND (max_cell_volt - min_cell_volt) / pack_volt > 0.03 THEN 'high_imbalance'
            WHEN mod_avg_temp > 50 THEN 'high_temperature'
            WHEN mod_avg_temp < 0  THEN 'low_temperature'
            WHEN pack_volt < 300 THEN 'low_voltage'
            WHEN pack_volt > 450 THEN 'high_voltage'
            WHEN ABS(pack_current) > 50 THEN 'extreme_current'
            ELSE 'normal'
        END AS anomaly_type,
        CASE 
            WHEN soh < 90 THEN (90 - soh) * 2
            WHEN pack_volt > 0 AND (max_cell_volt - min_cell_volt) / pack_volt > 0.03 THEN 
                ((max_cell_volt - min_cell_volt) / pack_volt - 0.03) * 1000
            WHEN mod_avg_temp > 50 THEN (mod_avg_temp - 50) * 2
            WHEN mod_avg_temp < 0  THEN ABS(mod_avg_temp) * 2
            WHEN pack_volt < 300 THEN (300 - pack_volt) * 0.5
            WHEN pack_volt > 450 THEN (pack_volt - 450) * 0.5
            WHEN ABS(pack_current) > 50 THEN (ABS(pack_current) - 50) * 2
            ELSE 0 
        END AS anomaly_severity,
        ROW_NUMBER() OVER (PARTITION BY device_no ORDER BY TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') DESC) AS rn
    FROM bms_all
    WHERE soh IS NOT NULL AND pack_volt > 0
)
SELECT 
    device_no,
    msg_time,
    soc,
    soh,
    anomaly_type,
    anomaly_severity,
    CASE 
        WHEN anomaly_severity >= 80 THEN 'critical'
        WHEN anomaly_severity >= 60 THEN 'high'
        WHEN anomaly_severity >= 40 THEN 'medium'
        WHEN anomaly_severity >= 20 THEN 'low'
        ELSE 'normal'
    END AS risk_level
FROM anomaly_indicators
WHERE anomaly_type <> 'normal';

-- 랭킹 (MATERIALIZED VIEW로 변경)
CREATE MATERIALIZED VIEW vehicle_rankings_mv AS
WITH performance_scores AS (
    SELECT 
        vehicle_id,
        vehicle_type,
        latest_soh,
        latest_soc,
        cell_balance_index as avg_efficiency,
        ROUND(
            (latest_soh * 0.50) + 
            (latest_soc * 0.30) + 
            (GREATEST(0, 100 - cell_balance_index) * 0.20), 2
        ) AS overall_score
    FROM vehicle_performance_mv
    WHERE latest_soh IS NOT NULL
),
rankings AS (
    SELECT 
        vehicle_id,
        vehicle_type,
        latest_soh,
        latest_soc,
        avg_efficiency,
        overall_score,
        ROW_NUMBER()  OVER (ORDER BY overall_score DESC) AS overall_rank,
        ROW_NUMBER()  OVER (ORDER BY latest_soh DESC) AS soh_rank,
        ROW_NUMBER()  OVER (ORDER BY latest_soc DESC) AS soc_rank,
        PERCENT_RANK() OVER (ORDER BY overall_score) * 100 AS overall_percentile
    FROM performance_scores
)
SELECT 
    vehicle_id,
    vehicle_type,
    latest_soh,
    latest_soc,
    avg_efficiency,
    overall_score,
    overall_rank,
    soh_rank,
    soc_rank,
    CASE 
        WHEN overall_percentile >= 90 THEN 'TOP_10'
        WHEN overall_percentile >= 75 THEN 'HIGH_PERFORMANCE'
        WHEN overall_percentile >= 50 THEN 'AVERAGE'
        ELSE 'NEEDS_ATTENTION'
    END AS performance_category
FROM rankings;

-- 차량 제원 비교 뷰
CREATE MATERIALIZED VIEW vehicle_spec_comparison_mv AS
WITH actual_performance AS (
    SELECT 
        car_type,
        COUNT(DISTINCT device_no) as vehicle_count,
        ROUND(AVG(soh), 2) as actual_avg_soh,
        ROUND(AVG((pack_volt * pack_current) / 1000), 2) as actual_avg_power,
        ROUND(AVG(mod_avg_temp), 2) as actual_avg_temp,
        ROUND(AVG((max_cell_volt - min_cell_volt) / pack_volt * 100), 3) as actual_avg_cell_balance,
        ROUND(AVG(pack_volt), 2) as avg_pack_volt,
        ROUND(AVG(ABS(pack_current)), 2) as avg_pack_current,
        ROUND(AVG(soc), 2) as avg_soc
    FROM (
        SELECT device_no, car_type, soh, pack_volt, pack_current, mod_avg_temp, max_cell_volt, min_cell_volt, soc
        FROM public.bongo3_bms_data
        WHERE soh IS NOT NULL AND pack_volt > 0
        UNION ALL
        SELECT device_no, car_type, soh, pack_volt, pack_current, mod_avg_temp, max_cell_volt, min_cell_volt, soc
        FROM public.gv60_bms_data
        WHERE soh IS NOT NULL AND pack_volt > 0
        UNION ALL
        SELECT device_no, car_type, soh, pack_volt, pack_current, mod_avg_temp, max_cell_volt, min_cell_volt, soc
        FROM public.porter2_bms_data
        WHERE soh IS NOT NULL AND pack_volt > 0
    ) all_bms
    GROUP BY car_type
)
SELECT 
    car_type,
    vehicle_count,
    actual_avg_soh,
    actual_avg_power,
    actual_avg_temp,
    actual_avg_cell_balance,
    avg_pack_volt,
    avg_pack_current,
    avg_soc,
    -- 실제 배터리 용량 추정 (전압 기반)
    ROUND(avg_pack_volt * avg_pack_current / 1000, 2) as estimated_battery_capacity_kwh,
    -- 실제 주행 거리 추정 (SOC 기반)
    ROUND(avg_soc * 10, 0) as estimated_range_km,
    -- 실제 효율성 (전력 기반)
    ROUND(avg_pack_volt / avg_pack_current, 2) as actual_efficiency_kmkwh,
    -- 효율성 저하율
    ROUND((100 - actual_avg_soh) / 100 * 100, 2) as efficiency_degradation_rate,
    -- 배터리 수명 예측
    CASE 
        WHEN actual_avg_soh >= 90 THEN 'Excellent'
        WHEN actual_avg_soh >= 80 THEN 'Good'
        WHEN actual_avg_soh >= 70 THEN 'Fair'
        ELSE 'Poor'
    END as battery_life_prediction
FROM actual_performance
ORDER BY efficiency_degradation_rate ASC;


-- -- =========================
-- -- 3) 인덱스 (원본 테이블에만)
-- -- =========================

-- BMS: 기본 시계열 조인/필터
CREATE INDEX IF NOT EXISTS idx_bongo3_bms_dev_time ON bongo3_bms_data(device_no, msg_time);
CREATE INDEX IF NOT EXISTS idx_gv60_bms_dev_time   ON gv60_bms_data(device_no, msg_time);
CREATE INDEX IF NOT EXISTS idx_porter2_bms_dev_time ON porter2_bms_data(device_no, msg_time);

-- BMS: 자주 참조되는 컬럼
CREATE INDEX IF NOT EXISTS idx_bongo3_bms_soh       ON bongo3_bms_data(soh);
CREATE INDEX IF NOT EXISTS idx_gv60_bms_soh         ON gv60_bms_data(soh);
CREATE INDEX IF NOT EXISTS idx_porter2_bms_soh      ON porter2_bms_data(soh);

CREATE INDEX IF NOT EXISTS idx_bongo3_bms_pack_v    ON bongo3_bms_data(pack_volt);
CREATE INDEX IF NOT EXISTS idx_gv60_bms_pack_v      ON gv60_bms_data(pack_volt);
CREATE INDEX IF NOT EXISTS idx_porter2_bms_pack_v   ON porter2_bms_data(pack_volt);

CREATE INDEX IF NOT EXISTS idx_bongo3_bms_pack_i    ON bongo3_bms_data(pack_current);
CREATE INDEX IF NOT EXISTS idx_gv60_bms_pack_i      ON gv60_bms_data(pack_current);
CREATE INDEX IF NOT EXISTS idx_porter2_bms_pack_i   ON porter2_bms_data(pack_current);

CREATE INDEX IF NOT EXISTS idx_bongo3_bms_temp_avg  ON bongo3_bms_data(mod_avg_temp);
CREATE INDEX IF NOT EXISTS idx_gv60_bms_temp_avg    ON gv60_bms_data(mod_avg_temp);
CREATE INDEX IF NOT EXISTS idx_porter2_bms_temp_avg ON porter2_bms_data(mod_avg_temp);

-- GPS: 시간 매칭용
CREATE INDEX IF NOT EXISTS idx_bongo3_gps_dev_time ON bongo3_gps_data(device_no, time);
CREATE INDEX IF NOT EXISTS idx_gv60_gps_dev_time   ON gv60_gps_data(device_no, time);
CREATE INDEX IF NOT EXISTS idx_porter2_gps_dev_time ON porter2_gps_data(device_no, time);

CREATE INDEX IF NOT EXISTS idx_bms_device_time ON bongo3_bms_data(device_no, msg_time);
CREATE INDEX IF NOT EXISTS idx_bms_car_type ON bongo3_bms_data(car_type);
CREATE INDEX IF NOT EXISTS idx_bms_soh ON bongo3_bms_data(soh);
CREATE INDEX IF NOT EXISTS idx_bms_temp ON bongo3_bms_data(mod_avg_temp);
CREATE INDEX IF NOT EXISTS idx_bms_balance ON bongo3_bms_data(max_cell_volt, min_cell_volt, pack_volt);
CREATE INDEX IF NOT EXISTS idx_gps_device_time ON bongo3_gps_data(device_no, time);
CREATE INDEX IF NOT EXISTS idx_gps_speed ON bongo3_gps_data(speed);