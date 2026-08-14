/**
 * Recent OSINT tools — localStorage. Tanpa backend.
 */

import { useCallback, useEffect, useState } from 'react';

const RECENT_KEY = 'osint-recent-tools';
const MAX = 8;

export function useOsintHistory() {
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 50)));
    } catch {
      /* abaikan */
    }
  }, [recent]);

  const recordUsage = useCallback((toolId: string) => {
    setRecent((prev) => [toolId, ...prev.filter((id) => id !== toolId)].slice(0, MAX));
  }, []);

  return { recent, recordUsage };
}
