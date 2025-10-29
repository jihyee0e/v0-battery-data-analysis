// vehicle-performance.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Battery, TrendingUp, CheckCircle, XCircle, Clock, Sun, Snowflake, Leaf, Flower } from 'lucide-react';
import { useDashboardContext } from '@/context/DashboardContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, Label, LabelList, ScatterChart, Scatter, ReferenceLine } from 'recharts';

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

  // Helper: 계절 계산
  const getSeason = (month0: number) => {
    // month0: 0=Jan ... 11=Dec
    if (month0 === 11 || month0 === 0 || month0 === 1) return '겨울';
    if (month0 >= 2 && month0 <= 4) return '봄';
    if (month0 >= 5 && month0 <= 7) return '여름';
    return '가을';
  };

  // 실제 segments 데이터로 차트용 데이터 생성 (전체 데이터 사용)
  const patternChartData = useMemo(() => {
    const segments: any[] = segmentData?.segments || segmentData || [];
    if (!Array.isArray(segments) || segments.length === 0) return [] as any[];

    // 안전 파싱 + 주행거리만 집계 (날짜 필터 없이 전체 데이터)
    const drivingSegments = segments.filter((s: any) => {
      const dist = Number(s?.distance_km ?? 0);
      const main = s?.main_activity || s?.segment_type; // 하위 호환
      return dist > 0 && (main ? String(main).includes('주행') : true);
    });

    if (drivingSegments.length === 0) return [] as any[];

    const byKey = new Map<string, number>();

    if (patternView === 'daily') {
      // 전체 일별 데이터
      for (const s of drivingSegments) {
        const t = new Date(s?.end_time || s?._time || s?.start_time).getTime();
        if (isNaN(t)) continue;
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

    // 기본: 월별(YYYY-MM) - 전체 데이터
    for (const s of drivingSegments) {
      const t = new Date(s?.end_time || s?._time || s?.start_time);
      if (isNaN(t.getTime())) continue;
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

  // 주행 세션 리스트 (전체, 날짜 필터 없음)
  const allDrivingSessions = useMemo(() => {
    const segments: any[] = segmentData?.segments || segmentData || [];
    if (!Array.isArray(segments) || segments.length === 0) return [] as any[];
    return segments.filter((s: any) => {
      const dist = Number(s?.distance_km ?? 0);
      const main = s?.main_activity || s?.segment_type;
      return dist > 0 && (main ? String(main).includes('주행') : true);
    });
  }, [segmentData]);

  // 히스토그램: 세션 거리 분포 (km) - 전체 데이터 사용
  const histogramData = useMemo(() => {
    if (allDrivingSessions.length === 0) return [] as any[];
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
    for (const s of allDrivingSessions) {
      const d = Number(s.distance_km || 0);
      const bin = bins.find(b => (b.max === null ? d >= b.min : d >= b.min && d < b.max));
      if (bin) bin.count += 1;
    }
    return bins.map(b => ({ name: b.label, count: b.count }));
  }, [allDrivingSessions]);

  // 도넛: 단거리/장거리 비율 (임계값 5km) - 전체 데이터 사용
  const donutData = useMemo(() => {
    if (allDrivingSessions.length === 0) return [] as any[];
    const THRESH_KM = 5;
    let shortCnt = 0, longCnt = 0;
    for (const s of allDrivingSessions) {
      const d = Number(s.distance_km || 0);
      if (d < THRESH_KM) shortCnt += 1; else longCnt += 1;
    }
    return [
      { name: '단거리', value: shortCnt },
      { name: '장거리', value: longCnt }
    ];
  }, [allDrivingSessions]);

  // 도넛: 주행/정차 비율
  const idleRatioData = useMemo(() => {
    const segments: any[] = segmentData?.segments || segmentData || [];
    if (!Array.isArray(segments) || segments.length === 0) return [] as any[];
    
    let drivingCnt = 0, idleCnt = 0;
    for (const s of segments) {
      const main = s?.main_activity || s?.segment_type;
      if (main && String(main).includes('주행')) {
        drivingCnt += 1;
      } else if (main && String(main).includes('정차')) {
        idleCnt += 1;
      }
    }
    
    return [
      { name: '주행', value: drivingCnt },
      { name: '정차', value: idleCnt }
    ];
  }, [segmentData]);

  // 주행 효율 데이터 (km/kWh)
  const efficiencyData = useMemo(() => {
    if (allDrivingSessions.length === 0) return [] as any[];
    
    const byKey = new Map<string, { totalDistance: number, totalEnergy: number }>();
    
    for (const s of allDrivingSessions) {
      const t = new Date(s?.end_time || s?._time || s?.start_time);
      if (isNaN(t.getTime())) continue;
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
      
      const distance = Number(s.distance_km || 0);
      const energy = Math.abs(Number(s.energy_kwh || 0));
      
      if (energy === 0) continue; // 에너지가 0이면 효율 계산 불가
      
      const prev = byKey.get(key) || { totalDistance: 0, totalEnergy: 0 };
      byKey.set(key, {
        totalDistance: prev.totalDistance + distance,
        totalEnergy: prev.totalEnergy + energy
      });
    }
    
    const sorted = Array.from(byKey.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([name, data]) => ({
      name,
      efficiency: data.totalEnergy > 0 ? parseFloat((data.totalDistance / data.totalEnergy).toFixed(2)) : 0
    }));
  }, [allDrivingSessions]);

  // ========== 충전 분석 데이터 변환 ==========
  
  // // 충전 세션 요약 데이터 (Bar Chart용)
  // const chargingSessionData = useMemo(() => {
  //   const sessions = chargingData?.sessions || [];
  //   if (sessions.length === 0) return [] as any[];
    
  //   return sessions.map((s: any, idx: number) => ({
  //     name: `${idx + 1}회`,
  //     date: new Date(s.start_time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
  //     socIncrease: s.soc_increase || 0,
  //     duration: s.duration_minutes || 0,
  //     energy: s.energy_kwh || 0,
  //     isFast: s.is_fast_charging || false
  //   }));
  // }, [chargingData]);

  // // 충전 효율 분석 데이터 (Scatter Chart용)
  // const chargingEfficiencyData = useMemo(() => {
  //   const sessions = chargingData?.sessions || [];
  //   if (sessions.length === 0) return [] as any[];
    
  //   return sessions.map((s: any) => ({
  //     time: s.duration_minutes || 0,
  //     socIncrease: s.soc_increase || 0,
  //     current: s.avg_current || 0,
  //     voltage: s.avg_voltage || 0,
  //     energy: s.energy_kwh || 0
  //   }));
  // }, [chargingData]);

  // // 이상 충전 감지 데이터 (Box Plot용)
  // const anomalyData = useMemo(() => {
  //   const sessions = chargingData?.sessions || [];
  //   if (sessions.length === 0) return [] as any[];
    
  //   // ΔSOC per kWh 계산
  //   const efficiencyValues = sessions
  //     .map((s: any) => {
  //       const energy = s.energy_kwh || 0;
  //       const socIncrease = s.soc_increase || 0;
  //       return energy > 0 ? socIncrease / energy : 0;
  //     })
  //     .filter((v: number) => v > 0 && v < 100); // 이상치 제거
    
  //   if (efficiencyValues.length === 0) return [];
    
  //   // Z-score 계산
  //   const mean = efficiencyValues.reduce((a: number, b: number) => a + b, 0) / efficiencyValues.length;
  //   const std = Math.sqrt(
  //     efficiencyValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / efficiencyValues.length
  //   );
    
  //   return efficiencyValues.map((val: number) => {
  //     const zScore = std > 0 ? Math.abs((val - mean) / std) : 0;
  //     return {
  //       value: val,
  //       isAnomaly: zScore > 2, // 2 표준편차 이상
  //       zScore
  //     };
  //   });
  // }, [chargingData]);

  // // 시간대별 충전 패턴 데이터 (Heatmap용)
  // const chargingTimePatternData = useMemo(() => {
  //   const sessions = chargingData?.sessions || [];
  //   if (sessions.length === 0) return [] as any[];
    
  //   const heatmapData: any[] = [];
  //   const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    
  //   for (let hour = 0; hour < 24; hour++) {
  //     for (let day = 0; day < 7; day++) {
  //       const filteredSessions = sessions.filter((s: any) => {
  //         const startTime = new Date(s.start_time);
  //         return startTime.getHours() === hour && startTime.getDay() === day;
  //       });
        
  //       const totalEnergy = filteredSessions.reduce((sum: number, s: any) => sum + (s.energy_kwh || 0), 0);
        
  //       heatmapData.push({
  //         hour,
  //         day,
  //         dayLabel: weekdays[day],
  //         value: totalEnergy,
  //         count: filteredSessions.length
  //       });
  //     }
  //   }
    
  //   return heatmapData;
  // }, [chargingData]);

  // ========== 배터리 분석 데이터 변환 ==========
  
  // 온도 시계열 데이터
  const tempTimeseriesData = useMemo(() => {
    const timeseries = batteryData?.temperature_analysis?.timeseries || [];
    if (timeseries.length === 0) return [] as any[];
    
    // segments 데이터의 시간 범위 가져오기
    const segments = [...(segmentData?.segments || [])].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    if (segments.length > 0) {
      const firstTime = new Date(segments[0].start_time).getTime();
      const lastTime = new Date(segments[segments.length - 1].end_time).getTime();
      
      // 해당 시간 범위에 맞는 온도 데이터만 필터링
      const filteredTimeseries = timeseries.filter((t: any) => {
        const tTime = new Date(t.time).getTime();
        return tTime >= firstTime && tTime <= lastTime;
      });
      
      return filteredTimeseries.map((t: any) => ({
        time: new Date(t.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        temp: t.temp || 0,
        tempMax: t.tempMax || t.temp || 0,
        tempMin: t.tempMin || t.temp || 0,
        tempInternal: t.tempInternal || t.temp || 0
      }));
    }
    
    return timeseries.map((t: any) => ({
      time: new Date(t.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      temp: t.temp || 0,
      tempMax: t.tempMax || t.temp || 0,
      tempMin: t.tempMin || t.temp || 0,
      tempInternal: t.tempInternal || t.temp || 0
    }));
  }, [batteryData, segmentData]);

  // SOH 시계열 데이터 (수명 예측용)
  const sohTimeseriesData = useMemo(() => {
    const timeseries = batteryData?.soh_timeseries || [];
    if (timeseries.length === 0) return [] as any[];
    
    return timeseries.map((s: any) => ({
      time: new Date(s.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      soh: s.soh || 0
    }));
  }, [batteryData]);

  // 온도 이벤트 데이터
  const tempAnomalyData = useMemo(() => {
    const anomalies = batteryData?.temperature_analysis?.anomalies || [];
    if (anomalies.length === 0) return [] as any[];
    
    return anomalies.map((a: any) => ({
      time: new Date(a.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      temp: a.temp || 0,
      tempMax: a.tempMax || a.temp || 0,
      tempMin: a.tempMin || a.temp || 0,
      deviation: (a.tempMax || a.temp) - (a.tempMin || a.temp)
    }));
  }, [batteryData]);

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

    // 개별 차량 분석 데이터 가져오기
    try {
      const segmentRes = await fetch(`/api/vehicles/driving-patterns/segments/${deviceNo}`);
      const batteryRes = await fetch(`/api/vehicles/driving-patterns/battery/${deviceNo}`);
      const drivingRes = await fetch(`/api/vehicles/driving-patterns/${deviceNo}`);
      const chargingRes = await fetch(`/api/vehicles/driving-patterns/charging/${deviceNo}`);

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
      } else {
        const errorText = await chargingRes.text();
        console.error('충전 데이터 로드 실패:', chargingRes.status, errorText);
      }
      if (segmentRes.ok) {
        const segment = await segmentRes.json();
        console.log('구간 데이터:', segment);
        console.log(`🔢 원본 segments 수: ${segment.data?.segments?.length || 0}`);
        // 300개로 제한
        if (segment.data?.segments) {
          const originalLength = segment.data.segments.length;
          segment.data.segments = segment.data.segments.slice(0, 300);
          console.log(`✂️  제한 후 segments 수: ${segment.data.segments.length}개`);
        }
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
    // trim으로 공백 제거
    const normalizedActivity = String(activity || '').trim();
    
    switch (normalizedActivity) {
      case '단거리':
        return 'bg-orange-100 text-orange-800 border border-orange-300 px-2 py-1 rounded text-sm font-medium';
      case '장거리':
        return 'bg-red-100 text-red-800 border border-red-300 px-2 py-1 rounded text-sm font-medium';
      case '충전':
        return 'bg-blue-100 text-blue-800 border border-blue-300 px-2 py-1 rounded text-sm font-medium';
      case '정지':
        return 'bg-gray-100 text-gray-600 border border-gray-300 px-2 py-1 rounded text-sm font-medium';
      case '주차':
        return 'bg-purple-100 text-purple-800 border border-purple-300 px-2 py-1 rounded text-sm font-medium';
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
                                  {segment.sub_activity || '알 수 없음'}
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

                {/* Segments 타임라인 차트 */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Car className="w-5 h-5 mr-2" />
                      구간 시간표 (Timeline)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 주행/정차 막대 */}
                      <div className="relative h-12 border rounded bg-gray-50 overflow-hidden">
                        {segmentData?.segments?.map((seg: any, idx: number) => {
                          const startTime = new Date(seg.start_time).getTime();
                          const endTime = new Date(seg.end_time).getTime();
                          const totalTime = new Date(segmentData.segments[segmentData.segments.length - 1].end_time).getTime() - 
                                           new Date(segmentData.segments[0].start_time).getTime();
                          const startPercent = ((startTime - new Date(segmentData.segments[0].start_time).getTime()) / totalTime) * 100;
                          const widthPercent = ((endTime - startTime) / totalTime) * 100;
                          const isDriving = seg.main_activity?.includes('주행');
                          
                          return (
                            <div
                              key={idx}
                              className="absolute"
                              style={{
                                left: `${startPercent}%`,
                                width: `${widthPercent}%`,
                                height: '48%',
                                top: isDriving ? '0' : '50%',
                                backgroundColor: isDriving ? '#ef4444' : '#3b82f6',
                                borderRight: idx < segmentData.segments.length - 1 ? '1px solid white' : 'none'
                              }}
                              title={`${seg.main_activity} - ${Math.round(seg.duration_hours || 0)}분`}
                            />
                          );
                        })}
                      </div>
                      
                      {/* 요약 정보 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-red-500"></div>
                          <span className="text-sm">주행 구간</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500"></div>
                          <span className="text-sm">정차 구간</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 분석 카드들 - 세로로 배치 */}
                <div className="space-y-6">
              {/* ========== 배터리 심화 분석 시작 ========== */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Battery className="w-5 h-5 mr-2" />
                    배터리 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* KPI 카드들 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="text-sm text-gray-600 mb-1">평균 SOC</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {batteryData?.avg_soc ? `${batteryData.avg_soc.toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm text-gray-600 mb-1">평균 SOH</div>
                        <div className="text-2xl font-bold text-green-600">
                          {batteryData?.avg_soh ? `${batteryData.avg_soh.toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <div className="text-sm text-gray-600 mb-1">온도 편차</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {batteryData?.temperature_analysis?.temp_deviation ? `${batteryData.temperature_analysis.temp_deviation.toFixed(1)}°C` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">이상 온도 이벤트</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {batteryData?.temperature_analysis?.anomaly_count || 0}회
                        </div>
                      </div>
                    </div>

                    {/* 온도 분석 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">🔥 온도 분석 (Thermal Analysis)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="border rounded p-4">
                          <div className="text-sm font-medium mb-2">평균 온도</div>
                          <div className="text-3xl font-bold text-blue-600">
                            {batteryData?.avg_temperature ? `${batteryData.avg_temperature.toFixed(1)}°C` : 'N/A'}
                          </div>
                        </div>
                        <div className="border rounded p-4">
                          <div className="text-sm font-medium mb-2">온도 범위</div>
                          <div className="text-sm">
                            최대: {batteryData?.temperature_analysis?.avg_temp_max ? `${batteryData.temperature_analysis.avg_temp_max.toFixed(1)}°C` : 'N/A'}<br/>
                            최소: {batteryData?.temperature_analysis?.avg_temp_min ? `${batteryData.temperature_analysis.avg_temp_min.toFixed(1)}°C` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {/* 온도 시계열 차트 */}
                      <div className="h-96 border rounded bg-white p-4">
                        <div className="text-sm font-medium mb-3">온도 변화 추이</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={tempTimeseriesData as any} margin={{ top: 15, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} name="평균 온도" />
                            <Line type="monotone" dataKey="tempMax" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" name="최대 온도" />
                            <Line type="monotone" dataKey="tempMin" stroke="#60a5fa" strokeWidth={1} strokeDasharray="5 5" name="최소 온도" />
                            <Line type="monotone" dataKey="tempInternal" stroke="#10b981" strokeWidth={1} name="내부 온도" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* SOH 수명 예측
                    <div>
                      <h3 className="text-lg font-semibold mb-4">⚡️ 배터리 수명 예측 (SOH Degradation)</h3>
                      <div className="h-80 border rounded bg-white p-4">
                        <div className="text-sm font-medium mb-3">SOH 변화 추이</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sohTimeseriesData as any} margin={{ top: 15, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="soh" stroke="#10b981" strokeWidth={2} name="SOH (%)" />
                            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 5" label="교체 권장 (80%)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div> */}

                    {/* 이상 온도 이벤트 */}
                    {tempAnomalyData.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">🧠 이상 온도 이벤트 감지</h3>
                        <div className="h-96 border rounded bg-white p-4">
                          <div className="text-sm font-medium mb-3">온도 편차 큰 구간</div>
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart data={tempAnomalyData as any} margin={{ top: 15, bottom: 25 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" tick={{ fontSize: 8 }} />
                              <YAxis label={{ value: '온도 (°C)', angle: -90, position: 'insideLeft' }} />
                              <Tooltip 
                                formatter={(value: any, name: string) => {
                                  if (name === 'temp') return [value.toFixed(1) + '°C', '평균 온도'];
                                  if (name === 'deviation') return [value.toFixed(1) + '°C', '온도 편차'];
                                  return [value, name];
                                }}
                              />
                              <Scatter name="온도 편차" dataKey="deviation" fill="#ef4444">
                                {tempAnomalyData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.deviation > 10 ? '#dc2626' : '#f97316'} />
                                ))}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* ========== 배터리 분석 끝 ========== */}

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
                    <div className="w-full h-52 border rounded bg-white p-4">
                      <div className="text-sm font-medium mb-3">
                        {patternView === 'daily' ? '일별' : patternView === 'monthly' ? '월별' : '계절별'} 주행거리
                      </div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          {patternView === 'daily' ? (
                            // 일별: Area Chart 사용 (데이터가 많아서 더 보기 좋음)
                            <AreaChart data={patternChartData as any}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="name" 
                                angle={-45} 
                                textAnchor="end" 
                                height={80}
                                interval="preserveStartEnd"
                                tick={{ fontSize: 10 }}
                              />
                              <YAxis />
                              <Tooltip />
                              <Area type="monotone" dataKey="cumulative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2} name="누적 주행거리" />
                              <Area type="monotone" dataKey="distance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} name="일별 주행거리" />
                            </AreaChart>
                          ) : (
                            // 월별/계절별: Bar Chart 사용
                            <BarChart data={patternChartData as any}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="distance" fill="#3b82f6" />
                              <Line type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 세션 분포 & 도넛 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="h-64 border rounded bg-white p-4">
                        <div className="text-base font-semibold mb-4">세션 거리 분포</div>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={histogramData as any}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis allowDecimals={false} />
                              <Tooltip 
                                formatter={(value: any) => [`${value}회`, '세션 수']}
                                labelFormatter={(label) => `거리: ${label}km`}
                              />
                              <Bar dataKey="count" fill="#6366f1" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">※ 각 거리 구간별 주행 세션 횟수</div>
                      </div>
                      <div className="h-64 border rounded bg-white p-4">
                        <div className="text-base font-semibold mb-4">단거리/장거리 비율</div>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={donutData as any} 
                                dataKey="value" 
                                nameKey="name" 
                                innerRadius={45} 
                                outerRadius={70}
                                label={(entry: any) => {
                                  const total = donutData.reduce((sum: number, item: any) => sum + item.value, 0);
                                  const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                                  return `${percent}% (${entry.value}회)`;
                                }}
                                labelLine={false}
                              >
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip 
                                formatter={(value: any, name: string) => [
                                  name === '단거리' || name === '장거리' ? `${value}회` : value,
                                  name
                                ]}
                              />
                              <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => (
                                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{value}</span>
                                )}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* 주행/정차 비율 & 주행 효율 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="h-64 border rounded bg-white p-4">
                        <div className="text-base font-semibold mb-4">주행/정차 비율</div>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={idleRatioData as any} 
                                dataKey="value" 
                                nameKey="name" 
                                innerRadius={45} 
                                outerRadius={70}
                                label={(entry: any) => {
                                  const total = idleRatioData.reduce((sum: number, item: any) => sum + item.value, 0);
                                  const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                                  return `${percent}% (${entry.value}회)`;
                                }}
                                labelLine={false}
                              >
                                <Cell fill="#3b82f6" />
                                <Cell fill="#94a3b8" />
                              </Pie>
                              <Tooltip 
                                formatter={(value: any, name: string) => [
                                  name === '주행' || name === '정차' ? `${value}회` : value,
                                  name
                                ]}
                              />
                              <Legend 
                                verticalAlign="bottom" 
                                height={24}
                                wrapperStyle={{ paddingTop: '8px' }}
                                formatter={(value) => (
                                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{value}</span>
                                )}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="h-64 border rounded bg-white p-4">
                        <div className="text-base font-semibold mb-4">주행 효율 (km/kWh)</div>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={efficiencyData as any}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip 
                                formatter={(value: any) => [`${value} km/kWh`, '효율']}
                                labelFormatter={(label) => `월: ${label}`}
                              />
                              <Bar dataKey="efficiency" fill="#10b981" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">※ 월별 에너지 사용량 대비 주행 거리 (배터리 효율성)</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ========== 충전 수준 분석 시작 ========== */}
              {/* <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    충전 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">1️⃣ 충전 세션 요약</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-sm text-gray-600 mb-1">총 충전 횟수</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {chargingData?.total_sessions || 0}회
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-sm text-gray-600 mb-1">평균 SOC 증가량</div>
                          <div className="text-2xl font-bold text-green-600">
                            {chargingData?.sessions && chargingData.sessions.length > 0
                              ? `${(chargingData.sessions.reduce((sum: number, s: any) => sum + (s.soc_increase || 0), 0) / chargingData.sessions.length).toFixed(1)}%`
                              : '0%'}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <div className="text-sm text-gray-600 mb-1">평균 충전 시간</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {chargingData?.sessions && chargingData.sessions.length > 0
                              ? `${(chargingData.sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) / chargingData.sessions.length).toFixed(0)}분`
                              : '0분'}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-sm text-gray-600 mb-1">평균 충전 에너지</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {chargingData?.sessions && chargingData.sessions.length > 0
                              ? `${(chargingData.sessions.reduce((sum: number, s: any) => sum + (s.energy_kwh || 0), 0) / chargingData.sessions.length).toFixed(1)}kWh`
                              : '0kWh'}
                          </div>
                        </div>
                      </div>

                      <div className="h-96 border rounded bg-white p-4">
                        <div className="text-sm font-medium mb-3">세션별 충전 성과</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chargingSessionData as any}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip 
                              formatter={(value: any, name: string) => {
                                if (name === 'socIncrease') return [`${value.toFixed(1)}%`, 'SOC 증가'];
                                if (name === 'duration') return [`${value.toFixed(0)}분`, '충전 시간'];
                                if (name === 'energy') return [`${value.toFixed(2)}kWh`, '에너지'];
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="socIncrease" fill="#3b82f6" name="SOC 증가 (%)" />
                            <Bar yAxisId="right" dataKey="energy" fill="#10b981" name="에너지 (kWh)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">2️⃣ 충전 효율 분석</h3>
                      <div className="h-96 border rounded bg-white p-4">
                        <div className="text-sm font-medium mb-3">충전 시간 vs SOC 증가량 (색상 = 평균 전류)</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart data={chargingEfficiencyData as any}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              type="number" 
                              dataKey="time" 
                              name="충전 시간"
                              label={{ value: '충전 시간 (분)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                              type="number" 
                              dataKey="socIncrease" 
                              name="SOC 증가"
                              label={{ value: 'SOC 증가 (%)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              cursor={{ strokeDasharray: '3 3' }}
                              formatter={(value: any, name: string) => {
                                if (name === 'time') return [value.toFixed(0) + '분', '충전 시간'];
                                if (name === 'socIncrease') return [value.toFixed(1) + '%', 'SOC 증가'];
                                if (name === 'current') return [value.toFixed(1) + 'A', '평균 전류'];
                                if (name === 'voltage') return [value.toFixed(1) + 'V', '평균 전압'];
                                return [value, name];
                              }}
                            />
                            <Scatter 
                              name="충전 세션" 
                              dataKey="socIncrease" 
                              fill="#3b82f6"
                            >
                              {(chargingEfficiencyData as any[]).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.current > 50 ? '#ef4444' : entry.current > 20 ? '#f59e0b' : '#3b82f6'} />
                              ))}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">3️⃣ 이상 충전 감지</h3>
                      <div className="h-96 border rounded bg-white p-4">
                        <div className="text-sm font-medium mb-3">ΔSOC per kWh 분포 (Z-score 기반 이상치 탐지)</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={anomalyData.map((item: any, idx: number) => ({ ...item, index: idx })) as any}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="index" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: any, name: string) => {
                                if (name === 'value') return [`${value.toFixed(2)} %/kWh`, '효율'];
                                if (name === 'zScore') return [value.toFixed(2), 'Z-score'];
                                return [value, name];
                              }}
                            />
                            <Bar dataKey="value" fill="#6366f1">
                              {(anomalyData as any[]).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isAnomaly ? '#ef4444' : '#6366f1'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 text-sm text-gray-600">
                          이상치 수: {(anomalyData as any[]).filter((a: any) => a.isAnomaly).length}개
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card> */}
              {/* ========== 충전 분석 끝 ========== */}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

