"use client"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Car, BarChart3 } from "lucide-react"

interface NavigationProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const navItems = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "vehicles", label: "개별 차량 분석", icon: Car },
    { id: "analysis", label: "데이터 분석", icon: BarChart3 },
  ]

  return (
    <nav className="flex items-center gap-2 mb-6 p-2 bg-white border border-gray-200 rounded-lg">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Button
            key={item.id}
            variant={currentPage === item.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(item.id)}
            className={`flex items-center gap-2 ${
              currentPage === item.id 
                ? "bg-green-500 text-white hover:bg-green-600" 
                : "text-black hover:bg-gray-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}
