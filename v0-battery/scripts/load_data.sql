
-- CSV 데이터를 테이블에 직접 로드

SET search_path TO public;


-- 1. BMS 데이터 로드       
COPY bongo3_bms_data FROM '/integrated_data/BMS/BONGO3_bms_integrated.csv' CSV HEADER;
COPY gv60_bms_data FROM '/integrated_data/BMS/GV60_bms_integrated.csv' CSV HEADER;
COPY porter2_bms_data FROM '/integrated_data/BMS/PORTER2_bms_integrated.csv' CSV HEADER;

-- 2. GPS 데이터 로드
COPY bongo3_gps_data FROM '/integrated_data/GPS/BONGO3_gps_integrated.csv' CSV HEADER;
COPY gv60_gps_data FROM '/integrated_data/GPS/GV60_gps_integrated.csv' CSV HEADER;
COPY porter2_gps_data FROM '/integrated_data/GPS/PORTER2_gps_integrated.csv' CSV HEADER;

-- 3. 데이터 검증 및 품질 확인
-- 로드된 데이터 수 확인
SELECT 'BMS 데이터 검증' as check_type, 
       'bongo3' as car_type, 
       COUNT(*) as record_count 
FROM bongo3_bms_data
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

-- 4. 데이터 품질 확인
-- NULL 값이 있는 컬럼 확인
SELECT 'BMS NULL 체크' as check_type,
       COUNT(CASE WHEN soc IS NULL THEN 1 END) as soc_null_count,
       COUNT(CASE WHEN soh IS NULL THEN 1 END) as soh_null_count,
       COUNT(CASE WHEN pack_volt IS NULL THEN 1 END) as pack_volt_null_count,
       COUNT(CASE WHEN max_cell_volt IS NULL THEN 1 END) as max_cell_volt_null_count,
       COUNT(CASE WHEN min_cell_volt IS NULL THEN 1 END) as min_cell_volt_null_count
-- FROM bongo3_bms_data;
-- FROM gv60_bms_data;
FROM porter2_bms_data;

SELECT 'GPS NULL 체크',
       COUNT(CASE WHEN lat IS NULL THEN 1 END) as lat_null_count,
       COUNT(CASE WHEN lng IS NULL THEN 1 END) as lng_null_count,
       COUNT(CASE WHEN speed IS NULL THEN 1 END) as speed_null_count,
       COUNT(CASE WHEN time IS NULL THEN 1 END) as time_null_count,
       0
-- FROM bongo3_gps_data;
-- FROM gv60_gps_data;
FROM porter2_gps_data;

-- DELETE FROM bongo3_bms_data WHERE soc IS NULL OR soh IS NULL;
-- DELETE FROM gv60_bms_data WHERE soc IS NULL OR soh IS NULL;
-- DELETE FROM porter2_bms_data WHERE soc IS NULL OR soh IS NULL;

-- -- 5. 시간 범위 확인
-- SELECT 'BMS 시간 범위' as check_type,
--        MIN(msg_time) as earliest_record,
--        MAX(msg_time) as latest_record,
--        COUNT(DISTINCT DATE(msg_time)) as unique_days
-- FROM bongo3_bms_data
-- UNION ALL
-- SELECT 'GPS 시간 범위',
--        MIN(time) as earliest_record,
--        MAX(time) as latest_record,
--        COUNT(DISTINCT DATE(time)) as unique_days
-- FROM bongo3_gps_data;