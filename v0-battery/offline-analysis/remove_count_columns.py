#!/usr/bin/env python3
"""
BMS CSV 파일에서 mod_temp_count, cell_volt_count 컬럼을 제거하는 스크립트
원본 파일에서 제거합니다.
"""

import pandas as pd
import os
from pathlib import Path
from multiprocessing import Pool, cpu_count

def remove_count_columns_from_file(file_path):
    """단일 BMS 파일에서 count 컬럼들을 제거합니다."""
    print(f"처리 중: {os.path.basename(file_path)}")
    
    try:
        # 파일 읽기
        df = pd.read_csv(file_path)
        
        # count 컬럼들 제거
        columns_to_remove = ['mod_temp_count', 'cell_volt_count']
        removed_columns = []
        
        for col in columns_to_remove:
            if col in df.columns:
                df = df.drop(columns=[col])
                removed_columns.append(col)
        
        if removed_columns:
            print(f"  - 제거된 컬럼: {', '.join(removed_columns)}")
        else:
            print(f"  - 제거할 컬럼이 없음")
        
        # 원본 파일에 저장
        df.to_csv(file_path, index=False)
        
        print(f"✅ 완료: {os.path.basename(file_path)} (총 컬럼: {len(df.columns)}개)")
        return True
        
    except Exception as e:
        print(f"❌ 오류: {os.path.basename(file_path)} - {e}")
        return False

def main():
    """메인 함수"""
    base_path = Path("/mnt/hdd1/jihye0e/aicar-preprocessing/final_data/aicar_2308_splited_by_cartype")
    
    if not base_path.exists():
        print(f"❌ 경로가 존재하지 않습니다: {base_path}")
        return
    
    # BMS 파일들 찾기
    bms_files = list(base_path.glob("bms/**/*.csv"))
    
    print("BMS 파일에서 count 컬럼 제거 시작")
    print("="*60)
    print(f"처리할 BMS 파일: {len(bms_files)}개")
    
    if len(bms_files) == 0:
        print("❌ 처리할 BMS 파일이 없습니다.")
        return
    
    # 병렬처리로 빠른 처리
    print(f"\n🚀 병렬처리로 빠른 처리 시작 (CPU 코어: {cpu_count()}개)")
    
    with Pool(processes=cpu_count()) as pool:
        results = pool.map(remove_count_columns_from_file, bms_files)
    
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
