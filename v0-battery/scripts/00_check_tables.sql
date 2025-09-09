-- 실제 테이블 구조 확인용 스크립트
-- 이 스크립트를 먼저 실행하여 테이블 구조를 확인하세요

-- 1. 모든 테이블 목록 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. BMS 관련 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%bms%'
ORDER BY table_name;

-- 3. GPS 관련 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%gps%'
ORDER BY table_name;