#!/usr/bin/env python3
"""
배터리 성능 시스템을 위한 데이터 분석 스크립트
ERD 설계를 위한 기본 데이터 특성만 분석합니다.
"""

import pandas as pd
import numpy as np
import os
import json
from pathlib import Path
from datetime import datetime
from multiprocessing import Pool, cpu_count

def analyze_csv_file(file_path):
    """CSV 파일의 전체 데이터를 로드해서 기본 특성을 분석합니다."""
    print(f"\n{'='*60}")
    print(f"파일 분석: {os.path.basename(file_path)}")
    print(f"{'='*60}")
    
    try:
        # 파일 크기 확인
        file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
        print(f"파일 크기: {file_size:.2f} MB")
        
        # 청크 단위로 데이터 분석
        print("청크 단위 데이터 분석 중...")
        chunk_size = 10000
        total_rows = 0
        columns_info = {}
        
        # 첫 번째 청크로 컬럼 정보 확인
        first_chunk = pd.read_csv(file_path, nrows=1)
        columns = first_chunk.columns.tolist()
        print(f"총 컬럼 수: {len(columns)}")
        
        # 컬럼 정보 출력
        print(f"\n컬럼 목록:")
        for i, col in enumerate(columns):
            print(f"{i+1:3d}. {col}")
            columns_info[col] = {
                'dtype': str(first_chunk[col].dtype),
                'total_count': 0,
                'non_null_count': 0,
                'null_count': 0,
                'unique_values': set(),
                'min_val': None,
                'max_val': None,
                'zero_count': 0,
                'negative_count': 0
            }
        
        # 청크별로 전체 데이터 처리
        chunk_iter = pd.read_csv(file_path, chunksize=chunk_size)
        for chunk_num, chunk in enumerate(chunk_iter):
            total_rows += len(chunk)
            
            # 각 컬럼별 통계 누적
            for col in columns:
                col_data = chunk[col]
                col_info = columns_info[col]
                
                # 기본 통계
                col_info['total_count'] += len(col_data)
                col_info['non_null_count'] += col_data.count()
                col_info['null_count'] += col_data.isnull().sum()
                
                # 고유값 수집 (메모리 절약을 위해 set 사용)
                if col_data.dtype == 'object':
                    col_info['unique_values'].update(col_data.dropna().astype(str))
                else:
                    col_info['unique_values'].update(col_data.dropna())
                
                # 숫자형 데이터 통계
                if pd.api.types.is_numeric_dtype(col_data):
                    non_null_data = col_data.dropna()
                    if len(non_null_data) > 0:
                        if col_info['min_val'] is None:
                            col_info['min_val'] = non_null_data.min()
                            col_info['max_val'] = non_null_data.max()
                        else:
                            col_info['min_val'] = min(col_info['min_val'], non_null_data.min())
                            col_info['max_val'] = max(col_info['max_val'], non_null_data.max())
                        
                        col_info['zero_count'] += (non_null_data == 0).sum()
                        col_info['negative_count'] += (non_null_data < 0).sum()
            
            # 진행 상황 출력
            if (chunk_num + 1) % 10 == 0:
                print(f"처리된 청크: {chunk_num + 1}, 누적 행 수: {total_rows:,}")
        
        print(f"전체 데이터 행 수: {total_rows:,}")
        
        # 최종 통계 정리
        final_stats = {}
        for col, col_info in columns_info.items():
            final_stats[col] = {
                'dtype': col_info['dtype'],
                'total_count': col_info['total_count'],
                'non_null_count': col_info['non_null_count'],
                'null_count': col_info['null_count'],
                'null_percentage': (col_info['null_count'] / col_info['total_count']) * 100 if col_info['total_count'] > 0 else 0,
                'unique_count': len(col_info['unique_values']),
                'min_val': col_info['min_val'],
                'max_val': col_info['max_val'],
                'zero_count': col_info['zero_count'],
                'negative_count': col_info['negative_count']
            }
        
        return final_stats, total_rows, columns
        
    except Exception as e:
        print(f"파일 읽기 오류: {e}")
        print(f"파일 경로: {file_path}")
        return None, 0, []

def analyze_column_stats(df, column_name):
    """특정 컬럼의 기본 통계 정보를 분석합니다."""
    if column_name not in df.columns:
        return None
    
    col_data = df[column_name]
    
    stats = {
        'column': column_name,
        'dtype': str(col_data.dtype),
        'total_count': len(col_data),
        'non_null_count': col_data.count(),
        'null_count': col_data.isnull().sum(),
        'null_percentage': (col_data.isnull().sum() / len(col_data)) * 100,
        'unique_count': col_data.nunique(),
        'duplicate_count': len(col_data) - col_data.nunique()
    }
    
    # 숫자형 데이터인 경우 추가 통계
    if pd.api.types.is_numeric_dtype(col_data):
        stats.update({
            'min': col_data.min(),
            'max': col_data.max(),
            'zero_count': (col_data == 0).sum(),
            'negative_count': (col_data < 0).sum()
        })
    
    return stats

