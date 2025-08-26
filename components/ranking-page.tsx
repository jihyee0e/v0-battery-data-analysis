"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Medal, Award, TrendingUp, Battery } from "lucide-react"

const rankingData = {
  soh: [
    { rank: 1, id: "gv60_003", model: "GV60", value: 98.1, score: 98.1, odometer: 28900 },
    { rank: 2, id: "gv60_001", model: "GV60", value: 96.8, score: 96.8, odometer: 45230 },
    { rank: 3, id: "gv60_002", model: "GV60", value: 95.3, score: 95.3, odometer: 52100 },
    { rank: 4, id: "porter2_001", model: "Porter 2", value: 94.5, score: 94.5, odometer: 89048 },
    { rank: 5, id: "porter2_002", model: "Porter 2", value: 92.1, score: 92.1, odometer: 95230 },
    { rank: 6, id: "bongo3_001", model: "Bongo 3", value: 91.2, score: 91.2, odometer: 127845 },
    { rank: 7, id: "bongo3_002", model: "Bongo 3", value: 89.4, score: 89.4, odometer: 134200 },
    { rank: 8, id: "porter2_003", model: "Porter 2", value: 87.2, score: 87.2, odometer: 156780 },
    { rank: 9, id: "bongo3_003", model: "Bongo 3", value: 85.6, score: 85.6, odometer: 178450 },
    { rank: 10, id: "porter2_004", model: "Porter 2", value: 83.7, score: 83.7, odometer: 189320 },
  ],
  efficiency: [
    { rank: 1, id: "gv60_003", model: "GV60", value: 7.2, score: 95.8, odometer: 28900 },
    { rank: 2, id: "gv60_001", model: "GV60", value: 6.8, score: 94.2, odometer: 45230 },
    { rank: 3, id: "porter2_001", model: "Porter 2", value: 6.4, score: 92.1, odometer: 89048 },
    { rank: 4, id: "gv60_002", model: "GV60", value: 6.2, score: 90.5, odometer: 52100 },
    { rank: 5, id: "porter2_002", model: "Porter 2", value: 5.9, score: 88.8, odometer: 95230 },
    { rank: 6, id: "bongo3_001", model: "Bongo 3", value: 5.6, score: 86.2, odometer: 127845 },
    { rank: 7, id: "bongo3_002", model: "Bongo 3", value: 5.3, score: 84.1, odometer: 134200 },
    { rank: 8, id: "porter2_003", model: "Porter 2", value: 5.0, score: 81.7, odometer: 156780 },
    { rank: 9, id: "bongo3_003", model: "Bongo 3", value: 4.8, score: 79.3, odometer: 178450 },
    { rank: 10, id: "porter2_004", model: "Porter 2", value: 4.5, score: 76.8, odometer: 189320 },
  ],
}

export function RankingPage() {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return (
      <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>
    )
  }

  const getRankColor = (rank: number) => {
    if (rank <= 3) return "text-primary border-primary bg-primary/10"
    if (rank <= 6) return "text-chart-3 border-chart-3 bg-chart-3/10"
    return "text-muted-foreground border-muted-foreground bg-muted/10"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">상위 성능 차량 랭킹</h2>
        <Badge variant="outline" className="text-primary border-primary bg-primary/10">
          Top 10 차량
        </Badge>
      </div>

      {/* 종합 성능 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              최고 성능 차량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">GV60 - 003</div>
            <div className="text-sm text-muted-foreground">SOH: 98.1% | 효율: 7.2 km/kWh</div>
            <Badge variant="outline" className="text-green-500 border-green-500 bg-green-500/10 mt-2">
              종합 1위
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 성능</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">평균 SOH</span>
                <span className="font-mono">91.4%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">평균 효율</span>
                <span className="font-mono">5.8 km/kWh</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">성능 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">A급 (90%+)</span>
                <span className="font-mono">6대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">B급 (80-90%)</span>
                <span className="font-mono">3대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">C급 (70-80%)</span>
                <span className="font-mono">1대</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOH 랭킹 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-primary" />
              배터리 건강도 (SOH) 랭킹
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankingData.soh.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-border/30"
              >
                <div className="flex items-center justify-center w-8">{getRankIcon(vehicle.rank)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{vehicle.model}</div>
                    <div className="text-lg font-bold font-mono">{vehicle.value}%</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-mono">{vehicle.id}</span>
                    <span>{vehicle.odometer.toLocaleString()} km</span>
                  </div>
                  <Progress value={vehicle.value} className="mt-2 h-2" />
                </div>
                <Badge variant="outline" className={getRankColor(vehicle.rank)}>
                  #{vehicle.rank}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 효율성 랭킹 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-chart-3" />
              에너지 효율성 랭킹
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankingData.efficiency.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-border/30"
              >
                <div className="flex items-center justify-center w-8">{getRankIcon(vehicle.rank)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{vehicle.model}</div>
                    <div className="text-lg font-bold font-mono">{vehicle.value} km/kWh</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-mono">{vehicle.id}</span>
                    <span>점수: {vehicle.score}</span>
                  </div>
                  <Progress value={vehicle.score} className="mt-2 h-2" />
                </div>
                <Badge variant="outline" className={getRankColor(vehicle.rank)}>
                  #{vehicle.rank}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
