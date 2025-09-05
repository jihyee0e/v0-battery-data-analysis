// 데이터 표시용 유틸리티 함수
export const formatDisplayValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toString();
};

// 퍼센트 표시용
export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value.toFixed(1)}%`;
};

// 소수점 표시용
export const formatDecimal = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toFixed(decimals);
};

// 정수 표시용
export const formatInteger = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return Math.round(value).toString();
};