def analyze_gps_data(df):
    """GPS 데이터의 주요 컬럼 특성을 확인합니다."""
    print(f"\n{'='*40}")
    print("GPS 컬럼 확인")
    print(f"{'='*40}")
    
    # SQL에서 실제로 사용되는 핵심 컬럼들
    core_columns = ['device_no', 'car_type', 'time', 'lat', 'lng', 'speed', 'fuel_pct']
    additional_columns = ['direction', 'hdop', 'state', 'mode']
    
    print("\n🔍 핵심 컬럼:")
    for col in core_columns:
        if col in df.columns:
            col_data = df[col]
            print(f"\n{col}:")
            print(f"  - 데이터 타입: {col_data.dtype}")
            print(f"  - null 개수: {col_data.isnull().sum():,}")
            print(f"  - 고유값 개수: {col_data.nunique():,}")
            
            if pd.api.types.is_numeric_dtype(col_data):
                print(f"  - 범위: {col_data.min():.3f} ~ {col_data.max():.3f}")
                print(f"  - 0값 개수: {(col_data == 0).sum():,}")
            else:
                print(f"  - 고유값: {col_data.unique()}")
    
    print("\n📊 추가 컬럼들 (일부 분석에서 사용):")
    for col in additional_columns:
        if col in df.columns:
            col_data = df[col]
            print(f"\n{col}:")
            print(f"  - 데이터 타입: {col_data.dtype}")
            print(f"  - null 개수: {col_data.isnull().sum():,}")
            print(f"  - 고유값 개수: {col_data.nunique():,}")
            
            if pd.api.types.is_numeric_dtype(col_data):
                print(f"  - 범위: {col_data.min():.3f} ~ {col_data.max():.3f}")
                print(f"  - 0값 개수: {(col_data == 0).sum():,}")
            else:
                print(f"  - 고유값: {col_data.unique()}")

def analyze_battery_stats(stats, columns):
    """배터리 관련 데이터의 특성을 통계 기반으로 분석합니다."""
    print(f"\n{'='*40}")
    print("배터리 데이터 분석")
    print(f"{'='*40}")
    
    # 핵심 컬럼들
    core_columns = ['device_no', 'car_type', 'msg_time', 'soc', 'soh', 'pack_volt', 'pack_current', 
                   'mod_avg_temp', 'max_cell_volt', 'min_cell_volt']
    additional_columns = ['cellvolt_dispersion', 'odometer', 'ext_temp', 'trip_chrg_pw', 'trip_dischrg_pw',
                         'max_deter_cell_no', 'min_deter_cell_no']
    
    print("\n🔍 핵심 컬럼들 (모든 분석에서 사용):")
    for col in core_columns:
        if col in stats:
            col_stat = stats[col]
            print(f"\n{col}:")
            print(f"  - 데이터 타입: {col_stat['dtype']}")
            print(f"  - null 개수: {col_stat['null_count']:,}")
            print(f"  - 고유값 개수: {col_stat['unique_count']:,}")
            
            if col_stat['min_val'] is not None and col_stat['max_val'] is not None:
                print(f"  - 범위: {col_stat['min_val']:.3f} ~ {col_stat['max_val']:.3f}")
                print(f"  - 0값 개수: {col_stat['zero_count']:,}")
    
    print("\n📊 추가 컬럼들 (일부 분석에서 사용):")
    for col in additional_columns:
        if col in stats:
            col_stat = stats[col]
            print(f"\n{col}:")
            print(f"  - 데이터 타입: {col_stat['dtype']}")
            print(f"  - null 개수: {col_stat['null_count']:,}")
            print(f"  - 고유값 개수: {col_stat['unique_count']:,}")
            
            if col_stat['min_val'] is not None and col_stat['max_val'] is not None:
                print(f"  - 범위: {col_stat['min_val']:.3f} ~ {col_stat['max_val']:.3f}")
                print(f"  - 0값 개수: {col_stat['zero_count']:,}")

