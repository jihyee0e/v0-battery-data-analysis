SET search_path TO public;

-- GPS: 근접 매칭 가속 (3개 테이블)
CREATE INDEX IF NOT EXISTS idx_gps_bongo3_ct_dev_time
  ON bongo3_gps_data (car_type, device_no, "time");
CREATE INDEX IF NOT EXISTS idx_gps_gv60_ct_dev_time
  ON gv60_gps_data   (car_type, device_no, "time");
CREATE INDEX IF NOT EXISTS idx_gps_porter2_ct_dev_time
  ON porter2_gps_data(car_type, device_no, "time");

-- BMS: 차량별 최신/기간 필터 가속 (3개 테이블)
-- 1) 컬럼 추가(빈 칼럼)
ALTER TABLE bongo3_bms_data  ADD COLUMN msg_ts timestamptz;
ALTER TABLE gv60_bms_data    ADD COLUMN msg_ts timestamptz;
ALTER TABLE porter2_bms_data ADD COLUMN msg_ts timestamptz;

-- 2) 1회 백필 (YY 포맷이면 그대로) 
UPDATE bongo3_bms_data
  SET msg_ts = to_timestamp(msg_time, 'YY-MM-DD HH24:MI:SS') WHERE msg_ts IS NULL;
UPDATE gv60_bms_data  -- 완료
  SET msg_ts = to_timestamp(msg_time, 'YY-MM-DD HH24:MI:SS') WHERE msg_ts IS NULL;
UPDATE porter2_bms_data  -- 완료
  SET msg_ts = to_timestamp(msg_time, 'YY-MM-DD HH24:MI:SS') WHERE msg_ts IS NULL;

-- 3) 인덱스
CREATE INDEX IF NOT EXISTS idx_bms_bongo3_ct_dev_ts
  ON bongo3_bms_data (car_type, device_no, msg_ts DESC);
CREATE INDEX IF NOT EXISTS idx_bms_gv60_ct_dev_ts  -- 완료
  ON gv60_bms_data (car_type, device_no, msg_ts DESC);
CREATE INDEX IF NOT EXISTS idx_bms_porter2_ct_dev_ts   -- 완료
  ON porter2_bms_data (car_type, device_no, msg_ts DESC);

