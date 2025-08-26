-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bms_device_time ON bms_data(device_no, msg_time DESC);
CREATE INDEX IF NOT EXISTS idx_gps_device_time ON gps_data(device_no, msg_time DESC);
CREATE INDEX IF NOT EXISTS idx_bms_car_type ON bms_data(car_type);
CREATE INDEX IF NOT EXISTS idx_bms_soh ON bms_data(soh);
CREATE INDEX IF NOT EXISTS idx_bms_soc ON bms_data(soc);

-- 복합 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bms_device_time_soh ON bms_data(device_no, msg_time DESC, soh) WHERE soh IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bms_car_type_time ON bms_data(car_type, msg_time DESC) WHERE msg_time >= CURRENT_DATE - INTERVAL '1 year';
