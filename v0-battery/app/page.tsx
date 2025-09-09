"use client"

import { useState } from "react"
import { Navigation } from "@/v0-battery/components/navigation"
import EVDashboard from "@/v0-battery/components/ev-dashboard"
import VehiclePerformance from "@/v0-battery/components/vehicle-performance"
import { VehicleDetails } from "@/v0-battery/components/vehicle-details"
import RankingPage from "@/v0-battery/components/ranking-page"
import { AnalysisPage } from "@/v0-battery/components/analysis-page"

export default function Home() {
  const [currentPage, setCurrentPage] = useState("dashboard")

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <EVDashboard />
      case "vehicles":
        return <VehiclePerformance />
      case "details":
        return <VehicleDetails />
      case "ranking":
        return <RankingPage />
      case "analysis":
        return <AnalysisPage />
      default:
        return <EVDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      {renderPage()}
    </div>
  )
}
