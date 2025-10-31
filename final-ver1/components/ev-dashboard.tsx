// ev-dashboard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Car, Zap, Settings, TrendingUp, Thermometer } from 'lucide-react';
import { useDashboardContext } from '@/context/DashboardContext';

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
  odometer: number;
  speed: number;
  charging_power: number;
  charging_status: string;
  is_charging: boolean;
  is_fast_charging: boolean;
  is_slow_charging: boolean;
  is_moving: boolean;
}

export default function EvDashboard() {
  const { overviewStats, setOverviewStats, initialized } = useDashboardContext();
  const [selectedVehicle, setSelectedVehicle] = useState<"all" | "porter2" | "gv60" | "bongo3">("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [availableDateRanges, setAvailableDateRanges] = useState<string[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [currentData, setCurrentData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const [realtimeData, setRealtimeData] = useState<{
    summary: {
      total_devices: number;
      charging_devices: number;
      moving_devices: number;
      cable_only_devices: number;
      disconnected_devices: number;
      unknown_devices: number;
      avg_soc: number;
      avg_soh: number;
      avg_temp: number;
      avg_voltage: number;
      avg_current: number;
      avg_odometer: number;
      avg_speed: number;
      avg_power: number;
      max_temp: number;
      min_temp: number;
    };
    data: VehicleData[];
  } | null>(null);

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

  // 대시보드 데이터는 Context에서 관리됨

  // 선택된 차량의 현재 데이터 가져오기
  const fetchVehicleData = async () => {
    try {
      const carTypeParam = selectedVehicle === "all" ? "ALL" : selectedVehicle.toUpperCase();
      const response = await fetch(`/api/dashboard/analytics?car_type=${carTypeParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealtimeData({
            summary: data.summary,
            data: data.data
          });
          if (data.data && data.data.length > 0) {
            setCurrentData(data.data[0]);
          }
        }
      }
    } catch (error) {
      console.error('차량 데이터 로드 실패:', error);
    }
  };

  // 개요 통계는 Context에서 관리됨

  useEffect(() => {
    if (currentData) {
      setLoading(false);
    }
  }, [currentData]);

  // 초기 로딩 상태 관리
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchAvailableDateRanges();
      await fetchVehicleData();
      setLoading(false);
      setIsInitialMount(false);
    };
    
    initializeData();
  }, []);

  // selectedVehicle 또는 selectedDateRange 변경 시 (초기 마운트 이후)
  useEffect(() => {
    if (!isInitialMount) {
      fetchVehicleData();
    }
  }, [selectedVehicle, selectedDateRange]);

  // Context 초기화 대기
  if (!initialized) {
    return <div className="flex items-center justify-center h-64 bg-white text-black">로딩 중...</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 bg-white text-black">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-black">Main Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center">
              <Car className="mr-2 w-5 h-5" />
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-600 hover:border-gray-500"
              >
                <span className="text-sm text-black">
                  {selectedVehicle === "all" ? "전체" :
                   selectedVehicle === "porter2" ? "PORTER2" : 
                   selectedVehicle === "gv60" ? "GV60" : "BONGO3"}
                </span>
                <span className="text-black">▼</span>
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-gray-100 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                  <div className="py-1">
                    <button 
                      onClick={() => {setSelectedVehicle("all"); setIsDropdownOpen(false);}}
                      className="w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-700 flex items-center justify-between"
                    >
                      전체
                      {selectedVehicle === "all" && <span className="text-black">✓</span>}
                    </button>
                    <button 
                      onClick={() => {setSelectedVehicle("porter2"); setIsDropdownOpen(false);}}
                      className="w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-700 flex items-center justify-between"
                    >
                      PORTER2
                      {selectedVehicle === "porter2" && <span className="text-black">✓</span>}
                    </button>
                    <button 
                      onClick={() => {setSelectedVehicle("gv60"); setIsDropdownOpen(false);}}
                      className="w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-700 flex items-center justify-between"
                    >
                      GV60
                      {selectedVehicle === "gv60" && <span className="text-black">✓</span>}
                    </button>
                    <button 
                      onClick={() => {setSelectedVehicle("bongo3"); setIsDropdownOpen(false);}}
                      className="w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-700 flex items-center justify-between"
                    >
                      BONGO3
                      {selectedVehicle === "bongo3" && <span className="text-black">✓</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Data Flow Architecture */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Data Flow Architecture</h2>
          <div className="flex items-center justify-between">
            {/* Dataset */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Dataset</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <span>⛁</span>
                  <span className="text-sm">SK</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <span>⛁</span>
                  <span className="text-sm">Aicar</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <span>⛁</span>
                  <span className="text-sm">Batterwhy</span>
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="mx-4">
              <span className="text-2xl">→</span>
            </div>
            
            {/* Ranking */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Ranking</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Top 100</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Medium</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Bottom 100</span>
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="mx-4">
              <span className="text-2xl">→</span>
            </div>
            
            {/* Analysis */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Analysis</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <span>⛁</span>
                  <span className="text-sm">Battery</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Odometer</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200">
                  <span>🟢</span>
                  <span className="text-sm">Charge</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">데이터 통계</h2>
          {selectedVehicle === "all" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 전체 라인 수 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">전체 라인 수</h3>
              <div className="text-3xl font-bold text-black mb-2">
                {overviewStats?.total?.총합?.toLocaleString() ?? '-'}
                {/* 2,928,859,927 */}
              </div>
              <div className="text-sm text-gray-600">
                BMS: {overviewStats?.total?.BMS?.toLocaleString() ?? '-'} + GPS:{' '}
                {overviewStats?.total?.GPS?.toLocaleString() ?? '-'}
                {/* BMS: 2,773,281,962 + GPS: 155,577,965 */}
              </div>
            </div>
          
            {/* 수집 기간 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">수집 기간</h3>
              <div className="text-3xl font-bold text-black mb-2">
                {/* {(() => {
                  const start = new Date("2022-12-01T00:40:07")
                  const end = new Date("2023-08-31T23:59:58")
                  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                  return `${diffDays}일`
                })()} */}
                273일
              </div>
              <div className="text-sm text-gray-600">
                2022-12-01 00:40:07 ~ 2023-09-01 23:59:58
              </div>
            </div>
          
            {/* 차종별 개수 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">차종별 개수</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">BONGO3:</span>
                  <span className="text-black">
                    {overviewStats?.vehicles?.BONGO3?.총합?.toLocaleString() ?? '-'}
                    {/* 1,413,590,272 */}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GV60:</span>
                  <span className="text-black">
                    {overviewStats?.vehicles?.GV60?.총합?.toLocaleString() ?? '-'}
                    {/* 46,331,816 */}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PORTER2:</span>
                  <span className="text-black">
                    {overviewStats?.vehicles?.PORTER2?.총합?.toLocaleString() ?? '-'}
                    {/* 1,468,937,839 */}
                  </span>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">총 라인 수</h3>
                <div className="text-3xl font-bold text-black">
                  {(() => {
                    if (!overviewStats) return '-'
                    const map: any = { porter2: 'PORTER2', gv60: 'GV60', bongo3: 'BONGO3' }
                    const key = map[selectedVehicle as keyof typeof map]
                    return key ? overviewStats.vehicles?.[key]?.총합?.toLocaleString() ?? '-' : '-'
                  })()}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">등록 디바이스</h3>
                <div className="text-3xl font-bold text-black">
                  {(() => {
                    if (!overviewStats) return '-'
                    const map: any = { porter2: 'PORTER2', gv60: 'GV60', bongo3: 'BONGO3' }
                    const key = map[selectedVehicle as keyof typeof map]
                    return key ? overviewStats.avgSocSoh?.[key]?.device_count ?? '-' : '-'
                  })()}
                </div>
                <div className="text-sm text-gray-600">대</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">평균 성능</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">평균 SOC:</span>
                    <span className="text-black">
                      {(() => {
                        if (!overviewStats) return '-'
                        const map: any = { porter2: 'PORTER2', gv60: 'GV60', bongo3: 'BONGO3' }
                        const key = map[selectedVehicle as keyof typeof map]
                        const val = key ? overviewStats.avgSocSoh?.[key]?.avg_soc : null
                        return typeof val === 'number' ? `${val.toFixed(1)}%` : '-'
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">평균 SOH:</span>
                    <span className="text-black">
                      {(() => {
                        if (!overviewStats) return '-'
                        const map: any = { porter2: 'PORTER2', gv60: 'GV60', bongo3: 'BONGO3' }
                        const key = map[selectedVehicle as keyof typeof map]
                        const val = key ? overviewStats.avgSocSoh?.[key]?.avg_soh : null
                        return typeof val === 'number' ? `${val.toFixed(1)}%` : '-'
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* 상단 4개 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Battery Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Battery Status</h3>
            <span className="text-black text-sm">⛁</span>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#374151" strokeWidth="8" fill="transparent"/>
                {/* strokeDashoffset={251.2 - (251.2 * (realtimeData?.summary?.avg_soc || 0) / 100)} */}
                <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="8" fill="transparent" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (251.2 * 73 / 100)} 
                        strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {realtimeData?.summary?.avg_soc?.toFixed(0) || '-'}%
                    {/* 73% */}
                  </div>
                  <div className="text-xs text-black">Battery</div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">SOC:</span>
              <span className="text-black">{realtimeData?.summary?.avg_soc?.toFixed(1) || '-'}%</span>
              {/* <span className="text-black">72.7%</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Range:</span>
              <span className="text-black">{realtimeData?.summary?.avg_soc ? `${(realtimeData.summary.avg_soc * 0.15).toFixed(0)} km` : '- km'}</span>
              {/* <span className="text-black">11 km</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Voltage:</span>
              {/* <span className="text-black">{realtimeData?.summary?.avg_voltage?.toFixed(1) || '-'} V</span> */}
              <span className="text-black">370.6 V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current:</span>
              <span className="text-black">{realtimeData?.summary?.avg_current?.toFixed(1) || '-'} A</span>
              {/* <span className="text-black">2.1 A</span> */}
            </div>
          </div>
        </div>

        {/* Charging */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Charging</h3>
            <Zap className="text-orange-500 text-sm w-4 h-4" />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Zap className={`mr-2 w-4 h-4 ${(realtimeData?.summary?.charging_devices || 0) > 0 ? 'text-green-500' : 'text-gray-600'}`} />
                {/* <Zap className="mr-2 w-4 h-4 text-green-500" /> */}
                <span className={(realtimeData?.summary?.charging_devices || 0) > 0 ? 'text-green-500' : 'text-gray-600'}>
                {/* <span className="text-green-500"> */}
                  {(realtimeData?.summary?.charging_devices || 0) > 0 ? 'Charging' : 'Not Charging'}
                  {/* Charging */}
                </span>
              </div>
              <div className="text-2xl font-bold text-black">
                {realtimeData?.data?.filter(d => d.is_charging).reduce((sum, d) => sum + (d.charging_power || 0), 0).toFixed(1) || '0.0'} kW
                {/* 68.6 kW */}
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min((realtimeData?.summary?.charging_devices || 0) / Math.max(realtimeData?.summary?.total_devices || 1, 1) * 100, 100)}%`}}></div>
              {/* <div className="bg-green-500 h-2 rounded-full" style={{width: '92%'}}></div> */}
            </div>
            <div className="text-sm text-black">
              {realtimeData?.summary?.charging_devices || 0} / {realtimeData?.summary?.total_devices || 0} devices
              {/* 108 / 117 devices */}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cable Only:</span>
              <span className="text-black">{realtimeData?.summary?.cable_only_devices || 0} devices</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Disconnected:</span>
              <span className="text-black">{realtimeData?.summary?.disconnected_devices || 0} devices</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unknown:</span>
              <span className="text-black">{realtimeData?.summary?.unknown_devices || 0} devices</span>
            </div>
          </div>
        </div>

        {/* Odometer */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Odometer</h3>
            <Settings className="text-black text-sm w-4 h-4" />
          </div>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-black">
              {realtimeData?.summary?.avg_odometer ? Math.round(realtimeData.summary.avg_odometer).toLocaleString() : '-'}
              {/* 40,344 */}
            </div>
            <div className="text-sm text-gray-600">km</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Moving:</span>
              <span className={(realtimeData?.summary?.moving_devices || 0) > 0 ? 'text-green-400' : 'text-gray-600'}>
              {/* <span className="text-green-400"> */}
                {realtimeData?.summary?.moving_devices || 0} devices
                {/* 3 devices */}
              </span>
            </div>
          </div>
        </div>

        {/* Battery Health */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Battery Health</h3>
            <TrendingUp className="text-green-500 text-sm w-4 h-4" />
          </div>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-black">
              {realtimeData?.summary?.avg_soh?.toFixed(1) || '-'}%
              {/* 98.1% */}
            </div>
            <div className="text-sm text-gray-600">State of Health</div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min(realtimeData?.summary?.avg_soh || 0, 100)}%`}}></div>
            {/* <div className="bg-green-500 h-2 rounded-full" style={{width: '98.1%'}}></div> */}
          </div>
        </div>
      </div>

      {/* 하단 2개 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Temperature Range */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Temperature Range</h3>
            <TrendingUp className="text-black text-sm w-4 h-4" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Average:</span>
              <span className="text-black font-bold">{realtimeData?.summary?.avg_temp?.toFixed(1) || '-'}°C</span>
              {/* <span className="text-black font-bold">0.0°C</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Temp:</span>
              <span className="text-black font-bold">{realtimeData?.summary?.max_temp?.toFixed(1) || '-'}°C</span>
              {/* <span className="text-black font-bold">28.0°C</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min Temp:</span>
              <span className="text-black font-bold">{realtimeData?.summary?.min_temp?.toFixed(1) || '-'}°C</span>
              {/* <span className="text-black font-bold">-8.0°C</span> */}
            </div>
          </div>
        </div>

        {/* Energy Efficiency */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Energy Efficiency</h3>
            <Zap className="text-orange-500 text-sm w-4 h-4" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Power:</span>
              <span className="text-black font-bold">{realtimeData?.summary?.avg_power ? `${(realtimeData.summary.avg_power / 1000).toFixed(1)} kW` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Current:</span>
              <span className="text-black font-bold">{realtimeData?.summary?.avg_current?.toFixed(1) || '-'} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Voltage:</span>
              <span className="text-black font-bold">{realtimeData?.summary?.avg_voltage?.toFixed(1) || '-'} V</span>
            </div>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
