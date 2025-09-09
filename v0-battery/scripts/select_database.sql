SET search_path TO public;

WITH params AS (
  SELECT '2022-01-01 00:00:00+09'::timestamptz AS start_ts,
         '2023-12-31 23:59:59+09'::timestamptz AS end_ts
),
bms_all AS (
  SELECT b.device_no, b.car_type, b.msg_time,
         TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') AS msg_ts,
         b.soc, b.soh, b.pack_volt, b.pack_current,
         b.mod_avg_temp, b.max_cell_volt, b.min_cell_volt
  FROM public.bongo3_bms_data b
  JOIN params p ON TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') BETWEEN p.start_ts AND p.end_ts
  UNION ALL
  SELECT b.device_no, b.car_type, b.msg_time,
         TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') AS msg_ts,
         b.soc, b.soh, b.pack_volt, b.pack_current,
         b.mod_avg_temp, b.max_cell_volt, b.min_cell_volt
  FROM public.gv60_bms_data b
  JOIN params p ON TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') BETWEEN p.start_ts AND p.end_ts
  UNION ALL
  SELECT b.device_no, b.car_type, b.msg_time,
         TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') AS msg_ts,
         b.soc, b.soh, b.pack_volt, b.pack_current,
         b.mod_avg_temp, b.max_cell_volt, b.min_cell_volt
  FROM public.porter2_bms_data b
  JOIN params p ON TO_TIMESTAMP(b.msg_time, 'YY-MM-DD HH24:MI:SS') BETWEEN p.start_ts AND p.end_ts
),
/* GPS: time → time_ts (별칭 통일) */
gps_all AS (
  SELECT g.device_no, g.car_type,
         g.time AS time_ts, g.lat, g.lng, g.speed, g.fuel_pct
  FROM public.bongo3_gps_data g
  JOIN params p ON g.time BETWEEN p.start_ts AND p.end_ts
  UNION ALL
  SELECT g.device_no, g.car_type,
         g.time AS time_ts, g.lat, g.lng, g.speed, g.fuel_pct
  FROM public.gv60_gps_data g
  JOIN params p ON g.time BETWEEN p.start_ts AND p.end_ts
  UNION ALL
  SELECT g.device_no, g.car_type,
         g.time AS time_ts, g.lat, g.lng, g.speed, g.fuel_pct
  FROM public.porter2_gps_data g
  JOIN params p ON g.time BETWEEN p.start_ts AND p.end_ts
),
-- 차량별 기간 내 최종 1건
latest_bms AS (
  SELECT
    t.device_no, t.car_type, t.msg_time, t.msg_ts, t.soc, t.soh, t.pack_volt, t.pack_current,
    t.mod_avg_temp,
    CASE WHEN t.pack_volt > 0 AND t.max_cell_volt IS NOT NULL AND t.min_cell_volt IS NOT NULL
         THEN (t.max_cell_volt - t.min_cell_volt) / t.pack_volt * 100 ELSE 0 END AS cell_balance_index,
    ROW_NUMBER() OVER (PARTITION BY t.car_type, t.device_no ORDER BY t.msg_ts DESC) AS rn
  FROM bms_all t
  WHERE t.soc IS NOT NULL AND t.soh IS NOT NULL AND t.pack_volt > 0
),
latest_bms_filtered AS (
  SELECT * FROM latest_bms WHERE rn = 1
),
-- GPS 최근접 매칭(±60초)
vehicle_integrated AS (
  SELECT
    b.device_no, b.car_type, b.msg_time, b.msg_ts, b.soc, b.soh, b.pack_volt, b.pack_current,
    b.mod_avg_temp, b.cell_balance_index,
    g.time_ts AS gps_time, g.lat, g.lng, g.speed, g.fuel_pct,
    CASE WHEN ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time_ts))) <= 60 THEN g.speed    END AS valid_speed,
    CASE WHEN ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time_ts))) <= 60 THEN g.fuel_pct END AS valid_fuel_pct
  FROM latest_bms_filtered b
  LEFT JOIN LATERAL (
    SELECT g.*
    FROM gps_all g
    WHERE g.car_type = b.car_type
      AND g.device_no = b.device_no
      AND ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time_ts))) <= 60
    ORDER BY ABS(EXTRACT(EPOCH FROM (b.msg_ts - g.time_ts)))
    LIMIT 1
  ) g ON TRUE
),
-- 차종별 집계
vehicle_stats AS (
  SELECT
    vi.car_type,
    (SELECT end_ts FROM params) AS base_ts,
    COUNT(*)::bigint AS total_vehicles,
    SUM(CASE WHEN vi.pack_current > 0 THEN 1 ELSE 0 END)::bigint AS charging_now,
    SUM(CASE WHEN vi.valid_speed  > 0 THEN 1 ELSE 0 END)::bigint AS moving_now,
    ROUND(AVG(vi.soc)::numeric, 2) AS avg_soc,
    ROUND(AVG(vi.soh)::numeric, 2) AS avg_soh,
    ROUND(100.0 * SUM(CASE WHEN vi.soh < 80 THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2) AS low_SOH_pct,
    ROUND(100.0 * SUM(CASE WHEN vi.mod_avg_temp > 45 THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2) AS high_temp_pct,
    ROUND(100.0 * SUM(CASE WHEN vi.cell_balance_index > 1.5 THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2) AS high_imbalance_pct
  FROM vehicle_integrated vi
  GROUP BY vi.car_type
),
total_stats AS (
  SELECT
    'TOTAL' AS car_type,
    (SELECT end_ts FROM params) AS base_ts,
    SUM(total_vehicles) AS total_vehicles,
    SUM(charging_now) AS charging_now,
    SUM(moving_now) AS moving_now,
    ROUND(SUM(avg_soc * total_vehicles)::numeric / NULLIF(SUM(total_vehicles),0), 2) AS avg_soc,
    ROUND(SUM(avg_soh * total_vehicles)::numeric / NULLIF(SUM(total_vehicles),0), 2) AS avg_soh,
    ROUND(SUM(low_SOH_pct * total_vehicles)::numeric / NULLIF(SUM(total_vehicles),0), 2) AS low_SOH_pct,
    ROUND(SUM(high_temp_pct * total_vehicles)::numeric / NULLIF(SUM(total_vehicles),0), 2) AS high_temp_pct,
    ROUND(SUM(high_imbalance_pct * total_vehicles)::numeric / NULLIF(SUM(total_vehicles),0), 2) AS high_imbalance_pct
  FROM vehicle_stats
)
SELECT
  car_type, total_vehicles, charging_now, moving_now,
  avg_soc, avg_soh, low_SOH_pct, high_temp_pct, high_imbalance_pct,
  base_ts AS last_updated
FROM vehicle_stats
UNION ALL
SELECT
  car_type, total_vehicles, charging_now, moving_now,
  avg_soc, avg_soh, low_SOH_pct, high_temp_pct, high_imbalance_pct,
  base_ts AS last_updated
FROM total_stats;
