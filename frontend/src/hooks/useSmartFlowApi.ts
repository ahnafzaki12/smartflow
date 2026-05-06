import { useState, useEffect } from 'react';

export interface SmartFlowData {
  queue: {
    'Simpang A': number;
    'Simpang B': number;
    'Simpang C': number;
    'Simpang D': number;
  };
  green_lights: {
    'Simpang A': number;
    'Simpang B': number;
    'Simpang C': number;
    'Simpang D': number;
  };
}

const DEFAULT_DATA: SmartFlowData = {
  queue: { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 },
  green_lights: { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 }
};

export function useSmartFlowApi() {
  const [data, setData] = useState<SmartFlowData>(DEFAULT_DATA);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/status');
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    };

    fetchStatus(); // initial fetch
    const interval = setInterval(fetchStatus, 500);

    return () => clearInterval(interval);
  }, []);

  return { data, error };
}
