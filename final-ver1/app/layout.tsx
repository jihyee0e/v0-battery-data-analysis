import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DashboardProvider } from '@/context/DashboardContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EV Battery Monitoring System',
  description: '전기차 배터리 모니터링 및 분석 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <DashboardProvider>
          {/* 네비게이션 바 */}
          <nav className="bg-blue-600 text-white p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">EV 배터리 모니터링</h1>
              <div className="flex space-x-6">
                <a href="/" className="hover:text-blue-200">대시보드</a>
                <a href="/advanced-analysis" className="hover:text-blue-200">고급 분석</a>
              </div>
            </div>
          </nav>
          
          {children}
        </DashboardProvider>
      </body>
    </html>
  )
}
