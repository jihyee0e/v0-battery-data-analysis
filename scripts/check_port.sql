SELECT version();
SELECT current_database();
SELECT schemaname, matviewname FROM pg_matviews;

SELECT COUNT(*) FROM bongo3_bms_data;  
SELECT COUNT(*) FROM gv60_bms_data;  -- 4819309
SELECT COUNT(*) FROM porter2_bms_data;  -- 16212344

SELECT COUNT(*) FROM bongo3_gps_data;  -- 8359887
SELECT COUNT(*) FROM gv60_gps_data;  -- 319569
SELECT COUNT(*) FROM porter2_gps_data;  -- 9655353

SHOW search_path; 
SELECT schema_name FROM information_schema.schemata;
SELECT current_database(), inet_server_addr(), inet_server_port();

SELECT current_schema as current_schema;

SELECT inet_server_addr(), inet_server_port();

SELECT
  current_database()          AS db,
  current_user                AS user,
  inet_client_addr()          AS client_addr,
  inet_server_addr()          AS server_addr,
  current_setting('port')     AS server_port,   -- 컨테이너 내부 포트(5432로 보일 수 있음)
  current_setting('data_directory') AS data_dir;

SELECT
  n.nspname AS schema,
  c.relname AS matview,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'm'
ORDER BY 1,2;

--
SET search_path TO public;
SELECT * FROM vehicle_spec_comparison_mv;