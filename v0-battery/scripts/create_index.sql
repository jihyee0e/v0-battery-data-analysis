-- =========================
-- 인덱스 (원본 테이블에만)
-- =========================

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