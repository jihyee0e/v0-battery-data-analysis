#!/usr/bin/env python3
"""
BMS CSV 파일에 mod_temp_count, cell_volt_count 컬럼을 추가하는 스크립트
원본 파일에 직접 추가합니다.
"""

import pandas as pd
import os
from pathlib import Path
from multiprocessing import Pool, cpu_count

def add_count_columns_to_file(file_path):
    """단일 BMS 파일에 count 컬럼들을 추가합니다."""
    print(f"처리 중: {os.path.basename(file_path)}")
    
    try:
        # 파일 읽기
        df = pd.read_csv(file_path)
        
        # mod_temp 컬럼들 찾기 
        mod_temp_cols = [col for col in df.columns if col.startswith('mod_temp_') and col.replace('mod_temp_', '').isdigit()]
        # cell_volt 컬럼들 찾기 
        cell_volt_cols = [col for col in df.columns if col.startswith('cell_volt_') and col.replace('cell_volt_', '').isdigit()]
        
        # count 컬럼들 추가
        if mod_temp_cols:
            df['mod_temp_count'] = df[mod_temp_cols].notna().sum(axis=1)
            print(f"  - mod_temp_count 추가됨 (범위: {df['mod_temp_count'].min()} ~ {df['mod_temp_count'].max()})")
        
        if cell_volt_cols:
            df['cell_volt_count'] = df[cell_volt_cols].notna().sum(axis=1)
            print(f"  - cell_volt_count 추가됨 (범위: {df['cell_volt_count'].min()} ~ {df['cell_volt_count'].max()})")
        
        # 원본 파일에 저장
        df.to_csv(file_path, index=False)
        
        print(f"✅ 완료: {os.path.basename(file_path)} (총 컬럼: {len(df.columns)}개)")
        return True
        
    except Exception as e:
        print(f"❌ 오류: {os.path.basename(file_path)} - {e}")
        return False

def main():
    """메인 함수"""
    base_path = Path("/mnt/hdd1/jihye0e/aicar-preprocessing/final_data/aicar_2212_splited_by_cartype")
    
    if not base_path.exists():
        print(f"❌ 경로가 존재하지 않습니다: {base_path}")
        return
    
    # BMS 파일들 찾기
    bms_files = list(base_path.glob("bms/**/*.csv"))
    
    print("BMS 파일에 count 컬럼 추가 시작")
    print("="*60)
    print(f"처리할 BMS 파일: {len(bms_files)}개")
    
    if len(bms_files) == 0:
        print("❌ 처리할 BMS 파일이 없습니다.")
        return
    
    # 병렬처리로 빠른 처리
    print(f"\n🚀 병렬처리로 빠른 처리 시작 (CPU 코어: {cpu_count()}개)")
    
    with Pool(processes=cpu_count()) as pool:
        results = pool.map(add_count_columns_to_file, bms_files)
    
    # 결과 요약
    success_count = sum(results)
    total_count = len(bms_files)
    
    print(f"\n✅ 처리 완료!")
    print(f"   성공: {success_count}/{total_count} 파일")
    print(f"   실패: {total_count - success_count} 파일")
    
    if success_count == total_count:
        print("🎉 모든 파일이 성공적으로 처리되었습니다!")
    else:
        print("⚠️ 일부 파일 처리에 실패했습니다.")

if __name__ == "__main__":
    main()