def analyze_gps_stats(stats, columns):
    """GPS 데이터의 주요 컬럼 특성을 통계 기반으로 확인합니다."""
    print(f"\n{'='*40}")
    print("GPS 컬럼 확인")
    print(f"{'='*40}")
    
    # SQL에서 실제로 사용되는 핵심 컬럼들
    core_columns = ['device_no', 'car_type', 'time', 'lat', 'lng', 'speed', 'fuel_pct']
    additional_columns = ['direction', 'hdop', 'state', 'mode']
    
    print("\n🔍 핵심 컬럼:")
    for col in core_columns:
        if col in stats:
            col_stat = stats[col]
            print(f"\n{col}:")
            print(f"  - 데이터 타입: {col_stat['dtype']}")
            print(f"  - null 개수: {col_stat['null_count']:,}")
            print(f"  - 고유값 개수: {col_stat['unique_count']:,}")
            
            if col_stat['min_val'] is not None and col_stat['max_val'] is not None:
                print(f"  - 범위: {col_stat['min_val']:.3f} ~ {col_stat['max_val']:.3f}")
                print(f"  - 0값 개수: {col_stat['zero_count']:,}")
    
    print("\n📊 추가 컬럼들 (일부 분석에서 사용):")
    for col in additional_columns:
        if col in stats:
            col_stat = stats[col]
            print(f"\n{col}:")
            print(f"  - 데이터 타입: {col_stat['dtype']}")
            print(f"  - null 개수: {col_stat['null_count']:,}")
            print(f"  - 고유값 개수: {col_stat['unique_count']:,}")
            
            if col_stat['min_val'] is not None and col_stat['max_val'] is not None:
                print(f"  - 범위: {col_stat['min_val']:.3f} ~ {col_stat['max_val']:.3f}")
                print(f"  - 0값 개수: {col_stat['zero_count']:,}")
    

