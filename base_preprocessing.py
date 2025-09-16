import os
import sys
import pandas as pd
import numpy as np
import json
import pickle
from pathlib import Path

class BasePreprocessor:
    """통합 전처리기"""
    
    def __init__(self):
        self.checkpoint_file = "processing_checkpoint.json"
        self.batch_size = 10000  # 배치 크기
    
    def _fix_year_vectorized(self, s: pd.Series) -> pd.Series:
        """타임스탬프 보정 - 2자리 연도를 4자리로 변환"""
        s = s.astype('string').str.strip()
        mask_two = s.str.match(r'^\d{2}[-/.]')
        s = s.mask(mask_two, s.str.replace(r'^(\d{2})([-/.])', r'20\1\2', regex=True))
        return pd.to_datetime(s, errors='coerce')
    
    
    def clean_data(self, df: pd.DataFrame, category: str) -> pd.DataFrame:
        """데이터 정제"""
        if df.empty:
            return df
            
        df = df.copy()
        
        # 첫 번째 행이 헤더인 경우 제거
        if len(df) > 0 and df.iloc[0].astype(str).str.contains('-').any():
            df = df.drop(df.index[0]).reset_index(drop=True)
        
        # 빈 행 제거 및 컬럼명 정제
        df = df.dropna(how='all').reset_index(drop=True)
        df.columns = [col.strip() for col in df.columns]
        
        # 문자열 컬럼 정제
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).str.strip()
        
        df = df.replace('', pd.NA)
        
        return df
    
    def load_checkpoint(self):
        """체크포인트 로드"""
        if os.path.exists(self.checkpoint_file):
            with open(self.checkpoint_file, 'r') as f:
                return json.load(f)
        return {}
    
    def save_checkpoint(self, checkpoint_data):
        """체크포인트 저장"""
        with open(self.checkpoint_file, 'w') as f:
            json.dump(checkpoint_data, f, indent=2)
    
    def process_file_with_checkpoint(self, file_path: str, category: str) -> pd.DataFrame:
        """체크포인트가 있는 파일 처리"""
        checkpoint = self.load_checkpoint()
        file_key = f"{category}_{os.path.basename(file_path)}"
        
        # 파일 크기 확인
        total_rows = sum(1 for _ in open(file_path)) - 1  # 헤더 제외
        
        if file_key in checkpoint:
            processed_rows = checkpoint[file_key].get('processed_rows', 0)
            if processed_rows >= total_rows:
                print(f"⏭️ {file_path} 이미 완료됨, 건너뛰기")
                return pd.DataFrame()
            print(f"🔄 {file_path} {processed_rows}행부터 이어서 처리")
        else:
            processed_rows = 0
            print(f"🆕 {file_path} 새로 시작")
        
        # 배치별 처리
        all_dfs = []
        batch_start = processed_rows
        
        try:
            while batch_start < total_rows:
                batch_end = min(batch_start + self.batch_size, total_rows)
                
                # 배치 읽기
                df_batch = pd.read_csv(file_path, skiprows=batch_start + 1, nrows=self.batch_size, low_memory=False)
                
                if df_batch.empty:
                    break
                
                # 전처리
                df_batch = self.clean_data(df_batch, category)
                if category == 'gps':
                    df_batch = self.expand_gps_list_columns(df_batch)
                df_batch = self.validate_physical_ranges(df_batch, category)
                df_batch = self.convert_data_types(df_batch, category)
                df_batch = self.remove_duplicates(df_batch)
                
                all_dfs.append(df_batch)
                
                # 체크포인트 업데이트
                checkpoint[file_key] = {
                    'processed_rows': batch_end,
                    'total_rows': total_rows,
                    'status': 'in_progress' if batch_end < total_rows else 'completed'
                }
                self.save_checkpoint(checkpoint)
                
                print(f"✅ {file_path} {batch_end}/{total_rows} 행 처리 완료")
                batch_start = batch_end
            
            # 모든 배치 합치기
            if all_dfs:
                result_df = pd.concat(all_dfs, ignore_index=True)
                return result_df
            else:
                return pd.DataFrame()
                
        except Exception as e:
            print(f"❌ {file_path} 처리 중 오류: {e}")
            return pd.DataFrame()
    
    def expand_gps_list_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """GPS 리스트형 컬럼 동적 확장 (NaN 패딩)"""
        if df.empty:
            return df
        df = df.copy()
        candidate_delims = [',', '|', ';']
        object_cols = [c for c in df.columns if df[c].dtype == 'object']
        cols_to_expand = []
        for col in object_cols:
            sample = df[col].dropna().astype(str).head(50)
            if sample.empty:
                continue
            for delim in candidate_delims:
                if sample.str.contains(delim).mean() > 0.5:
                    cols_to_expand.append((col, delim))
                    break
        for col, delim in cols_to_expand:
            parts_series = df[col].astype(str).where(df[col].notna(), None)
            max_len = parts_series.dropna().apply(lambda x: len(x.split(delim)) if isinstance(x, str) else 0).max()
            if not max_len or max_len < 2:
                continue
            new_cols = [f"{col}_{i+1}" for i in range(max_len)]
            for i in range(max_len):
                df[new_cols[i]] = parts_series.apply(
                    lambda x: (x.split(delim)[i].strip() if isinstance(x, str) and len(x.split(delim)) > i else np.nan)
                )
            df = df.drop(columns=[col])
        return df

    def validate_physical_ranges(self, df: pd.DataFrame, category: str) -> pd.DataFrame:
        """물리적 범위 검증"""
        if df.empty:
            return df
            
        df = df.copy()
        
        if category == 'bms':
            # SOC, SOH: 0~100%
            soc_soh_cols = [col for col in df.columns if 'soc' in col.lower() or 'soh' in col.lower()]
            for col in soc_soh_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and (val < 0 or val > 100)) else val)
            
            # 전압: ≤3000V
            volt_cols = [col for col in df.columns if '_volt' in col.lower()]
            for col in volt_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and val > 3000) else val)
            
            # 온도: -35~80°C
            temp_cols = [col for col in df.columns if '_temp' in col.lower()]
            for col in temp_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and (val < -35 or val > 80)) else val)
            
            # 전류: -500~500A
            current_cols = [col for col in df.columns if '_current' in col.lower()]
            for col in current_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and (val < -500 or val > 500)) else val)
            
            # 차량 속도: 0~180km/h
            speed_cols = [col for col in df.columns if 'emobility_spd' in col.lower()]
            for col in speed_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and (val < 0 or val > 180)) else val)
            
            # 셀 전압: 0~6V
            cell_volt_cols = [col for col in df.columns if 'cell_volt_' in col.lower()]
            for col in cell_volt_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and (val < 0 or val > 6)) else val)
            
            # 누적값: ≤1,000,000
            cumul_cols = [col for col in df.columns if 'cumul' in col.lower()]
            for col in cumul_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and val > 1000000) else val)
            
            # 주행거리: 0~2,000,000km
            odo_cols = [col for col in df.columns if 'odometer' in col.lower()]
            for col in odo_cols:
                df[col] = df[col].map(lambda val: np.nan if (isinstance(val, (int, float)) and (val <= 0 or val > 2000000)) else val)
        
        elif category == 'gps':
            # 위도: -90~90
            if 'lat' in df.columns:
                df['lat'] = df['lat'].apply(lambda x: np.nan if pd.notna(x) and (x < -90 or x > 90) else x)
            
            # 경도: -180~180
            if 'lng' in df.columns:
                df['lng'] = df['lng'].apply(lambda x: np.nan if pd.notna(x) and (x < -180 or x > 180) else x)
            
            # 속도: 0~300km/h
            if 'speed' in df.columns:
                df['speed'] = df['speed'].apply(lambda x: np.nan if pd.notna(x) and (x < 0 or x > 300) else x)
            
            # 방향: 0~360
            if 'direction' in df.columns:
                df['direction'] = df['direction'].apply(lambda x: np.nan if pd.notna(x) and (x < 0 or x > 360) else x)
            
            # 연료퍼센트: 0~100
            if 'fuel_pct' in df.columns:
                df['fuel_pct'] = df['fuel_pct'].apply(lambda x: np.nan if pd.notna(x) and (x < 0 or x > 100) else x)
            
            # HDOP: 0~50
            if 'hdop' in df.columns:
                df['hdop'] = df['hdop'].apply(lambda x: np.nan if pd.notna(x) and (x < 0 or x > 50) else x)
        
        return df
    
    def convert_data_types(self, df: pd.DataFrame, category: str) -> pd.DataFrame:
        """데이터 타입 변환 - 우리 코드의 장점"""
        if df.empty:
            return df
            
        df = df.copy()
        
        # device_no: object 타입 유지 (과학적 표기법 방지)
        if 'device_no' in df.columns:
            df['device_no'] = df['device_no'].astype(str)
        
        # 시간 컬럼들: object 타입 유지
        time_cols = ['time', 'msg_time', 'measured_month']
        for col in time_cols:
            if col in df.columns:
                df[col] = df[col].astype(str)
        
        if category == 'bms':
            # BMS 숫자 컬럼들을 float64로 변환
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if col not in ['device_no', 'time', 'msg_time', 'measured_month']:
                    df[col] = pd.to_numeric(df[col], errors='coerce').astype('float64')
        
        elif category == 'gps':
            # GPS 숫자 컬럼들을 float64로 변환
            float_cols = ['lat', 'lng', 'speed', 'direction', 'fuel_pct', 'hdop']
            for col in float_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce').astype('float64')
            
            # GPS 문자 컬럼들을 object로 변환
            object_cols = ['mode', 'source', 'state', 'car_type']
            for col in object_cols:
                if col in df.columns:
                    df[col] = df[col].astype('object')
        
        return df
    
    def process_file_streaming_append(self, file_path: str, category: str, output_file: str):
        """스트리밍 방식으로 파일 처리 - append 모드 (헤더 없이)"""
        try:
            chunk_size = 10000  # 1만 행씩 처리
            
            print(f"🔄 {file_path} append 처리 시작")
            
            for chunk_df in pd.read_csv(file_path, chunksize=chunk_size, low_memory=False):
                if chunk_df.empty:
                    continue
                
                # 데이터 정제
                chunk_df = self.clean_data(chunk_df, category)
                
                # GPS 리스트 컬럼 동적 확장
                if category == 'gps':
                    chunk_df = self.expand_gps_list_columns(chunk_df)
                
                # 물리적 범위 검증
                chunk_df = self.validate_physical_ranges(chunk_df, category)
                
                # 데이터 타입 변환
                chunk_df = self.convert_data_types(chunk_df, category)
                                
                # 헤더 없이 append
                chunk_df.to_csv(output_file, mode='a', header=False, index=False)
                
                print(f"✅ {file_path} 청크 append 완료 ({len(chunk_df)}행)")
                
                # 메모리에서 청크 해제
                del chunk_df
            
            print(f"✅ {file_path} append 처리 완료")
            
        except Exception as e:
            print(f"❌ {file_path} append 처리 중 오류: {e}")
    
    def process_file_streaming(self, file_path: str, category: str, output_file: str):
        """스트리밍 방식으로 파일 처리 - 메모리 효율적"""
        try:
            chunk_size = 10000  # 1만 행씩 처리
            is_first_chunk = True
            
            print(f"🔄 {file_path} 스트리밍 처리 시작")
            
            for chunk_df in pd.read_csv(file_path, chunksize=chunk_size, low_memory=False):
                if chunk_df.empty:
                    continue
                
                # 데이터 정제
                chunk_df = self.clean_data(chunk_df, category)
                
                # GPS 리스트 컬럼 동적 확장
                if category == 'gps':
                    chunk_df = self.expand_gps_list_columns(chunk_df)
                
                # 물리적 범위 검증
                chunk_df = self.validate_physical_ranges(chunk_df, category)
                
                # 데이터 타입 변환
                chunk_df = self.convert_data_types(chunk_df, category)
                
                # 첫 번째 청크는 헤더와 함께 저장, 이후는 헤더 없이 append
                chunk_df.to_csv(output_file, mode='a' if not is_first_chunk else 'w', 
                               header=is_first_chunk, index=False)
                
                is_first_chunk = False
                print(f"✅ {file_path} 청크 처리 완료 ({len(chunk_df)}행)")
                
                # 메모리에서 청크 해제
                del chunk_df
            
            print(f"✅ {file_path} 스트리밍 처리 완료")
            
        except Exception as e:
            print(f"❌ {file_path} 스트리밍 처리 중 오류: {e}")
    
    def process_file(self, file_path: str, category: str) -> pd.DataFrame:
        """파일 처리 메인 함수"""
        try:
            # 파일 읽기
            df = pd.read_csv(file_path, low_memory=False)
            
            # 데이터 정제
            df = self.clean_data(df, category)
            
            # GPS 리스트 컬럼 동적 확장 (정제 직후 적용)
            if category == 'gps':
                df = self.expand_gps_list_columns(df)
            
            # 물리적 범위 검증
            df = self.validate_physical_ranges(df, category)
            
            # 데이터 타입 변환
            df = self.convert_data_types(df, category)
            
            # 타임스탬프 보정
            for dt_col in ['time', 'msg_time', 'measured_month', 'start_time']:
                if dt_col in df.columns:
                    df[dt_col] = self._fix_year_vectorized(df[dt_col])
            
            return df
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            return pd.DataFrame()
    
    def save_data(self, df: pd.DataFrame, category: str, output_dir: str):
        """통합 데이터 저장"""
        if df.empty:
            return
        
        # 저장 경로 생성
        output_path = Path(output_dir) / f"{category}.csv"
        
        # 통합 파일로 저장
        df.to_csv(output_path, mode='w', header=True, index=False)
        print(f"✅ {category} 통합 데이터 저장 완료: {output_path}")

    def process_directory(self, root_dir: str, output_dir: str, use_ray: bool = True):
        """splited_data 구조를 유지하면서 개별 파일 전처리"""
        root = Path(root_dir)
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)

        categories = ['bms', 'gps']

        try:
            if use_ray:
                import ray
                if not ray.is_initialized():
                    ray.init(ignore_reinit_error=True, logging_level=30)

                @ray.remote
                def _process_file_with_structure(file_path: str, category: str, root_dir: str, output_dir: str):
                    inst = BasePreprocessor()
                    df = inst.process_file(file_path, category)
                    
                    if df.empty:
                        return {"status": "empty", "path": file_path}
                    
                    # 원본 구조 유지하면서 출력 경로 생성
                    relative_path = Path(file_path).relative_to(Path(root_dir))
                    output_path = Path(output_dir) / relative_path
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    df.to_csv(output_path, index=False)
                    return {"status": "success", "path": str(relative_path)}

                for category in categories:
                    file_paths = [str(p) for p in root.rglob(f"**/{category}/**/*.csv")]
                    if not file_paths:
                        continue
                    
                    print(f"🔄 {category} 파일 {len(file_paths)}개 처리 시작...")
                    
                    # Ray 병렬 처리
                    futures = [_process_file_with_structure.remote(p, category, str(root), str(output)) for p in file_paths]
                    results = ray.get(futures)
                    
                    success_count = sum(1 for r in results if r["status"] == "success")
                    empty_count = sum(1 for r in results if r["status"] == "empty")
                    
                    print(f"✅ {category} 완료: 성공 {success_count}개, 빈파일 {empty_count}개")
                    
            else:
                for category in categories:
                    file_paths = list(root.rglob(f"**/{category}/**/*.csv"))
                    if not file_paths:
                        continue
                    
                    for file_path in file_paths:
                        # 원본 구조 유지하면서 출력 경로 생성
                        relative_path = file_path.relative_to(root)
                        output_path = output / relative_path
                        
                        # 출력 디렉토리 생성
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        
                        # 스트리밍 방식으로 전처리 후 저장
                        self.process_file_streaming(str(file_path), category, str(output_path))
                        print(f"✅ {relative_path} 전처리 완료")
                        
        except Exception as e:
            print(f"❌ 디렉터리 처리 오류: {e}")

if __name__ == "__main__":
    bp = BasePreprocessor()
    
    # splited_data 폴더 스캔해서 정제
    bp.process_directory(
        "splited_data/aicar_2308_splited_by_cartype",  # 입력 폴더
        "final_data/aicar_2308_splited_by_cartype",    # 출력 폴더
        use_ray=False  # Ray 병렬처리 사용 여부
    )