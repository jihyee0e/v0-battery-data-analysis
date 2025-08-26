"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Zap, Thermometer, Calendar } from "lucide-react"

const seasonalData = [
  { month: "1월", temp: -2, avgSOH: 89.2, avgEfficiency: 5.1, chargingSessions: 156 },
  { month: "2월", temp: 1, avgSOH: 90.1, avgEfficiency: 5.3, chargingSessions: 142 },
  { month: "3월", temp: 8, avgSOH: 91.5, avgEfficiency: 5.8, chargingSessions: 138 },
  { month: "4월", temp: 15, avgSOH: 92.8, avgEfficiency: 6.2, chargingSessions: 145 },
  { month: "5월", temp: 21, avgSOH: 94.1, avgEfficiency: 6.5, chargingSessions: 152 },
  { month: "6월", temp: 26, avgSOH: 93.7, avgEfficiency: 6.3, chargingSessions: 168 },
  { month: "7월", temp: 29, avgSOH: 92.4, avgEfficiency: 5.9, chargingSessions: 185 },
  { month: "8월", temp: 28, avgSOH: 91.8, avgEfficiency: 5.7, chargingSessions: 192 },
  { month: "9월", temp: 23, avgSOH: 92.9, avgEfficiency: 6.1, chargingSessions: 174 },
  { month: "10월", temp: 16, avgSOH: 93.6, avgEfficiency: 6.4, chargingSessions: 159 },
  { month: "11월", temp: 8, avgSOH: 92.1, avgEfficiency: 5.8, chargingSessions: 148 },
  { month: "12월", temp: 2, avgSOH: 90.7, avgEfficiency: 5.4, chargingSessions: 163 },
]

const chargingPatterns = [
  { hour: "00", sessions: 12, efficiency: 94.2, avgPower: 7.2 },
  { hour: "02", sessions: 8, efficiency: 95.1, avgPower: 7.5 },
  { hour: "04", sessions: 6, efficiency: 95.8, avgPower: 7.8 },
  { hour: "06", sessions: 15, efficiency: 93.4, avgPower: 6.9 },
  { hour: "08", sessions: 28, efficiency: 91.2, avgPower: 6.1 },
  { hour: "10", sessions: 35, efficiency: 89.8, avgPower: 5.8 },
  { hour: "12", sessions: 42, efficiency: 88.5, avgPower: 5.5 },
  { hour: "14", sessions: 38, efficiency: 89.1, avgPower: 5.7 },
  { hour: "16", sessions: 45, efficiency: 87.9, avgPower: 5.3 },
  { hour: "18", sessions: 52, efficiency: 86.4, avgPower: 5.1 },
  { hour: "20", sessions: 48, efficiency: 87.2, avgPower: 5.4 },
  { hour: "22", sessions: 32, efficiency: 90.6, avgPower: 6.3 },
]

const chargingLocationData = [
  { name: "가정용 충전", value: 45, color: "#8884d8" },
  { name: "직장 충전소", value: 28, color: "#82ca9d" },
  { name: "공공 급속충전", value: 18, color: "#ffc658" },
  { name: "상업시설", value: 9, color: "#ff7300" },
]

export function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">데이터 분석</h2>
      </div>

      <Tabs defaultValue="seasonal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            계절별 분석
          </TabsTrigger>
          <TabsTrigger value="charging" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            충전 패턴 분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seasonal" className="space-y-6">
          {/* 온도별 성능 변화 */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="w-5 h-5" />
                온도별 배터리 성능 변화
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seasonalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temp"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name="온도 (°C)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgSOH"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="평균 SOH (%)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgEfficiency"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      name="평균 효율 (km/kWh)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 계절별 충전 빈도 */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>월별 충전 세션 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="chargingSessions" fill="hsl(var(--primary))" name="충전 세션" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 계절별 인사이트 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">최적 성능 온도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15-21°C</div>
                <p className="text-xs text-muted-foreground">SOH 92.8-94.1% 구간</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">여름철 성능 저하</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">-2.3%</div>
                <p className="text-xs text-muted-foreground">7-8월 평균 SOH 감소</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">겨울철 효율 저하</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">-1.1</div>
                <p className="text-xs text-muted-foreground">km/kWh 평균 감소</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charging" className="space-y-6">
          {/* 시간대별 충전 패턴 */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                시간대별 충전 패턴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chargingPatterns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar yAxisId="left" dataKey="sessions" fill="hsl(var(--primary))" name="충전 세션 수" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="efficiency"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      name="충전 효율 (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 충전 위치 분포 */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>충전 위치 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chargingLocationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chargingLocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 충전 효율 분석 */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>충전 효율 인사이트</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <div>
                      <div className="font-medium">최고 효율 시간대</div>
                      <div className="text-sm text-muted-foreground">새벽 2-6시</div>
                    </div>
                    <div className="text-lg font-bold text-green-500">95.8%</div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <div>
                      <div className="font-medium">피크 충전 시간</div>
                      <div className="text-sm text-muted-foreground">오후 6-8시</div>
                    </div>
                    <div className="text-lg font-bold text-orange-500">52회</div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <div>
                      <div className="font-medium">평균 충전 전력</div>
                      <div className="text-sm text-muted-foreground">전체 시간대</div>
                    </div>
                    <div className="text-lg font-bold">6.2 kW</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 충전 패턴 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">일평균 충전</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3회</div>
                <p className="text-xs text-muted-foreground">차량당 평균</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">평균 충전 시간</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2시간</div>
                <p className="text-xs text-muted-foreground">세션당 평균</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">충전 완료율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.7%</div>
                <p className="text-xs text-muted-foreground">성공적 완료</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">에너지 비용</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩142</div>
                <p className="text-xs text-muted-foreground">kWh당 평균</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
