// ev-dashboard.tsx

'use client';

import React, { useState } from 'react';
import { Car, Zap, TrendingUp, Thermometer, Battery, Plug, MapPin, BarChart, Filter, Wrench, CheckCircle, Activity, AlertTriangle } from 'lucide-react';

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

// 데이터 통계 하드코딩 값
const hardcodedStats = {
  total: {
    총합: 2928859927,
    BMS: 2773281962,
    GPS: 155577965,
  },
  vehicles: {
    BONGO3: {
      총합: 1413590272,
    },
    GV60: {
      총합: 46331816,
    },
    PORTER2: {
      총합: 1468937839,
    },
  },
  collectionPeriod: {
    days: 273,
    start: '2022-12-01 00:40:07',
    end: '2023-09-01 23:59:58',
  },
};

export default function EvDashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState<"all" | "porter2" | "gv60" | "bongo3">("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 차종/전체 하드코딩 요약값 (원하는 값으로 채워 사용)
  const hardcodedSummaryByType: Record<string, any> = {
    ALL: {
      // 화면 스냅샷 기준 하드코딩 값
      total_devices: 117,
      charging_devices: 66,
      moving_devices: 35,
      cable_only_devices: 46,
      disconnected_devices: 5,
      unknown_devices: 0,
      avg_soc: 66.8,
      avg_soh: 97.4,
      avg_temp: 6.7,
      avg_voltage: 347.5,
      battery_voltage_display: 347.5,
      avg_current: 0.1,
      avg_odometer: 64515,
      avg_speed: 0,
      avg_power: -800,
      charging_power_kw: 130.6,
      max_temp: 50.0,
      min_temp: -45.0,
    },
    PORTER2: {
      total_devices: 56,
      charging_devices: 26,
      moving_devices: 18,
      cable_only_devices: 28,
      disconnected_devices: 2,
      unknown_devices: 0,
      avg_soc: 68.5,
      avg_soh: 97.1,
      avg_temp: 5.9,
      max_temp: 50.0,
      min_temp: -45.0,
      avg_voltage: 341.9,
      battery_voltage_display: 341.9,
      avg_current: -0.2,
      avg_odometer: 63310,
      avg_speed: 0,
      avg_power: -2100,
      charging_power_kw: 19.2,
    },
    GV60: {
      total_devices: 6,
      charging_devices: 5,
      moving_devices: 1,
      cable_only_devices: 1,
      disconnected_devices: 0,
      unknown_devices: 0,
      avg_soc: 63.0,
      avg_soh: 100.0,
      avg_temp: 20.0,
      max_temp: 48.0,
      min_temp: 0.0,
      avg_voltage: 736.6,
      battery_voltage_display: 736.6,
      avg_current: -0.4,
      avg_odometer: 20990,
      avg_speed: 0,
      avg_power: 700,
      charging_power_kw: 4.2,
    },
    BONGO3: {
      total_devices: 55,
      charging_devices: 35,
      moving_devices: 16,
      cable_only_devices: 17,
      disconnected_devices: 3,
      unknown_devices: 0,
      avg_soc: 65.2,
      avg_soh: 97.6,
      avg_temp: 6.0,
      max_temp: 46.0,
      min_temp: -14.0,
      avg_voltage: 340.6,
      battery_voltage_display: 340.6,
      avg_current: 0.3,
      avg_odometer: 67179,
      avg_speed: 0,
      avg_power: 400,
      charging_power_kw: 107.2,
    },
  };

  // 표시용 요약값 선택
  const vehicleKeyMap: Record<string, string> = { all: 'ALL', porter2: 'PORTER2', gv60: 'GV60', bongo3: 'BONGO3' };
  const displaySummary = hardcodedSummaryByType[vehicleKeyMap[selectedVehicle]] || hardcodedSummaryByType.ALL;
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
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <span>⛁</span>
                  <span className="text-sm">SK</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <span>⛁</span>
                  <span className="text-sm">AICAR</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <span>⛁</span>
                  <span className="text-sm">Batterwhy</span>
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="mx-4">
              <span className="text-2xl">→</span>
            </div>
            
            {/* Processing */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Processing</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">Data Cleaning</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <Wrench className="w-4 h-4" />
                  <span className="text-sm">Feature Engineering</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Validation</span>
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
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Battery Health Prediction</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Anomaly Detection</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                  <BarChart className="w-4 h-4" />
                  <span className="text-sm">Performance Analysis</span>
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
                  2,928,859,927
                </div>
                <div className="text-sm text-gray-600">
                  BMS: 2,773,281,962 + GPS: 155,577,965
                </div>
              </div>
          
              {/* 수집 기간 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">수집 기간</h3>
                <div className="text-3xl font-bold text-black mb-2">
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
                      1,413,590,272
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GV60:</span>
                    <span className="text-black">
                      46,331,816
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PORTER2:</span>
                    <span className="text-black">
                      1,468,937,839
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
                    const map: any = { porter2: 'PORTER2', gv60: 'GV60', bongo3: 'BONGO3' }
                    const key = map[selectedVehicle as keyof typeof map]
                    if (!key || !hardcodedStats?.vehicles?.[key as keyof typeof hardcodedStats.vehicles]) return '-'
                    return hardcodedStats.vehicles[key as keyof typeof hardcodedStats.vehicles].총합.toLocaleString()
                  })()}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">등록 디바이스</h3>
                <div className="text-3xl font-bold text-black">
                  {(() => {
                    const map: any = { porter2: 'PORTER2', gv60: 'GV60', bongo3: 'BONGO3' }
                    const key = map[selectedVehicle as keyof typeof map]
                    return key && displaySummary ? displaySummary.total_devices : '-'
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
                      {displaySummary?.avg_soc !== undefined && displaySummary?.avg_soc !== null ? Number(displaySummary.avg_soc).toFixed(1) : '-'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">평균 SOH:</span>
                    <span className="text-black">
                      {displaySummary?.avg_soh !== undefined && displaySummary?.avg_soh !== null ? Number(displaySummary.avg_soh).toFixed(1) : '-'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 데이터 필드 목록 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col space-y-3">
              <h2 className="text-lg font-semibold text-black">데이터 필드 목록</h2>
              <span className="text-xs text-gray-800">🔴 <span className="bg-gray-100 px-2 py-1 rounded">주요 필드</span> 🔵 <span className="bg-gray-100 px-2 py-1 rounded">공통 필드</span></span>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <span className="text-xs text-gray-500">(모든 차종 공통)</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">총 필드 수</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-sm font-medium text-black">253개</span>
              </div>
            </div>
          </div>

          {/* 카테고리 6개 그리드 (2행 3열) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 배터리 기본 정보 */}
          <div className="border border-gray-200 rounded-lg p-3 max-h-70 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Battery className="w-4 h-4" />
                <span className="text-base font-medium text-gray-700">배터리 기본/Battery Core</span>
              </div>
              <span className="text-xs text-gray-500">(22개)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-base text-red-600 whitespace-nowrap">▪ soc</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ soh</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ pack_volt</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ pack_current</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ odometer</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ batt_pw</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ batt_internal_temp</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ batt_coolant_inlet_temp</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ batt_fan_running</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ batt_ltr_rear_temp</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ batt_pra_busbar_temp</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ bms_running</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ acceptable_chrg_pw</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ acceptable_dischrg_pw</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ insul_resistance</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ int_temp</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ inverter_capacity_volt</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ main_relay_conn</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ sub_batt_volt</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ ext_temp</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ socd</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ v2l</div>
              </div>
              <div className="space-y-1">
              </div>
              <div className="space-y-1">
              </div>
            </div>
          </div>

          {/* 셀 전압 */}
          <div className="border border-gray-200 rounded-lg p-3 max-h-70 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span className="text-base font-medium text-gray-700">셀 전압/Cell Voltage</span>
              </div>
              <span className="text-xs text-gray-500">(195개)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cell_volt_1 ~ 192</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cellvolt_dispersion</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ max_cell_volt</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ max_cell_volt_no</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ max_deter_cell_no</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ min_cell_volt</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ min_cell_volt_no</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ min_deter</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ min_deter_cell_no</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cell_volt_count</div>
              </div>
              <div className="space-y-1">
              </div>
              <div className="space-y-1">
              </div>
            </div>
          </div>

          {/* 모듈 온도 */}
          <div className="border border-gray-200 rounded-lg p-3 max-h-70 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Thermometer className="w-4 h-4" />
                <span className="text-base font-medium text-gray-700">모듈 온도/Module Temp</span>
              </div>
              <span className="text-xs text-gray-500">(21개)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-base text-gray-600 whitespace-nowrap">▪ mod_temp_1 ~ 18</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ mod_avg_temp</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ mod_max_temp</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ mod_min_temp</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ mod_temp_count</div>
              </div>
              <div className="space-y-1">
              </div>
              <div className="space-y-1">
              </div>
            </div>
          </div>

          {/* 충전 */}
          <div className="border border-gray-200 rounded-lg p-3 max-h-70 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Plug className="w-4 h-4" />
                <span className="text-base font-medium text-gray-700">충전/Charge</span>
              </div>
              <span className="text-xs text-gray-500">(7개)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-base text-red-600 whitespace-nowrap">▪ chrg_cable_conn</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ fast_chrg_port_conn</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ slow_chrg_port_conn</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ fast_chrg_relay_on</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ est_chrg_time</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ chrg_cnt</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ chrg_cnt_q</div>
              </div>
              <div className="space-y-1">
              </div>
              <div className="space-y-1">
              </div>
            </div>
          </div>

          {/* 위치/GPS */}
          <div className="border border-gray-200 rounded-lg p-3 max-h-70 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span className="text-base font-medium text-gray-700">위치/GPS</span>
              </div>
              <span className="text-xs text-gray-500">(9개)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-base text-red-600 whitespace-nowrap">▪ speed</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ lat</div>
                <div className="text-base text-red-600 whitespace-nowrap">▪ lng</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ direction</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ fuel_pct</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ hdop</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ mode</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ source</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ state</div>
              </div>
              <div className="space-y-1">
              </div>
              <div className="space-y-1">
              </div>
            </div>
          </div>

          {/* 기타 */}
          <div className="border border-gray-200 rounded-lg p-3 max-h-70 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart className="w-4 h-4" />
                <span className="text-base font-medium text-gray-700">기타/Other</span>
              </div>
              <span className="text-xs text-gray-500">(23개)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-base text-blue-600 whitespace-nowrap">▪ car_type</div>
                <div className="text-base text-blue-600 whitespace-nowrap">▪ device_no</div>
                <div className="text-base text-blue-600 whitespace-nowrap">▪ time</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ msg_id</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ op_time</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ seq</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ start_time</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ measured_month</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ msg_time</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ drive_motor_spd_1</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ drive_motor_spd_2</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ emobility_spd</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ hvac_list_1</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ hvac_list_2</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ airbag_hwire_duty</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ trip_chrg_pw</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ trip_dischrg_pw</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cumul_current_chrgd</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cumul_current_dischrgd</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cumul_energy_chrgd</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cumul_energy_chrgd_q</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cumul_pw_chrgd</div>
                <div className="text-base text-gray-600 whitespace-nowrap">▪ cumul_pw_dischrgd</div>
              </div>
              <div className="space-y-1">
              </div>
              <div className="space-y-1">
              </div>
            </div>
          </div>
        </div>
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
                <circle cx="50" cy="50" r="40" stroke="#374151" strokeWidth="8" fill="transparent"/>                <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="8" fill="transparent" 
                        strokeDasharray="251.2" 
                        // strokeDashoffset={251.2 - (251.2 * (realtimeData?.summary?.avg_soc || 0) / 100)} 
                        strokeDashoffset={251.2 - (251.2 * (displaySummary?.avg_soc || 0) / 100)} 
                        // {strokeDashoffset={251.2 - (251.2 * 73 / 100)}}
                        strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {/* {realtimeData?.summary?.avg_soc?.toFixed(0) || '-'}% */}
                    {displaySummary?.avg_soc !== undefined && displaySummary?.avg_soc !== null ? Number(displaySummary.avg_soc).toFixed(0) : '-'}%
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
              {/* <span className="text-black">{realtimeData?.summary?.avg_soc?.toFixed(1) || '-'}%</span> */}
              <span className="text-black">{displaySummary?.avg_soc !== undefined && displaySummary?.avg_soc !== null ? Number(displaySummary.avg_soc).toFixed(1) : '-'}%</span>
              {/* <span className="text-black">72.7%</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Range:</span>
              {/* <span className="text-black">{realtimeData?.summary?.avg_soc ? `${(realtimeData.summary.avg_soc * 0.15).toFixed(0)} km` : '- km'}</span> */}
              <span className="text-black">{displaySummary?.avg_soc ? `${(Number(displaySummary.avg_soc) * 0.15).toFixed(0)} km` : '- km'}</span>
              {/* <span className="text-black">11 km</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Voltage:</span>
              {/* <span className="text-black">{realtimeData?.summary?.avg_voltage?.toFixed(1) || '-'} V</span> */}
            <span className="text-black">{(displaySummary?.battery_voltage_display ?? displaySummary?.avg_voltage) !== undefined && (displaySummary?.battery_voltage_display ?? displaySummary?.avg_voltage) !== null ? Number(displaySummary.battery_voltage_display ?? displaySummary.avg_voltage).toFixed(1) : '-'} V</span>
            {/* <span className="text-black">370.6 V</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current:</span>
              {/* <span className="text-black">{realtimeData?.summary?.avg_current?.toFixed(1) || '-'} A</span> */}
              <span className="text-black">{displaySummary?.avg_current !== undefined && displaySummary?.avg_current !== null ? Number(displaySummary.avg_current).toFixed(1) : '-'} A</span>
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
              {/* <Zap className={`mr-2 w-4 h-4 ${(realtimeData?.summary?.charging_devices || 0) > 0 ? 'text-green-500' : 'text-gray-600'}`} /> */}
                <Zap className={`mr-2 w-4 h-4 ${(displaySummary?.charging_devices || 0) > 0 ? 'text-green-500' : 'text-gray-600'}`} />
                {/* <Zap className="mr-2 w-4 h-4 text-green-500" /> */}
                {/* <span className={(realtimeData?.summary?.charging_devices || 0) > 0 ? 'text-green-500' : 'text-gray-600'}> */}
                <span className={(displaySummary?.charging_devices || 0) > 0 ? 'text-green-500' : 'text-gray-600'}>
                {/* <span className="text-green-500"> */}
                {/* {(realtimeData?.summary?.charging_devices || 0) > 0 ? 'Charging' : 'Not Charging'} */}
                  {(displaySummary?.charging_devices || 0) > 0 ? 'Charging' : 'Not Charging'}
                  {/* Charging */}
                </span>
              </div>
              <div className="text-2xl font-bold text-black">
                {displaySummary?.charging_power_kw !== undefined && displaySummary?.charging_power_kw !== null
                  ? Number(displaySummary.charging_power_kw).toFixed(1)
                  : '0.0'
                } kW
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          {/* <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min((realtimeData?.summary?.charging_devices || 0) / Math.max(realtimeData?.summary?.total_devices || 1, 1) * 100, 100)}%`}}></div> */}
              <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min((displaySummary?.charging_devices || 0) / Math.max(displaySummary?.total_devices || 1, 1) * 100, 100)}%`}}></div>
              {/* <div className="bg-green-500 h-2 rounded-full" style={{width: '92%'}}></div> */}
            </div>
            <div className="text-sm text-black">
            {/* {realtimeData?.summary?.charging_devices || 0} / {realtimeData?.summary?.total_devices || 0} devices */}
              {displaySummary?.charging_devices || 0} / {displaySummary?.total_devices || 0} devices
              {/* 108 / 117 devices */}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cable Only:</span>
              {/* <span className="text-black">{realtimeData?.summary?.cable_only_devices || 0} devices</span> */}
              <span className="text-black">{displaySummary?.cable_only_devices || 0} devices</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Disconnected:</span>
              {/* <span className="text-black">{realtimeData?.summary?.disconnected_devices || 0} devices</span> */}
              <span className="text-black">{displaySummary?.disconnected_devices || 0} devices</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unknown:</span>
              {/* <span className="text-black">{realtimeData?.summary?.unknown_devices || 0} devices</span> */}
              <span className="text-black">{displaySummary?.unknown_devices || 0} devices</span>
            </div>
          </div>
        </div>

        {/* Temperature Range */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Temperature Range</h3>
            <Thermometer className="text-black text-sm w-4 h-4" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Average:</span>
              {/* <span className="text-black font-bold">{realtimeData?.summary?.avg_temp?.toFixed(1) || '-'}°C</span> */}
              <span className="text-black font-bold">{displaySummary?.avg_temp !== undefined && displaySummary?.avg_temp !== null ? Number(displaySummary.avg_temp).toFixed(1) : '-'}°C</span>
              {/* <span className="text-black font-bold">0.0°C</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Temp:</span>
              {/* <span className="text-black font-bold">{realtimeData?.summary?.max_temp?.toFixed(1) || '-'}°C</span> */}
              <span className="text-black font-bold">{displaySummary?.max_temp !== undefined && displaySummary?.max_temp !== null ? Number(displaySummary.max_temp).toFixed(1) : '-'}°C</span>
              {/* <span className="text-black font-bold">28.0°C</span> */}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min Temp:</span>
              {/* <span className="text-black font-bold">{realtimeData?.summary?.min_temp?.toFixed(1) || '-'}°C</span> */}
              <span className="text-black font-bold">{displaySummary?.min_temp !== undefined && displaySummary?.min_temp !== null ? Number(displaySummary.min_temp).toFixed(1) : '-'}°C</span>
              {/* <span className="text-black font-bold">-8.0°C</span> */}
            </div>
          </div>
        </div>

        {/* Odometer - 주석처리됨 */}
        {/* <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Odometer</h3>
            <Settings className="text-black text-sm w-4 h-4" />
          </div>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-black">
            {realtimeData?.summary?.avg_odometer ? Math.round(realtimeData.summary.avg_odometer).toLocaleString() : '-'}
              {displaySummary?.avg_odometer ? Math.round(Number(displaySummary.avg_odometer)).toLocaleString() : '-'}
            </div>
            <div className="text-sm text-gray-600">km</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Moving:</span>
              <span className={(displaySummary?.moving_devices || 0) > 0 ? 'text-green-400' : 'text-gray-600'}>
                {displaySummary?.moving_devices || 0} devices
              </span>
            </div>
          </div>
        </div> */}

        {/* Battery Health */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Battery Health</h3>
            <TrendingUp className="text-green-500 text-sm w-4 h-4" />
          </div>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-black">
            {/* {realtimeData?.summary?.avg_soh?.toFixed(1) || '-'}% */}
              {displaySummary?.avg_soh !== undefined && displaySummary?.avg_soh !== null ? Number(displaySummary.avg_soh).toFixed(1) : '-'}%
              {/* 98.1% */}
            </div>
            <div className="text-sm text-gray-600">State of Health</div>
          </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
            {/* <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min(realtimeData?.summary?.avg_soh || 0, 100)}%`}}></div> */}
              <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min(displaySummary?.avg_soh || 0, 100)}%`}}></div>
            {/* <div className="bg-green-500 h-2 rounded-full" style={{width: '98.1%'}}></div> */}
          </div>
        </div>
      </div>

      {/* 하단 2개 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Temperature Range - 주석처리됨 (상단으로 이동) */}
        {/* <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-gray-700">Temperature Range</h3>
            <TrendingUp className="text-black text-sm w-4 h-4" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Average:</span>
              <span className="text-black font-bold">{displaySummary?.avg_temp !== undefined && displaySummary?.avg_temp !== null ? Number(displaySummary.avg_temp).toFixed(1) : '-'}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Temp:</span>
              <span className="text-black font-bold">{displaySummary?.max_temp !== undefined && displaySummary?.max_temp !== null ? Number(displaySummary.max_temp).toFixed(1) : '-'}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min Temp:</span>
              <span className="text-black font-bold">{displaySummary?.min_temp !== undefined && displaySummary?.min_temp !== null ? Number(displaySummary.min_temp).toFixed(1) : '-'}°C</span>
            </div>
          </div>
        </div> */}
      </div>

      </div>
    </div>
  );
}
