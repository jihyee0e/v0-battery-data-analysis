"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import EVDashboard from "@/components/ev-dashboard"
import VehiclePerformance from "@/components/vehicle-performance"
import { VehicleDetails } from "@/components/vehicle-details"
import RankingPage from "@/components/ranking-page"
import { AnalysisPage } from "@/components/analysis-page"

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
