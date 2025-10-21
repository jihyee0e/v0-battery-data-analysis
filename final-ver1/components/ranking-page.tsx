'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Star, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';

interface RankingData {
  vehicle_id: string;
  vehicle_type: string;
  latest_soh: number;
  latest_soc: number;
  avg_efficiency: number;
  overall_score: number;
  soh_rank: number;
  soc_rank: number;
  overall_rank: number;
  performance_category: string;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('overall');
  const [carType, setCarType] = useState('');
  const [topN, setTopN] = useState(20);

  const fetchRankingData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        metric: metric,
        top_n: topN.toString(),
        limit: topN.toString()
      });

      if (carType) params.append('car_type', carType);

      const response = await fetch(`/api/vehicles/rankings?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setRankings(data.data);
        }
      }
    } catch (error) {
      console.error('랭킹 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankingData();
  }, [metric, carType, topN]);

  const getGradeDisplay = (score: number) => {
    if (score >= 90) return <><CheckCircle className="w-4 h-4 inline mr-1 text-green-600" />우수</>;
    if (score >= 80) return <><CheckCircle className="w-4 h-4 inline mr-1 text-blue-600" />양호</>;
    if (score >= 70) return <><Clock className="w-4 h-4 inline mr-1 text-yellow-600" />보통</>;
    return <><XCircle className="w-4 h-4 inline mr-1 text-red-600" />불량</>;
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-500" />;
    return <Star className="w-4 h-4 text-gray-400" />;
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'soh': return 'SOH';
      case 'efficiency': return '효율성';
      case 'overall': return '종합';
      default: return metric;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">차량 성능 랭킹</h1>
        <div className="text-sm text-gray-500">
          총 {rankings.length}대의 차량
        </div>
      </div>

      {/* 필터링 */}
      <Card>
        <CardHeader>
          <CardTitle>랭킹 기준 및 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue placeholder="랭킹 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">종합 성능</SelectItem>
                <SelectItem value="soh">SOH</SelectItem>
                <SelectItem value="efficiency">효율성</SelectItem>
              </SelectContent>
            </Select>

            <Select value={carType} onValueChange={(value) => setCarType(value === 'ALL' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="차종 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="BONGO3">BONGO3</SelectItem>
                <SelectItem value="GV60">GV60</SelectItem>
                <SelectItem value="PORTER2">PORTER2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={topN.toString()} onValueChange={(value) => setTopN(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="상위 N위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">상위 10위</SelectItem>
                <SelectItem value="20">상위 20위</SelectItem>
                <SelectItem value="50">상위 50위</SelectItem>
                <SelectItem value="100">상위 100위</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 랭킹 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>{getMetricLabel(metric)} 기준 랭킹</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">순위</th>
                  <th className="text-left p-3">차량 ID</th>
                  <th className="text-left p-3">차종</th>
                  <th className="text-left p-3">SOH</th>
                  <th className="text-left p-3">효율성</th>
                  <th className="text-left p-3">SOC</th>
                  <th className="text-left p-3">종합 점수</th>
                  <th className="text-left p-3">카테고리</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((vehicle, index) => (
                  <tr key={vehicle.vehicle_id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getRankIcon(vehicle.overall_rank)}
                        <span className="font-semibold">{vehicle.overall_rank}</span>
                      </div>
                    </td>
                    <td className="p-3 font-medium">{vehicle.vehicle_id}</td>
                    <td className="p-3">
                      <Badge variant="outline">{vehicle.vehicle_type}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-lg font-semibold">{vehicle.latest_soh.toFixed(1)}%</div>
                      <div className="text-sm text-gray-500">순위: {vehicle.soh_rank}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-lg font-semibold">{vehicle.avg_efficiency.toFixed(2)}%</div>
                      <div className="text-sm text-gray-500">순위: {vehicle.soc_rank}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-lg font-semibold">{vehicle.latest_soc.toFixed(1)}%</div>
                    </td>
                    <td className="p-3">
                      <div className="text-lg font-semibold">{vehicle.overall_score.toFixed(1)}</div>
                      <Badge className={getGradeColor(vehicle.overall_score)}>
                        {getGradeDisplay(vehicle.overall_score)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant="outline" 
                        className={
                          vehicle.performance_category === 'TOP_10' ? 'bg-yellow-100 text-yellow-800' :
                          vehicle.performance_category === 'HIGH_PERFORMANCE' ? 'bg-blue-100 text-blue-800' :
                          vehicle.performance_category === 'AVERAGE' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {vehicle.performance_category}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOP 10</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rankings.filter(v => v.performance_category === 'TOP_10').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">고성능</CardTitle>
            <Medal className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rankings.filter(v => v.performance_category === 'HIGH_PERFORMANCE').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rankings.filter(v => v.performance_category === 'AVERAGE').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">저성능</CardTitle>
            <Star className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rankings.filter(v => v.performance_category === 'LOW_PERFORMANCE').length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
