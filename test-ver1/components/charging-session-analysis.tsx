'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChargingSessionData {
  session_id: number;
  charge_start_time: string;
  charge_end_time: string;
  start_soc: number;
  end_soc: number;
  avg_charging_power: number;
  soc_per_hour: number;
  estimated_soh: number;
}

interface ChargingSessionAnalysisProps {
  vehicleId: string;
}

export default function ChargingSessionAnalysis({ vehicleId }: ChargingSessionAnalysisProps) {
  const [sessionData, setSessionData] = useState<ChargingSessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await fetch(`/api/vehicles/charging?vehicleId=${vehicleId}`);
        const data = await response.json();
        if (data.success) {
          setSessionData(data.data);
        }
      } catch (error) {
        console.error('충전 세션 데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchSessionData();
    }
  }, [vehicleId]);

  if (loading) return <div className="text-center p-4">충전 세션 데이터 로딩 중...</div>;

  if (sessionData.length === 0) return <div className="text-center p-4 text-gray-500">충전 세션 데이터가 없습니다.</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">충전 세션 분석</h3>
      
      {/* 충전 효율성 차트 */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3">충전 효율성 (시간당 SOC 증가량)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sessionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="session_id" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="soc_per_hour" fill="#8884d8" name="SOC/시간" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 충전 세션 상세 정보 */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">세션 ID</th>
              <th className="px-4 py-2 text-left">시작 시간</th>
              <th className="px-4 py-2 text-left">종료 시간</th>
              <th className="px-4 py-2 text-left">시작 SOC</th>
              <th className="px-4 py-2 text-left">종료 SOC</th>
              <th className="px-4 py-2 text-left">평균 충전 전력</th>
              <th className="px-4 py-2 text-left">시간당 SOC</th>
              <th className="px-4 py-2 text-left">추정 SOH</th>
            </tr>
          </thead>
          <tbody>
            {sessionData.map((session) => (
              <tr key={session.session_id} className="border-b">
                <td className="px-4 py-2">{session.session_id}</td>
                <td className="px-4 py-2">{new Date(session.charge_start_time).toLocaleString()}</td>
                <td className="px-4 py-2">{new Date(session.charge_end_time).toLocaleString()}</td>
                <td className="px-4 py-2">{session.start_soc}%</td>
                <td className="px-4 py-2">{session.end_soc}%</td>
                <td className="px-4 py-2">{session.avg_charging_power.toFixed(2)}W</td>
                <td className="px-4 py-2">{session.soc_per_hour.toFixed(2)}%/h</td>
                <td className="px-4 py-2">{session.estimated_soh.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 충전 효율성 요약 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {sessionData.length}
          </div>
          <div className="text-sm text-gray-600">총 충전 세션</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {(sessionData.reduce((sum, session) => sum + session.soc_per_hour, 0) / sessionData.length).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">평균 충전 속도 (%/h)</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {(sessionData.reduce((sum, session) => sum + session.estimated_soh, 0) / sessionData.length).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">평균 추정 SOH (%)</div>
        </div>
      </div>
    </div>
  );
}

