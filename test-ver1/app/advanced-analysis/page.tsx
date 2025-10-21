'use client';

import { useState } from 'react';
import BatteryAgingTrends from '@/components/battery-aging-trends';
import ChargingSessionAnalysis from '@/components/charging-session-analysis';

export default function AdvancedAnalysisPage() {
  const [activeTab, setActiveTab] = useState<'aging' | 'charging'>('aging');

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">고급 배터리 분석</h1>

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('aging')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'aging'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              전체 차량 노화 분석
            </button>
            <button
              onClick={() => setActiveTab('charging')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'charging'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              전체 차량 충전 분석
            </button>
          </nav>
        </div>

        {/* 분석 내용 */}
        {activeTab === 'aging' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">전체 차량 배터리 노화 현황</h3>
              <p className="text-gray-600 mb-4">
                모든 차량의 SOH 변화율과 효율성 트렌드를 종합적으로 분석합니다.
              </p>
              {/* 여기에 전체 차량 노화 분석 컴포넌트 추가 예정 */}
              <div className="text-center p-8 text-gray-500">
                전체 차량 노화 분석 차트가 여기에 표시됩니다.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'charging' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">전체 차량 충전 패턴 분석</h3>
              <p className="text-gray-600 mb-4">
                모든 차량의 충전 효율성과 패턴을 종합적으로 분석합니다.
              </p>
              {/* 여기에 전체 차량 충전 분석 컴포넌트 추가 예정 */}
              <div className="text-center p-8 text-gray-500">
                전체 차량 충전 분석 차트가 여기에 표시됩니다.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
