-- 뷰 삭제
DROP MATERIALIZED VIEW IF EXISTS cell_balance_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vehicle_spec_comparison_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS bms_response_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS battery_health_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS anomaly_detection_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vehicle_performance_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS vehicle_rankings_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS driving_patterns_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS charging_efficiency_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS temperature_voltage_correlation_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS long_term_performance_trends_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS trends_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS charging_patterns_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS cell_balance_trends_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS driving_pattern_performance_mv CASCADE;

COMMIT;

-- 테이블 삭제
DROP TABLE IF EXISTS bongo3_bms_data CASCADE;
DROP TABLE IF EXISTS gv60_bms_data CASCADE;
DROP TABLE IF EXISTS porter2_bms_data CASCADE;
DROP TABLE IF EXISTS bongo3_gps_data CASCADE;
DROP TABLE IF EXISTS gv60_gps_data CASCADE;
DROP TABLE IF EXISTS porter2_gps_data CASCADE;


-- 참조 확인(의존성)
SELECT * FROM pg_depend 
WHERE objid = 'vehicle_history_analysis'::regclass;

SELECT * FROM pg_views WHERE viewname = 'vehicle_history_analysis';
SELECT COUNT(*) FROM vehicle_history_analysis;
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
-- WHERE query LIKE '%DROP%vehicle_history_analysis%';
SELECT viewname FROM pg_views WHERE viewname LIKE '%vehicle_history%';

-- 인덱스 제거
DROP INDEX IF EXISTS idx_bongo3_bms_dev_time;
DROP INDEX IF EXISTS idx_gv60_bms_dev_time;
DROP INDEX IF EXISTS idx_porter2_bms_dev_time;

DROP INDEX IF EXISTS idx_bongo3_bms_soh;
DROP INDEX IF EXISTS idx_gv60_bms_soh;
DROP INDEX IF EXISTS idx_porter2_bms_soh;

DROP INDEX IF EXISTS idx_bongo3_bms_pack_v;
DROP INDEX IF EXISTS idx_gv60_bms_pack_v;
DROP INDEX IF EXISTS idx_porter2_bms_pack_v;

DROP INDEX IF EXISTS idx_bongo3_bms_pack_i;
DROP INDEX IF EXISTS idx_gv60_bms_pack_i;
DROP INDEX IF EXISTS idx_porter2_bms_pack_i;

DROP INDEX IF EXISTS idx_bongo3_bms_temp_avg;
DROP INDEX IF EXISTS idx_gv60_bms_temp_avg;
DROP INDEX IF EXISTS idx_porter2_bms_temp_avg;

DROP INDEX IF EXISTS idx_bongo3_gps_dev_time;
DROP INDEX IF EXISTS idx_gv60_gps_dev_time;
DROP INDEX IF EXISTS idx_porter2_gps_dev_time;

DROP INDEX IF EXISTS idx_bms_device_time;
DROP INDEX IF EXISTS idx_gps_device_time;

DROP INDEX IF EXISTS idx_bms_car_type;
DROP INDEX IF EXISTS idx_gps_speed;

DROP INDEX IF EXISTS idx_bms_soh;
DROP INDEX IF EXISTS idx_bms_temp;

DROP INDEX IF EXISTS idx_bms_balance;