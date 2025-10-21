// vehicle-performance.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Battery, Zap, TrendingUp, CheckCircle, AlertCircle, XCircle, Clock, Sun, Snowflake, Leaf, Flower } from 'lucide-react';
import { useDashboardContext } from '@/context/DashboardContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface VehicleTypeData {
  carType: string;
  deviceCount: number;
  avgSoc: number;
  avgSoh: number;
  totalRecords: number;
}

interface DeviceData {
  device_no: string;
  soc: number;
  soh: number;
  vehicle_status: string;
  performance_grade: string;
}

export default function VehiclePerformance() {
  const { initialized } = useDashboardContext();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCarType, setSelectedCarType] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [batteryData, setBatteryData] = useState<any>(null);
  const [drivingData, setDrivingData] = useState<any>(null);
  const [chargingData, setChargingData] = useState<any>(null);
  const [segmentData, setSegmentData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  // 주행 분석 카드 UI 상태
  const [patternView, setPatternView] = useState<'daily' | 'monthly' | 'seasonal'>('daily');
  // 날짜 범위 선택 (기본: 전체)
  const [rangeStart, setRangeStart] = useState<string>(''); // YYYY-MM-DD
  const [rangeEnd, setRangeEnd] = useState<string>('');     // YYYY-MM-DD

  // segments의 전체 기간 계산
  const segmentsRange = useMemo(() => {
    const segments: any[] = segmentData?.segments || segmentData || [];
    if (!Array.isArray(segments) || segments.length === 0) return { min: undefined as number | undefined, max: undefined as number | undefined };
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const s of segments) {
      const t1 = new Date(s?.start_time || s?._time).getTime();
      const t2 = new Date(s?.end_time || s?._time).getTime();
      if (!isNaN(t1)) min = Math.min(min, t1);
      if (!isNaN(t2)) max = Math.max(max, t2);
    }
    if (!isFinite(min) || max === 0) return { min: undefined, max: undefined };
    return { min, max };
  }, [segmentData]);

  // 초기 날짜 범위 설정 (한 번만)
  useEffect(() => {
    if (segmentsRange.min && segmentsRange.max && !rangeStart && !rangeEnd) {
      const toDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
      setRangeStart(toDateStr(segmentsRange.min));
      setRangeEnd(toDateStr(segmentsRange.max));
    }
  }, [segmentsRange, rangeStart, rangeEnd]);

  // Helper: 계절 계산
  const getSeason = (month0: number) => {
    // month0: 0=Jan ... 11=Dec
    if (month0 === 11 || month0 === 0 || month0 === 1) return '겨울';
    if (month0 >= 2 && month0 <= 4) return '봄';
    if (month0 >= 5 && month0 <= 7) return '여름';
    return '가을';
  };

  // 실제 segments 데이터로 차트용 데이터 생성
  const patternChartData = useMemo(() => {
    const segments: any[] = segmentData?.segments || segmentData || [];
    if (!Array.isArray(segments) || segments.length === 0) return [] as any[];

    // 안전 파싱 + 주행거리만 집계
    const drivingSegments = segments.filter((s: any) => {
      const dist = Number(s?.distance_km ?? 0);
      const main = s?.main_activity || s?.segment_type; // 하위 호환
      return dist > 0 && (main ? String(main).includes('주행') : true);
    });

    if (drivingSegments.length === 0) return [] as any[];

    const byKey = new Map<string, number>();

    if (patternView === 'daily') {
      // 최근 30일 기본
      const endTs = rangeEnd ? new Date(rangeEnd).getTime() : new Date(drivingSegments[drivingSegments.length - 1]?.end_time || drivingSegments[drivingSegments.length - 1]?._time || Date.now()).getTime();
      const startTs = rangeStart ? new Date(rangeStart).getTime() : endTs - 30 * 24 * 60 * 60 * 1000;
      for (const s of drivingSegments) {
        const t = new Date(s?.end_time || s?._time || s?.start_time).getTime();
        if (isNaN(t) || t < startTs || t > endTs) continue;
        const key = new Date(t).toISOString().slice(0, 10); // YYYY-MM-DD
        const prev = byKey.get(key) || 0;
        byKey.set(key, prev + Number(s.distance_km));
      }
      const sorted = Array.from(byKey.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      let cumulative = 0;
      return sorted.map(([name, distance]) => {
        cumulative += distance;
        return { name, distance, cumulative };
      });
    }

    if (patternView === 'seasonal') {
      for (const s of drivingSegments) {
        const t = new Date(s?.end_time || s?._time || s?.start_time);
        if (isNaN(t.getTime())) continue;
        if (rangeStart && t.getTime() < new Date(rangeStart).getTime()) continue;
        if (rangeEnd && t.getTime() > new Date(rangeEnd).getTime()) continue;
        const key = getSeason(t.getMonth());
        const prev = byKey.get(key) || 0;
        byKey.set(key, prev + Number(s.distance_km));
      }
      const order = ['봄', '여름', '가을', '겨울'];
      let cumulative = 0;
      return order
        .filter((k) => byKey.has(k))
        .map((k) => {
          const distance = byKey.get(k) || 0;
          cumulative += distance;
          return { name: k, distance, cumulative };
        });
    }

    // 기본: 월별(YYYY-MM)
    for (const s of drivingSegments) {
      const t = new Date(s?.end_time || s?._time || s?.start_time);
      if (isNaN(t.getTime())) continue;
      if (rangeStart && t.getTime() < new Date(rangeStart).getTime()) continue;
      if (rangeEnd && t.getTime() > new Date(rangeEnd).getTime()) continue;
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
      const prev = byKey.get(key) || 0;
      byKey.set(key, prev + Number(s.distance_km));
    }
    const sorted = Array.from(byKey.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = 0;
    return sorted.map(([name, distance]) => {
      cumulative += distance;
      return { name, distance, cumulative };
    });
  }, [segmentData, patternView]);

  // 공통: 날짜 범위로 필터링된 주행 세션 리스트
  const filteredDrivingSessions = useMemo(() => {
    const segments: any[] = segmentData?.segments || segmentData || [];
    if (!Array.isArray(segments) || segments.length === 0) return [] as any[];
    const startMs = rangeStart ? new Date(rangeStart).getTime() : undefined;
    const endMs = rangeEnd ? new Date(rangeEnd).getTime() : undefined;
    return segments.filter((s: any) => {
      const dist = Number(s?.distance_km ?? 0);
      const main = s?.main_activity || s?.segment_type;
      const t = new Date(s?.end_time || s?._time || s?.start_time).getTime();
      if (isNaN(t)) return false;
      if (startMs && t < startMs) return false;
      if (endMs && t > endMs) return false;
      return dist > 0 && (main ? String(main).includes('주행') : true);
    });
  }, [segmentData, rangeStart, rangeEnd]);

  // 히스토그램: 세션 거리 분포 (km)
  const histogramData = useMemo(() => {
    if (filteredDrivingSessions.length === 0) return [] as any[];
    // 구간: 0-1, 1-3, 3-5, 5-10, 10-20, 20-50, 50+
    const bins: { label: string; min: number; max: number | null; count: number }[] = [
      { label: '0~1', min: 0, max: 1, count: 0 },
      { label: '1~3', min: 1, max: 3, count: 0 },
      { label: '3~5', min: 3, max: 5, count: 0 },
      { label: '5~10', min: 5, max: 10, count: 0 },
      { label: '10~20', min: 10, max: 20, count: 0 },
      { label: '20~50', min: 20, max: 50, count: 0 },
      { label: '50+', min: 50, max: null, count: 0 }
    ];
    for (const s of filteredDrivingSessions) {
      const d = Number(s.distance_km || 0);
      const bin = bins.find(b => (b.max === null ? d >= b.min : d >= b.min && d < b.max));
      if (bin) bin.count += 1;
    }
    return bins.map(b => ({ name: b.label, count: b.count }));
  }, [filteredDrivingSessions]);

  // 도넛: 단거리/장거리 비율 (임계값 5km)
  const donutData = useMemo(() => {
    if (filteredDrivingSessions.length === 0) return [] as any[];
    const THRESH_KM = 5;
    let shortCnt = 0, longCnt = 0;
    for (const s of filteredDrivingSessions) {
      const d = Number(s.distance_km || 0);
      if (d < THRESH_KM) shortCnt += 1; else longCnt += 1;
    }
    return [
      { name: '단거리', value: shortCnt },
      { name: '장거리', value: longCnt }
    ];
  }, [filteredDrivingSessions]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // 차종별 현황 데이터 가져오기
  const fetchVehicleTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles/driving-patterns/types');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.vehicleTypes) {
          setVehicleTypes(data.vehicleTypes);
        }
      }
    } catch (error) {
      console.error('차종별 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 차종별 디바이스 목록 가져오기
  const fetchDevices = async (carType: string) => {
    // 이미 로드된 데이터가 있으면 재요청하지 않음
    if (devices.length > 0 && selectedCarType === carType) {
      return;
    }
    
    try {
      const response = await fetch(`/api/vehicles/driving-patterns/types?car_type=${carType}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.devices) {
          setDevices(data.devices);
        }
      }
    } catch (error) {
      console.error('디바이스 목록 로드 실패:', error);
    }
  };

  useEffect(() => {
    // 초기 로드만 수행 (탭 이동 시 재요청 방지)
    fetchVehicleTypes();
  }, []);


  // 차종 클릭 핸들러
  const handleCarTypeClick = async (carType: string) => {
    setSelectedCarType(carType);
    await fetchDevices(carType);
    setShowDeviceModal(true);
  };

  // 디바이스 클릭 핸들러
  const handleDeviceClick = async (deviceNo: string) => {
    setSelectedDevice(deviceNo);
    // 디바이스 목록 모달은 그대로 둠 (닫지 않음)
    setShowDetailModal(true); // 상세 모달을 즉시 띄우고 내부에서 로딩 표시
    setDetailLoading(true);

    // 이미 로드된 데이터가 있으면 재요청하지 않음
    if (batteryData && drivingData && chargingData && segmentData) {
      setDetailLoading(false);
      return;
    }

    // 초기화
    setBatteryData(null);
    setDrivingData(null);
    setChargingData(null);
    setSegmentData(null);

    // 개별 차량 분석 데이터 가져오기 (병렬)
    try {
      const [batteryRes, drivingRes, chargingRes, segmentRes] = await Promise.all([
        fetch(`/api/vehicles/driving-patterns/battery/${deviceNo}`),
        fetch(`/api/vehicles/driving-patterns/${deviceNo}`),
        fetch(`/api/vehicles/driving-patterns/charging/${deviceNo}`),
        fetch(`/api/vehicles/driving-patterns/segments/${deviceNo}`)
      ]);

      if (batteryRes.ok) {
        const battery = await batteryRes.json();
        console.log('배터리 데이터:', battery);
        setBatteryData(battery.data);
      }
      if (drivingRes.ok) {
        const driving = await drivingRes.json();
        console.log('주행 데이터:', driving);
        setDrivingData(driving.data);
      }
      if (chargingRes.ok) {
        const charging = await chargingRes.json();
        console.log('충전 데이터:', charging);
        setChargingData(charging.data);
      }
      if (segmentRes.ok) {
        const segment = await segmentRes.json();
        console.log('구간 데이터:', segment);
        setSegmentData(segment.data);
      }
    } catch (error) {
      console.error('개별 차량 데이터 로드 실패:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getGradeDisplay = (grade: string) => {
    switch (grade) {
      case '우수': return <><CheckCircle className="w-4 h-4 inline mr-1 text-green-600" />우수</>;
      case '양호': return <><CheckCircle className="w-4 h-4 inline mr-1 text-blue-600" />양호</>;
      case '보통': return <><Clock className="w-4 h-4 inline mr-1 text-yellow-600" />보통</>;
      case '불량': return <><XCircle className="w-4 h-4 inline mr-1 text-red-600" />불량</>;
      default: return grade;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case '우수': return 'bg-green-100 text-green-800';
      case '양호': return 'bg-blue-100 text-blue-800';
      case '보통': return 'bg-yellow-100 text-yellow-800';
      case '불량': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (vehicleStatus: string) => {
    switch (vehicleStatus) {
      case 'charging': return "충전중";
      case 'discharging': return "주행중";
      case 'idle': return "대기중";
      default: return "알 수 없음";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '충전중': return 'bg-blue-100 text-blue-800';
      case '주행중': return 'bg-green-100 text-green-800';
      case '대기중': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityText = (quality: string) => {
    switch (quality) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return quality;
    }
  };

  // 계절 아이콘 반환
  const getSeasonIcon = (season: string) => {
    switch (season) {
      case '봄': return <Flower className="w-4 h-4 text-pink-500" />;
      case '여름': return <Sun className="w-4 h-4 text-yellow-500" />;
      case '가을': return <Leaf className="w-4 h-4 text-orange-500" />;
      case '겨울': return <Snowflake className="w-4 h-4 text-blue-500" />;
      default: return <Sun className="w-4 h-4 text-gray-500" />;
    }
  };

  // 주요 활동 색상 및 스타일
  const getMainActivityStyle = (activity: string) => {
    switch (activity) {
      case '주행':
        return 'bg-green-100 text-green-800 border border-green-300 px-2 py-1 rounded text-sm font-medium';
      case '정차':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-1 rounded text-sm font-medium';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300 px-2 py-1 rounded text-sm font-medium';
    }
  };

  // 부가 활동 색상 및 스타일
  const getSubActivityStyle = (activity: string) => {
    switch (activity) {
      case '단거리':
        return 'bg-orange-100 text-orange-800 border border-orange-300 px-2 py-1 rounded text-sm font-medium';
      case '장거리':
        return 'bg-red-100 text-red-800 border border-red-300 px-2 py-1 rounded text-sm font-medium';
      case '충전':
        return 'bg-blue-100 text-blue-800 border border-blue-300 px-2 py-1 rounded text-sm font-medium';
      case '정지':
        return 'bg-gray-100 text-gray-600 border border-gray-300 px-2 py-1 rounded text-sm font-medium';
      default:
        return 'bg-gray-100 text-gray-600 border border-gray-300 px-2 py-1 rounded text-sm font-medium';
    }
  };

  // 전류 색상
  const getCurrentColor = (current: number) => {
    if (current > 0) return 'text-blue-600 font-medium';
    if (current < 0) return 'text-red-600 font-medium';
    return 'text-gray-600';
  };

  // SOC 변화량 시각화
  const renderSocChange = (change: number) => {
    const isPositive = change > 0;
    const width = Math.min(Math.abs(change) * 2, 100); // 최대 100% 너비
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">{change.toFixed(1)}%</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
          <div 
            className={`h-2 rounded-full ${isPositive ? 'bg-green-500' : 'bg-gray-400'}`}
            style={{ 
              width: `${width}%`,
              marginLeft: isPositive ? '0' : 'auto',
              marginRight: isPositive ? 'auto' : '0'
            }}
          />
        </div>
      </div>
    );
  };

  // Context 초기화 대기
  if (!initialized) {
    return <div className="flex items-center justify-center h-64 bg-white text-black">로딩 중...</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 bg-white text-black">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 p-6 bg-white text-black min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black">차량 성능 모니터링</h1>
        <div className="text-sm text-gray-600">
          총 {vehicleTypes.reduce((sum, type) => sum + type.deviceCount, 0)}대의 차량
        </div>
      </div>

      {/* 차종별 현황 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>차종별 데이터 수집 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                    <th className="text-left p-4">순번</th>
                    <th className="text-left p-4">차종</th>
                    <th className="text-left p-4">차량 수</th>
                </tr>
              </thead>
              <tbody>
                {vehicleTypes.map((type, index) => (
                  <tr key={type.carType} className="border-b">
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4">
                      <span 
                        className="font-medium text-black hover:text-green-500 cursor-pointer transition-colors duration-200"
                        onClick={() => handleCarTypeClick(type.carType)}
                      >
                        {type.carType}
                      </span>
                    </td>
                    <td className="p-4">{type.deviceCount}대</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 디바이스 목록 모달 */}
      {showDeviceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedCarType} - Device 목록</h2>
              <Button variant="ghost" className="text-black hover:text-red-600" onClick={() => setShowDeviceModal(false)}>✕</Button>
            </div>
            <p className="text-gray-600 mb-4">총 {devices.length}개의 차량 ID</p>
            <div className="grid grid-cols-2 gap-4">
              {devices.map((device, index) => (
                <Card key={device.device_no} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleDeviceClick(device.device_no)}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="font-bold text-lg">{device.device_no}</div>
                      <div className="text-sm text-gray-500">#{index + 1}</div>
                      <div className="mt-2 space-y-1">
                        <div className="text-sm">SOC: {device.soc.toFixed(1)}%</div>
                        <div className="text-sm">SOH: {device.soh.toFixed(1)}%</div>
                        <Badge className={getGradeColor(device.performance_grade)}>
                          {getGradeDisplay(device.performance_grade)}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2 w-full bg-white text-black border border-gray-300 hover:bg-gray-100">
                        상세보기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 개별 차량 상세 모달 */}
      {showDetailModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedDevice} 상세 분석</h2>
              <Button variant="ghost" className="text-black hover:text-red-600" onClick={() => setShowDetailModal(false)}>✕</Button>
            </div>
            
            {detailLoading ? (
              <div className="flex items-center justify-center h-64 text-gray-600">로딩 중...</div>
            ) : (
              <>
                {/* 구간별 통계 테이블 - 맨 위로 이동 */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      구간별 통계
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">주요 활동</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">부가 활동</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px]">계절</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px]">시작 시간</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px]">종료 시간</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">SOH (%)</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">팩 전압 (V)</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">팩 전류 (A)</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">SOC 시작 (%)</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">SOC 종료 (%)</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">주행거리 (km)</th>
                            <th className="text-left p-2 font-semibold text-gray-700 min-w-[80px] whitespace-nowrap">
                              에너지 변화량 (kWh)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {segmentData?.segments?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((segment: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-2 whitespace-nowrap">
                                <span className={getMainActivityStyle(segment.main_activity)}>
                                  {segment.main_activity}
                                </span>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <span className={getSubActivityStyle(segment.sub_activity)}>
                                  {segment.sub_activity}
                                </span>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  {getSeasonIcon(segment.season)}
                                  <span className="text-sm">{segment.season}</span>
                                </div>
                              </td>
                              <td className="p-2 text-sm whitespace-nowrap">{new Date(segment.start_time).toLocaleString('ko-KR')}</td>
                              <td className="p-2 text-sm whitespace-nowrap">{new Date(segment.end_time).toLocaleString('ko-KR')}</td>
                              <td className="p-2 text-sm font-medium whitespace-nowrap">{segment.soh ? `${segment.soh.toFixed(1)}%` : 'N/A'}</td>
                              <td className="p-2 text-sm whitespace-nowrap">{segment.pack_volt ? `${segment.pack_volt.toFixed(1)}V` : 'N/A'}</td>
                              <td className={`p-2 text-sm font-medium whitespace-nowrap ${getCurrentColor(segment.pack_current || 0)}`}>
                                {segment.pack_current ? `${segment.pack_current.toFixed(1)}A` : 'N/A'}
                              </td>
                              <td className="p-2 text-sm whitespace-nowrap">{segment.soc_start ? `${segment.soc_start.toFixed(1)}%` : 'N/A'}</td>
                              <td className="p-2 text-sm whitespace-nowrap">{segment.soc_end ? `${segment.soc_end.toFixed(1)}%` : 'N/A'}</td>
                              <td className="p-2 text-sm font-medium whitespace-nowrap">
                                {segment.distance_km !== undefined && segment.distance_km !== null 
                                  ? `${segment.distance_km}km` 
                                  : 'N/A'}
                              </td>
                              <td
                                className={`p-2 text-sm font-medium whitespace-nowrap ${
                                  Number(segment.energy_kwh.toFixed(3)) === 0
                                    ? 'text-black'  
                                    : segment.energy_kwh > 0
                                      ? 'text-green-600' // 양수 = 방전
                                      : 'text-red-600'   // 음수 = 충전
                                }`}
                              >
                                {segment.energy_kwh !== undefined && segment.energy_kwh !== null
                                  ? `${segment.energy_kwh.toFixed(3)}kWh`
                                  : 'N/A'}
                              </td>
                            </tr>
                          )) || (
                            <tr>
                              <td colSpan={12} className="p-4 text-center text-gray-500">데이터가 없습니다.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* 페이지네이션 */}
                    {segmentData?.segments && segmentData.segments.length > itemsPerPage && (
                      <div className="flex justify-center items-center mt-4 space-x-1 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs bg-white text-black border-gray-300"
                        >
                          처음
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs bg-white text-black border-gray-300"
                        >
                          이전
                        </Button>
                        
                        {/* 페이지 번호들 */}
                        {(() => {
                          const totalPages = Math.ceil(segmentData.segments.length / itemsPerPage);
                          const pages = [];
                          
                          // 10개씩 묶어서 표시
                          const currentGroup = Math.floor((currentPage - 1) / 10);
                          const startPage = currentGroup * 10 + 1;
                          const endPage = Math.min(totalPages, (currentGroup + 1) * 10);
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(i);
                          }
                          
                          return pages.map((page) => (
                            <Button
                              key={page}
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 text-sm bg-white border-gray-300 ${
                                currentPage === page 
                                  ? "text-blue-600 font-semibold" 
                                  : "text-black"
                              }`}
                            >
                              {page}
                            </Button>
                          ));
                        })()}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === Math.ceil(segmentData.segments.length / itemsPerPage)}
                          className="px-2 py-1 text-xs bg-white text-black border-gray-300"
                        >
                          다음
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.ceil(segmentData.segments.length / itemsPerPage))}
                          disabled={currentPage === Math.ceil(segmentData.segments.length / itemsPerPage)}
                          className="px-2 py-1 text-xs bg-white text-black border-gray-300"
                        >
                          마지막
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 분석 카드들 - 세로로 배치 */}
                <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Battery className="w-5 h-5 mr-2" />
                    배터리 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                        <div>평균 SOC: {batteryData?.avg_soc ? `${batteryData.avg_soc.toFixed(1)}%` : 'N/A'}</div>
                        <div>평균 SOH: {batteryData?.avg_soh ? `${batteryData.avg_soh.toFixed(1)}%` : 'N/A'}</div>
                        <div>건강도: {batteryData?.battery_health || 'N/A'}</div>
                        <div>셀 밸런스: {batteryData?.cell_balance || 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Car className="w-5 h-5 mr-2" />
                    주행 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                  <div className="space-y-2">
                      <div>총 주행거리: {drivingData?.total_distance !== undefined ? `${drivingData.total_distance.toLocaleString('ko-KR')}km` : 'N/A'}</div>
                      <div>주행 횟수: {drivingData?.session_count || 0}회</div>
                      <div>주행 시간: {drivingData?.driving_time?.formatted_time || 'N/A'}</div>
                      <div>평균 효율: {drivingData?.total_distance && drivingData?.driving_time?.total_seconds ? `${(drivingData.total_distance / (drivingData.driving_time.total_seconds / 3600)).toFixed(1)}km/h` : 'N/A'}</div>
                    </div>
                    {/* 보기 전환 */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">주행 패턴</div>
                      <select
                        value={patternView}
                        onChange={(e) => setPatternView(e.target.value as 'daily' | 'monthly' | 'seasonal')}
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-black"
                      >
                        <option value="daily">일별</option>
                        <option value="monthly">월별</option>
                        <option value="seasonal">계절별</option>
                      </select>
                    </div>

                    {/* 패턴 차트 */}
                    <div className="w-full h-44 border rounded bg-white p-4">
                      <div className="text-sm font-medium mb-2">
                        {patternView === 'daily' ? '일별' : patternView === 'monthly' ? '월별' : '계절별'} 주행거리
                      </div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={patternChartData as any}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="distance" fill="#3b82f6" />
                            <Line type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 세션 분포 & 도넛 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="h-44 border rounded bg-white p-3">
                        <div className="text-sm font-medium mb-2">세션 거리 분포</div>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={histogramData as any}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#6366f1" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="h-44 border rounded bg-white p-3">
                        <div className="text-sm font-medium mb-2">단거리/장거리 비율</div>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={donutData as any} dataKey="value" nameKey="name" innerRadius={35} outerRadius={55}>
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* 날짜 범위 선택 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">날짜 범위</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={rangeStart}
                            onChange={(e) => setRangeStart(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-black"
                            min={segmentsRange.min ? new Date(segmentsRange.min).toISOString().slice(0,10) : undefined}
                            max={rangeEnd || (segmentsRange.max ? new Date(segmentsRange.max).toISOString().slice(0,10) : undefined)}
                          />
                          <span className="text-gray-400">~</span>
                          <input
                            type="date"
                            value={rangeEnd}
                            onChange={(e) => setRangeEnd(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-black"
                            min={rangeStart || (segmentsRange.min ? new Date(segmentsRange.min).toISOString().slice(0,10) : undefined)}
                            max={segmentsRange.max ? new Date(segmentsRange.max).toISOString().slice(0,10) : undefined}
                          />
                        </div>
                      </div>
                      <div className="w-full h-28 md:h-36 border rounded bg-white p-3">
                        <div className="text-sm font-medium mb-2">주행 세션 타임라인</div>
                        <div className="h-20 md:h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={filteredDrivingSessions.slice(0, 20).map((s: any, i: number) => ({
                                name: `세션${i+1}`,
                                start: new Date(s.start_time || s._time).getHours() + new Date(s.start_time || s._time).getMinutes()/60,
                                duration: (new Date(s.end_time || s._time).getTime() - new Date(s.start_time || s._time).getTime()) / (1000 * 60 * 60),
                                distance: Number(s.distance_km || 0)
                              }))}
                              layout="horizontal"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 24]} />
                              <YAxis dataKey="name" type="category" width={60} />
                              <Tooltip 
                                formatter={(value: any, name: string) => [
                                  name === 'duration' ? `${value.toFixed(1)}시간` : 
                                  name === 'distance' ? `${value.toFixed(1)}km` : value,
                                  name === 'duration' ? '지속시간' : name === 'distance' ? '거리' : name
                                ]}
                              />
                              <Bar dataKey="duration" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    충전 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                        <div>충전 횟수: {chargingData?.total_sessions || 0}회</div>
                        <div>충전 시간: {chargingData?.total_charging_time_hours ? `${chargingData.total_charging_time_hours.toFixed(1)}시간` : 'N/A'}</div>
                        <div>충전 에너지: {chargingData?.total_energy_kwh ? `${chargingData.total_energy_kwh.toFixed(0)}kWh` : 'N/A'}</div>
                        <div>충전 효율: {chargingData?.avg_charging_efficiency ? `${chargingData.avg_charging_efficiency.toFixed(1)}%` : 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

