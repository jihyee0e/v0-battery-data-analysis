'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';

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

export default function VehiclePerformance() {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    carType: '',
    grade: '',
    status: '',
    quality: ''
  });
  const [sortBy, setSortBy] = useState('soh');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVehicles, setTotalVehicles] = useState(0);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy
      });

      if (filters.carType) params.append('car_type', filters.carType);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.status) params.append('status', filters.status);
      if (filters.quality) params.append('quality', filters.quality);

      const response = await fetch(`/api/vehicles/performance?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setVehicles(data.data);
          const total = data.pagination?.total_count ?? data.data.length ?? 0;
          setTotalVehicles(total);
          setTotalPages(data.pagination?.total_pages ?? Math.ceil((data.data.length ?? 0) / 20));
        }
      }
    } catch (error) {
      console.error('차량 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [filters, sortBy, currentPage]);

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

  const getStatusText = (packCurrent: number, packVolt: number) => {
    const powerW = packVolt * packCurrent;
    if (powerW > 1000 || packCurrent >= 3) return "충전중";
    if (powerW < -3000 || packCurrent <= -8) return "주행중";
    return "대기중";
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">차량 성능 모니터링</h1>
        <div className="text-sm text-gray-500">
          총 {totalVehicles}대의 차량
        </div>
      </div>

      {/* 필터링 */}
      <Card>
        <CardHeader>
          <CardTitle>필터링 및 정렬</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={filters.carType} onValueChange={(value) => setFilters(prev => ({ ...prev, carType: value === 'ALL' ? '' : value }))}>
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

            <Select value={filters.grade} onValueChange={(value) => setFilters(prev => ({ ...prev, grade: value === 'ALL' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="등급 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="우수">🟢 우수</SelectItem>
                <SelectItem value="양호">🔵 양호</SelectItem>
                <SelectItem value="보통">🟡 보통</SelectItem>
                <SelectItem value="불량">🔴 불량</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'ALL' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="충전중">충전중</SelectItem>
                <SelectItem value="주행중">주행중</SelectItem>
                <SelectItem value="대기중">대기중</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.quality} onValueChange={(value) => setFilters(prev => ({ ...prev, quality: value === 'ALL' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="품질 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soh">전체</SelectItem>
                <SelectItem value="efficiency">효율성</SelectItem>
                <SelectItem value="charging">충전효율</SelectItem>
                <SelectItem value="updated">최신순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 차량 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.vehicle_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{vehicle.vehicle_id}</CardTitle>
                <Badge variant="outline">{vehicle.vehicle_type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 배터리 상태 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">SOC</div>
                  <div className="text-lg font-semibold">{vehicle.latest_soc.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">SOH</div>
                  <div className="text-lg font-semibold">{vehicle.latest_soh.toFixed(1)}%</div>
                </div>
              </div>

              {/* 성능 지표 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">효율성</div>
                  <div className="text-lg font-semibold">{vehicle.avg_efficiency.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">온도</div>
                  <div className="text-lg font-semibold">{vehicle.mod_avg_temp.toFixed(1)}°C</div>
                </div>
              </div>

              {/* 전기적 특성 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">전압</div>
                  <div className="text-sm font-medium">{vehicle.pack_volt.toFixed(1)}V</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">전류</div>
                  <div className="text-sm font-medium">{vehicle.pack_current.toFixed(2)}A</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">전력</div>
                  <div className="text-sm font-medium">{vehicle.power_w.toFixed(1)}W</div>
                </div>
              </div>

              {/* 상태 */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getGradeColor(vehicle.performance_grade)}>
                  {getGradeDisplay(vehicle.performance_grade)}
                </Badge>
                <Badge className={getStatusColor(vehicle.vehicle_status)}>
                  {getStatusText(vehicle.pack_current, vehicle.pack_volt)}
                </Badge>
              </div>

              {/* 추가 정보 */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>업데이트: {new Date(vehicle.last_updated).toLocaleString('ko-KR')}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