def save_analysis_results(all_results, output_dir="analysis_results"):
    """분석 결과를 파일로 저장합니다."""
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 1. 전체 결과를 JSON으로 저장
    json_file = output_path / f"data_analysis_summary_{timestamp}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)
    
    # 2. 컬럼별 상세 정보를 CSV로 저장
    csv_file = output_path / f"column_details_{timestamp}.csv"
    column_details = []
    
    for file_name, file_data in all_results['files'].items():
        for col_name, col_stats in file_data['columns'].items():
            row = {
                'file_name': file_name,
                'column_name': col_name,
                'data_type': col_stats.get('dtype', ''),
                'total_count': col_stats.get('total_count', 0),
                'null_count': col_stats.get('null_count', 0),
                'null_percentage': col_stats.get('null_percentage', 0),
                'unique_count': col_stats.get('unique_count', 0),
                'min_value': col_stats.get('min_val', ''),
                'max_value': col_stats.get('max_val', ''),
                'zero_count': col_stats.get('zero_count', ''),
                'negative_count': col_stats.get('negative_count', '')
            }
            column_details.append(row)
    
    df_details = pd.DataFrame(column_details)
    df_details.to_csv(csv_file, index=False, encoding='utf-8')
    
    # 3. 데이터 리포트 텍스트로 저장
    report_file = output_path / f"data_quality_report_{timestamp}.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("데이터 분석 리포트\n")
        f.write("="*50 + "\n\n")
        f.write(f"분석 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        for file_name, file_data in all_results['files'].items():
            f.write(f"파일: {file_name}\n")
            f.write(f"크기: {file_data['file_size']:.2f} MB\n")
            f.write(f"전체 행 수: {file_data['total_rows']:,}\n")
            f.write(f"컬럼 수: {file_data['total_columns']}\n\n")
            
            # 문제가 있는 컬럼들 식별
            problem_columns = []
            for col_name, col_stats in file_data['columns'].items():
                if col_stats.get('null_percentage', 0) > 50:
                    problem_columns.append(f"{col_name} (null율: {col_stats['null_percentage']:.1f}%)")
                elif col_stats.get('unique_count', 0) == 1:
                    problem_columns.append(f"{col_name} (고유값 1개)")
            
            if problem_columns:
                f.write("⚠️ 주의가 필요한 컬럼들:\n")
                for col in problem_columns:
                    f.write(f"  - {col}\n")
            f.write("\n" + "-"*30 + "\n\n")
    
    print(f"\n📁 분석 결과가 저장되었습니다:")
    print(f"  - JSON 요약: {json_file}")
    print(f"  - 컬럼 상세: {csv_file}")
    print(f"  - 품질 리포트: {report_file}")

def main():
    """메인 분석 함수"""
    base_path = Path("/mnt/hdd1/jihye0e/aicar-preprocessing/final_data/aicar_2308_splited_by_cartype")
    
    if not base_path.exists():
        print(f"❌ 경로가 존재하지 않습니다: {base_path}")
        return
    
    # 실제 존재하는 파일들 찾기
    bms_files = list(base_path.glob("bms/**/*.csv"))
    gps_files = list(base_path.glob("gps/**/*.csv"))
    
    print("데이터 컬럼 분석 시작")
    print("="*60)
    print(f"분석할 BMS 파일: {len(bms_files)}개")
    print(f"분석할 GPS 파일: {len(gps_files)}개")
    
    if len(bms_files) == 0 and len(gps_files) == 0:
        print("❌ 분석할 파일이 없습니다.")
        return
    
    all_results = {
        'analysis_time': datetime.now().isoformat(),
        'files': {}
    }
    
    # BMS 데이터 분석
    # 병렬처리로 빠른 분석
    print(f"\n🚀 병렬처리로 빠른 분석 시작 (CPU 코어: {cpu_count()}개)")
    
    # 모든 파일을 하나의 리스트로 합치기
    all_files = bms_files + gps_files
    print(f"총 분석할 파일: {len(all_files)}개")
    
    # 병렬처리로 분석
    with Pool(processes=cpu_count()) as pool:
        results = pool.map(analyze_csv_file, all_files)
    
    # 결과 처리
    for i, (file_path, result) in enumerate(zip(all_files, results)):
        if result[0] is not None:  # stats가 None이 아닌 경우
            stats, total_rows, columns = result
            file_name = file_path.name
            file_size = file_path.stat().st_size / (1024 * 1024)
            
            file_result = {
                'file_size': file_size,
                'total_rows': total_rows,
                'total_columns': len(columns),
                'columns': stats
            }
            
            all_results['files'][file_name] = file_result
            
            # 진행 상황 출력
            if (i + 1) % 10 == 0:
                print(f"처리 완료: {i + 1}/{len(all_files)} 파일")
    
    print(f"✅ 병렬처리 완료: {len(all_results['files'])}개 파일 분석됨")
    
    # 2차 그룹화: 차종별, bms/gps별로 그룹화
    print(f"\n🔍 2차 그룹화: 차종별, BMS/GPS별 분석")
    grouped_data = analyze_by_cartype_and_type(all_results['files'], bms_files + gps_files)
    
    # 결과 저장
    save_analysis_results(all_results)

def analyze_by_cartype_and_type(files_data, file_paths):
    """차종별, bms/gps별로 그룹화해서 분석합니다."""
    print(f"\n{'='*60}")
    print("차종별, BMS/GPS별 분석")
    print(f"{'='*60}")
    
    # 차종별, 타입별로 그룹화
    grouped_data = {}
    
    # 파일 경로와 데이터 매핑
    file_path_map = {}
    for file_path in file_paths:
        file_path_map[file_path.name] = file_path
    
    for file_name, file_data in files_data.items():
        # 파일명에서 차종과 타입 추출
        if 'bms' in file_name.lower():
            data_type = 'BMS'
        elif 'gps' in file_name.lower():
            data_type = 'GPS'
        else:
            continue
            
        # 경로에서 차종 추출 (예: .../BONGO3/bms_xxx.csv)
        file_path = file_path_map.get(file_name)
        cartype = 'UNKNOWN'
        if file_path:
            for ct in ['BONGO3', 'GV60', 'PORTER2']:
                if ct in str(file_path):
                    cartype = ct
                    break
        
        # 그룹화
        key = f"{cartype}_{data_type}"
        if key not in grouped_data:
            grouped_data[key] = {
                'cartype': cartype,
                'data_type': data_type,
                'files': [],
                'total_files': 0,
                'total_rows': 0,
                'total_size_mb': 0
            }
        
        grouped_data[key]['files'].append(file_name)
        grouped_data[key]['total_files'] += 1
        grouped_data[key]['total_rows'] += file_data['total_rows']
        grouped_data[key]['total_size_mb'] += file_data['file_size']
    
    # 각 그룹별 분석 결과 출력
    for key, group_data in grouped_data.items():
        print(f"\n🚗 {group_data['cartype']} - {group_data['data_type']}")
        print(f"   파일 수: {group_data['total_files']}개")
        print(f"   총 행 수: {group_data['total_rows']:,}")
        print(f"   총 크기: {group_data['total_size_mb']:.2f} MB")
        
        # 공통 컬럼들 분석
        if group_data['files']:
            first_file = group_data['files'][0]
            if first_file in files_data:
                first_file_data = files_data[first_file]
                common_columns = ['device_no', 'car_type', 'time', 'lat', 'lng', 'speed', 'fuel_pct', 
                                'soc', 'soh', 'pack_volt', 'pack_current']
                
                print(f"   📊 주요 컬럼 분석:")
                for col in common_columns:
                    if col in first_file_data['columns']:
                        col_stats = first_file_data['columns'][col]
                        print(f"     {col}: {col_stats['dtype']}, null율 {col_stats['null_percentage']:.1f}%")
                        
                        if 'min_val' in col_stats and 'max_val' in col_stats:
                            if col_stats['min_val'] is not None and col_stats['max_val'] is not None:
                                print(f"       범위: {col_stats['min_val']:.3f} ~ {col_stats['max_val']:.3f}")
    
    return grouped_data

if __name__ == "__main__":
    main()