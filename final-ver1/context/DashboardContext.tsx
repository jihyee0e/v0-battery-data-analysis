'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface DashboardContextType {
  overviewStats: any | null;
  setOverviewStats: React.Dispatch<React.SetStateAction<any | null>>;
  initialized: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [overviewStats, setOverviewStats] = useState<any | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 최초 한 번만 API 호출
  useEffect(() => {
    if (initialized) return;

    const fetchOverviewStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.overview) setOverviewStats(json.overview);
        }
      } catch (e) {
        console.error('개요 통계 로드 실패:', e);
      } finally {
        setInitialized(true);
      }
    };

    fetchOverviewStats();
  }, [initialized]);

  return (
    <DashboardContext.Provider value={{ overviewStats, setOverviewStats, initialized }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used within DashboardProvider');
  return context;
};
