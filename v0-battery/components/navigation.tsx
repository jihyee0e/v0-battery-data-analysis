"use client"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Car, TrendingUp, Trophy, BarChart3 } from "lucide-react"

interface NavigationProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const navItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "vehicles", label: "차량 성능", icon: Car },
    { id: "details", label: "차량 상세", icon: TrendingUp },
    { id: "ranking", label: "상위 성능", icon: Trophy },
    { id: "analysis", label: "데이터 분석", icon: BarChart3 },
  ]

  return (
    <nav className="flex items-center gap-2 mb-6 p-2 bg-card/30 backdrop-blur-sm rounded-lg border border-border/50">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Button
            key={item.id}
            variant={currentPage === item.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(item.id)}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}
