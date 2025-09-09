-- 대시보드 통계 조회
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

-- 차량 성능 요약 조회
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
-- 차종별 최신 BMS 데이터 (차량별 최신 1건씩)
latest_bms AS (
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
            THEN (max_cell_volt - min_cell_volt) / NULLIF(pack_volt, 0) * 100 
            ELSE 0 
        END AS cell_balance_index,
        ROW_NUMBER() OVER (PARTITION BY car_type, device_no ORDER BY TO_TIMESTAMP(msg_time, 'YY-MM-DD HH24:MI:SS') DESC) AS rn
    FROM bms_all
    WHERE soc IS NOT NULL AND soh IS NOT NULL AND pack_volt > 0
),
-- 차종별 최신 BMS 데이터만 필터링
latest_bms_filtered AS (
    SELECT *
    FROM latest_bms
    WHERE rn = 1
),
-- 시간 정합된 통합 데이터 (최근접 GPS 매칭)
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
        b.msg_time AS bms_time,
        g.time AS gps_time,
        g.speed,
        g.lat,
        g.lng,
        g.fuel_pct,
        ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time))) AS time_diff_seconds
    FROM latest_bms_filtered b
    LEFT JOIN LATERAL (
        SELECT g.*
        FROM gps_all g
        WHERE g.car_type = b.car_type
          AND g.device_no = b.device_no
          AND ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time))) <= 60
        ORDER BY ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time)))
        LIMIT 1
    ) g ON TRUE
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
    CASE 
        WHEN time_diff_seconds <= 60 THEN speed
        ELSE NULL 
    END AS speed,
    CASE 
        WHEN time_diff_seconds <= 60 THEN lat
        ELSE NULL 
    END AS lat,
    CASE 
        WHEN time_diff_seconds <= 60 THEN lng
        ELSE NULL 
    END AS lng,
    CASE 
        WHEN time_diff_seconds <= 60 THEN fuel_pct
        ELSE NULL 
    END AS fuel_pct,
    CASE 
        WHEN latest_soh >= 90 THEN '우수'
        WHEN latest_soh >= 80 THEN '양호'
        WHEN latest_soh >= 70 THEN '보통'
        ELSE '불량'
    END AS performance_grade,
    CASE 
        WHEN pack_current > 1 THEN 'charging'
        WHEN pack_current < -1 THEN 'discharging'
        ELSE 'idle'
    END AS vehicle_status,
    GREATEST(bms_time, COALESCE(gps_time, bms_time)) AS last_updated
FROM vehicle_integrated;