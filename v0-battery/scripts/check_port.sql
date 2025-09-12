SELECT version();
SELECT current_database(), inet_server_addr(), inet_server_port();
SELECT schemaname, matviewname FROM pg_matviews;

SELECT COUNT(*) FROM bongo3_bms_data;  -- 272093277
SELECT COUNT(*) FROM gv60_bms_data;  -- 4819309
SELECT COUNT(*) FROM porter2_bms_data;  -- 16212344

SELECT COUNT(*) FROM bongo3_gps_data;  -- 8359887
SELECT COUNT(*) FROM gv60_gps_data;  -- 319569
SELECT COUNT(*) FROM porter2_gps_data;  -- 9655353

SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename LIKE '%bms%' OR tablename LIKE '%gps%'
ORDER BY tablename, indexname;
--
SET search_path TO public;
