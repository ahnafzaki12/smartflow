// SmartFlowProvider.tsx — Task 3.7: WS primary, polling fallback
import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useSmartFlowWs, type ExtendedStatus } from '@/hooks/useSmartFlowWs';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import type { ApiStatus, HistoryEntry } from '@/hooks/useSmartFlowApi';
import type { FlowTimelinePoint } from '@/types/metrics';

interface SmartFlowContextValue {
  apiData:        ExtendedStatus;
  apiStatus:      ApiStatus;
  useWs:          boolean;
  chartData:      FlowTimelinePoint[];
  decisions:      DecisionEntry[];
}

export interface DecisionEntry {
  id: number;
  timestamp: string;
  time: string;
  intersection: string;
  prev_green: number;
  new_green: number;
  reason: string;
  cycle_number?: number;
}

const SmartFlowContext = createContext<SmartFlowContextValue | null>(null);

export function SmartFlowProvider({ children }: { children: ReactNode }) {
  const { chartData, decisions, appendTick } = useHistoricalData();
  const handleTick = useCallback((e: HistoryEntry) => appendTick(e), [appendTick]);
  const { data: apiData, status: apiStatus, useWs } = useSmartFlowWs(handleTick);

  return (
    <SmartFlowContext.Provider value={{ apiData, apiStatus, useWs, chartData, decisions }}>
      {children}
    </SmartFlowContext.Provider>
  );
}

export function useSmartFlow(): SmartFlowContextValue {
  const ctx = useContext(SmartFlowContext);
  if (!ctx) throw new Error('useSmartFlow() must be inside <SmartFlowProvider>');
  return ctx;
}
