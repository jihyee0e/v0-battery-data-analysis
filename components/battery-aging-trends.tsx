'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AgingTrendData {
  month: string;
  avg_soh: number;
  avg_efficiency: number;
  soh_change_rate: number;
  efficiency_change_rate: number;
  soh_trend: string;
  efficiency_trend: string;
}

interface BatteryAgingTrendsProps {
  vehicleId: string;
}

export default function BatteryAgingTrends({ vehicleId }: BatteryAgingTrendsProps) {
  const [trendData, setTrendData] = useState<AgingTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const response = await fetch(`/api/vehicles/trends?vehicleId=${vehicleId}`);
        const data = await response.json();
        if (data.success) {
          setTrendData(data.data);
        }
      } catch (error) {
        console.error('트렌드 데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchTrendData();
    }
  }, [vehicleId]);

  if (loading) return <div className="text-center p-4">트렌드 데이터 로딩 중...</div>;

  if (trendData.length === 0) return <div className="text-center p-4 text-gray-500">트렌드 데이터가 없습니다.</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">배터리 노화 트렌드 분석</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOH 변화 추이 */}
        <div>
          <h4 className="text-md font-medium mb-3">SOH 변화 추이</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg_soh" stroke="#8884d8" name="SOH (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 효율성 변화 추이 */}
        <div>
          <h4 className="text-md font-medium mb-3">효율성 변화 추이</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg_efficiency" stroke="#82ca9d" name="효율성" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 트렌드 요약 */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trendData.slice(-1).map((latest, index) => (
          <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">SOH 트렌드</div>
            <div className={`text-lg font-semibold ${
              latest.soh_trend === '안정' ? 'text-green-600' :
              latest.soh_trend === '경미한 저하' ? 'text-yellow-600' :
              latest.soh_trend === '중간 저하' ? 'text-orange-600' : 'text-red-600'
            }`}>
              {latest.soh_trend}
            </div>
          </div>
        ))}
        {trendData.slice(-1).map((latest, index) => (
          <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">효율성 트렌드</div>
            <div className={`text-lg font-semibold ${
              latest.efficiency_trend === '안정' ? 'text-green-600' :
              latest.efficiency_trend === '경미한 저하' ? 'text-yellow-600' :
              latest.efficiency_trend === '중간 저하' ? 'text-orange-600' : 'text-red-600'
            }`}>
              {latest.efficiency_trend}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

