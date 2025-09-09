"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, ArrowRight, BarChart3, Battery } from "lucide-react"

export function DataFlowDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Flow Architecture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
          {/* Dataset Section */}
          <div className="flex-shrink-0">
            <div className="text-sm font-medium mb-3 text-center">Dataset</div>
            <div className="space-y-2">
              {["SK", "Aicar", "Batterwhy"].map((dataset) => (
                <div key={dataset} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">{dataset}</span>
                </div>
              ))}
            </div>
          </div>

          <ArrowRight className="text-muted-foreground flex-shrink-0" />

          {/* Ranking Section */}
          <div className="flex-shrink-0">
            <div className="text-sm font-medium mb-3 text-center">Ranking</div>
            <div className="space-y-2">
              {[
                { label: "Top 100", color: "bg-primary" },
                { label: "Medium", color: "bg-chart-3" },
                { label: "Bottom 100", color: "bg-chart-4" },
              ].map((rank) => (
                <div key={rank.label} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <div className={`w-3 h-3 rounded ${rank.color}`} />
                  <span className="text-sm">{rank.label}</span>
                </div>
              ))}
            </div>
          </div>

          <ArrowRight className="text-muted-foreground flex-shrink-0" />

          {/* Analysis Section */}
          <div className="flex-shrink-0">
            <div className="text-sm font-medium mb-3 text-center">Analysis</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Battery className="w-4 h-4 text-primary" />
                <span className="text-sm">Battery</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">Odometer</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <div className="w-4 h-4 bg-primary rounded" />
                <span className="text-sm">Charge</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
