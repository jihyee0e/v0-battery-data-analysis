'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BatteryGauge } from './battery-gauge';
import { ChargingStatus } from './charging-status';

interface DashboardData {
  total_vehicles: number;
  online_5m_pct: number;
  charging_now: number;
  moving_now: number;
  avg_soc: number;
  avg_soh: number;
  low_SOH_pct: number;
  high_temp_pct: number;
  high_imbalance_pct: number;
  vehicle_types: {
    [key: string]: {
      count: number;
      online_5m_pct: number;
      charging_now: number;
      moving_now: number;
      avg_soh: number;
      avg_soc: number;
      low_SOH_pct: number;
      high_temp_pct: number;
      high_imbalance_pct: number;
    };
  };
  last_updated: string;
}

interface VehicleData {
  vehicle_id: string;
  vehicle_type: string;
  latest_soc: number;
  latest_soh: number;
  performance_grade: string;
  last_updated: string;
  pack_volt: number;
  pack_current: number;
  mod_avg_temp: number;
  avg_efficiency: number;
  power_w: number;
  vehicle_status: string;
}

export default function EvDashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState<"porter2" | "gv60" | "bongo3">("porter2");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [availableDateRanges, setAvailableDateRanges] = useState<string[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [currentData, setCurrentData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);

  // 사용 가능한 날짜 범위 가져오기
  const fetchAvailableDateRanges = async () => {
    try {
      const response = await fetch('/api/date-ranges');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAvailableDateRanges(data.data);
        }
      }
    } catch (error) {
      console.error('날짜 범위 로드 실패:', error);
    }
  };

  // 대시보드 데이터 가져오기
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard API response:', data);
        setDashboardData(data);
        console.log('Dashboard data set:', data);
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    }
  };

  // 선택된 차량의 현재 데이터 가져오기
  const fetchVehicleData = async () => {
    try {
      const response = await fetch(`/api/vehicles/performance?car_type=${selectedVehicle.toUpperCase()}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setCurrentData(data.data[0]);
        }
      }
    } catch (error) {
      console.error('차량 데이터 로드 실패:', error);
    }
  };

  // 선택된 차종의 대시보드 데이터 필터링
  const getFilteredDashboardData = () => {
    if (!dashboardData) return null;
    
    const selectedVehicleData = dashboardData.vehicle_types[selectedVehicle];
    
    return selectedVehicleData || {
      count: dashboardData.total_vehicles,
      online_5m_pct: dashboardData.online_5m_pct,
      charging_now: dashboardData.charging_now,
      moving_now: dashboardData.moving_now,
      avg_soh: dashboardData.avg_soh,
      avg_soc: dashboardData.avg_soc,
      low_SOH_pct: dashboardData.low_SOH_pct,
      high_temp_pct: dashboardData.high_temp_pct,
      high_imbalance_pct: dashboardData.high_imbalance_pct,
    };
  };

  useEffect(() => {
    if (selectedVehicle || selectedDateRange) {
      fetchVehicleData();
    }
  }, [selectedVehicle, selectedDateRange]);

  useEffect(() => {
    if (dashboardData && currentData) {
      setLoading(false);
    }
  }, [dashboardData, currentData]);

  // 초기 로딩 상태 관리
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchAvailableDateRanges();
      await fetchDashboardData();
      await fetchVehicleData();
      setLoading(false);
    };
    
    initializeData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  if (!dashboardData || !currentData) {
    return <div className="text-red-500">데이터를 불러올 수 없습니다.</div>;
  }

  const getGradeDisplay = (grade: string) => {
    switch (grade) {
      case '우수': return '🟢 우수';
      case '양호': return '🔵 양호';
      case '보통': return '🟡 보통';
      case '불량': return '🔴 불량';
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

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">전기차 배터리 모니터링 대시보드</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            마지막 업데이트: {new Date(dashboardData.last_updated).toLocaleString('ko-KR')}
          </span>
          <Select value={selectedVehicle} onValueChange={(value: "porter2" | "gv60" | "bongo3") => setSelectedVehicle(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="porter2">PORTER2</SelectItem>
              <SelectItem value="gv60">GV60</SelectItem>
              <SelectItem value="bongo3">BONGO3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedDateRange} onValueChange={(value: string) => setSelectedDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 기간</SelectItem>
              {availableDateRanges.map((dateRange) => (
                <SelectItem key={dateRange} value={dateRange}>
                  {dateRange}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 핵심 KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{selectedVehicle.toUpperCase()} 차량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 SOC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.avg_soc?.toFixed(1) || '0.0'}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 SOH</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.avg_soh?.toFixed(1) || '0.0'}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">온라인 비율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.online_5m_pct?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-gray-500">
              최근 5분 내 보고
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 운영 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">충전 중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.charging_now || 0}</div>
            <p className="text-xs text-gray-500">
              현재 충전 중인 차량
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">주행 중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.moving_now || 0}</div>
            <p className="text-xs text-gray-500">
              현재 주행 중인 차량
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">데이터 신선도</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.online_5m_pct?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-gray-500">
              통신 상태 양호도
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 리스크 모니터링 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">저 SOH 비율</CardTitle>
            <Badge variant={(getFilteredDashboardData()?.low_SOH_pct || 0) >= 10 ? "destructive" : "secondary"}>
              {(getFilteredDashboardData()?.low_SOH_pct || 0) >= 10 ? "주의" : "양호"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.low_SOH_pct?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-gray-500">
              SOH &lt; 80% 차량 비율
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">고온 비율</CardTitle>
            <Badge variant={(getFilteredDashboardData()?.high_temp_pct || 0) >= 2 ? "destructive" : "secondary"}>
              {(getFilteredDashboardData()?.high_temp_pct || 0) >= 2 ? "주의" : "양호"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.high_temp_pct?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-gray-500">
              온도 &gt; 45℃ 차량 비율
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">불균형 비율</CardTitle>
            <Badge variant={(getFilteredDashboardData()?.high_imbalance_pct || 0) >= 5 ? "destructive" : "secondary"}>
              {(getFilteredDashboardData()?.high_imbalance_pct || 0) >= 5 ? "주의" : "양호"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getFilteredDashboardData()?.high_imbalance_pct?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-gray-500">
              셀 불균형 &gt; 1.5% 비율
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 배터리 상태 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>배터리 상태 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dashboardData.avg_soc.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">평균 SOC</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dashboardData.avg_soh.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">평균 SOH</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{dashboardData.total_vehicles}</div>
              <div className="text-sm text-gray-500">총 차량 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{dashboardData.online_5m_pct.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">온라인 비율</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 차종별 상세 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>차종별 상세 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(dashboardData.vehicle_types).map(([carType, data]) => (
              <div key={carType} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">{carType.toUpperCase()}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold">{data.count}</div>
                    <div className="text-xs text-gray-500">차량 수</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{data.avg_soh.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">평균 SOH</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{data.charging_now}</div>
                    <div className="text-xs text-gray-500">충전 중</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{data.moving_now}</div>
                    <div className="text-xs text-gray-500">주행 중</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm font-bold text-red-600">{data.low_SOH_pct.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">저 SOH 비율</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-orange-600">{data.high_temp_pct.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">고온 비율</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-yellow-600">{data.high_imbalance_pct.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">불균형 비율</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 차량 상세 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>선택된 차량: {currentData.vehicle_type}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">배터리 상태</h4>
              <BatteryGauge percentage={currentData.latest_soc} />
              <div className="text-sm text-gray-500">
                SOH: {currentData.latest_soh.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">충전 상태</h4>
              <ChargingStatus 
                isCharging={currentData.pack_current > 0}
                power={Math.abs((currentData.pack_current * currentData.pack_volt) / 1000)} 
                timeRemaining="계산 중..." 
              />
              <div className="text-sm text-gray-500">
                전압: {currentData.pack_volt.toFixed(1)}V<br />
                전류: {currentData.pack_current.toFixed(2)}A<br />
                전력: {Math.abs((currentData.pack_current * currentData.pack_volt) / 1000).toFixed(1)}W
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">성능 지표</h4>
              <div className="space-y-1">
                <div className="text-sm">
                  셀 밸런스: <span className="font-medium">{currentData.avg_efficiency.toFixed(2)}%</span>
                </div>
                <div className="text-sm">
                  온도: <span className="font-medium">{currentData.mod_avg_temp.toFixed(1)}°C</span>
                </div>
                <div className="text-sm">
                  전력: <span className="font-medium">{Math.abs((currentData.pack_current * currentData.pack_volt) / 1000).toFixed(1)}W</span>
                </div>
              </div>

            </div>
            <div className="space-y-2">
              <h4 className="font-medium">상태 정보</h4>
              <div className="space-y-1">
                <Badge className={getGradeColor(currentData.performance_grade)}>
                  {getGradeDisplay(currentData.performance_grade)}
                </Badge>
                <div className="text-sm text-gray-500">
                  상태: {currentData.vehicle_status}<br />
                  등급: {currentData.performance_grade}<br />
                  온도: {currentData.mod_avg_temp.toFixed(1)}°C
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
